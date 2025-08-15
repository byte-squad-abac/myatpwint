'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book } from '@/lib/types';

interface BookRecommendationsProps {
  currentBookId: string;
  title?: string;
  limit?: number;
}

export default function BookRecommendations({ 
  currentBookId, 
  title = "You might also like",
  limit = 5 
}: BookRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [currentBookId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: currentBookId,
          limit,
          threshold: 0.8
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);

    } catch (error) {
      console.error('Recommendations error:', error);
      setError('Unable to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="recommendations-loading" style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#666'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
        <div>Finding similar books...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommendations-error" style={{
        padding: '20px',
        color: '#d32f2f',
        textAlign: 'center'
      }}>
        {error}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="book-recommendations" style={{
      marginTop: '40px',
      padding: '20px 0'
    }}>
      <h3 style={{
        fontSize: '1.5rem',
        marginBottom: '20px',
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {title}
        <span style={{
          fontSize: '0.8rem',
          color: '#4CAF50',
          fontWeight: 'normal',
          backgroundColor: '#E8F5E9',
          padding: '2px 8px',
          borderRadius: '12px'
        }}>
          ✨ AI-Powered
        </span>
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '20px'
      }}>
        {recommendations.map((book) => (
          <Link 
            key={book.id} 
            href={`/books/${book.id}`} 
            style={{
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <div 
              className="recommendation-card"
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                backgroundColor: '#fff',
                position: 'relative'
              }}
              onMouseOver={(e) => {
                const card = e.currentTarget;
                card.style.transform = 'translateY(-4px)';
                card.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
              }}
              onMouseOut={(e) => {
                const card = e.currentTarget;
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
              }}
            >
              {/* Similarity Badge */}
              {(book as any).recommendationMetadata?.similarity && (
                <div style={{ 
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(76, 175, 80, 0.9)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  zIndex: 1
                }}>
                  {Math.round((book as any).recommendationMetadata.similarity * 100)}% match
                </div>
              )}

              <img
                src={book.image_url}
                alt={book.name}
                style={{
                  width: '100%',
                  height: '240px',
                  objectFit: 'cover'
                }}
              />
              
              <div style={{ padding: '12px' }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {book.name}
                </div>
                
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  marginBottom: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  by {book.author}
                </div>
                
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  color: '#641B2E' 
                }}>
                  {book.price.toLocaleString()} MMK
                </div>

                {book.category && (
                  <div style={{
                    fontSize: '11px',
                    color: '#888',
                    marginTop: '4px',
                    backgroundColor: '#f5f5f5',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    {book.category}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}