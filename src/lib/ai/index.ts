/**
 * AI Services barrel exports
 */

export { default as EmbeddingService } from './embedding-service'
export { default as AISearchService } from './search-service'

// Re-export types for convenience
export type {
  EmbeddingResult,
  BookWithSearchMetadata,
  BookWithRecommendationMetadata,
  SemanticSearchOptions,
  SemanticSearchResult,
  RecommendationResult,
  EmbeddingBatchResult
} from '@/types'