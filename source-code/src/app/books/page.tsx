'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabaseClient';
import './books.css';


interface Book {
  id: string;
  name: string;
  price: number;
  author: string;
  description: string;
  category: string;
  published_date: string;
  edition: string;
  tags: string[];
  image_url: string;
  created_at: string;
}

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '28px' }}>
        {filteredBooks.length > 0 ? (
          filteredBooks.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`} passHref style={{ textDecoration: 'none' }}>
            <div
              key={book.id}
              className="book-card"
            >
              <img src={book.image_url} alt={book.name} style={{ width: '150px', height: '220px', objectFit: 'cover', borderRadius: '6px', marginBottom: 16, background: '#f0f0f0' }} />
              <h2 style={{ fontSize: '1.13rem', margin: '0 0 6px', fontWeight: 600, textAlign: 'center' }}>{book.name}</h2>
              <p style={{ color: '#888', margin: 0, fontSize: '0.98rem', textAlign: 'center' }}>by {book.author}</p>
              <p style={{ color: '#007b55', fontWeight: 700, margin: '12px 0 0', fontSize: '1.05rem' }}>{book.price}</p>
            </div>
            </Link>
          ))
        ) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#999', fontSize: '1.1rem' }}>No books found.</div>
        )}
      </div>
    </main>
  );
}
