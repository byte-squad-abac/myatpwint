/**
 * Semantic Search API for Books
 * GET /api/recommendations/search?query={text}&limit={number}&category={category}
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'query parameter is required' },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Query too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Use traditional database search as primary method
    return await getFallbackSearchResults(query, limit, category || undefined);

  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      { error: 'Failed to perform search', details: String(error) },
      { status: 500 }
    );
  }
}

async function getFallbackSearchResults(query: string, limit: number, category?: string) {
  try {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    if (searchTerms.length === 0) {
      return NextResponse.json({
        success: true,
        query: query,
        recommendations: [],
        algorithm: 'traditional_search',
        model_version: 'database',
        total: 0,
        cached: false
      });
    }

    
    let baseQuery = supabase
      .from('books')
      .select('*');
    
    // Apply category filter if provided
    if (category) {
      baseQuery = baseQuery.eq('category', category);
    }

    // Search in name, author, and description using PostgreSQL text search
    const searchQueries = [
      // Exact matches in name and author (highest priority)
      baseQuery.or(`name.ilike.%${query}%,author.ilike.%${query}%`),
      
      // Term matches in name, author, description
      ...searchTerms.map(term => 
        baseQuery.or(`name.ilike.%${term}%,author.ilike.%${term}%,description.ilike.%${term}%`)
      )
    ];

    // Execute all search queries
    const searchResults = await Promise.all(
      searchQueries.map(async (q, index) => {
        try {
          const { data } = await q.limit(limit);
          return (data || []).map((book: any) => ({
            ...book,
            search_priority: index === 0 ? 1.0 : 0.8 - (index * 0.1),
            match_type: index === 0 ? 'exact' : 'partial'
          }));
        } catch (err) {
          console.warn(`Search query ${index} failed:`, err);
          return [];
        }
      })
    );

    // Combine and deduplicate results
    const combinedResults: any[] = [];
    const seenIds = new Set();

    searchResults.flat().forEach(book => {
      if (!seenIds.has(book.id)) {
        seenIds.add(book.id);
        combinedResults.push(book);
      }
    });

    // Score and rank results
    const rankedResults = combinedResults
      .map(book => {
        let score = book.search_priority;
        
        // Boost score based on query match quality
        const nameMatch = book.name.toLowerCase().includes(query.toLowerCase());
        const authorMatch = book.author?.toLowerCase().includes(query.toLowerCase());
        const exactMatch = nameMatch || authorMatch;
        
        if (exactMatch) {
          score += 0.3;
        }

        // Boost for newer books
        const daysSinceCreated = Math.floor(
          (new Date().getTime() - new Date(book.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const recencyBoost = Math.max(0, 0.1 - (daysSinceCreated / 1000));
        score += recencyBoost;

        return {
          ...book,
          similarity_score: Math.min(score, 1.0),
          recommendation_reason: generateSearchReason(query, book, score),
          algorithm: 'traditional_search',
          search_query: query
        };
      })
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit);

    // Track search request
    await trackSearchRequest(query, rankedResults.length, 'traditional_search');

    return NextResponse.json({
      success: true,
      query: query,
      recommendations: rankedResults,
      algorithm: 'traditional_search',
      model_version: 'database',
      total: rankedResults.length,
      cached: false
    });

  } catch (error) {
    console.error('Fallback search failed:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

function generateSearchReason(query: string, book: any, score: number): string {
  const reasons = [];
  
  const queryLower = query.toLowerCase();
  const nameLower = (book.name || '').toLowerCase();
  const authorLower = (book.author || '').toLowerCase();
  const descriptionLower = (book.description || '').toLowerCase();
  
  if (nameLower.includes(queryLower)) {
    reasons.push('title matches your search');
  } else if (nameLower.split(' ').some((word: string) => queryLower.includes(word) && word.length > 2)) {
    reasons.push('title contains related terms');
  }
  
  if (authorLower.includes(queryLower)) {
    reasons.push('author matches your search');
  } else if (authorLower.split(' ').some((word: string) => queryLower.includes(word) && word.length > 2)) {
    reasons.push('author name is similar');
  }
  
  if (descriptionLower.includes(queryLower)) {
    reasons.push('description matches your query');
  }
  
  if (reasons.length === 0) {
    if (score > 0.7) {
      reasons.push('highly relevant content');
    } else if (score > 0.5) {
      reasons.push('relevant content');
    } else {
      reasons.push('related topics');
    }
  }
  
  return `Found because ${reasons.slice(0, 2).join(' and ')}`;
}

async function trackSearchRequest(query: string, resultCount: number, algorithm: string) {
  try {
    await supabase.from('recommendation_interactions').insert({
      interaction_type: 'search',
      recommendation_type: 'search',
      algorithm_version: 'v1.0',
      metadata: { 
        search_query: query,
        result_count: resultCount,
        algorithm: algorithm
      }
    });
  } catch (error) {
    console.warn('Failed to track search request:', error);
  }
}