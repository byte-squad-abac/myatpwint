/**
 * API to generate embedding for a single book (used when publishing)
 */

import { NextRequest, NextResponse } from 'next/server';
import AISearchService from '@/lib/ai/search-service';

export async function POST(request: NextRequest) {
  try {
    const { bookId } = await request.json();

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    console.log(`Generating embedding for book: ${bookId}`);

    // Generate embedding for the specific book
    await AISearchService.generateBookEmbedding(bookId);

    return NextResponse.json({
      message: 'Embedding generated successfully',
      bookId
    });

  } catch (error) {
    console.error('Single embedding generation API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Embedding generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for information
export async function GET() {
  return NextResponse.json({
    message: 'Generate Single Book Embedding API',
    endpoints: {
      generate: 'POST /api/ai/generate-single-embedding',
      body: {
        bookId: 'string (required)'
      },
      description: 'Generates E5 embedding for a specific book'
    }
  });
}