/**
 * Book Recommendations API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import AISearchService from '@/lib/ai/search-service';
import { RecommendationResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, limit = 5, threshold = 0.8 } = body;

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Find similar books
    const recommendations = await AISearchService.findSimilarBooks(bookId, {
      limit: Math.min(limit, 20), // Cap at 20 recommendations
      threshold
    });

    const response: RecommendationResult = {
      bookId,
      recommendations,
      recommendationCount: recommendations.length,
      method: 'content-similarity',
      model: 'multilingual-e5-base'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Recommendations API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Recommendations failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'AI Book Recommendations API',
    endpoints: {
      similar: 'POST /api/ai/similar',
      body: {
        bookId: 'string (required)',
        limit: 'number (optional, default: 5)',
        threshold: 'number (optional, default: 0.8)'
      }
    }
  });
}