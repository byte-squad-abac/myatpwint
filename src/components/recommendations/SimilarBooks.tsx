'use client';

import React, { useState, useEffect } from 'react';
import RecommendationSection, { RecommendationBook } from './RecommendationSection';

export interface SimilarBooksProps {
  bookId: string;
  bookTitle?: string;
  limit?: number;
  category?: string;
  showScores?: boolean;
  showAlgorithm?: boolean;
}

interface SimilarBooksResponse {
  success: boolean;
  target_book?: any;
  recommendations: any[];
  algorithm?: string;
  model_version?: string;
  total: number;
  cached: boolean;
}

export default function SimilarBooks({
  bookId,
  bookTitle,
  limit = 6,
  category,
  showScores = true,
  showAlgorithm = true,
}: SimilarBooksProps) {
  const [books, setBooks] = useState<RecommendationBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetBook, setTargetBook] = useState<any>(null);

  const fetchSimilarBooks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        bookId,
        limit: limit.toString(),
        minSimilarity: '0.3',
      });

      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`/api/recommendations/similar?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }

      const data: SimilarBooksResponse = await response.json();

      if (data.success && data.recommendations) {
        setBooks(data.recommendations);
        setTargetBook(data.target_book);
      } else {
        throw new Error('No recommendations found');
      }
    } catch (err) {
      console.error('Error fetching similar books:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookId) {
      fetchSimilarBooks();
    }
  }, [bookId, limit, category]);

  const getTitle = () => {
    if (targetBook?.name) {
      return `Books Similar to "${targetBook.name}"`;
    }
    if (bookTitle) {
      return `Books Similar to "${bookTitle}"`;
    }
    return 'Similar Books You Might Like';
  };

  const getSubtitle = () => {
    if (books.length === 0 && !loading) {
      return 'No similar books found';
    }
    
    return `Based on content analysis and user preferences • ${books.length} recommendations`;
  };

  return (
    <RecommendationSection
      title={getTitle()}
      subtitle={getSubtitle()}
      books={books}
      loading={loading}
      error={error}
      onRefresh={fetchSimilarBooks}
      maxBooks={limit}
      showAlgorithm={showAlgorithm}
      showScores={showScores}
      expandable={books.length > limit}
      type="similar"
    />
  );
}