'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// CSS animations
const styleSheet = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  @keyframes slideInUp {
    from { 
      opacity: 0; 
      transform: translateY(20px) scale(0.95); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
  }
  
  @keyframes shimmer {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.querySelector('#semantic-search-styles')) {
  const style = document.createElement('style');
  style.id = 'semantic-search-styles';
  style.textContent = styleSheet;
  document.head.appendChild(style);
}
import { 
  BookWithSearchMetadata, 
  SemanticSearchProps,
  SemanticSearchResult 
} from '@/lib/types';

interface SemanticSearchWithHeaderProps extends SemanticSearchProps {
  pageTitle?: string;
  headerMode?: boolean;
}

export default function SemanticSearch({ 
  onResults, 
  placeholder = "Search books in Myanmar or English...",
  category = "all",
  autoNavigate = false,
  pageTitle = "Books",
  headerMode = false
}: SemanticSearchWithHeaderProps) {
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
  const [isScrolled, setIsScrolled] = useState(false);
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

  // Scroll detection for sticky behavior
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Header mode for integration into existing navigation
  if (headerMode) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{
          position: 'relative',
          background: 'rgba(252, 235, 213, 0.95)',
          border: '1px solid rgba(252, 235, 213, 0.3)',
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease'
        }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={query.length > 0 || isFocused ? '' : currentPlaceholder}
            style={{
              width: '100%',
              padding: '12px 50px 12px 16px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '18px',
              outline: 'none',
              backgroundColor: 'transparent',
              color: '#5B2C3B',
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
              left: `${16 + (currentPlaceholder.length * 6.8)}px`,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '1px',
              height: '16px',
              background: '#5B2C3B',
              opacity: isTyping ? 1 : 0,
              display: isTyping ? 'block' : 'none'
            }} />
          )}
          
          {/* Enhanced Search Status Indicators */}
          <div style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 2
          }}>
            {loading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'linear-gradient(135deg, rgba(91, 44, 59, 0.9), rgba(91, 44, 59, 0.7))',
                color: '#FCEBD5',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(252, 235, 213, 0.2)',
                boxShadow: '0 2px 8px rgba(91, 44, 59, 0.3)'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#FCEBD5',
                  animation: 'pulse 1.5s infinite'
                }} />
                AI
              </div>
            )}

            {searchMethod === 'semantic' && results.length > 0 && !loading && (
              <div style={{
                background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                ✨ {results.length}
              </div>
            )}
            
            {!loading && !results.length && query.length === 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(201, 126, 126, 0.8), rgba(201, 126, 126, 0.6))',
                color: '#FCEBD5',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                border: '1px solid rgba(252, 235, 213, 0.2)',
                boxShadow: '0 2px 8px rgba(201, 126, 126, 0.2)'
              }}>
                🤖 AI
              </div>
            )}
          </div>
        </div>

        {/* Dropdown Results for header mode */}
        {showDropdown && results.length > 0 && (
          <div 
            style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              right: '0',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '400px',
              overflowY: 'auto',
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              marginTop: '8px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              opacity: showDropdown ? 1 : 0,
              transform: showDropdown ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.3s ease'
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
                  borderRadius: index === 0 ? '16px 16px 0 0' : index === results.length - 1 ? '0 0 16px 16px' : '0',
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
                {/* Book Cover */}
                <div style={{ position: 'relative', minWidth: '48px' }}>
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
    );
  }

  // Original full page mode
  return (
    <div>

      {/* Enhanced Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <div 
          className="search-dropdown"
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: showDropdown ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-10px)',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '400px',
            overflowY: 'auto',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
            marginTop: '8px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            opacity: showDropdown ? 1 : 0,
            transition: 'all 0.3s ease'
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
  );
}