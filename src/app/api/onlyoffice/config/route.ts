import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateJWTToken, generateDocumentKey } from '../../../../lib/onlyoffice-jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { manuscriptId, userId, userRole, manuscriptStatus } = await request.json();

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

    // Always update the document key to current value
    await supabase
      .from('manuscripts')
      .update({ document_key: documentKey })
      .eq('id', manuscriptId);

    // Get signed URL for document using consistent filename pattern
    const fileName = `manuscript-${manuscriptId}.docx`;
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('manuscripts')
      .createSignedUrl(fileName, 3600); // 1 hour

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
    }

    // Add cache-busting parameter to ensure latest version is loaded
    let documentUrl = signedUrlData?.signedUrl || manuscript.file_url;
    const separator = documentUrl.includes('?') ? '&' : '?';
    documentUrl += `${separator}v=${Date.now()}`;
    

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
        callbackUrl: `${process.env.ONLYOFFICE_CALLBACK_URL || 'http://host.docker.internal:3000'}/api/onlyoffice/callback`,
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
    config.token = token;

    // Log editing activity
    await supabase
      .from('manuscript_activity')
      .insert({
        manuscript_id: manuscriptId,
        user_id: userId,
        activity_type: 'editor_opened',
        timestamp: new Date().toISOString()
      });

    return NextResponse.json(config);

  } catch (error) {
    console.error('OnlyOffice config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}