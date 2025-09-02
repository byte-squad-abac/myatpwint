/**
 * AI-Powered Search Service
 */

// React and Next.js
import { createClient } from '@supabase/supabase-js'

// Internal services
import EmbeddingService from './embedding-service'

// Types
import type {
  Book,
  SemanticSearchOptions,
  BookWithSearchMetadata,
  BookWithRecommendationMetadata,
  EmbeddingBatchResult
} from '@/types'

// Constants
import { AI_CONFIG } from '@/constants'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class AISearchService {
  /**
   * Semantic book search with Burmese support
   */
  static async semanticSearch(
    query: string, 
    options: SemanticSearchOptions = {}
  ): Promise<BookWithSearchMetadata[]> {
    const { 
      limit = AI_CONFIG.MAX_SEARCH_RESULTS, 
      threshold = AI_CONFIG.DEFAULT_SEARCH_THRESHOLD, 
      category 
    } = options;

    try {
      // Generate query embedding with proper prefix
      const queryEmbedding = await EmbeddingService.generateEmbedding(query, true);

      // Prepare the RPC call
      const rpcCall = supabase.rpc('match_books_semantic', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit
      });

      // Execute search
      const { data, error } = await rpcCall;

      if (error) {
        console.error('Semantic search error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      // Post-filter by category if specified
      let results = data || [];
      if (category && category !== 'all') {
        results = results.filter((book: Book) => 
          book.category?.toLowerCase().includes(category.toLowerCase())
        );
      }

      // Add search metadata
      return results.map((book: Book & { similarity: number }): BookWithSearchMetadata => ({
        ...book,
        searchMetadata: {
          similarity: book.similarity,
          searchMethod: 'semantic' as const,
          model: 'multilingual-e5-base'
        }
      }));
      
    } catch (error) {
      console.error('Semantic search failed:', error);
      throw error;
    }
  }

  /**
   * Find similar books for recommendations
   */
  static async findSimilarBooks(
    bookId: string,
    options: {
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<BookWithRecommendationMetadata[]> {
    const { 
      limit = AI_CONFIG.MAX_RECOMMENDATIONS, 
      threshold = AI_CONFIG.DEFAULT_RECOMMENDATION_THRESHOLD 
    } = options;

    try {
      // Get the book's embedding
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('content_embedding, name, author')
        .eq('id', bookId)
        .single();

      if (bookError || !book) {
        throw new Error('Book not found or no embedding available');
      }

      if (!book.content_embedding) {
        // If no embedding, generate it
        await this.generateBookEmbedding(bookId);
        return this.findSimilarBooks(bookId, options); // Retry
      }

      // Find similar books using the book's embedding
      const { data, error } = await supabase.rpc('match_books_semantic', {
        query_embedding: book.content_embedding,
        match_threshold: threshold,
        match_count: limit + 1, // +1 to account for excluding original
        exclude_book_id: bookId
      });

      if (error) {
        console.error('Similar books search error:', error);
        throw error;
      }

      // Limit results and add metadata
      return (data || []).slice(0, limit).map((book: Book & { similarity: number }): BookWithRecommendationMetadata => ({
        ...book,
        recommendationMetadata: {
          similarity: book.similarity,
          reason: 'content-similarity' as const,
          model: 'multilingual-e5-base'
        }
      }));

    } catch (error) {
      console.error('Similar books search failed:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single book
   */
  static async generateBookEmbedding(bookId: string): Promise<void> {
    try {
      // Get book data
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (bookError || !book) {
        throw new Error('Book not found');
      }

      // Generate embedding
      const searchText = EmbeddingService.buildBookSearchText(book);
      const embedding = await EmbeddingService.generateEmbedding(searchText, false);

      // Update book with embedding
      const { error: updateError } = await supabase
        .from('books')
        .update({
          content_embedding: embedding,
          search_text: searchText,
          embedding_generated_at: new Date().toISOString()
        })
        .eq('id', bookId);

      if (updateError) {
        throw new Error(`Failed to update book embedding: ${updateError.message}`);
      }

    } catch (error) {
      console.error('Book embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Batch generate embeddings for all books
   */
  static async generateAllBookEmbeddings(): Promise<EmbeddingBatchResult> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      // Get all books without embeddings
      const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .is('content_embedding', null);

      if (error) {
        throw new Error(`Failed to fetch books: ${error.message}`);
      }

      if (!books || books.length === 0) {
        console.log('No books need embedding generation');
        return results;
      }

      console.log(`Generating embeddings for ${books.length} books...`);

      // Generate embeddings in batches
      const batchResults = await EmbeddingService.batchGenerateEmbeddings(books);

      // Update books with embeddings
      for (const result of batchResults) {
        try {
          const { error: updateError } = await supabase
            .from('books')
            .update({
              content_embedding: result.embedding,
              search_text: result.searchText,
              embedding_generated_at: new Date().toISOString()
            })
            .eq('id', result.id);

          if (updateError) {
            throw new Error(updateError.message);
          }

          results.success++;
        } catch (error: unknown) {
          results.failed++;
          const message = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Book ${result.id}: ${message}`);
        }
      }

      console.log(`Embedding generation complete: ${results.success} success, ${results.failed} failed`);
      return results;

    } catch (error) {
      console.error('Batch embedding generation failed:', error);
      throw error;
    }
  }
}

export default AISearchService;