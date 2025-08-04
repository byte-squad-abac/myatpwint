'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/lib/pwa/offlineStorage';
import { OfflineBook } from '@/lib/types';

interface UseOfflineBooksReturn {
  offlineBooks: OfflineBook[];
  isDownloading: string | null;
  downloadProgress: number;
  downloadBook: (book: { id: string; title: string; author: string; fileUrl: string }) => Promise<boolean>;
  deleteOfflineBook: (id: string) => Promise<void>;
  getOfflineBookFile: (id: string) => Promise<Blob | null>;
  isBookOffline: (id: string) => boolean;
  storageUsage: {
    used: number;
    quota: number;
    available: number;
    books: number;
  } | null;
  refreshOfflineBooks: () => Promise<void>;
}

export function useOfflineBooks(): UseOfflineBooksReturn {
  const [offlineBooks, setOfflineBooks] = useState<OfflineBook[]>([]);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [storageUsage, setStorageUsage] = useState<{
    used: number;
    quota: number;
    available: number;
    books: number;
  } | null>(null);

  const refreshOfflineBooks = useCallback(async () => {
    try {
      const books = await offlineStorage.getAllOfflineBooks();
      setOfflineBooks(books);
      
      const usage = await offlineStorage.getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('Failed to refresh offline books:', error);
    }
  }, []);

  useEffect(() => {
    refreshOfflineBooks();
  }, [refreshOfflineBooks]);

  const downloadBook = useCallback(async (book: {
    id: string;
    title: string;
    author: string;
    fileUrl: string;
  }): Promise<boolean> => {
    try {
      setIsDownloading(book.id);
      setDownloadProgress(0);

      // Simulate download progress (since we can't easily track real progress with fetch)
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const success = await offlineStorage.downloadBookForOffline(book);
      
      clearInterval(progressInterval);
      setDownloadProgress(100);
      
      if (success) {
        await refreshOfflineBooks();
        
        // Show success for a moment
        setTimeout(() => {
          setIsDownloading(null);
          setDownloadProgress(0);
        }, 1000);
        
        return true;
      } else {
        setIsDownloading(null);
        setDownloadProgress(0);
        return false;
      }
    } catch (error) {
      console.error('Download failed:', error);
      setIsDownloading(null);
      setDownloadProgress(0);
      return false;
    }
  }, [refreshOfflineBooks]);

  const deleteOfflineBook = useCallback(async (id: string): Promise<void> => {
    try {
      await offlineStorage.deleteOfflineBook(id);
      await refreshOfflineBooks();
    } catch (error) {
      console.error('Failed to delete offline book:', error);
      throw error;
    }
  }, [refreshOfflineBooks]);

  const getOfflineBookFile = useCallback(async (id: string): Promise<Blob | null> => {
    try {
      return await offlineStorage.getOfflineBookFile(id);
    } catch (error) {
      console.error('Failed to get offline book file:', error);
      return null;
    }
  }, []);

  const isBookOffline = useCallback((id: string): boolean => {
    return offlineBooks.some(book => book.id === id);
  }, [offlineBooks]);

  return {
    offlineBooks,
    isDownloading,
    downloadProgress,
    downloadBook,
    deleteOfflineBook,
    getOfflineBookFile,
    isBookOffline,
    storageUsage,
    refreshOfflineBooks
  };
}