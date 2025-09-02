'use client';

import { useState, useCallback } from 'react';
import { BookConfig } from '../types';

export function useBookConfig() {
  const [bookConfig, setBookConfig] = useState<BookConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookConfig = useCallback(async (
    bookId: string,
    userId: string,
    readerId: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      // Force destroy existing editor instances globally
      const existingReader = document.getElementById(readerId);
      if (existingReader) {
        existingReader.innerHTML = '';
      }
      
      // Clear any global OnlyOffice instances
      if (typeof window !== 'undefined' && window.DocsAPI) {
        try {
          // Clear OnlyOffice instances if available
          if ('instances' in window.DocsAPI && window.DocsAPI.DocEditor && 'instances' in window.DocsAPI.DocEditor) {
            (window.DocsAPI.DocEditor as { instances: Record<string, unknown> }).instances = {};
          }
        } catch {
          // OnlyOffice instances cleared
        }
      }
      
      const response = await fetch(`/api/onlyoffice/book-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load book configuration');
      }

      const config = await response.json();
      setBookConfig(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load book reader');
      console.error('Book config error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    bookConfig,
    loading,
    error,
    fetchBookConfig,
    setError
  };
}