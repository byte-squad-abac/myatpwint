import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { N8NService } from '@/lib/services/n8n.service';
import AISearchService from '@/lib/ai/search-service';
import { Book } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  let createdBook: any = null;
  let marketingTriggered = false;
  let manuscriptUpdated = false;
  let manuscriptId: string | null = null;

  try {
    const bookData = await request.json();
    
    console.log('📚 Publishing new book:', bookData.name);
    
    // 1. Validate required fields
    const requiredFields = ['name', 'author', 'description', 'category', 'price', 'edition'];
    for (const field of requiredFields) {
      if (!bookData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // 2. Prepare book data with published status
    const bookToSave = {
      ...bookData,
      published_date: bookData.published_date || new Date().toISOString(),
      tags: bookData.tags || [],
      // Ensure image_url has a default
      image_url: bookData.image_url || '/images/default-book-cover.jpg'
    };
    
    // 3. Save book to database (transaction point 1)
    const { data: book, error } = await supabase
      .from('books')
      .insert(bookToSave)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    createdBook = book;
    manuscriptId = bookData.manuscript_id || null;
    console.log('✅ Book saved to database:', book.id);

    // 4. Generate embeddings for semantic search
    let embeddingStatus = 'failed';
    let embeddingError = null;
    
    try {
      console.log('🔍 Generating embeddings for semantic search...');
      await AISearchService.generateBookEmbedding(book.id);
      embeddingStatus = 'generated';
      console.log('✅ Embeddings generated successfully');
    } catch (embeddingErr) {
      console.error('❌ Embedding generation failed:', embeddingErr);
      embeddingStatus = 'failed';
      embeddingError = embeddingErr instanceof Error ? embeddingErr.message : 'Embedding generation failed';
      // Don't fail the entire publishing process for embedding errors
    }

    // 5. Trigger N8N marketing automation with detailed error handling
    let marketingStatus = 'failed';
    let marketingError = null;
    
    try {
      console.log('🚀 Triggering N8N marketing automation...');
      const n8nResult = await N8NService.triggerBookPublishedWorkflow(book as Book);
      
      if (n8nResult.success) {
        console.log('✅ N8N marketing automation triggered successfully');
        marketingStatus = 'triggered';
        marketingTriggered = true;
      } else {
        console.error('❌ N8N automation failed:', n8nResult.error);
        marketingStatus = 'failed';
        marketingError = n8nResult.error || 'Unknown N8N error';
      }
    } catch (n8nError) {
      console.error('❌ N8N automation exception:', n8nError);
      marketingStatus = 'failed';
      marketingError = n8nError instanceof Error ? n8nError.message : 'N8N service unavailable';
    }

    // 6. Update manuscript status if manuscript_id provided (transaction point 2)
    if (bookData.manuscript_id) {
      try {
        const { error: mErr } = await supabase
          .from('manuscripts')
          .update({ 
            status: 'published',
            published_at: new Date().toISOString() 
          })
          .eq('id', bookData.manuscript_id);
        
        if (mErr) {
          console.error('❌ Manuscript update failed:', mErr); 
          throw new Error(`Failed to update manuscript status: ${mErr.message}`);
        }
        
        manuscriptUpdated = true;
        console.log('✅ Manuscript status updated to published');
      } catch (manuscriptError) {
        console.error('❌ Critical manuscript update error:', manuscriptError);
        throw manuscriptError; // This will trigger rollback
      }
    }

    // 7. Log marketing analytics (non-critical)
    try {
      const analyticsData = {
        book_id: book.id,
        campaign_type: 'automated_marketing',
        status: marketingStatus,
        error_message: marketingError,
        platforms_posted: marketingStatus === 'triggered' ? ['facebook', 'twitter', 'email', 'telegram'] : [],
        triggered_at: new Date().toISOString(),
        completed_at: marketingStatus === 'triggered' ? new Date().toISOString() : null
      };

      const { error: analyticsError } = await supabase
        .from('n8n_marketing_analytics')
        .insert(analyticsData);

      if (analyticsError) {
        console.warn('⚠️ Failed to log marketing analytics:', analyticsError);
      } else {
        console.log('✅ Marketing analytics logged');
      }
    } catch (analyticsInsertError) {
      console.warn('⚠️ Analytics insert error:', analyticsInsertError);
    }
    
    // 8. Prepare response with detailed status
    const response: any = {
      success: true,
      book,
      marketing: {
        status: marketingStatus,
        error: marketingError
      },
      embedding: {
        status: embeddingStatus,
        error: embeddingError
      }
    };

    // Customize message based on marketing status
    if (marketingStatus === 'triggered') {
      response.message = '🎉 Book published successfully! Marketing automation is running.';
    } else if (marketingStatus === 'failed') {
      response.message = '📚 Book published successfully, but marketing automation failed. You can retry marketing later.';
      response.warning = `Marketing automation error: ${marketingError}`;
    }

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Book publishing error:', error);
    
    // Rollback operations if needed
    await performRollback(createdBook, manuscriptUpdated, marketingTriggered, manuscriptId || undefined);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Publishing failed',
        rollback_performed: createdBook !== null
      },
      { status: 500 }
    );
  }
}

/**
 * Perform rollback operations for failed publishing
 */
async function performRollback(
  createdBook: any, 
  manuscriptUpdated: boolean, 
  marketingTriggered: boolean, 
  manuscriptId?: string
) {
  const rollbackOperations = [];

  try {
    // 1. Rollback book creation
    if (createdBook) {
      console.log('🔄 Rolling back book creation...');
      const { error: bookDeleteError } = await supabase
        .from('books')
        .delete()
        .eq('id', createdBook.id);
      
      if (bookDeleteError) {
        console.error('❌ Failed to rollback book creation:', bookDeleteError);
        rollbackOperations.push(`Failed to delete book: ${bookDeleteError.message}`);
      } else {
        console.log('✅ Book creation rolled back');
      }
    }

    // 2. Rollback manuscript status update
    if (manuscriptUpdated && manuscriptId) {
      console.log('🔄 Rolling back manuscript status...');
      const { error: manuscriptRollbackError } = await supabase
        .from('manuscripts')
        .update({ 
          status: 'queued_for_publication',
          published_at: null 
        })
        .eq('id', manuscriptId);
      
      if (manuscriptRollbackError) {
        console.error('❌ Failed to rollback manuscript status:', manuscriptRollbackError);
        rollbackOperations.push(`Failed to revert manuscript status: ${manuscriptRollbackError.message}`);
      } else {
        console.log('✅ Manuscript status rolled back');
      }
    }

    // 3. Log compensating action for marketing automation
    if (marketingTriggered && createdBook) {
      console.log('⚠️ Marketing was triggered but transaction failed - logging compensating action');
      
      try {
        // Log a compensating marketing analytics entry
        await supabase
          .from('n8n_marketing_analytics')
          .insert({
            book_id: createdBook.id,
            campaign_type: 'rollback_compensation',
            status: 'failed',
            error_message: 'Book publication failed after marketing trigger - transaction rolled back',
            triggered_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          });
        
        console.log('✅ Compensating marketing analytics logged');
      } catch (compensationError) {
        console.error('❌ Failed to log compensation:', compensationError);
        rollbackOperations.push('Failed to log marketing compensation');
      }
    }

    if (rollbackOperations.length > 0) {
      console.error('⚠️ Some rollback operations failed:', rollbackOperations);
    } else {
      console.log('✅ All rollback operations completed successfully');
    }
    
  } catch (rollbackError) {
    console.error('❌ Critical rollback error:', rollbackError);
  }
}

// GET endpoint to test N8N connection
export async function GET() {
  try {
    const testResult = await N8NService.testConnection();
    
    return NextResponse.json({
      n8n_status: testResult.success ? 'connected' : 'failed',
      webhook_url: N8NService.getWebhookUrl(),
      message: testResult.message || testResult.error,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      n8n_status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}