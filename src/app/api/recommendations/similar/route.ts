/**
 * Similar Books Recommendation API
 * GET /api/recommendations/similar?bookId={id}&limit={number}
 */

import { NextRequest, NextResponse } from 'next/server';
// import { PineconeService } from '@/lib/services/pinecone.service'; // Disabled for now
import { createClient } from '@supabase/supabase-js';

// Initialize services - Pinecone disabled for now
// const pineconeService = new PineconeService();
// let pineconeInitialized = false;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Pinecone initialization disabled
// async function initializePinecone() {
//   if (!pineconeInitialized) {
//     try {
//       await pineconeService.initialize();
//       pineconeInitialized = true;
//     } catch (error) {
//       console.error('Failed to initialize Pinecone:', error);
//       throw error;
//     }
//   }
// }

export async function GET(request: NextRequest) {
  try {
    // await initializePinecone(); // Disabled
    
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const minSimilarity = parseFloat(searchParams.get('minSimilarity') || '0.3');
    const category = searchParams.get('category');
    
    if (!bookId) {
      return NextResponse.json(
        { error: 'bookId parameter is required' },
        { status: 400 }
      );
    }

    // Get the target book data
    const { data: targetBook, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError || !targetBook) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Use our Python service for AI recommendations
    try {
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      
      // Get the target book's embedding from Python service
      const embeddingResponse = await fetch(`${pythonServiceUrl}/books/${bookId}/embedding`);
      
      if (!embeddingResponse.ok) {
        throw new Error('Failed to get book embedding from Python service');
      }
      
      const embeddingData = await embeddingResponse.json();
      const targetEmbedding = embeddingData.embedding;
      
      // Get all other book embeddings from database
      const { data: allEmbeddings, error } = await supabase
        .from('book_embeddings')
        .select(`
          book_id,
          embedding_vector,
          books (
            id,
            name,
            author,
            description,
            category,
            image_url,
            price
          )
        `)
        .neq('book_id', bookId);

      if (error) {
        throw new Error('Failed to fetch book embeddings: ' + error.message);
      }

      // Calculate similarity scores
      const similarities = allEmbeddings.map(item => {
        const otherEmbedding = item.embedding_vector;
        const similarity = calculateCosineSimilarity(targetEmbedding, otherEmbedding);
        
        return {
          book: item.books,
          similarity: similarity,
          book_id: item.book_id
        };
      });

      // Sort by similarity and return top results
      const recommendations = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => ({
          ...item.book,
          similarity_score: item.similarity,
          recommendation_reason: generateSimilarityReason(targetBook, item.book),
          algorithm: 'ai_cosine_similarity'
        }));

      // Track recommendation interaction
      await trackRecommendationRequest(bookId, 'similar', recommendations.length);

      return NextResponse.json({
        success: true,
        target_book: targetBook,
        recommendations: recommendations,
        algorithm: 'ai_cosine_similarity',
        model_version: 'paraphrase-multilingual-MiniLM-L12-v2',
        total: recommendations.length,
        cached: false
      });

    } catch (pythonError) {
      console.warn('Python service unavailable, falling back to simple similarity:', pythonError);
    }

    // Final fallback to simple database query
    return await getFallbackSimilarBooks(targetBook, limit);

  } catch (error) {
    console.error('Error in similar books API:', error);
    return NextResponse.json(
      { error: 'Failed to get similar books', details: error.message },
      { status: 500 }
    );
  }
}

async function generateBookEmbedding(book: any): Promise<number[] | null> {
  try {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    
    const response = await fetch(`${pythonServiceUrl}/books/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        book: {
          id: book.id,
          name: book.name,
          author: book.author,
          description: book.description,
          category: book.category,
          tags: book.tags,
          price: book.price,
        },
        generate_embedding: true,
        update_cache: false,
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function getFallbackSimilarBooks(targetBook: any, limit: number) {
  try {
    // Simple database-based similarity using category, author, and tags
    let query = supabase
      .from('books')
      .select('*')
      .neq('id', targetBook.id);

    // First try: same category
    if (targetBook.category) {
      query = query.eq('category', targetBook.category);
    }

    const { data: categoryMatches } = await query.limit(limit * 2).execute();
    
    if (categoryMatches && categoryMatches.length >= limit) {
      const recommendations = categoryMatches.slice(0, limit).map(book => ({
        ...book,
        similarity_score: 0.8, // High score for category match
        recommendation_reason: `Same category: ${targetBook.category}`,
        algorithm: 'category_based'
      }));

      await trackRecommendationRequest(targetBook.id, 'similar', recommendations.length);

      return NextResponse.json({
        success: true,
        target_book: targetBook,
        recommendations,
        algorithm: 'category_based',
        model_version: 'fallback',
        total: recommendations.length,
        cached: false
      });
    }

    // Second try: same author
    if (targetBook.author) {
      const { data: authorMatches } = await supabase
        .from('books')
        .select('*')
        .eq('author', targetBook.author)
        .neq('id', targetBook.id)
        .limit(limit)
        .execute();

      if (authorMatches && authorMatches.length > 0) {
        const recommendations = authorMatches.map(book => ({
          ...book,
          similarity_score: 0.9, // Very high score for same author
          recommendation_reason: `Same author: ${targetBook.author}`,
          algorithm: 'author_based'
        }));

        await trackRecommendationRequest(targetBook.id, 'similar', recommendations.length);

        return NextResponse.json({
          success: true,
          target_book: targetBook,
          recommendations,
          algorithm: 'author_based',
          model_version: 'fallback',
          total: recommendations.length,
          cached: false
        });
      }
    }

    // Third try: random popular books
    const { data: randomBooks } = await supabase
      .from('books')
      .select('*')
      .neq('id', targetBook.id)
      .limit(limit)
      .execute();

    const recommendations = (randomBooks || []).map(book => ({
      ...book,
      similarity_score: 0.5,
      recommendation_reason: 'Popular book you might like',
      algorithm: 'popular'
    }));

    await trackRecommendationRequest(targetBook.id, 'similar', recommendations.length);

    return NextResponse.json({
      success: true,
      target_book: targetBook,
      recommendations,
      algorithm: 'popular',
      model_version: 'fallback',
      total: recommendations.length,
      cached: false
    });

  } catch (error) {
    console.error('Fallback query failed:', error);
    return NextResponse.json(
      { error: 'All recommendation methods failed' },
      { status: 500 }
    );
  }
}

function generateSimilarityReason(targetBook: any, similarBook: any): string {
  const reasons = [];
  
  if (targetBook.category === similarBook.category) {
    reasons.push(`same category (${targetBook.category})`);
  }
  
  if (targetBook.author === similarBook.author) {
    reasons.push(`same author (${targetBook.author})`);
  }
  
  // Check for tag overlap
  const targetTags = Array.isArray(targetBook.tags) ? targetBook.tags : 
                    (typeof targetBook.tags === 'string' ? JSON.parse(targetBook.tags || '[]') : []);
  const similarTags = Array.isArray(similarBook.tags) ? similarBook.tags : 
                     (typeof similarBook.tags === 'string' ? JSON.parse(similarBook.tags || '[]') : []);
  
  const commonTags = targetTags.filter(tag => similarTags.includes(tag));
  if (commonTags.length > 0) {
    reasons.push(`similar topics (${commonTags.slice(0, 2).join(', ')})`);
  }
  
  if (reasons.length === 0) {
    reasons.push('similar content themes');
  }
  
  return `Recommended because of ${reasons.join(', ')}`;
}

// Helper function to calculate cosine similarity between two vectors
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) {
    return 0;
  }
  
  return dotProduct / magnitude;
}

async function trackRecommendationRequest(bookId: string, type: string, count: number) {
  try {
    await supabase.from('recommendation_interactions').insert({
      book_id: bookId,
      interaction_type: 'view',
      recommendation_type: type,
      algorithm_version: 'v1.0',
      metadata: { recommendation_count: count }
    });
  } catch (error) {
    console.warn('Failed to track recommendation request:', error);
  }
}