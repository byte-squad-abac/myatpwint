/**
 * Personalized User Recommendations API
 * GET /api/recommendations/personalized?userId={id}&limit={number}
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
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const excludePurchased = searchParams.get('excludePurchased') === 'true';
    const category = searchParams.get('category');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.warn('User lookup failed:', userError);
    }

    // Try to get personalized recommendations from Python service first
    try {
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${pythonServiceUrl}/recommendations/personalized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          limit: limit,
          exclude_purchased: excludePurchased,
          category_filter: category,
          min_similarity: 0.3,
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
              user_affinity: rec.user_affinity
            };
          })
        );

        // Track recommendation interaction
        await trackRecommendationRequest(userId, 'personalized', recommendations.length);

        return NextResponse.json({
          success: true,
          user_id: userId,
          recommendations: recommendations,
          algorithm: pythonResult.algorithm,
          model_version: pythonResult.model_version,
          total: recommendations.length,
          cached: pythonResult.cached || false,
          user_profile: pythonResult.user_profile
        });
      }
    } catch (pythonError) {
      console.warn('Python service unavailable, falling back to Pinecone:', pythonError);
    }

    // Fallback to Pinecone personalized recommendations
    try {
      const personalizedResults = await pineconeService.getPersonalizedRecommendations(userId, limit);
      
      // Get full book data for results
      const recommendations = await Promise.all(
        personalizedResults.map(async (result) => {
          const { data: bookData } = await supabase
            .from('books')
            .select('*')
            .eq('id', result.bookId)
            .single();

          return {
            ...bookData,
            similarity_score: result.score,
            recommendation_reason: result.metadata?.recommendationReason || 'Based on your interests',
            algorithm: 'collaborative_filtering',
            user_affinity: result.score
          };
        })
      );

      // Filter out null results and apply category filter if needed
      const filteredRecommendations = recommendations
        .filter(Boolean)
        .filter(rec => !category || rec.category === category);

      // Track recommendation request
      await trackRecommendationRequest(userId, 'personalized', filteredRecommendations.length);

      return NextResponse.json({
        success: true,
        user_id: userId,
        recommendations: filteredRecommendations,
        algorithm: 'collaborative_filtering',
        model_version: 'pinecone',
        total: filteredRecommendations.length,
        cached: false
      });

    } catch (pineconeError) {
      console.error('Pinecone personalized query failed:', pineconeError);
      
      // Final fallback to user history-based recommendations
      return await getFallbackPersonalizedBooks(userId, limit, category, excludePurchased);
    }

  } catch (error) {
    console.error('Error in personalized recommendations API:', error);
    return NextResponse.json(
      { error: 'Failed to get personalized recommendations', details: String(error) },
      { status: 500 }
    );
  }
}

async function getFallbackPersonalizedBooks(
  userId: string, 
  limit: number, 
  category?: string, 
  excludePurchased: boolean = true
) {
  try {
    // Get user's purchase history to understand preferences
    const { data: purchaseHistory } = await supabase
      .from('orders')
      .select(`
        book_id,
        books (
          id, name, author, category, tags, price
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .limit(20);

    // Get user's cart items to understand current interests
    const { data: cartItems } = await supabase
      .from('carts')
      .select(`
        book_id,
        books (
          id, name, author, category, tags, price
        )
      `)
      .eq('user_id', userId);

    const userBooks = [
      ...(purchaseHistory || []).map(p => p.books),
      ...(cartItems || []).map(c => c.books)
    ].filter(Boolean);

    if (userBooks.length === 0) {
      // New user - recommend popular books
      return await getPopularBooks(limit, category);
    }

    // Extract user preferences
    const userCategories = [...new Set(userBooks.map(b => b.category).filter(Boolean))];
    const userAuthors = [...new Set(userBooks.map(b => b.author).filter(Boolean))];
    const purchasedBookIds = excludePurchased 
      ? (purchaseHistory || []).map(p => p.book_id).filter(Boolean)
      : [];

    // Build recommendation query
    let query = supabase
      .from('books')
      .select('*')
      .not('id', 'in', `(${purchasedBookIds.join(',') || 'null'})`);

    // Apply category filter
    if (category) {
      query = query.eq('category', category);
    } else if (userCategories.length > 0) {
      query = query.in('category', userCategories);
    }

    const { data: categoryMatches } = await query.limit(limit * 2);

    if (categoryMatches && categoryMatches.length > 0) {
      // Score recommendations based on user preferences
      const scoredRecommendations = categoryMatches
        .map((book: any) => {
          let score = 0.6; // Base score for category match
          
          // Boost score for same author
          if (userAuthors.includes(book.author)) {
            score += 0.3;
          }
          
          // Check tag overlap
          const bookTags = Array.isArray(book.tags) ? book.tags : 
                          (typeof book.tags === 'string' ? JSON.parse(book.tags || '[]') : []);
          const userTags = userBooks.flatMap(ub => {
            const tags = Array.isArray(ub.tags) ? ub.tags : 
                        (typeof ub.tags === 'string' ? JSON.parse(ub.tags || '[]') : []);
            return tags;
          });
          
          const tagOverlap = bookTags.filter((tag: any) => userTags.includes(tag)).length;
          if (tagOverlap > 0) {
            score += Math.min(tagOverlap * 0.1, 0.2);
          }

          return {
            ...book,
            similarity_score: Math.min(score, 1.0),
            recommendation_reason: generatePersonalizedReason(book, userCategories, userAuthors, tagOverlap > 0),
            algorithm: 'preference_based',
            user_affinity: score
          };
        })
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);

      await trackRecommendationRequest(userId, 'personalized', scoredRecommendations.length);

      return NextResponse.json({
        success: true,
        user_id: userId,
        recommendations: scoredRecommendations,
        algorithm: 'preference_based',
        model_version: 'fallback',
        total: scoredRecommendations.length,
        cached: false,
        user_profile: {
          preferred_categories: userCategories,
          preferred_authors: userAuthors,
          total_purchases: purchaseHistory?.length || 0
        }
      });
    }

    // If no category matches, fall back to popular books
    return await getPopularBooks(limit, category);

  } catch (error) {
    console.error('Fallback personalized query failed:', error);
    return NextResponse.json(
      { error: 'All personalized recommendation methods failed' },
      { status: 500 }
    );
  }
}

async function getPopularBooks(limit: number, category?: string) {
  try {
    let query = supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: popularBooks } = await query.limit(limit);

    const recommendations = (popularBooks || []).map((book: any) => ({
      ...book,
      similarity_score: 0.7,
      recommendation_reason: 'Popular book you might enjoy',
      algorithm: 'popular',
      user_affinity: 0.7
    }));

    return NextResponse.json({
      success: true,
      recommendations,
      algorithm: 'popular',
      model_version: 'fallback',
      total: recommendations.length,
      cached: false
    });
  } catch (error) {
    console.error('Popular books fallback failed:', error);
    return NextResponse.json(
      { error: 'Failed to get popular books' },
      { status: 500 }
    );
  }
}

function generatePersonalizedReason(
  book: any, 
  userCategories: string[], 
  userAuthors: string[], 
  hasTagOverlap: boolean
): string {
  const reasons = [];
  
  if (userCategories.includes(book.category)) {
    reasons.push(`matches your interest in ${book.category}`);
  }
  
  if (userAuthors.includes(book.author)) {
    reasons.push(`same author as books you've enjoyed`);
  }
  
  if (hasTagOverlap) {
    reasons.push('similar themes to your preferences');
  }
  
  if (reasons.length === 0) {
    reasons.push('recommended based on your reading history');
  }
  
  return `Recommended because it ${reasons.join(', ')}`;
}

async function trackRecommendationRequest(userId: string, type: string, count: number) {
  try {
    await supabase.from('recommendation_interactions').insert({
      user_id: userId,
      interaction_type: 'view',
      recommendation_type: type,
      algorithm_version: 'v1.0',
      metadata: { recommendation_count: count }
    });
  } catch (error) {
    console.warn('Failed to track recommendation request:', error);
  }
}