'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookWithSearchMetadata, 
  SemanticSearchProps,
  SemanticSearchResult 
} from '@/lib/types';

export default function SemanticSearch({ 
  onResults, 
  placeholder = "Search books in Myanmar or English...",
  category = "all",
  autoNavigate = false
}: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookWithSearchMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMethod, setSearchMethod] = useState<'semantic' | 'traditional'>('semantic');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEnterPressed, setIsEnterPressed] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  // Animated placeholder examples
  const placeholderExamples = [
    'Search with AI...',
    'Try "A novel about romance in modern Yangon"',
    'မြန်မာ့ဗုဒ္ဓဘာသာရဲ့ အနှစ်သာရနဲ့ ဓလေ့ထုံးတမ်းတွေ',
    'Describe what you want to read...',
    'Search "sci-fi" or "အနာဂတ်ဝတ္ထု"'
  ];

  // Typing animation effect
  useEffect(() => {
    if (query.length > 0 || isFocused) return; // Don't animate when focused or typing

    let timeout: NodeJS.Timeout;
    const currentExample = placeholderExamples[placeholderIndex];
    
    if (isTyping) {
      // Typing effect
      if (currentPlaceholder.length < currentExample.length) {
        timeout = setTimeout(() => {
          setCurrentPlaceholder(currentExample.slice(0, currentPlaceholder.length + 1));
        }, 100);
      } else {
        // Finished typing, wait then start erasing
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    } else {
      // Erasing effect
      if (currentPlaceholder.length > 0) {
        timeout = setTimeout(() => {
          setCurrentPlaceholder(currentPlaceholder.slice(0, -1));
        }, 50);
      } else {
        // Finished erasing, move to next example
        setPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentPlaceholder, placeholderIndex, isTyping, query, isFocused, placeholderExamples]);

  const handleSearch = useCallback(async (forPageUpdate: boolean = false) => {
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

      const data: SemanticSearchResult = await response.json();
      setResults(data.results || []);
      setSearchMethod(data.searchMethod);
      setShowDropdown(true);
      
      // Only update page results when Enter is pressed
      if (forPageUpdate) {
        onResults?.(data.results || [], true); // Update books page
      }

    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setShowDropdown(false);
      if (forPageUpdate) {
        onResults?.([], true); // Still active search, just failed
      }
    } finally {
      setLoading(false);
    }
  }, [query, category, onResults]);

  // Debounced search for dropdown only
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        handleSearch(false); // Don't update page, only dropdown
      } else {
        setResults([]);
        setShowDropdown(false);
        // Don't reset page results here - only when Enter is pressed with empty query
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, category, handleSearch]);

  const handleResultClick = useCallback((bookId: string) => {
    setShowDropdown(false);
    setQuery('');
    if (autoNavigate) {
      router.push(`/books/${bookId}`);
    }
  }, [autoNavigate, router]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim().length >= 2) {
        handleSearch(true); // Update the books page
      } else {
        // Clear search results when Enter is pressed with empty/short query
        onResults?.([], false);
      }
      setShowDropdown(false);
    }
  }, [query, handleSearch, onResults]);

  return (
    <>
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes slideDown {
          from { 
            opacity: 0; 
            transform: translateY(-10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.3); }
          50% { box-shadow: 0 0 30px rgba(102, 126, 234, 0.6); }
        }
        .search-container {
          position: relative;
          max-width: 700px;
          margin: 0 auto;
        }
        .search-bar {
          position: relative;
          background: linear-gradient(145deg, #ffffff, #f8f9ff);
          border: 2px solid transparent;
          background-clip: padding-box;
          border-radius: 25px;
          box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15);
          transition: all 0.3s ease;
        }
        .search-bar:focus-within {
          animation: glow 2s ease-in-out infinite;
          transform: translateY(-2px);
        }
        .search-bar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 25px;
          background: linear-gradient(145deg, #667eea, #764ba2);
          z-index: -1;
          margin: -2px;
        }
      `}</style>
      
      <div className="semantic-search search-container">
        {/* Minimal AI Search Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(145deg, #667eea, #764ba2)',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
          }}>
            🤖 <span>AI-Powered Search</span>
          </div>
        </div>

        {/* Sleek Search Bar */}
        <div className="search-bar">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={query.length > 0 || isFocused ? '' : currentPlaceholder}
              className="search-input"
              style={{
                width: '100%',
                padding: '18px 70px 18px 24px',
                fontSize: '16px',
                border: 'none',
                borderRadius: '23px',
                outline: 'none',
                backgroundColor: 'transparent',
                color: '#333',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onFocus={() => {
                setIsFocused(true);
                if (results.length > 0) setShowDropdown(true);
              }}
              onBlur={() => {
                setIsFocused(false);
              }}
            />
            
            {/* Animated cursor for placeholder */}
            {!query && !isFocused && (
              <span style={{
                position: 'absolute',
                left: `${24 + (currentPlaceholder.length * 8.5)}px`,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '2px',
                height: '20px',
                background: '#667eea',
                animation: 'blink 1s infinite',
                display: isTyping ? 'block' : 'none'
              }} />
            )}
            
            {/* Search Status Indicators */}
            <div style={{
              position: 'absolute',
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {loading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '15px',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'white',
                    animation: 'blink 1s infinite'
                  }} />
                  AI
                </div>
              )}

              {searchMethod === 'semantic' && results.length > 0 && !loading && (
                <div style={{
                  background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  ✨ {results.length}
                </div>
              )}
              
              {!loading && !results.length && (
                <div style={{
                  color: '#667eea',
                  fontSize: '18px'
                }}>
                  🔍
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Helper text */}
        <div style={{
          textAlign: 'center',
          marginTop: '12px',
          fontSize: '12px',
          color: '#888'
        }}>
          Press <kbd style={{ 
            background: '#f5f5f5', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontWeight: 'bold' 
          }}>Enter</kbd> to search the entire catalog
        </div>

      {/* Enhanced Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <div 
          className="search-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '500px',
            overflowY: 'auto',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '20px',
            marginTop: '8px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          {results.map((book, index) => (
            <div
              key={book.id}
              onClick={() => handleResultClick(book.id)}
              style={{
                padding: '16px 20px',
                borderBottom: index === results.length - 1 ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.3s ease',
                borderRadius: index === 0 ? '20px 20px 0 0' : index === results.length - 1 ? '0 0 20px 20px' : '0',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              {/* Book Cover with Enhanced Style */}
              <div style={{
                position: 'relative',
                minWidth: '48px'
              }}>
                <img
                  src={book.image_url}
                  alt={book.name}
                  style={{
                    width: '48px',
                    height: '72px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    transition: 'transform 0.3s ease'
                  }}
                />
                {(book as any).searchMetadata?.similarity && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                  }}>
                    {Math.round((book as any).searchMetadata.similarity * 100)}%
                  </div>
                )}
              </div>
              
              {/* Book Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '16px',
                  marginBottom: '6px',
                  color: '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {book.name}
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#666',
                  marginBottom: '4px'
                }}>
                  👤 {book.author}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    color: '#667eea'
                  }}>
                    💰 {book.price} MMK
                  </span>
                  <span style={{
                    background: 'rgba(102, 126, 234, 0.1)',
                    color: '#667eea',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    {book.category}
                  </span>
                </div>
              </div>
              
              {/* Arrow Indicator */}
              <div style={{
                color: '#667eea',
                fontSize: '18px',
                transition: 'transform 0.3s ease'
              }}>
                →
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
    </>
  );
}