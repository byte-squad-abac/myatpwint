/**
 * Sync Books to Stripe Products API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncBookToStripe } from '@/lib/stripe/products';
import { createClient } from '@supabase/supabase-js';
import type { Book } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, syncAll = false } = body;

    if (syncAll) {
      // Sync all books to Stripe
      const { data: books, error } = await supabase
        .from('books')
        .select('*');

      if (error) {
        throw error;
      }

      if (!books || books.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No books found to sync',
          synced: 0,
        });
      }

      const results = [];
      const batchSize = 5;

      // Process in batches to avoid rate limiting
      for (let i = 0; i < books.length; i += batchSize) {
        const batch = books.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(async (book) => {
            try {
              const stripeProduct = await syncBookToStripe(book as Book);
              return {
                bookId: book.id,
                bookName: book.name,
                success: true,
                stripeProductId: stripeProduct.stripe_product_id,
              };
            } catch (error) {
              return {
                bookId: book.id,
                bookName: book.name,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          })
        );

        results.push(...batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : {
            success: false,
            error: result.reason?.message || 'Promise rejected',
          }
        ));

        // Small delay between batches
        if (i + batchSize < books.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return NextResponse.json({
        success: true,
        message: `Sync completed: ${successCount} succeeded, ${failureCount} failed`,
        synced: successCount,
        failed: failureCount,
        results,
      });
    } else if (bookId) {
      // Sync single book
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (bookError || !book) {
        return NextResponse.json(
          { error: 'Book not found' },
          { status: 404 }
        );
      }

      const stripeProduct = await syncBookToStripe(book as Book);

      return NextResponse.json({
        success: true,
        message: 'Book synced successfully',
        book: {
          id: book.id,
          name: book.name,
          stripeProductId: stripeProduct.stripe_product_id,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Either bookId or syncAll=true must be provided' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error syncing books to Stripe:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to sync books to Stripe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Stripe Product Sync API',
    endpoints: {
      syncAll: 'POST /api/stripe/sync-products with { "syncAll": true }',
      syncSingle: 'POST /api/stripe/sync-products with { "bookId": "uuid" }',
    },
    status: 'active',
  });
}