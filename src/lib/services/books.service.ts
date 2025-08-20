/**
 * Books Service
 * 
 * Centralized service for all book-related operations
 * including fetching, searching, and purchasing books.
 */

import { createClient } from '@supabase/supabase-js';
import { BaseService } from './base.service';
import { Book, BookFilters, Purchase, DeliveryType, PaginatedResponse } from '../types';
import { config } from '../config';

const supabase = createClient(config.supabase.url, config.supabase.anonKey);

export class BooksService extends BaseService {
  /**
   * Get all books with optional filtering
   */
  static async getBooks(filters?: BookFilters): Promise<Book[]> {
    return this.withRetry(async () => {
      let query = supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.author) {
        query = query.ilike('author', `%${filters.author}%`);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,author.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters?.priceRange) {
        const [min, max] = filters.priceRange;
        query = query.gte('price', min).lte('price', max);
      }

      const response = await query;
      return this.formatResponse(response).data;
    });
  }

  /**
   * Get paginated books
   */
  static async getPaginatedBooks(
    page: number = 1,
    pageSize: number = 20,
    filters?: BookFilters
  ): Promise<PaginatedResponse<Book>> {
    return this.withRetry(async () => {
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from('books')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      // Apply filters (same as getBooks)
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,author.ilike.%${filters.search}%`);
      }

      const response = await query;
      const result = this.formatResponse(response);

      return {
        data: result.data,
        count: response.count || 0,
        page,
        totalPages: Math.ceil((response.count || 0) / pageSize),
      };
    });
  }

  /**
   * Get book by ID
   */
  static async getBookById(id: string): Promise<Book> {
    return this.withRetry(async () => {
      const response = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      return this.formatResponse(response).data;
    });
  }

  /**
   * Get featured books
   */
  static async getFeaturedBooks(limit: number = 10): Promise<Book[]> {
    return this.withRetry(async () => {
      const response = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      return this.formatResponse(response).data;
    });
  }

  /**
   * Search books
   */
  static async searchBooks(searchTerm: string): Promise<Book[]> {
    return this.withRetry(async () => {
      const response = await supabase
        .from('books')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      return this.formatResponse(response).data;
    });
  }

  /**
   * Get book categories
   */
  static async getCategories(): Promise<string[]> {
    return this.withRetry(async () => {
      const response = await supabase
        .from('books')
        .select('category')
        .not('category', 'is', null);

      const result = this.formatResponse(response);
      const categories = [...new Set(result.data.map(book => book.category))];
      return categories.filter(Boolean);
    });
  }

  /**
   * Purchase a book
   */
  static async purchaseBook(
    userId: string,
    bookId: string,
    deliveryType: DeliveryType,
    price: number
  ): Promise<Purchase> {
    return this.withRetry(async () => {
      const purchaseData = {
        user_id: userId,
        book_id: bookId,
        delivery_type: deliveryType,
        purchase_price: price,
        purchased_at: new Date().toISOString(),
      };

      const response = await supabase
        .from('purchases')
        .insert(purchaseData)
        .select()
        .single();

      return this.formatResponse(response).data;
    });
  }

  /**
   * Check if user has purchased a book
   */
  static async hasPurchased(userId: string, bookId: string): Promise<boolean> {
    return this.withRetry(async () => {
      const response = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .single();

      return response.data !== null;
    });
  }

  /**
   * Publish a book (creates new book and triggers marketing automation)
   */
  static async publishBook(bookData: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Promise<Book> {
    return this.withRetry(async () => {
      // Call the publish API endpoint
      const response = await fetch('/api/books/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish book');
      }

      const result = await response.json();
      return result.book;
    });
  }

  /**
   * Create/add a book (without publishing workflow)
   */
  static async createBook(bookData: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Promise<Book> {
    return this.withRetry(async () => {
      const bookToSave = {
        ...bookData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_date: bookData.published_date || new Date().toISOString(),
        tags: bookData.tags || [],
      };

      const response = await supabase
        .from('books')
        .insert(bookToSave)
        .select()
        .single();

      return this.formatResponse(response).data;
    });
  }
}