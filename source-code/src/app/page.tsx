"use client";

import Link from 'next/link';
import './page.css';

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <h1 className="hero-title">📚 Myat Pwint Publishing House</h1>
        <p className="hero-subtitle">
          Discover, read, rent, or publish books — an all-in-one platform for readers,
          authors, and publishers across Myanmar and beyond.
        </p>

        <div className="button-group">
          <Link href="/books" className="button primary">Explore Books</Link>
          <Link href="/login" className="button secondary">Login / Signup</Link>
        </div>
        <div style={{ marginTop: 16 }}>
          <Link href="/publisher" style={{ fontSize: '0.98rem', color: '#888', textDecoration: 'underline' }}>
            Publisher Login
          </Link>
        </div>
      </section>
    </main>
  );
} 