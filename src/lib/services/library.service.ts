/**
 * Library Service
 * 
 * Centralized service for library-related operations
 * including purchased books, reading progress, and offline functionality.
 */

import { createClient } from '@supabase/supabase-js';
import { BaseService } from './base.service';
import { LibraryBook, Purchase, Book } from '../types';
import { config } from '../config';

const supabase = createClient(config.supabase.url, config.supabase.anonKey);

export class LibraryService extends BaseService {
  /**
   * Get user's purchased books (library)
   */
  static async getUserLibrary(userId: string): Promise<LibraryBook[]> {
    return this.withRetry(async () => {
      const response = await supabase
        .from('purchases')
        .select(`
          *,
          books (
            id,
            name,
            author,
            description,
            category,
            image_url,
            file_url,
            tags,
            published_date,
            edition,
            price,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('purchased_at', { ascending: false });

      const result = this.formatResponse(response);

      // Transform purchases to library books
      const libraryBooks: LibraryBook[] = result.data.map((purchase: any) => ({
        id: purchase.books.id,
        name: purchase.books.name,
        author: purchase.books.author,
        description: purchase.books.description,
        category: purchase.books.category,
        image_url: purchase.books.image_url,
        file_url: purchase.books.file_url,
        tags: purchase.books.tags || [],
        published_date: purchase.books.published_date,
        edition: purchase.books.edition,
        price: purchase.books.price,
        created_at: purchase.books.created_at,
        // Library-specific fields
        fileName: `${purchase.books.name}.pdf`,
        file: null,
        size: 'Unknown',
        uploadDate: purchase.purchased_at,
        source: 'purchased' as const,
        fileUrl: purchase.books.file_url,
        purchasePrice: purchase.purchase_price,
        purchaseDate: purchase.purchased_at,
      }));

      return libraryBooks;
    });
  }

  /**
   * Get user's purchase history
   */
  static async getPurchaseHistory(userId: string): Promise<Purchase[]> {
    return this.withRetry(async () => {
      const response = await supabase
        .from('purchases')
        .select(`
          *,
          books (*)
        `)
        .eq('user_id', userId)
        .order('purchased_at', { ascending: false });

      return this.formatResponse(response).data;
    });
  }

  /**
   * Get a specific purchased book
   */
  static async getPurchasedBook(userId: string, bookId: string): Promise<LibraryBook | null> {
    return this.withRetry(async () => {
      const response = await supabase
        .from('purchases')
        .select(`
          *,
          books (
            id,
            name,
            author,
            description,
            category,
            image_url,
            file_url,
            tags,
            published_date,
            edition,
            price,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .single();

      if (response.error) {
        return null;
      }

      const purchase = response.data;
      
      // Transform to library book
      const libraryBook: LibraryBook = {
        id: purchase.books.id,
        name: purchase.books.name,
        author: purchase.books.author,
        description: purchase.books.description,
        category: purchase.books.category,
        image_url: purchase.books.image_url,
        file_url: purchase.books.file_url,
        tags: purchase.books.tags || [],
        published_date: purchase.books.published_date,
        edition: purchase.books.edition,
        price: purchase.books.price,
        created_at: purchase.books.created_at,
        // Library-specific fields
        fileName: `${purchase.books.name}.pdf`,
        file: null,
        size: 'Unknown',
        uploadDate: purchase.purchased_at,
        source: 'purchased' as const,
        fileUrl: purchase.books.file_url,
        purchasePrice: purchase.purchase_price,
        purchaseDate: purchase.purchased_at,
      };

      return libraryBook;
    });
  }

  /**
   * Save reading progress
   */
  static async saveReadingProgress(
    userId: string,
    bookId: string,
    progress: {
      currentPage: number;
      totalPages: number;
      percentage: number;
    }
  ): Promise<void> {
    return this.withRetry(async () => {
      const progressData = {
        user_id: userId,
        book_id: bookId,
        current_page: progress.currentPage,
        total_pages: progress.totalPages,
        percentage: progress.percentage,
        updated_at: new Date().toISOString(),
      };

      const response = await supabase
        .from('reading_progress')
        .upsert(progressData, { onConflict: 'user_id,book_id' });

      this.formatResponse(response);
    });
  }

  /**
   * Get reading progress
   */
  static async getReadingProgress(userId: string, bookId: string) {
    return this.withRetry(async () => {
      const response = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .single();

      if (response.error) {
        return null;
      }

      return response.data;
    });
  }

  /**
   * Get recently read books
   */
  static async getRecentlyRead(userId: string, limit: number = 10): Promise<LibraryBook[]> {
    return this.withRetry(async () => {
      const response = await supabase
        .from('reading_progress')
        .select(`
          *,
          books (*)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (response.error) {
        return [];
      }

      // Transform to library books
      const libraryBooks: LibraryBook[] = response.data.map((progress: any) => ({
        id: progress.books.id,
        name: progress.books.name,
        author: progress.books.author,
        description: progress.books.description,
        category: progress.books.category,
        image_url: progress.books.image_url,
        file_url: progress.books.file_url,
        tags: progress.books.tags || [],
        published_date: progress.books.published_date,
        edition: progress.books.edition,
        price: progress.books.price,
        created_at: progress.books.created_at,
        // Library-specific fields
        fileName: `${progress.books.name}.pdf`,
        file: null,
        size: 'Unknown',
        uploadDate: progress.updated_at,
        source: 'purchased' as const,
        fileUrl: progress.books.file_url,
      }));

      return libraryBooks;
    });
  }
}