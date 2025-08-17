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
  const router = useRouter();

  const handleSearch = useCallback(async () => {
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
      onResults?.(data.results || [], true); // Indicate search is active

    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setShowDropdown(false);
      onResults?.([], true); // Still active search, just failed
    } finally {
      setLoading(false);
    }
  }, [query, category, onResults]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        handleSearch();
      } else {
        setResults([]);
        setShowDropdown(false);
        onResults?.([], false); // Indicate search is not active
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, category, handleSearch, onResults]);

  const handleResultClick = useCallback((bookId: string) => {
    setShowDropdown(false);
    setQuery('');
    if (autoNavigate) {
      router.push(`/books/${bookId}`);
    }
  }, [autoNavigate, router]);

  return (
    <>
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
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
      `}</style>
      
      <div className="semantic-search" style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
      {/* Modern Search Container */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated Background Elements */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: 'float 6s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '150px',
          height: '150px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse'
        }} />
        
        {/* Search Instructions Header */}
        <div style={{
          marginBottom: '20px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2
        }}>
          <h3 style={{
            color: 'white',
            margin: '0 0 12px 0',
            fontSize: '24px',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            🤖 AI-Powered Book Discovery
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '8px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '20px',
              padding: '8px 16px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <span style={{ marginRight: '8px' }}>🇲🇲</span>
              "မြန်မာ သမိုင်း"
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '20px',
              padding: '8px 16px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <span style={{ marginRight: '8px' }}>❤️</span>
              "love story"
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '20px',
              padding: '8px 16px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <span style={{ marginRight: '8px' }}>📚</span>
              "biography"
            </div>
          </div>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            margin: '0',
            fontSize: '14px',
            fontWeight: '300'
          }}>
            ✨ Describe what you're looking for in natural language
          </p>
        </div>
        
        {/* Enhanced Search Input */}
        <div className="search-input-container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '4px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="search-input"
              style={{
                width: '100%',
                padding: '16px 60px 16px 20px',
                fontSize: '16px',
                border: 'none',
                borderRadius: '12px',
                outline: 'none',
                backgroundColor: 'transparent',
                color: '#333',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
            />
            
            {loading && (
              <div className="search-loading" style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                animation: 'pulse 2s infinite'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'white',
                  animation: 'bounce 1s infinite'
                }} />
                AI Searching...
              </div>
            )}

            {searchMethod === 'semantic' && results.length > 0 && !loading && (
              <div style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
              }}>
                ✨ AI Found {results.length}
              </div>
            )}
          </div>
        </div>
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