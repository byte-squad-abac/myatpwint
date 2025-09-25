import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateJWTToken, generateDocumentKey } from '@/lib/onlyoffice-jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { manuscriptId, userId, userRole } = await request.json();

    if (!manuscriptId || !userId || !userRole) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch manuscript and user data
    const { data: manuscript, error: manuscriptError } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('id', manuscriptId)
      .single();

    if (manuscriptError || !manuscript) {
      return NextResponse.json({ error: 'Manuscript not found' }, { status: 404 });
    }

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    const canEdit = (
      (userRole === 'author' && manuscript.author_id === userId && manuscript.status === 'rejected') ||
      (userRole === 'editor' && (manuscript.status === 'submitted' || manuscript.status === 'under_review')) ||
      (userRole === 'publisher')
    );

    // Generate version-aware document key to force OnlyOffice to recognize updates
    const documentKey = generateDocumentKey(manuscriptId, manuscript.updated_at);

    // Update document key if column exists (optional)
    try {
      await supabase
        .from('manuscripts')
        .update({ document_key: documentKey })
        .eq('id', manuscriptId);
    } catch {
      // document_key column may not exist in current schema, continue without updating
      console.log('Document key update skipped - column may not exist');
    }

    // Ensure document exists in storage, create if missing
    const fileName = `manuscript-${manuscriptId}.docx`;
    let documentUrl = manuscript.file_url;
    
    try {
      // First, try to get existing signed URL
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('manuscripts')
        .createSignedUrl(fileName, 3600); // 1 hour

      if (urlError || !signedUrlData?.signedUrl) {
        console.log(`File not found in storage: ${fileName}`);
        
        // If file doesn't exist and we have a database file_url, try to fetch and upload it
        if (manuscript.file_url) {
          try {
            console.log(`Attempting to fetch and upload file from: ${manuscript.file_url}`);
            
            // Fetch the document from the database URL
            const response = await fetch(manuscript.file_url);
            if (response.ok) {
              const documentBuffer = await response.arrayBuffer();
              
              // Upload to storage
              const { error: uploadError } = await supabase.storage
                .from('manuscripts')
                .upload(fileName, documentBuffer, {
                  contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  upsert: true
                });
              
              if (uploadError) {
                console.error('Failed to upload to storage:', uploadError);
              } else {
                console.log(`Successfully uploaded ${fileName} to storage`);
                
                // Now get the signed URL for the uploaded file
                const { data: newSignedUrlData } = await supabase.storage
                  .from('manuscripts')
                  .createSignedUrl(fileName, 3600);
                
                if (newSignedUrlData?.signedUrl) {
                  documentUrl = newSignedUrlData.signedUrl;
                }
              }
            } else {
              console.log('Could not fetch document from database URL');
            }
          } catch (fetchError) {
            console.error('Error fetching/uploading document:', fetchError);
          }
        }
        
        // If still no storage file, create simple text placeholder that OnlyOffice can handle
        if (!documentUrl || documentUrl === manuscript.file_url) {
          console.log('Creating basic document placeholder');
          
          try {
            // Create a simple text file with manuscript title as content
            const placeholderContent = `${manuscript.title}\n\n[Start editing your manuscript here...]`;
            const textBuffer = new TextEncoder().encode(placeholderContent);
            
            // Upload as .txt first (OnlyOffice can handle this)
            const textFileName = `manuscript-${manuscriptId}.txt`;
            const { error: createError } = await supabase.storage
              .from('manuscripts')
              .upload(textFileName, textBuffer, {
                contentType: 'text/plain',
                upsert: true
              });
              
            if (!createError) {
              const { data: finalSignedUrlData } = await supabase.storage
                .from('manuscripts')
                .createSignedUrl(textFileName, 3600);
                
              if (finalSignedUrlData?.signedUrl) {
                documentUrl = finalSignedUrlData.signedUrl;
                console.log('Created text document placeholder');
              }
            } else {
              console.error('Failed to create document placeholder:', createError);
            }
          } catch (createError) {
            console.error('Error creating document placeholder:', createError);
          }
        }
        
      } else {
        documentUrl = signedUrlData.signedUrl;
        console.log(`Using existing signed URL for: ${fileName}`);
      }
    } catch (storageError) {
      console.error('Storage operation error:', storageError);
    }

    // Add cache-busting parameter to ensure latest version is loaded
    if (documentUrl) {
      const separator = documentUrl.includes('?') ? '&' : '?';
      documentUrl += `${separator}v=${Date.now()}`;
    }
    

    // Create OnlyOffice configuration
    const config = {
      document: {
        fileType: 'docx',
        key: documentKey,
        title: manuscript.title,
        url: documentUrl,
        permissions: {
          edit: canEdit,
          download: true,
          print: true,
          review: userRole === 'editor',
          comment: true,
          chat: canEdit,
          fillForms: canEdit,
          modifyFilter: canEdit,
          modifyContentControl: canEdit
        },
        info: {
          owner: manuscript.title,
          folder: 'Manuscripts',
          uploaded: manuscript.submitted_at
        }
      },
      documentType: 'word',
      editorConfig: {
        mode: canEdit ? 'edit' : 'view',
        lang: 'en',
        callbackUrl: `${process.env.NODE_ENV === 'production'
          ? (process.env.ONLYOFFICE_PRODUCTION_CALLBACK_URL || process.env.ONLYOFFICE_CALLBACK_URL || 'http://host.docker.internal:3000')
          : (process.env.ONLYOFFICE_CALLBACK_URL || 'http://host.docker.internal:3000')
        }/api/onlyoffice/callback`,
        coEditing: {
          mode: 'fast',
          change: true
        },
        user: {
          id: userId,
          name: user.name || 'Anonymous User'
        },
        customization: {
          about: false,
          feedback: false,
          goback: {
            url: userRole === 'author' ? '/author' : userRole === 'publisher' ? '/publisher' : '/editor',
            text: 'Back to Dashboard'
          }
        }
      }
    };

    // Generate JWT token for the configuration
    const token = generateJWTToken(config);
    (config as Record<string, unknown>).token = token;

    // Log editing activity (optional - table may not exist)
    try {
      await supabase
        .from('manuscript_activity')
        .insert({
          manuscript_id: manuscriptId,
          user_id: userId,
          activity_type: 'editor_opened',
          timestamp: new Date().toISOString()
        });
    } catch {
      // manuscript_activity table doesn't exist, continue without logging
      console.log('Activity logging skipped - table may not exist');
    }

    return NextResponse.json(config);

  } catch (error) {
    console.error('OnlyOffice config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}