/**
 * E5 Multilingual Embedding Service for Myanmar NLP
 * Using the E5 model via HuggingFace Inference Providers
 */

import { Book, EmbeddingResult } from '@/lib/types';

class EmbeddingService {
  // E5 model - excellent for multilingual embeddings including Myanmar
  private static readonly E5_MODEL = 'intfloat/multilingual-e5-base';
  // HF Inference Providers endpoint for feature extraction (reliable for E5 model)
  private static readonly HF_API_URL = 'https://router.huggingface.co/hf-inference/models';
  private static readonly HF_TOKEN = process.env.HUGGING_FACE_TOKEN;

  /**
   * Preprocess Myanmar text for E5 model
   */
  static preprocessText(text: string): string {
    let processed = text.normalize('NFC').trim();
    processed = processed.replace(/\s+/g, ' ');
    processed = processed.replace(/၊/g, ', ').replace(/။/g, '. ');
    return processed;
  }

  /**
   * Build search text from book data
   */
  static buildBookSearchText(book: Book): string {
    const parts = [
      book.name || '',
      book.author || '',
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
    const url = `${this.HF_API_URL}/${this.E5_MODEL}/pipeline/feature-extraction`;
    
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
    const batchSize = 5;

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
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export default EmbeddingService;