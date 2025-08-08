'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import RecommendationSection, { RecommendationBook } from './RecommendationSection';

export interface PersonalizedRecommendationsProps {
  limit?: number;
  category?: string;
  excludePurchased?: boolean;
  showScores?: boolean;
  showAlgorithm?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface PersonalizedResponse {
  success: boolean;
  user_id?: string;
  recommendations: any[];
  algorithm?: string;
  model_version?: string;
  total: number;
  cached: boolean;
  user_profile?: {
    preferred_categories?: string[];
    preferred_authors?: string[];
    total_purchases?: number;
  };
}

export default function PersonalizedRecommendations({
  limit = 8,
  category,
  excludePurchased = true,
  showScores = true,
  showAlgorithm = true,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
}: PersonalizedRecommendationsProps) {
  const session = useSession();
  const [books, setBooks] = useState<RecommendationBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const fetchPersonalizedRecommendations = async () => {
    if (!session?.user?.id) {
      setError('Please sign in to see personalized recommendations');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userId: session.user.id,
        limit: limit.toString(),
        excludePurchased: excludePurchased.toString(),
      });

      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`/api/recommendations/personalized?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }

      const data: PersonalizedResponse = await response.json();

      if (data.success && data.recommendations) {
        setBooks(data.recommendations);
        setUserProfile(data.user_profile);
      } else {
        throw new Error('No personalized recommendations found');
      }
    } catch (err) {
      console.error('Error fetching personalized recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalizedRecommendations();
  }, [session?.user?.id, limit, category, excludePurchased]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && session?.user?.id) {
      const interval = setInterval(fetchPersonalizedRecommendations, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, session?.user?.id]);

  const getTitle = () => {
    if (!session?.user?.id) {
      return 'Personalized Recommendations';
    }
    
    if (userProfile?.preferred_categories?.length) {
      return `Recommended for You`;
    }
    
    return 'Books Picked Just for You';
  };

  const getSubtitle = () => {
    if (!session?.user?.id) {
      return 'Sign in to see recommendations based on your reading history';
    }
    
    if (books.length === 0 && !loading) {
      return 'Start exploring books to get personalized recommendations';
    }

    let subtitle = `AI-powered recommendations based on your preferences`;
    
    if (userProfile) {
      const details = [];
      if (userProfile.total_purchases > 0) {
        details.push(`${userProfile.total_purchases} purchases`);
      }
      if (userProfile.preferred_categories?.length) {
        details.push(`${userProfile.preferred_categories.slice(0, 2).join(', ')} interests`);
      }
      if (details.length > 0) {
        subtitle += ` • ${details.join(', ')}`;
      }
    }

    return `${subtitle} • ${books.length} recommendations`;
  };

  // Don't render if user is not signed in
  if (!session?.user?.id) {
    return (
      <RecommendationSection
        title={getTitle()}
        subtitle={getSubtitle()}
        books={[]}
        loading={false}
        error="Please sign in to see personalized recommendations"
        maxBooks={limit}
        showAlgorithm={showAlgorithm}
        showScores={showScores}
        type="personalized"
      />
    );
  }

  return (
    <RecommendationSection
      title={getTitle()}
      subtitle={getSubtitle()}
      books={books}
      loading={loading}
      error={error}
      onRefresh={fetchPersonalizedRecommendations}
      maxBooks={limit}
      showAlgorithm={showAlgorithm}
      showScores={showScores}
      expandable={books.length > limit}
      type="personalized"
    />
  );
}