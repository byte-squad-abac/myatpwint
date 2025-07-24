'use client';

import { useState, useEffect, useCallback } from 'react';

// Types for offline book management
export interface OfflineBook {
  id: string;
  title: string;
  author: string;
  fileType: 'pdf' | 'epub' | 'txt';
  fileUrl: string;
  fileData: ArrayBuffer;
  coverUrl?: string;
  downloadedAt: number;
  lastAccessedAt: number;
  fileSize: number;
}

interface OfflineBookMetadata {
  id: string;
  title: string;
  author: string;
  fileType: 'pdf' | 'epub' | 'txt';
  fileUrl: string;
  coverUrl?: string;
  downloadedAt: number;
  lastAccessedAt: number;
  fileSize: number;
}

// IndexedDB configuration
const DB_NAME = 'MyatPwintOfflineBooks';
const DB_VERSION = 1;
const BOOKS_STORE = 'books';
const METADATA_STORE = 'metadata';

/**
 * Custom hook for managing offline book storage and retrieval
 * 
 * This hook provides functionality to:
 * - Download and store books offline using IndexedDB
 * - Check if books are available offline
 * - Retrieve offline books for reading
 * - Manage offline storage space
 * 
 * Technical Implementation:
 * - Uses IndexedDB for large file storage (better than localStorage)
 * - Separates metadata from file data for efficient queries
 * - Implements proper error handling and cleanup
 * 
 * References:
 * - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 * - https://web.dev/indexeddb/
 */
export function useOfflineBooks() {
  const [offlineBooks, setOfflineBooks] = useState<OfflineBookMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storageQuota, setStorageQuota] = useState<{ used: number; quota: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize IndexedDB
  const initDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create books store for file data
        if (!db.objectStoreNames.contains(BOOKS_STORE)) {
          const booksStore = db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
          booksStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }

        // Create metadata store for quick queries
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
          metadataStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
          metadataStore.createIndex('fileType', 'fileType', { unique: false });
        }
      };
    });
  }, []);

  // Load offline books metadata on component mount
  useEffect(() => {
    loadOfflineBooks();
    checkStorageQuota();
  }, []);

  // Load offline books metadata from IndexedDB
  const loadOfflineBooks = async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        setOfflineBooks(request.result || []);
      };

      request.onerror = () => {
        setError('Failed to load offline books');
      };
    } catch (err) {
      console.error('Error loading offline books:', err);
      setError('Failed to access offline storage');
    }
  };

  // Check storage quota and usage
  const checkStorageQuota = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        setStorageQuota({
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      } catch (err) {
        console.warn('Could not get storage estimate:', err);
      }
    }
  };

  // Check if a book is available offline
  const isBookOffline = useCallback((bookId: string): boolean => {
    return offlineBooks.some(book => book.id === bookId);
  }, [offlineBooks]);

  // Download and store a book offline
  const downloadBookOffline = async (
    bookId: string,
    title: string,
    author: string,
    fileUrl: string,
    fileType: 'pdf' | 'epub' | 'txt',
    coverUrl?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if book is already offline
      if (isBookOffline(bookId)) {
        setError('Book is already available offline');
        return false;
      }

      // Download the file
      console.log('[Offline] Downloading book:', title);
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download book: ${response.statusText}`);
      }

      const fileData = await response.arrayBuffer();
      const fileSize = fileData.byteLength;

      // Check storage space
      if (storageQuota && (storageQuota.used + fileSize > storageQuota.quota)) {
        throw new Error('Not enough storage space. Please free up some space and try again.');
      }

      const db = await initDB();
      const transaction = db.transaction([BOOKS_STORE, METADATA_STORE], 'readwrite');
      
      const now = Date.now();
      
      // Store file data
      const booksStore = transaction.objectStore(BOOKS_STORE);
      const bookData: OfflineBook = {
        id: bookId,
        title,
        author,
        fileType,
        fileUrl,
        fileData,
        coverUrl,
        downloadedAt: now,
        lastAccessedAt: now,
        fileSize,
      };
      
      booksStore.add(bookData);

      // Store metadata
      const metadataStore = transaction.objectStore(METADATA_STORE);
      const metadata: OfflineBookMetadata = {
        id: bookId,
        title,
        author,
        fileType,
        fileUrl,
        coverUrl,
        downloadedAt: now,
        lastAccessedAt: now,
        fileSize,
      };
      
      metadataStore.add(metadata);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          console.log('[Offline] Book downloaded successfully:', title);
          loadOfflineBooks(); // Refresh the list
          checkStorageQuota(); // Update storage usage
          resolve(true);
        };

        transaction.onerror = () => {
          reject(new Error('Failed to store book offline'));
        };
      });

    } catch (err) {
      console.error('Error downloading book offline:', err);
      setError(err instanceof Error ? err.message : 'Failed to download book offline');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Retrieve offline book data for reading
  const getOfflineBook = async (bookId: string): Promise<OfflineBook | null> => {
    try {
      const db = await initDB();
      const transaction = db.transaction([BOOKS_STORE, METADATA_STORE], 'readwrite');
      const booksStore = transaction.objectStore(BOOKS_STORE);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      // Get book data
      const bookRequest = booksStore.get(bookId);
      
      return new Promise((resolve, reject) => {
        bookRequest.onsuccess = () => {
          const book = bookRequest.result;
          if (book) {
            // Update last accessed time
            book.lastAccessedAt = Date.now();
            booksStore.put(book);
            
            // Update metadata
            metadataStore.get(bookId).onsuccess = (metaEvent) => {
              const metadata = (metaEvent.target as IDBRequest).result;
              if (metadata) {
                metadata.lastAccessedAt = Date.now();
                metadataStore.put(metadata);
              }
            };
            
            resolve(book);
          } else {
            resolve(null);
          }
        };

        bookRequest.onerror = () => {
          reject(new Error('Failed to retrieve offline book'));
        };
      });

    } catch (err) {
      console.error('Error retrieving offline book:', err);
      return null;
    }
  };

  // Remove a book from offline storage
  const removeOfflineBook = async (bookId: string): Promise<boolean> => {
    try {
      const db = await initDB();
      const transaction = db.transaction([BOOKS_STORE, METADATA_STORE], 'readwrite');
      const booksStore = transaction.objectStore(BOOKS_STORE);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      booksStore.delete(bookId);
      metadataStore.delete(bookId);

      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          console.log('[Offline] Book removed from offline storage:', bookId);
          loadOfflineBooks(); // Refresh the list
          checkStorageQuota(); // Update storage usage
          resolve(true);
        };

        transaction.onerror = () => {
          setError('Failed to remove offline book');
          resolve(false);
        };
      });

    } catch (err) {
      console.error('Error removing offline book:', err);
      setError('Failed to remove offline book');
      return false;
    }
  };

  // Clear all offline books (for storage management)
  const clearAllOfflineBooks = async (): Promise<boolean> => {
    try {
      const db = await initDB();
      const transaction = db.transaction([BOOKS_STORE, METADATA_STORE], 'readwrite');
      
      transaction.objectStore(BOOKS_STORE).clear();
      transaction.objectStore(METADATA_STORE).clear();

      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          console.log('[Offline] All offline books cleared');
          loadOfflineBooks();
          checkStorageQuota();
          resolve(true);
        };

        transaction.onerror = () => {
          setError('Failed to clear offline books');
          resolve(false);
        };
      });

    } catch (err) {
      console.error('Error clearing offline books:', err);
      setError('Failed to clear offline books');
      return false;
    }
  };

  // Get formatted storage usage
  const getStorageUsage = () => {
    if (!storageQuota) return null;

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      used: formatBytes(storageQuota.used),
      quota: formatBytes(storageQuota.quota),
      percentage: Math.round((storageQuota.used / storageQuota.quota) * 100),
    };
  };

  return {
    // State
    offlineBooks,
    isLoading,
    error,
    storageQuota,
    
    // Functions
    isBookOffline,
    downloadBookOffline,
    getOfflineBook,
    removeOfflineBook,
    clearAllOfflineBooks,
    getStorageUsage,
    
    // Refresh functions
    refreshOfflineBooks: loadOfflineBooks,
    refreshStorageQuota: checkStorageQuota,
  };
}

// Utility hook to check online/offline status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('[Network] App is online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[Network] App is offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}