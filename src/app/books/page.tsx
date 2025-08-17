'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabaseClient';
import SemanticSearch from '@/components/SemanticSearch';
import { Book, BookWithSearchMetadata } from '@/lib/types';
import './books.css';

export default function BooksPage() {

  const [books, setBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<BookWithSearchMetadata[] | null>(null);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [hasActiveSearch, setHasActiveSearch] = useState(false);
  
  // Use search results if there's an active search, otherwise show all books
  const displayBooks = hasActiveSearch && searchResults !== null ? searchResults : books;

  const fetchBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      // Shuffle books for random display
      const shuffledBooks = (data || []).sort(() => Math.random() - 0.5);
      setBooks(shuffledBooks);
      setAllBooks(data || []);
    } else {
      console.error('Error fetching books:', error.message);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleSearchResults = useCallback((results: BookWithSearchMetadata[], isSearchActive: boolean = false) => {
    setSearchResults(results);
    setHasActiveSearch(isSearchActive);
  }, []);

  return (
    <main style={{ padding: '0 20px 20px', fontFamily: 'sans-serif', background: '#fff', minHeight: '100vh' }}>
      {/* AI-Powered Semantic Search */}
      <div style={{ marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
        <SemanticSearch 
          onResults={handleSearchResults}
          placeholder="Search books in Myanmar or English with AI..."
          autoNavigate={true}
        />
      </div>
      
      <p style={{ fontSize: '1.5rem', color: '#666', marginBottom: 32, textAlign: 'center' }}>
        {hasActiveSearch 
          ? `Found ${searchResults?.length || 0} books matching your search`
          : 'Browse our collection of books'}
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
        gap: '20px',
        padding: '20px'
      }}>
        {displayBooks.length > 0 ? (
          displayBooks.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`} passHref style={{ textDecoration: 'none' }}>
              <div className="book-card">
                <img 
                  src={book.image_url} 
                  alt={book.name} 
                  className="book-cover"
                />
                <div className="book-info">
                  <h2 className="book-title">{book.name}</h2>
                  <p className="book-author">by {book.author}</p>
                  <p className="book-price">{book.price} MMK</p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', fontSize: '1.1rem', padding: '40px' }}>
            No books found.
          </div>
        )}
      </div>
    </main>
  );
}
