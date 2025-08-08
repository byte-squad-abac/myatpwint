/**
 * Trending Books Recommendation API
 * GET /api/recommendations/trending?limit={number}&timeWindow={days}&category={category}
 */

import { NextRequest, NextResponse } from 'next/server';
import { PineconeService } from '@/lib/services/pinecone.service';
import { createClient } from '@supabase/supabase-js';

// Initialize services
const pineconeService = new PineconeService();
let pineconeInitialized = false;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function initializePinecone() {
  if (!pineconeInitialized) {
    try {
      await pineconeService.initialize();
      pineconeInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error);
      throw error;
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    await initializePinecone();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const timeWindowDays = parseInt(searchParams.get('timeWindow') || '30');
    const category = searchParams.get('category');
    const minScore = parseFloat(searchParams.get('minScore') || '0.1');
    
    // Try to get trending recommendations from Python service first
    try {
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${pythonServiceUrl}/recommendations/trending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: limit,
          time_window_days: timeWindowDays,
          category_filter: category,
          min_score: minScore,
        }),
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (response.ok) {
        const pythonResult = await response.json();
        
        // Convert Python service response to our format
        const recommendations = await Promise.all(
          pythonResult.recommendations.map(async (rec: any) => {
            // Get full book data from database
            const { data: bookData } = await supabase
              .from('books')
              .select('*')
              .eq('id', rec.id)
              .single();

            return {
              ...bookData,
              similarity_score: rec.similarity_score,
              recommendation_reason: rec.recommendation_reason,
              algorithm: pythonResult.algorithm,
              trend_score: rec.trend_score,
              engagement_metrics: rec.engagement_metrics
            };
          })
        );

        // Track trending request
        await trackTrendingRequest('trending', recommendations.length, timeWindowDays);

        return NextResponse.json({
          success: true,
          recommendations: recommendations,
          algorithm: pythonResult.algorithm,
          model_version: pythonResult.model_version,
          time_window_days: timeWindowDays,
          total: recommendations.length,
          cached: pythonResult.cached || false
        });
      }
    } catch (pythonError) {
      console.warn('Python service unavailable, falling back to Pinecone:', pythonError);
    }

    // Fallback to Pinecone trending recommendations
    try {
      const trendingResults = await pineconeService.getTrendingBooks(limit);
      
      // Get full book data for results
      const recommendations = await Promise.all(
        trendingResults.map(async (result) => {
          const { data: bookData } = await supabase
            .from('books')
            .select('*')
            .eq('id', result.bookId)
            .single();

          return {
            ...bookData,
            similarity_score: result.score,
            recommendation_reason: result.metadata?.recommendationReason || 'Trending now',
            algorithm: 'engagement_based',
            trend_score: result.score
          };
        })
      );

      // Filter out null results and apply category filter if needed
      const filteredRecommendations = recommendations
        .filter(Boolean)
        .filter((rec: any) => !category || rec.category === category);

      // Track trending request
      await trackTrendingRequest('trending', filteredRecommendations.length, timeWindowDays);

      return NextResponse.json({
        success: true,
        recommendations: filteredRecommendations,
        algorithm: 'engagement_based',
        model_version: 'pinecone',
        time_window_days: timeWindowDays,
        total: filteredRecommendations.length,
        cached: false
      });

    } catch (pineconeError) {
      console.error('Pinecone trending query failed:', pineconeError);
      
      // Final fallback to database-based trending
      return await getFallbackTrendingBooks(limit, timeWindowDays, category);
    }

  } catch (error) {
    console.error('Error in trending recommendations API:', error);
    return NextResponse.json(
      { error: 'Failed to get trending recommendations', details: String(error) },
      { status: 500 }
    );
  }
}

async function getFallbackTrendingBooks(
  limit: number, 
  timeWindowDays: number, 
  category?: string
) {
  try {
    const timeWindowStart = new Date();
    timeWindowStart.setDate(timeWindowStart.getDate() - timeWindowDays);

    // Calculate trending score based on recent orders and cart additions
    const trendingQuery = `
      WITH recent_activity AS (
        SELECT 
          book_id,
          COUNT(*) as activity_count,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_count
        FROM (
          SELECT book_id, created_at FROM orders WHERE status = 'completed'
          UNION ALL
          SELECT book_id, created_at FROM carts
        ) activity
        GROUP BY book_id
        HAVING COUNT(*) > 0
      ),
      trending_books AS (
        SELECT 
          b.*,
          COALESCE(ra.activity_count, 0) as total_activity,
          COALESCE(ra.recent_count, 0) as recent_activity,
          CASE 
            WHEN ra.recent_count > 0 THEN 
              (ra.recent_count::float / GREATEST(ra.activity_count, 1)) + 
              (ra.recent_count::float / ${timeWindowDays})
            ELSE 0
          END as trend_score
        FROM books b
        LEFT JOIN recent_activity ra ON b.id = ra.book_id
        WHERE ($2::text IS NULL OR b.category = $2)
      )
      SELECT * FROM trending_books 
      WHERE trend_score > 0
      ORDER BY trend_score DESC, recent_activity DESC, total_activity DESC
      LIMIT $3
    `;

    const { data: trendingBooks, error } = await supabase.rpc('exec_sql', {
      query: trendingQuery,
      params: [timeWindowStart.toISOString(), category, limit]
    });

    if (error) {
      console.warn('Trending SQL query failed, using simpler approach:', error);
      return await getSimpleTrendingBooks(limit, category);
    }

    const recommendations = (trendingBooks || []).map((book: any) => ({
      ...book,
      similarity_score: Math.min(book.trend_score, 1.0),
      recommendation_reason: `Trending book with ${book.recent_activity} recent interactions`,
      algorithm: 'activity_based',
      trend_score: book.trend_score,
      engagement_metrics: {
        total_activity: book.total_activity,
        recent_activity: book.recent_activity
      }
    }));

    await trackTrendingRequest('trending', recommendations.length, timeWindowDays);

    return NextResponse.json({
      success: true,
      recommendations: recommendations,
      algorithm: 'activity_based',
      model_version: 'database',
      time_window_days: timeWindowDays,
      total: recommendations.length,
      cached: false
    });

  } catch (error) {
    console.error('Database trending query failed:', error);
    return await getSimpleTrendingBooks(limit, category);
  }
}

async function getSimpleTrendingBooks(limit: number, category?: string) {
  try {
    // Simple approach: Recently added books with good ratings/popularity
    let query = supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: recentBooks } = await query.limit(limit * 2);

    if (!recentBooks || recentBooks.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        algorithm: 'simple_recent',
        model_version: 'fallback',
        total: 0,
        cached: false
      });
    }

    // Score books based on recency and price (lower price might indicate higher demand)
    const scoredBooks = recentBooks
      .map((book: any) => {
        const daysSinceAdded = Math.floor(
          (new Date().getTime() - new Date(book.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // More recent = higher score, max score at day 0, decreases over time
        const recencyScore = Math.max(0, 1 - (daysSinceAdded / 30));
        
        // Price factor - normalized score (assume typical range 0-100 USD equivalent)
        const priceScore = book.price ? Math.max(0, 1 - (book.price / 100000)) : 0.5; // MMK to USD rough conversion
        
        const trendScore = (recencyScore * 0.7) + (priceScore * 0.3);

        return {
          ...book,
          similarity_score: trendScore,
          recommendation_reason: `Recently added ${daysSinceAdded === 0 ? 'today' : `${daysSinceAdded} days ago`}`,
          algorithm: 'simple_recent',
          trend_score: trendScore
        };
      })
      .sort((a, b) => b.trend_score - a.trend_score)
      .slice(0, limit);

    await trackTrendingRequest('trending', scoredBooks.length, 30);

    return NextResponse.json({
      success: true,
      recommendations: scoredBooks,
      algorithm: 'simple_recent',
      model_version: 'fallback',
      time_window_days: 30,
      total: scoredBooks.length,
      cached: false
    });

  } catch (error) {
    console.error('Simple trending books fallback failed:', error);
    return NextResponse.json(
      { error: 'All trending recommendation methods failed' },
      { status: 500 }
    );
  }
}

async function trackTrendingRequest(type: string, count: number, timeWindow: number) {
  try {
    await supabase.from('recommendation_interactions').insert({
      interaction_type: 'view',
      recommendation_type: type,
      algorithm_version: 'v1.0',
      metadata: { 
        recommendation_count: count,
        time_window_days: timeWindow
      }
    });
  } catch (error) {
    console.warn('Failed to track trending request:', error);
  }
}