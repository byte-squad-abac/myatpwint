/**
 * Pinecone Vector Database Service
 * Handles vector operations for book recommendations
 */

import { PineconeClient } from '@pinecone-database/pinecone';

export interface BookVector {
  id: string;
  values: number[];
  metadata: {
    bookId: string;
    title: string;
    author: string;
    category: string;
    language: string;
    price: number;
    rating?: number;
    tags?: string[];
  };
}

export interface SimilarityResult {
  bookId: string;
  score: number;
  metadata: any;
}

export class PineconeService {
  private client: PineconeClient;
  private index: any;
  private indexName: string = 'myanmar-books';
  private initialized: boolean = false;

  constructor() {
    this.client = new PineconeClient();
  }

  /**
   * Initialize Pinecone client and index
   */
  async initialize(): Promise<void> {
    try {
      await this.client.init({
        environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp-free',
        apiKey: process.env.PINECONE_API_KEY!,
      });

      // Check if index exists, create if it doesn't
      const indexList = await this.client.listIndexes();
      const indexExists = indexList.includes(this.indexName);

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        await this.client.createIndex({
          createRequest: {
            name: this.indexName,
            dimension: 384, // MiniLM embedding dimension
            metric: 'cosine',
            pod_type: 'p1.x1',
          },
        });
        
        // Wait for index to be ready
        await this.waitForIndexReady();
      }

      this.index = this.client.Index(this.indexName);
      this.initialized = true;
      console.log('✅ Pinecone service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Pinecone service:', error);
      throw error;
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait time

    while (attempts < maxAttempts) {
      try {
        const indexStats = await this.client.describeIndex({
          indexName: this.indexName,
        });

        if (indexStats.status?.ready) {
          console.log('✅ Pinecone index is ready');
          return;
        }

        console.log(`⏳ Waiting for index to be ready... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        console.log(`⚠️ Error checking index status, retrying... (${attempts + 1}/${maxAttempts})`);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    throw new Error('Index did not become ready within timeout period');
  }

  /**
   * Upsert book vectors to Pinecone
   */
  async upsertBookVectors(vectors: BookVector[]): Promise<void> {
    if (!this.initialized || !this.index) {
      throw new Error('Pinecone service not initialized');
    }

    try {
      const upsertRequest = {
        vectors: vectors.map(vector => ({
          id: vector.id,
          values: vector.values,
          metadata: vector.metadata,
        })),
      };

      await this.index.upsert({ upsertRequest });
      console.log(`✅ Upserted ${vectors.length} vectors to Pinecone`);
    } catch (error) {
      console.error('❌ Error upserting vectors to Pinecone:', error);
      throw error;
    }
  }

  /**
   * Query for similar books
   */
  async findSimilarBooks(
    queryVector: number[],
    topK: number = 10,
    filter?: any
  ): Promise<SimilarityResult[]> {
    if (!this.initialized || !this.index) {
      throw new Error('Pinecone service not initialized');
    }

    try {
      const queryRequest = {
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter,
      };

      const queryResponse = await this.index.query({ queryRequest });
      
      return queryResponse.matches?.map((match: any) => ({
        bookId: match.metadata?.bookId || match.id,
        score: match.score,
        metadata: match.metadata,
      })) || [];
    } catch (error) {
      console.error('❌ Error querying Pinecone:', error);
      throw error;
    }
  }

  /**
   * Delete book vector from Pinecone
   */
  async deleteBookVector(bookId: string): Promise<void> {
    if (!this.initialized || !this.index) {
      throw new Error('Pinecone service not initialized');
    }

    try {
      await this.index.delete1({ ids: [bookId] });
      console.log(`✅ Deleted vector for book: ${bookId}`);
    } catch (error) {
      console.error('❌ Error deleting vector from Pinecone:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    if (!this.initialized || !this.index) {
      throw new Error('Pinecone service not initialized');
    }

    try {
      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('❌ Error getting index stats:', error);
      throw error;
    }
  }

  /**
   * Batch process book embeddings from database
   */
  async syncBookEmbeddings(books: any[]): Promise<void> {
    if (!books.length) return;

    const batchSize = 100; // Pinecone batch size limit
    
    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);
      
      try {
        // Generate embeddings for books that don't have them
        const vectors: BookVector[] = [];
        
        for (const book of batch) {
          // Call Python service to generate embedding
          const embedding = await this.generateBookEmbedding(book);
          
          if (embedding) {
            vectors.push({
              id: book.id,
              values: embedding,
              metadata: {
                bookId: book.id,
                title: book.name,
                author: book.author,
                category: book.category || 'uncategorized',
                language: this.detectLanguage(book.name, book.author),
                price: book.price || 0,
                rating: book.rating || 0,
                tags: Array.isArray(book.tags) ? book.tags : 
                      (typeof book.tags === 'string' ? JSON.parse(book.tags) : []),
              },
            });
          }
        }

        if (vectors.length > 0) {
          await this.upsertBookVectors(vectors);
        }

        console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(books.length / batchSize)}`);
        
        // Rate limiting - wait between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error processing batch starting at index ${i}:`, error);
      }
    }
  }

  /**
   * Generate embedding for a book by calling Python service
   */
  private async generateBookEmbedding(book: any): Promise<number[] | null> {
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
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.embedding;
    } catch (error) {
      console.error(`❌ Error generating embedding for book ${book.id}:`, error);
      return null;
    }
  }

  /**
   * Detect language based on text content
   */
  private detectLanguage(title: string, author: string): string {
    const text = `${title} ${author}`.toLowerCase();
    
    // Simple Myanmar script detection
    const myanmarPattern = /[\u1000-\u109F\u1040-\u1049\uAA60-\uAA7F]/;
    if (myanmarPattern.test(text)) {
      return 'myanmar';
    }
    
    return 'english';
  }

  /**
   * Search books by text query
   */
  async searchBooks(
    query: string,
    topK: number = 20,
    filter?: any
  ): Promise<SimilarityResult[]> {
    try {
      // Generate embedding for search query
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${pythonServiceUrl}/embeddings/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: query,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate query embedding: ${response.statusText}`);
      }

      const result = await response.json();
      const queryVector = result.embedding;

      // Search in Pinecone
      return await this.findSimilarBooks(queryVector, topK, filter);
    } catch (error) {
      console.error('❌ Error in semantic search:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    topK: number = 10
  ): Promise<SimilarityResult[]> {
    try {
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${pythonServiceUrl}/recommendations/personalized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          limit: topK,
          exclude_purchased: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get personalized recommendations: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Convert to SimilarityResult format
      return result.recommendations?.map((rec: any) => ({
        bookId: rec.id,
        score: rec.similarity_score || 0,
        metadata: {
          bookId: rec.id,
          title: rec.name,
          author: rec.author,
          category: rec.category,
          price: rec.price,
          recommendationReason: rec.recommendation_reason,
        },
      })) || [];
    } catch (error) {
      console.error('❌ Error getting personalized recommendations:', error);
      throw error;
    }
  }

  /**
   * Get trending books
   */
  async getTrendingBooks(topK: number = 10): Promise<SimilarityResult[]> {
    try {
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${pythonServiceUrl}/recommendations/trending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: topK,
          time_window_days: 30,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get trending books: ${response.statusText}`);
      }

      const result = await response.json();
      
      return result.recommendations?.map((rec: any) => ({
        bookId: rec.id,
        score: rec.similarity_score || 0,
        metadata: {
          bookId: rec.id,
          title: rec.name,
          author: rec.author,
          category: rec.category,
          price: rec.price,
          recommendationReason: rec.recommendation_reason,
        },
      })) || [];
    } catch (error) {
      console.error('❌ Error getting trending books:', error);
      throw error;
    }
  }

  /**
   * Check if service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized || !this.index) {
        return false;
      }

      await this.getIndexStats();
      return true;
    } catch (error) {
      console.error('❌ Pinecone health check failed:', error);
      return false;
    }
  }
}