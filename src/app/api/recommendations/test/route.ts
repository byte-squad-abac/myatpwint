/**
 * Simple Test Recommendation API (using our Python service)
 * GET /api/recommendations/test?bookId={id}&limit={number}
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
    const bookId = searchParams.get('bookId');
    const limit = parseInt(searchParams.get('limit') || '5');
    
    if (!bookId) {
      return NextResponse.json(
        { error: 'bookId parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Finding similar books for:', bookId);
    
    // Step 1: Get the target book's embedding from Python service
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    
    const embeddingResponse = await fetch(`${pythonServiceUrl}/books/${bookId}/embedding`);
    
    if (!embeddingResponse.ok) {
      throw new Error('Failed to get book embedding from Python service');
    }
    
    const embeddingData = await embeddingResponse.json();
    const targetEmbedding = embeddingData.embedding;
    
    // Step 2: Get all other book embeddings from database
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

    // Step 3: Calculate similarity scores
    const similarities = allEmbeddings.map(item => {
      const otherEmbedding = item.embedding_vector;
      const similarity = calculateCosineSimilarity(targetEmbedding, otherEmbedding);
      
      return {
        book: item.books,
        similarity: similarity,
        book_id: item.book_id
      };
    });

    // Step 4: Sort by similarity and return top results
    const topSimilar = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => ({
        ...item.book,
        similarity_score: item.similarity
      }));

    console.log('✅ Found', topSimilar.length, 'similar books');

    return NextResponse.json({
      success: true,
      book_id: bookId,
      recommendations: topSimilar,
      algorithm: 'cosine_similarity',
      model_version: 'paraphrase-multilingual-MiniLM-L12-v2',
      count: topSimilar.length
    });

  } catch (error) {
    console.error('❌ Recommendation error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
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