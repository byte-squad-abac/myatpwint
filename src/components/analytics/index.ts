// Analytics Components
export { default as AnalyticsDashboard } from './AnalyticsDashboard';

// Analytics Services and Hooks
export { analyticsService } from '@/lib/services/analytics.service';
export type { 
  RecommendationInteraction,
  SearchEvent,
  RecommendationPerformance
} from '@/lib/services/analytics.service';

export { useAnalytics, useRecommendationTracking, withAnalytics } from '@/lib/hooks/useAnalytics';
export type { 
  UseAnalyticsOptions,
  RecommendationClickEvent,
  SearchEvent as HookSearchEvent,
  PurchaseEvent
} from '@/lib/hooks/useAnalytics';

// Analytics Context
export { 
  AnalyticsProvider, 
  AnalyticsConsent, 
  useAnalyticsContext, 
  withPageTracking 
} from '@/lib/contexts/AnalyticsContext';
export type { AnalyticsContextType, AnalyticsProviderProps } from '@/lib/contexts/AnalyticsContext';