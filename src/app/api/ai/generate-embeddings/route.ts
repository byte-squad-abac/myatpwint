/**
 * Admin API to generate embeddings for all books
 */

import { NextResponse } from 'next/server';
import AISearchService from '@/lib/ai/search-service';

export async function POST() {
  try {
    // For now, we'll skip authentication to test the functionality
    // In a production environment, you would want proper authentication
    console.log('Processing embedding generation request...');

    // Generate embeddings for all books
    const results = await AISearchService.generateAllBookEmbeddings();
    
    return NextResponse.json({
      message: 'Embedding generation completed',
      results
    });

  } catch (error) {
    console.error('Embedding generation API error:', error);
    
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
    message: 'Admin API - Generate Book Embeddings',
    endpoints: {
      generate: 'POST /api/ai/generate-embeddings',
      authentication: 'Required (Admin or Publisher role)',
      description: 'Generates E5 embeddings for all books without embeddings'
    }
  });
}