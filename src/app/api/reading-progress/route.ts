import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { handleApiError, validateUuid, validateRequestBody, successResponse, API_ERRORS } from '@/lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const bookId = searchParams.get('bookId')

    if (!userId) {
      throw API_ERRORS.VALIDATION_ERROR('User ID is required')
    }

    validateUuid(userId, 'userId')

    let query = supabase
      .from('reading_progress')
      .select(`
        *,
        books:book_id (
          id,
          name,
          author,
          image_url
        )
      `)
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false });

    // If bookId is provided, get specific book progress
    if (bookId) {
      validateUuid(bookId, 'bookId')
      query = query.eq('book_id', bookId)
    }

    const { data, error } = await query

    if (error) {
      throw API_ERRORS.INTERNAL_ERROR('Failed to fetch reading progress', error)
    }

    return successResponse({ progress: data || [] })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    validateRequestBody(body, ['userId', 'bookId', 'action'])
    const { userId, bookId, action, readingTimeSeconds } = body

    validateUuid(userId, 'userId')
    validateUuid(bookId, 'bookId')
    
    if (!['start_session', 'update_progress', 'end_session'].includes(action)) {
      throw API_ERRORS.VALIDATION_ERROR('Invalid action. Must be start_session, update_progress, or end_session')
    }

    const now = new Date().toISOString();

    if (action === 'start_session') {
      // Start a new reading session
      const { data, error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: userId,
          book_id: bookId,
          session_start: now,
          is_active_session: true,
          last_read_at: now,
        }, {
          onConflict: 'user_id,book_id'
        })
        .select()
        .single()

      if (error) {
        throw API_ERRORS.INTERNAL_ERROR('Failed to start reading session', error)
      }

      return successResponse(data, 'Reading session started')

    } else if (action === 'update_progress') {
      // Update reading progress during session
      const updateData: Record<string, unknown> = {
        last_read_at: now,
      };

      if (readingTimeSeconds !== undefined) {
        // Add to existing reading time
        const { data: currentProgress } = await supabase
          .from('reading_progress')
          .select('reading_time_seconds')
          .eq('user_id', userId)
          .eq('book_id', bookId)
          .single();
        
        const currentTime = currentProgress?.reading_time_seconds || 0;
        updateData.reading_time_seconds = currentTime + readingTimeSeconds;
      }

      const { data, error } = await supabase
        .from('reading_progress')
        .update(updateData)
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .select()
        .single();

      if (error) {
        throw API_ERRORS.INTERNAL_ERROR('Failed to update reading progress', error)
      }

      return successResponse(data, 'Reading progress updated')

    } else if (action === 'end_session') {
      // End the reading session
      const updateData: Record<string, unknown> = {
        session_end: now,
        is_active_session: false,
        last_read_at: now,
      };

      if (readingTimeSeconds !== undefined) {
        // Add final reading time
        const { data: currentProgress } = await supabase
          .from('reading_progress')
          .select('reading_time_seconds')
          .eq('user_id', userId)
          .eq('book_id', bookId)
          .single();
        
        const currentTime = currentProgress?.reading_time_seconds || 0;
        updateData.reading_time_seconds = currentTime + readingTimeSeconds;
      }

      const { data, error } = await supabase
        .from('reading_progress')
        .update(updateData)
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .select()
        .single();

      if (error) {
        throw API_ERRORS.INTERNAL_ERROR('Failed to end reading session', error)
      }

      return successResponse(data, 'Reading session ended')

    } else {
      throw API_ERRORS.VALIDATION_ERROR('Invalid action')
    }
  } catch (error) {
    return handleApiError(error)
  }
}