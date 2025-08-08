/**
 * Analytics Service for Recommendation System
 * Tracks user interactions, recommendation performance, and engagement metrics
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RecommendationInteraction {
  user_id?: string;
  book_id?: string;
  interaction_type: 'view' | 'click' | 'purchase' | 'add_to_cart' | 'search' | 'share';
  recommendation_type?: 'similar' | 'personalized' | 'trending' | 'search';
  algorithm_version?: string;
  similarity_score?: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface SearchEvent {
  user_id?: string;
  query: string;
  algorithm: string;
  results_count: number;
  clicked_book_id?: string;
  click_position?: number;
  session_id?: string;
}

export interface RecommendationPerformance {
  recommendation_type: string;
  algorithm: string;
  period_start: string;
  period_end: string;
  total_views: number;
  total_clicks: number;
  total_purchases: number;
  click_through_rate: number;
  conversion_rate: number;
  average_similarity_score: number;
}

export class AnalyticsService {
  private batchQueue: RecommendationInteraction[] = [];
  private readonly batchSize = 10;
  private readonly flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start the batch flush timer
    this.startBatchProcessor();
  }

  /**
   * Track a recommendation interaction
   */
  async trackInteraction(interaction: RecommendationInteraction): Promise<void> {
    try {
      // Add to batch queue
      this.batchQueue.push({
        ...interaction,
        created_at: new Date().toISOString(),
      });

      // Flush if batch is full
      if (this.batchQueue.length >= this.batchSize) {
        await this.flushBatch();
      }
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }

  /**
   * Track a search event
   */
  async trackSearch(searchEvent: SearchEvent): Promise<void> {
    try {
      await supabase
        .from('search_analytics')
        .insert({
          ...searchEvent,
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  /**
   * Track book click from recommendations
   */
  async trackBookClick(
    bookId: string, 
    recommendationType: string, 
    position: number, 
    similarityScore?: number,
    userId?: string
  ): Promise<void> {
    await this.trackInteraction({
      user_id: userId,
      book_id: bookId,
      interaction_type: 'click',
      recommendation_type: recommendationType as any,
      similarity_score: similarityScore,
      metadata: {
        position,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track book purchase from recommendations
   */
  async trackBookPurchase(
    bookId: string, 
    recommendationType: string, 
    userId: string,
    purchaseAmount: number
  ): Promise<void> {
    await this.trackInteraction({
      user_id: userId,
      book_id: bookId,
      interaction_type: 'purchase',
      recommendation_type: recommendationType as any,
      metadata: {
        purchase_amount: purchaseAmount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track add to cart from recommendations
   */
  async trackAddToCart(
    bookId: string, 
    recommendationType: string, 
    userId?: string,
    quantity: number = 1
  ): Promise<void> {
    await this.trackInteraction({
      user_id: userId,
      book_id: bookId,
      interaction_type: 'add_to_cart',
      recommendation_type: recommendationType as any,
      metadata: {
        quantity,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Get recommendation performance metrics
   */
  async getPerformanceMetrics(
    startDate: string,
    endDate: string,
    recommendationType?: string
  ): Promise<RecommendationPerformance[]> {
    try {
      let query = `
        SELECT 
          recommendation_type,
          algorithm_version as algorithm,
          COUNT(*) FILTER (WHERE interaction_type = 'view') as total_views,
          COUNT(*) FILTER (WHERE interaction_type = 'click') as total_clicks,
          COUNT(*) FILTER (WHERE interaction_type = 'purchase') as total_purchases,
          CASE 
            WHEN COUNT(*) FILTER (WHERE interaction_type = 'view') > 0 
            THEN (COUNT(*) FILTER (WHERE interaction_type = 'click')::float / COUNT(*) FILTER (WHERE interaction_type = 'view')) * 100
            ELSE 0
          END as click_through_rate,
          CASE 
            WHEN COUNT(*) FILTER (WHERE interaction_type = 'click') > 0 
            THEN (COUNT(*) FILTER (WHERE interaction_type = 'purchase')::float / COUNT(*) FILTER (WHERE interaction_type = 'click')) * 100
            ELSE 0
          END as conversion_rate,
          AVG(similarity_score) as average_similarity_score
        FROM recommendation_interactions 
        WHERE created_at BETWEEN $1 AND $2
      `;

      const params = [startDate, endDate];

      if (recommendationType) {
        query += ' AND recommendation_type = $3';
        params.push(recommendationType);
      }

      query += `
        GROUP BY recommendation_type, algorithm_version
        ORDER BY total_views DESC
      `;

      const { data, error } = await supabase.rpc('execute_sql', {
        query,
        params,
      });

      if (error) {
        throw error;
      }

      return data?.map((row: any) => ({
        ...row,
        period_start: startDate,
        period_end: endDate,
      })) || [];
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return [];
    }
  }

  /**
   * Get user behavior insights
   */
  async getUserBehaviorInsights(userId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('recommendation_interactions')
        .select(`
          interaction_type,
          recommendation_type,
          book_id,
          similarity_score,
          created_at,
          books:book_id (
            name,
            author,
            category,
            price
          )
        `)
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Analyze user behavior patterns
      const interactions = data || [];
      const categories = new Map<string, number>();
      const authors = new Map<string, number>();
      const recommendationTypes = new Map<string, number>();
      const interactionTypes = new Map<string, number>();

      interactions.forEach((interaction: any) => {
        // Count categories
        if (interaction.books?.category) {
          categories.set(
            interaction.books.category,
            (categories.get(interaction.books.category) || 0) + 1
          );
        }

        // Count authors
        if (interaction.books?.author) {
          authors.set(
            interaction.books.author,
            (authors.get(interaction.books.author) || 0) + 1
          );
        }

        // Count recommendation types
        if (interaction.recommendation_type) {
          recommendationTypes.set(
            interaction.recommendation_type,
            (recommendationTypes.get(interaction.recommendation_type) || 0) + 1
          );
        }

        // Count interaction types
        interactionTypes.set(
          interaction.interaction_type,
          (interactionTypes.get(interaction.interaction_type) || 0) + 1
        );
      });

      return {
        total_interactions: interactions.length,
        period_days: days,
        top_categories: Array.from(categories.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([category, count]) => ({ category, count })),
        top_authors: Array.from(authors.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([author, count]) => ({ author, count })),
        recommendation_type_usage: Array.from(recommendationTypes.entries())
          .map(([type, count]) => ({ type, count, percentage: (count / interactions.length) * 100 })),
        interaction_type_breakdown: Array.from(interactionTypes.entries())
          .map(([type, count]) => ({ type, count, percentage: (count / interactions.length) * 100 })),
        recent_interactions: interactions.slice(0, 20),
      };
    } catch (error) {
      console.error('Error getting user behavior insights:', error);
      return null;
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('search_analytics')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      const searches = data || [];
      
      // Analyze search patterns
      const queryFrequency = new Map<string, number>();
      const algorithmUsage = new Map<string, number>();
      const noResultQueries: string[] = [];

      searches.forEach((search: any) => {
        // Track query frequency
        const normalizedQuery = search.query.toLowerCase().trim();
        queryFrequency.set(
          normalizedQuery,
          (queryFrequency.get(normalizedQuery) || 0) + 1
        );

        // Track algorithm usage
        algorithmUsage.set(
          search.algorithm,
          (algorithmUsage.get(search.algorithm) || 0) + 1
        );

        // Track no-result queries
        if (search.results_count === 0) {
          noResultQueries.push(search.query);
        }
      });

      const totalSearches = searches.length;
      const searchesWithResults = searches.filter(s => s.results_count > 0).length;
      const searchesWithClicks = searches.filter(s => s.clicked_book_id).length;

      return {
        total_searches: totalSearches,
        searches_with_results: searchesWithResults,
        searches_with_clicks: searchesWithClicks,
        success_rate: totalSearches > 0 ? (searchesWithResults / totalSearches) * 100 : 0,
        click_through_rate: searchesWithResults > 0 ? (searchesWithClicks / searchesWithResults) * 100 : 0,
        top_queries: Array.from(queryFrequency.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([query, count]) => ({ query, count })),
        algorithm_usage: Array.from(algorithmUsage.entries())
          .map(([algorithm, count]) => ({ 
            algorithm, 
            count, 
            percentage: (count / totalSearches) * 100 
          })),
        no_result_queries: [...new Set(noResultQueries)].slice(0, 20),
        average_results_per_search: searches.length > 0 
          ? searches.reduce((sum, s) => sum + s.results_count, 0) / searches.length 
          : 0,
      };
    } catch (error) {
      console.error('Error getting search analytics:', error);
      return null;
    }
  }

  /**
   * Get recommendation effectiveness over time
   */
  async getRecommendationTrends(days: number = 30): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_recommendation_trends', {
        days_back: days
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting recommendation trends:', error);
      return [];
    }
  }

  /**
   * Private method to flush batch queue
   */
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    try {
      const batch = [...this.batchQueue];
      this.batchQueue = [];

      await supabase
        .from('recommendation_interactions')
        .insert(batch);
        
      console.log(`✅ Flushed ${batch.length} analytics events`);
    } catch (error) {
      console.error('Error flushing analytics batch:', error);
      // Put failed items back in queue
      this.batchQueue.unshift(...this.batchQueue);
    }
  }

  /**
   * Start the batch processor timer
   */
  private startBatchProcessor(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushBatch();
    }, this.flushInterval);
  }

  /**
   * Stop the batch processor
   */
  public stopBatchProcessor(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Cleanup and flush remaining events
   */
  public async cleanup(): Promise<void> {
    this.stopBatchProcessor();
    await this.flushBatch();
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Cleanup on process exit
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await analyticsService.cleanup();
  });
}