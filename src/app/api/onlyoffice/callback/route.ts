import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MANUSCRIPT_KEY_PREFIX, VERSION_SEPARATOR } from '../../../../lib/onlyoffice-jwt';

// OnlyOffice callback status codes
const CALLBACK_STATUS = {
  EDITING: 1,        // User connected/disconnected
  SAVE_READY: 2,     // Document ready for saving
  SAVE_ERROR: 3,     // Document saving error
  CLOSED: 4,         // Document closed without changes
  FORCE_SAVE: 6,     // Document force-saved
  FORCE_SAVE_ERROR: 7 // Force saving error
} as const;

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
    if (key.includes(VERSION_SEPARATOR)) {
      // Version-aware key: manuscript-{uuid}-v{timestamp}
      const versionIndex = key.lastIndexOf(VERSION_SEPARATOR);
      manuscriptId = key.substring(MANUSCRIPT_KEY_PREFIX.length, versionIndex);
    } else {
      // Simple key: manuscript-{uuid}
      manuscriptId = key.substring(MANUSCRIPT_KEY_PREFIX.length);
    }

    if (!manuscriptId) {
      console.error('Invalid document key format:', key);
      return NextResponse.json({ error: 0 }); // Still return success to avoid editor errors
    }


    try {
      // Handle different status codes
      switch (status) {
        case CALLBACK_STATUS.EDITING: // Document editing (user connected/disconnected)
          await supabase
            .from('manuscript_activity')
            .insert({
              manuscript_id: manuscriptId,
              users: users || [],
              activity_type: 'editing_activity',
              timestamp: new Date().toISOString()
            });
          break;

        case CALLBACK_STATUS.SAVE_READY: // Document ready for saving
        case CALLBACK_STATUS.FORCE_SAVE: // Document force-saved
          if (url) {
            // Download document from OnlyOffice
            const response = await fetch(url);
            if (!response.ok) {
              console.error('Failed to download from OnlyOffice:', response.status, response.statusText);
              throw new Error(`Failed to download document: ${response.status}`);
            }
            
            const documentBuffer = await response.arrayBuffer();

            // Use consistent filename pattern matching config route
            const fileName = `manuscript-${manuscriptId}.docx`;

            // Upload to Supabase Storage
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
                editing_status: status === CALLBACK_STATUS.FORCE_SAVE ? 'force_saved' : 'saved'
              })
              .eq('id', manuscriptId);

          }
          break;

        case CALLBACK_STATUS.SAVE_ERROR: // Document saving error
        case CALLBACK_STATUS.FORCE_SAVE_ERROR: // Force saving error
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

        case CALLBACK_STATUS.CLOSED: // Document closed without changes
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
          // Unhandled callback status
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