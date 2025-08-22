import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { N8NService } from '@/lib/services/n8n.service';
import { Book } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { bookId } = await request.json();
    
    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Retrying marketing automation for book:', bookId);

    // 1. Fetch book data
    const { data: book, error: fetchError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (fetchError || !book) {
      console.error('❌ Book not found:', fetchError);
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // 2. Check if book was published (prevent retry on unpublished books)
    if (!book.published_date) {
      return NextResponse.json(
        { error: 'Cannot retry marketing for unpublished books' },
        { status: 400 }
      );
    }

    // 3. Attempt to trigger N8N marketing automation
    let marketingStatus = 'failed';
    let marketingError = null;

    try {
      const n8nResult = await N8NService.triggerBookPublishedWorkflow(book as Book);
      
      if (n8nResult.success) {
        console.log('✅ Marketing automation retry successful');
        marketingStatus = 'triggered';
        
        // Create notification entry for retry success
        await supabase.rpc('create_notification', {
          target_user_id: book.user_id || book.author_id, // Notify book owner
          notification_type: 'book_published',
          notification_title: 'Marketing Campaign Retried Successfully! 🚀',
          notification_message: `Marketing automation for "${book.name}" has been successfully triggered.`,
          notification_data: {
            book_id: book.id,
            book_name: book.name,
            retry: true
          },
          expires_in_days: 7
        });

      } else {
        console.error('❌ Marketing automation retry failed:', n8nResult.error);
        marketingStatus = 'failed';
        marketingError = n8nResult.error || 'Unknown N8N error';
      }
    } catch (n8nError) {
      console.error('❌ Marketing automation retry exception:', n8nError);
      marketingStatus = 'failed';
      marketingError = n8nError instanceof Error ? n8nError.message : 'N8N service unavailable';
    }

    // 4. Update or create marketing analytics record
    try {
      const analyticsData = {
        book_id: book.id,
        campaign_type: 'retry_marketing',
        status: marketingStatus,
        error_message: marketingError,
        triggered_at: new Date().toISOString(),
        completed_at: marketingStatus === 'triggered' ? new Date().toISOString() : null
      };

      const { error: analyticsError } = await supabase
        .from('n8n_marketing_analytics')
        .insert(analyticsData);

      if (analyticsError) {
        console.warn('Failed to log marketing retry analytics:', analyticsError);
      }
    } catch (analyticsInsertError) {
      console.warn('Error inserting marketing analytics:', analyticsInsertError);
    }

    // 5. Prepare response
    const response: any = {
      success: marketingStatus === 'triggered',
      marketing: {
        status: marketingStatus,
        error: marketingError
      },
      book: {
        id: book.id,
        name: book.name
      }
    };

    if (marketingStatus === 'triggered') {
      response.message = '🚀 Marketing automation retried successfully!';
    } else {
      response.message = `❌ Marketing retry failed: ${marketingError}`;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Marketing retry error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Marketing retry failed' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check marketing status for a book
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    
    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Fetch marketing analytics for the book
    const { data: analytics, error } = await supabase
      .from('n8n_marketing_analytics')
      .select('*')
      .eq('book_id', bookId)
      .order('triggered_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching marketing analytics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch marketing status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analytics: analytics || [],
      canRetry: analytics && analytics.length > 0 && 
                analytics[0].status === 'failed'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check marketing status' },
      { status: 500 }
    );
  }
}