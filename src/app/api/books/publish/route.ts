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
    
    // 3. Save book to database
    const { data: book, error } = await supabase
      .from('books')
      .insert(bookToSave)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    console.log('✅ Book saved to database:', book.id);

    // 4. Trigger N8N marketing automation (non-blocking)
    try {
      const n8nResult = await N8NService.triggerBookPublishedWorkflow(book as Book);
      
      if (n8nResult.success) {
        console.log('🚀 N8N marketing automation triggered successfully');
      } else {
        console.warn('⚠️ N8N automation failed but book published:', n8nResult.error);
      }
    } catch (n8nError) {
      console.warn('⚠️ N8N automation error (non-blocking):', n8nError);
    }

    // 5. Update manuscript status if manuscript_id provided
    if (bookData.manuscript_id) {
      try {
        await supabase
          .from('manuscripts')
          .update({ 
            status: 'published',
            published_at: new Date().toISOString() 
          })
          .eq('id', bookData.manuscript_id);
        
        console.log('📝 Updated manuscript status to published');
      } catch (manuscriptError) {
        console.warn('⚠️ Failed to update manuscript status:', manuscriptError);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      book,
      message: 'Book published successfully and marketing automation triggered'
    });
    
  } catch (error) {
    console.error('❌ Book publishing error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Publishing failed' 
      },
      { status: 500 }
    );
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