'use client';

import { OfflineBook } from '../types';

class OfflineStorageManager {
  private dbName = 'MyatPwintOfflineDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Books store
        if (!db.objectStoreNames.contains('offlineBooks')) {
          const booksStore = db.createObjectStore('offlineBooks', { keyPath: 'id' });
          booksStore.createIndex('title', 'title', { unique: false });
          booksStore.createIndex('downloadDate', 'downloadDate', { unique: false });
          booksStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Book files store (for actual file content)
        if (!db.objectStoreNames.contains('bookFiles')) {
          const filesStore = db.createObjectStore('bookFiles', { keyPath: 'id' });
        }

        // Reading progress store
        if (!db.objectStoreNames.contains('readingProgress')) {
          const progressStore = db.createObjectStore('readingProgress', { keyPath: 'bookId' });
          progressStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }
      };
    });
  }

  async downloadBookForOffline(book: {
    id: string;
    title: string;
    author: string;
    fileUrl: string;
  }): Promise<boolean> {
    try {
      await this.init();
      
      // Check if already downloaded
      const existingBook = await this.getOfflineBook(book.id);
      if (existingBook) {
        console.log('Book already downloaded offline');
        return true;
      }

      // Download the file
      console.log('Downloading book for offline reading:', book.title);
      const response = await fetch(book.fileUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download book: ${response.status}`);
      }

      const fileBlob = await response.blob();
      const fileSize = fileBlob.size;

      // Check available storage space
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const available = (estimate.quota || 0) - (estimate.usage || 0);
        
        // Need at least 100MB buffer
        if (available < fileSize + (100 * 1024 * 1024)) {
          throw new Error('Insufficient storage space');
        }
      }

      // Store book metadata
      const offlineBook: OfflineBook = {
        id: book.id,
        title: book.title,
        author: book.author,
        fileUrl: book.fileUrl,
        fileSize,
        downloadDate: new Date(),
        lastAccessed: new Date()
      };

      // Store in parallel
      await Promise.all([
        this.storeOfflineBook(offlineBook),
        this.storeBookFile(book.id, fileBlob)
      ]);

      console.log('Book downloaded successfully for offline reading');
      return true;

    } catch (error) {
      console.error('Failed to download book for offline:', error);
      return false;
    }
  }

  private async storeOfflineBook(book: OfflineBook): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineBooks'], 'readwrite');
      const store = transaction.objectStore('offlineBooks');
      
      const request = store.put(book);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async storeBookFile(id: string, fileBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookFiles'], 'readwrite');
      const store = transaction.objectStore('bookFiles');
      
      const request = store.put({ id, file: fileBlob });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineBook(id: string): Promise<OfflineBook | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineBooks'], 'readonly');
      const store = transaction.objectStore('offlineBooks');
      
      const request = store.get(id);
      request.onsuccess = () => {
        const book = request.result;
        if (book) {
          // Update last accessed
          book.lastAccessed = new Date();
          this.storeOfflineBook(book);
        }
        resolve(book || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineBookFile(id: string): Promise<Blob | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookFiles'], 'readonly');
      const store = transaction.objectStore('bookFiles');
      
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.file : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllOfflineBooks(): Promise<OfflineBook[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineBooks'], 'readonly');
      const store = transaction.objectStore('offlineBooks');
      
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOfflineBook(id: string): Promise<void> {
    await this.init();
    
    const transaction = this.db!.transaction(['offlineBooks', 'bookFiles'], 'readwrite');
    
    const bookStore = transaction.objectStore('offlineBooks');
    const fileStore = transaction.objectStore('bookFiles');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = bookStore.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = fileStore.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
  }

  async saveReadingProgress(bookId: string, progress: {
    currentPage: number;
    totalPages: number;
    percentage: number;
  }): Promise<void> {
    await this.init();
    
    const data = {
      bookId,
      ...progress,
      lastUpdated: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['readingProgress'], 'readwrite');
      const store = transaction.objectStore('readingProgress');
      
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getReadingProgress(bookId: string): Promise<any | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['readingProgress'], 'readonly');
      const store = transaction.objectStore('readingProgress');
      
      const request = store.get(bookId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageUsage(): Promise<{
    used: number;
    quota: number;
    available: number;
    books: number;
  }> {
    const usage = { used: 0, quota: 0, available: 0, books: 0 };

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      usage.used = estimate.usage || 0;
      usage.quota = estimate.quota || 0;
      usage.available = usage.quota - usage.used;
    }

    const books = await this.getAllOfflineBooks();
    usage.books = books.reduce((total, book) => total + book.fileSize, 0);

    return usage;
  }

  async cleanupOldBooks(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const books = await this.getAllOfflineBooks();
    const cutoff = new Date(Date.now() - maxAge);
    
    const oldBooks = books.filter(book => 
      new Date(book.lastAccessed) < cutoff
    );

    for (const book of oldBooks) {
      await this.deleteOfflineBook(book.id);
      console.log('Cleaned up old offline book:', book.title);
    }
  }
}

export const offlineStorage = new OfflineStorageManager();