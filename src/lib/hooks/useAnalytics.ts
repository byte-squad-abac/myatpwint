/**
 * React Hook for Analytics Tracking
 * Provides easy-to-use methods for tracking user interactions with recommendations
 */

import { useCallback, useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { analyticsService } from '@/lib/services/analytics.service';

export interface UseAnalyticsOptions {
  userId?: string;
  sessionId?: string;
  enableAutoTracking?: boolean;
}

export interface RecommendationClickEvent {
  bookId: string;
  recommendationType: 'similar' | 'personalized' | 'trending' | 'search';
  position: number;
  similarityScore?: number;
  metadata?: Record<string, any>;
}

export interface SearchEvent {
  query: string;
  algorithm: string;
  resultsCount: number;
  clickedBookId?: string;
  clickPosition?: number;
}

export interface PurchaseEvent {
  bookId: string;
  recommendationType: 'similar' | 'personalized' | 'trending' | 'search';
  amount: number;
  metadata?: Record<string, any>;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const session = useSession();
  const userId = options.userId || session?.user?.id;

  // Track recommendation view
  const trackRecommendationView = useCallback(async (
    recommendationType: string,
    bookIds: string[],
    algorithm?: string
  ) => {
    try {
      await analyticsService.trackInteraction({
        user_id: userId,
        interaction_type: 'view',
        recommendation_type: recommendationType as any,
        algorithm_version: algorithm || 'v1.0',
        metadata: {
          book_ids: bookIds,
          book_count: bookIds.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error tracking recommendation view:', error);
    }
  }, [userId]);

  // Track book click from recommendations
  const trackRecommendationClick = useCallback(async (event: RecommendationClickEvent) => {
    try {
      await analyticsService.trackBookClick(
        event.bookId,
        event.recommendationType,
        event.position,
        event.similarityScore,
        userId
      );

      // Additional metadata tracking
      if (event.metadata) {
        await analyticsService.trackInteraction({
          user_id: userId,
          book_id: event.bookId,
          interaction_type: 'click',
          recommendation_type: event.recommendationType,
          similarity_score: event.similarityScore,
          metadata: {
            ...event.metadata,
            click_position: event.position,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Error tracking recommendation click:', error);
    }
  }, [userId]);

  // Track search
  const trackSearch = useCallback(async (event: SearchEvent) => {
    try {
      await analyticsService.trackSearch({
        user_id: userId,
        query: event.query,
        algorithm: event.algorithm,
        results_count: event.resultsCount,
        clicked_book_id: event.clickedBookId,
        click_position: event.clickPosition,
        session_id: options.sessionId || generateSessionId(),
      });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }, [userId, options.sessionId]);

  // Track purchase from recommendation
  const trackPurchase = useCallback(async (event: PurchaseEvent) => {
    try {
      if (!userId) {
        console.warn('Cannot track purchase without user ID');
        return;
      }

      await analyticsService.trackBookPurchase(
        event.bookId,
        event.recommendationType,
        userId,
        event.amount
      );

      // Track additional metadata
      if (event.metadata) {
        await analyticsService.trackInteraction({
          user_id: userId,
          book_id: event.bookId,
          interaction_type: 'purchase',
          recommendation_type: event.recommendationType,
          metadata: {
            ...event.metadata,
            purchase_amount: event.amount,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Error tracking purchase:', error);
    }
  }, [userId]);

  // Track add to cart from recommendation
  const trackAddToCart = useCallback(async (
    bookId: string,
    recommendationType: 'similar' | 'personalized' | 'trending' | 'search',
    quantity: number = 1,
    metadata?: Record<string, any>
  ) => {
    try {
      await analyticsService.trackAddToCart(bookId, recommendationType, userId, quantity);

      // Track additional metadata
      if (metadata) {
        await analyticsService.trackInteraction({
          user_id: userId,
          book_id: bookId,
          interaction_type: 'add_to_cart',
          recommendation_type: recommendationType,
          metadata: {
            ...metadata,
            quantity,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Error tracking add to cart:', error);
    }
  }, [userId]);

  // Track book share
  const trackShare = useCallback(async (
    bookId: string,
    shareMethod: string,
    recommendationType?: string
  ) => {
    try {
      await analyticsService.trackInteraction({
        user_id: userId,
        book_id: bookId,
        interaction_type: 'share',
        recommendation_type: recommendationType as any,
        metadata: {
          share_method: shareMethod,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error tracking share:', error);
    }
  }, [userId]);

  // Track page view with recommendations
  const trackPageView = useCallback(async (
    pageName: string,
    recommendationTypes: string[] = [],
    metadata?: Record<string, any>
  ) => {
    try {
      await analyticsService.trackInteraction({
        user_id: userId,
        interaction_type: 'view',
        metadata: {
          page_name: pageName,
          recommendation_types: recommendationTypes,
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }, [userId]);

  // Auto-track page views if enabled
  useEffect(() => {
    if (options.enableAutoTracking && typeof window !== 'undefined') {
      const handlePageView = () => {
        const pageName = window.location.pathname;
        trackPageView(pageName);
      };

      // Track initial page view
      handlePageView();

      // Track navigation changes (for SPA)
      const handlePopState = () => handlePageView();
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [options.enableAutoTracking, trackPageView]);

  // Helper function to create a tracking wrapper for click events
  const createClickTracker = useCallback((
    bookId: string,
    recommendationType: 'similar' | 'personalized' | 'trending' | 'search',
    position: number,
    similarityScore?: number,
    metadata?: Record<string, any>
  ) => {
    return async (event?: React.MouseEvent) => {
      await trackRecommendationClick({
        bookId,
        recommendationType,
        position,
        similarityScore,
        metadata,
      });
    };
  }, [trackRecommendationClick]);

  // Helper function to track search with click
  const createSearchClickTracker = useCallback((
    query: string,
    algorithm: string,
    resultsCount: number
  ) => {
    return async (bookId: string, position: number) => {
      await trackSearch({
        query,
        algorithm,
        resultsCount,
        clickedBookId: bookId,
        clickPosition: position,
      });
    };
  }, [trackSearch]);

  return {
    // Core tracking methods
    trackRecommendationView,
    trackRecommendationClick,
    trackSearch,
    trackPurchase,
    trackAddToCart,
    trackShare,
    trackPageView,

    // Helper methods
    createClickTracker,
    createSearchClickTracker,

    // State
    userId,
    isAuthenticated: !!userId,
  };
};

// Helper function to generate session ID
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Higher-order component for automatic analytics tracking
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>,
  trackingConfig: {
    pageName: string;
    recommendationTypes?: string[];
    autoTrackClicks?: boolean;
  }
) {
  return function WrappedComponent(props: P) {
    const analytics = useAnalytics({ enableAutoTracking: true });

    useEffect(() => {
      analytics.trackPageView(
        trackingConfig.pageName,
        trackingConfig.recommendationTypes
      );
    }, [analytics]);

    return <Component {...props} analytics={analytics} />;
  };
}

// Custom hook for tracking recommendation component performance
export const useRecommendationTracking = (
  recommendationType: string,
  books: any[] = [],
  algorithm?: string
) => {
  const analytics = useAnalytics();

  // Track when recommendations are viewed
  useEffect(() => {
    if (books.length > 0) {
      const bookIds = books.map(book => book.id || book.book_id).filter(Boolean);
      analytics.trackRecommendationView(recommendationType, bookIds, algorithm);
    }
  }, [books.length, recommendationType, algorithm, analytics]);

  return analytics;
};