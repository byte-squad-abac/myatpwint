'use client';
import React, { useState } from 'react';
import './books.css';

const mockBooks = [
  {
    id: 1,
    title: 'The Golden Land',
    author: 'Aung Min',
    price: '10,000 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 2,
    title: 'Yangon Nights',
    author: 'Khin Myat',
    price: '12,500 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 3,
    title: 'Pagoda Dreams',
    author: 'Soe Win',
    price: '8,000 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 4,
    title: 'Mandalay Moon',
    author: 'Hla Hla',
    price: '15,000 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 5,
    title: 'Irrawaddy Tales',
    author: 'Min Thu',
    price: '9,500 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 6,
    title: 'Bamboo Dreams',
    author: 'Nyein Chan',
    price: '11,000 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 7,
    title: 'Lotus in the Lake',
    author: 'Su Su',
    price: '13,000 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 8,
    title: 'Sagaing Sunsets',
    author: 'Aye Chan',
    price: '10,500 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 9,
    title: 'Bagan Mysteries',
    author: 'Mya Mya',
    price: '14,000 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 10,
    title: 'Shwedagon Secrets',
    author: 'Zaw Zaw',
    price: '12,000 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 11,
    title: 'Rice Fields',
    author: 'Htet Htet',
    price: '9,000 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 12,
    title: 'Monsoon Memories',
    author: 'Thiri',
    price: '13,500 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 13,
    title: 'Jade Dragon',
    author: 'Ko Ko',
    price: '16,000 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
  {
    id: 14,
    title: 'Teakwood Tales',
    author: 'Ei Mon',
    price: '11,500 MMK',
    image: 'https://via.placeholder.com/150x220?text=Book+Cover',
  },
];

export default function BooksPage() {
  const [search, setSearch] = useState('');
  const filteredBooks = mockBooks.filter(
    (book) =>
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      book.author.toLowerCase().includes(search.toLowerCase())
  );

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
            <div
              key={book.id}
              className="book-card"
            >
              <img src={book.image} alt={book.title} style={{ width: '150px', height: '220px', objectFit: 'cover', borderRadius: '6px', marginBottom: 16, background: '#f0f0f0' }} />
              <h2 style={{ fontSize: '1.13rem', margin: '0 0 6px', fontWeight: 600, textAlign: 'center' }}>{book.title}</h2>
              <p style={{ color: '#888', margin: 0, fontSize: '0.98rem', textAlign: 'center' }}>by {book.author}</p>
              <p style={{ color: '#007b55', fontWeight: 700, margin: '12px 0 0', fontSize: '1.05rem' }}>{book.price}</p>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#999', fontSize: '1.1rem' }}>No books found.</div>
        )}
      </div>
    </main>
  );
}
