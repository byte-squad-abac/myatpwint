'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Book } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface SemanticSearchProps {
  onResults?: (results: Book[]) => void;
  placeholder?: string;
  category?: string;
  autoNavigate?: boolean;
}

export default function SemanticSearch({ 
  onResults, 
  placeholder = "Search books in Myanmar or English...",
  category = "all",
  autoNavigate = false
}: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMethod, setSearchMethod] = useState<'semantic' | 'traditional'>('semantic');
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        handleSearch();
      } else {
        setResults([]);
        setShowDropdown(false);
        onResults?.([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, category]);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;

    setLoading(true);
    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          category: category === 'all' ? undefined : category,
          limit: 10,
          threshold: 0.7
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
      setSearchMethod(data.searchMethod);
      setShowDropdown(true);
      onResults?.(data.results || []);

    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setShowDropdown(false);
      onResults?.([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = useCallback((bookId: string) => {
    setShowDropdown(false);
    setQuery('');
    if (autoNavigate) {
      router.push(`/books/${bookId}`);
    }
  }, [autoNavigate, router]);

  return (
    <div className="semantic-search" style={{ position: 'relative' }}>
      <div className="search-input-container" style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="search-input"
          style={{
            width: '100%',
            padding: '12px 16px',
            paddingRight: '40px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.3s',
            backgroundColor: '#fff',
          }}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
        
        {loading && (
          <div className="search-loading" style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '20px'
          }}>
            🔍
          </div>
        )}

        {searchMethod === 'semantic' && results.length > 0 && (
          <span style={{
            position: 'absolute',
            right: '40px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#4CAF50',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            ✨ AI
          </span>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div 
          className="search-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            marginTop: '4px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
          }}
        >
          {results.map((book) => (
            <div
              key={book.id}
              onClick={() => handleResultClick(book.id)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <img
                src={book.image_url}
                alt={book.name}
                style={{
                  width: '40px',
                  height: '60px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                }}
              />
              
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '14px',
                  marginBottom: '4px'
                }}>
                  {book.name}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666' 
                }}>
                  {book.author} • {book.price} MMK
                </div>
                {(book as any).searchMetadata?.similarity && (
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#4CAF50',
                    marginTop: '2px'
                  }}>
                    {Math.round((book as any).searchMetadata.similarity * 100)}% match
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}