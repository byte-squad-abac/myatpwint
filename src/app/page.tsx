'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@supabase/auth-helpers-react';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthModal from '../components/AuthModal'; 
import AuthCard from '../components/AuthCard';
import './page.css';

export default function Home() {
 
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const [openPopup, setOpenPopup] = useState(false);
  const session = useSession();
  const isAuthed = Boolean(session?.user);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('auth') === '1') {
      setOpenPopup(true);
      router.replace('/', { scroll: false }); // clean the URL
    }
  }, [searchParams, router]);

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

          {isAuthed ? (
            <Link href="/profile" className="button secondary">Go to Profile</Link>
          ) : (
            <button className="button secondary" onClick={() => setOpenPopup(true)}>
              Login / Signup
            </button>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <Link href="/publisher" style={{ fontSize: '0.98rem', color: '#888', textDecoration: 'underline' }}>
            Publisher Login
          </Link>
        </div>
      </section>

      <AuthModal open={openPopup} onClose={() => setOpenPopup(false)}>
        <AuthCard onSuccess={() => setOpenPopup(false)} />
      </AuthModal>
    </main>
  );
}
