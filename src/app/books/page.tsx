'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabaseClient';
import { Book } from '@/lib/types';
import './books.css';

export default function BooksPage() {

  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const filteredBooks = books.filter(
    (book) =>
      book.name.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase())
  );

  const fetchBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .ilike('name', `%${search}%`)
      .order('created_at', { ascending: false });

    if (!error) {
      setBooks(data || []);
    } else {
      console.error('Error fetching books:', error.message);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif', background: '#f7f8fa', minHeight: '100vh' }}>
      <h1 style={{ fontWeight: 700, fontSize: '2.2rem', marginBottom: 8 }}>📚 Book Listings</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Browse our collection of books. More features coming soon!</p>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
        <input
          type="text"
          placeholder="Search by title or author..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="book-search-bar"
        />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
        gap: '20px',
        padding: '20px'
      }}>
        {filteredBooks.length > 0 ? (
          filteredBooks.map((book) => (
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
