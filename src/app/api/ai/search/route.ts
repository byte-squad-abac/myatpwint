/**
 * Semantic Search API Route
 */

import { NextRequest, NextResponse } from 'next/server'
import AISearchService from '@/lib/ai/search-service'
import { handleApiError, validateRequestBody, successResponse } from '@/lib/utils/api-errors'
import type { SemanticSearchResult } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    validateRequestBody(body, ['query'])
    const { query, category, limit = 10, threshold = 0.7 } = body

    if (query.trim().length === 0) {
      throw new Error('Search query cannot be empty')
    }

    // Perform semantic search
    const results = await AISearchService.semanticSearch(query, {
      limit: Math.min(limit, 50), // Cap at 50 results
      threshold,
      category
    })

    const response: SemanticSearchResult = {
      query,
      results,
      resultCount: results.length,
      searchMethod: 'semantic',
      model: 'multilingual-e5-base'
    }

    return successResponse(response)
  } catch (error) {
    return handleApiError(error)
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