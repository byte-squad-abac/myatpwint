import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, status, url, users, actions } = body;

    console.log('OnlyOffice callback received:', { key, status, users: users?.length });

    // Extract manuscript ID from document key
    // Key formats: manuscript-{manuscriptId} or manuscript-{manuscriptId}-v{timestamp}
    // Since UUID contains hyphens, we need to handle this carefully
    let manuscriptId: string;
    if (key.includes('-v')) {
      // Version-aware key: manuscript-{uuid}-v{timestamp}
      const versionIndex = key.lastIndexOf('-v');
      manuscriptId = key.substring('manuscript-'.length, versionIndex);
    } else {
      // Simple key: manuscript-{uuid}
      manuscriptId = key.substring('manuscript-'.length);
    }

    if (!manuscriptId) {
      console.error('Invalid document key format:', key);
      return NextResponse.json({ error: 0 }); // Still return success to avoid editor errors
    }

    console.log('Extracted manuscript ID:', manuscriptId, 'from key:', key);

    try {
      // Handle different status codes
      switch (status) {
        case 1: // Document editing (user connected/disconnected)
          await supabase
            .from('manuscript_activity')
            .insert({
              manuscript_id: manuscriptId,
              users: users || [],
              activity_type: 'editing_activity',
              timestamp: new Date().toISOString()
            });
          break;

        case 2: // Document ready for saving
        case 6: // Document force-saved
          if (url) {
            // Download document from OnlyOffice
            console.log('Downloading document from OnlyOffice:', url);
            const response = await fetch(url);
            if (!response.ok) {
              console.error('Failed to download from OnlyOffice:', response.status, response.statusText);
              throw new Error(`Failed to download document: ${response.status}`);
            }
            
            const documentBuffer = await response.arrayBuffer();
            console.log('Downloaded document size:', documentBuffer.byteLength, 'bytes');

            // Use consistent filename pattern matching config route
            const fileName = `manuscript-${manuscriptId}.docx`;

            // Upload to Supabase Storage
            console.log('Uploading to storage:', fileName, 'Full filename length:', fileName.length);
            const { data, error } = await supabase.storage
              .from('manuscripts')
              .upload(fileName, documentBuffer, {
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                upsert: true
              });

            if (error) {
              console.error('Storage upload error:', error);
              throw error;
            }
            
            console.log('Storage upload successful:', data?.path);
            console.log('Storage upload full response:', JSON.stringify(data, null, 2));

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('manuscripts')
              .getPublicUrl(fileName);

            // Update manuscript record
            await supabase
              .from('manuscripts')
              .update({
                file_url: publicUrl,
                updated_at: new Date().toISOString(),
                last_edited_by: users?.[0] || null,
                editing_status: status === 6 ? 'force_saved' : 'saved'
              })
              .eq('id', manuscriptId);

            console.log(`Manuscript ${manuscriptId} saved successfully`);
          }
          break;

        case 3: // Document saving error
        case 7: // Force saving error
          console.error(`Save error for manuscript ${manuscriptId}, status: ${status}`);
          await supabase
            .from('manuscript_activity')
            .insert({
              manuscript_id: manuscriptId,
              users: users || [],
              activity_type: 'save_error',
              timestamp: new Date().toISOString()
            });
          break;

        case 4: // Document closed without changes
          await supabase
            .from('manuscript_activity')
            .insert({
              manuscript_id: manuscriptId,
              users: users || [],
              activity_type: 'editor_closed',
              timestamp: new Date().toISOString()
            });
          break;

        default:
          console.log(`Unhandled callback status: ${status}`);
      }

    } catch (error) {
      console.error('Callback processing error:', error);
      // Still return success to avoid editor errors
    }

    // Always return success response
    return NextResponse.json({ error: 0 });

  } catch (error) {
    console.error('Callback handler error:', error);
    // Always return success to prevent OnlyOffice editor errors
    return NextResponse.json({ error: 0 });
  }
}