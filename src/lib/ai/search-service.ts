/**
 * AI-Powered Search Service
 */

import EmbeddingService from './embedding-service';
import { createClient } from '@supabase/supabase-js';

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
    options: {
      limit?: number;
      threshold?: number;
      category?: string;
    } = {}
  ): Promise<any[]> {
    const { limit = 10, threshold = 0.7, category } = options;

    try {
      // Generate query embedding with proper prefix
      const queryEmbedding = await EmbeddingService.generateEmbedding(query, true);

      // Prepare the RPC call
      let rpcCall = supabase.rpc('match_books_semantic', {
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
        results = results.filter((book: any) => 
          book.category?.toLowerCase().includes(category.toLowerCase())
        );
      }

      // Add search metadata
      return results.map((book: any) => ({
        ...book,
        searchMetadata: {
          similarity: book.similarity,
          searchMethod: 'semantic',
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
  ): Promise<any[]> {
    const { limit = 5, threshold = 0.8 } = options;

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
      return (data || []).slice(0, limit).map((book: any) => ({
        ...book,
        recommendationMetadata: {
          similarity: book.similarity,
          reason: 'content-similarity',
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
  static async generateAllBookEmbeddings(): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
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
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Book ${result.id}: ${error.message}`);
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