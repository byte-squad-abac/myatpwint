/**
 * Semantic Search API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import AISearchService from '@/lib/ai/search-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, category, limit = 10, threshold = 0.7 } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Perform semantic search
    const results = await AISearchService.semanticSearch(query, {
      limit: Math.min(limit, 50), // Cap at 50 results
      threshold,
      category
    });

    return NextResponse.json({
      query,
      results,
      resultCount: results.length,
      searchMethod: 'semantic',
      model: 'multilingual-e5-base'
    });

  } catch (error) {
    console.error('Search API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'AI Semantic Search API',
    endpoints: {
      search: 'POST /api/ai/search',
      body: {
        query: 'string (required)',
        category: 'string (optional)',
        limit: 'number (optional, default: 10)',
        threshold: 'number (optional, default: 0.7)'
      }
    }
  });
}