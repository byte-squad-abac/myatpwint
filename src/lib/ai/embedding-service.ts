/**
 * E5 Multilingual Embedding Service for Myanmar NLP
 * Using the E5 model via HuggingFace Inference Providers
 */

import type { Book, EmbeddingResult } from '@/types'
import { AI_CONFIG, HUGGING_FACE_CONFIG, MYANMAR_CONFIG } from '@/constants'

class EmbeddingService {
  // E5 model - excellent for multilingual embeddings including Myanmar
  private static readonly E5_MODEL = AI_CONFIG.EMBEDDING_MODEL
  // HF Inference Providers endpoint for feature extraction (reliable for E5 model)
  private static readonly HF_API_URL = HUGGING_FACE_CONFIG.API_URL
  private static readonly HF_TOKEN = process.env.HUGGING_FACE_TOKEN

  /**
   * Preprocess Myanmar text for E5 model
   */
  static preprocessText(text: string): string {
    let processed = text.normalize(MYANMAR_CONFIG.NORMALIZATION_FORM).trim();
    processed = processed.replace(/\s+/g, ' ');
    
    // Apply Myanmar punctuation mapping
    Object.entries(MYANMAR_CONFIG.PUNCTUATION_MAPPING).forEach(([myanmar, english]) => {
      processed = processed.replace(new RegExp(myanmar, 'g'), english);
    });
    
    return processed;
  }

  /**
   * Build search text from book data
   */
  static buildBookSearchText(book: Book): string {
    const parts = [
      book.name || '',
      book.author_name || '',
      book.description || '',
      book.category || '',
      (book.tags || []).join(' ')
    ].filter(Boolean);

    return this.preprocessText(parts.join(' '));
  }

  /**
   * Generate E5 embeddings with proper query/passsage prefix
   */
  static async generateEmbedding(
    text: string,
    isQuery: boolean = false
  ): Promise<number[]> {
    if (!this.HF_TOKEN) {
      throw new Error('HUGGING_FACE_TOKEN is not set');
    }

    const processedText = this.preprocessText(text);
    // E5 model needs query/passage prefixes for optimal performance
    const prefixedText = isQuery ? `query: ${processedText}` : `passage: ${processedText}`;
    const url = `${this.HF_API_URL}/${this.E5_MODEL}/${HUGGING_FACE_CONFIG.PIPELINE}`;
    
    // Remove console logs in production
    if (process.env.NODE_ENV === 'development') {
      console.log('Calling HuggingFace API:', url);
      console.log('Token exists:', !!this.HF_TOKEN);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prefixedText
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      // Inference API may return number[] or number[][]; normalize to 1D
      if (Array.isArray(result)) {
        return Array.isArray(result[0]) ? result[0] : result;
      }
      throw new Error('Unexpected embedding response format');
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Batch generate embeddings for multiple books
   */
  static async batchGenerateEmbeddings(books: Book[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const batchSize = AI_CONFIG.BATCH_SIZE;

    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);
      const batchPromises = batch.map(async (book) => {
        const searchText = this.buildBookSearchText(book);
        const embedding = await this.generateEmbedding(searchText, false);
        return { id: book.id, embedding, searchText };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (i + batchSize < books.length) {
        await new Promise((resolve) => setTimeout(resolve, AI_CONFIG.BATCH_DELAY));
      }
    }

    return results;
  }
}

export default EmbeddingService;