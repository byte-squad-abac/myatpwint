'use client';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';
import Link from 'next/link';
import { useSession } from '@supabase/auth-helpers-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());
  const session = useSession();

  return (
    <html lang="en">
      <body>
        <SessionContextProvider supabaseClient={supabaseClient}>
          <header style={{ padding: '20px', background: '#1a237e', color: 'white', position: 'relative' }}>
            <nav style={{ display: 'flex', gap: '20px' }}>
              <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
              <Link href="/books" style={{ color: 'white', textDecoration: 'none' }}>Books</Link>
              <Link href="/author" style={{ color: 'white', textDecoration: 'none' }}>Author</Link>
              <Link href="/publisher" style={{ color: 'white', textDecoration: 'none' }}>Publisher</Link>
              <Link href="/login" style={{ color: 'white', textDecoration: 'none', marginLeft: 'auto' }}>Login</Link>
              {session && session.user && (
                <Link href="/profile" style={{ marginLeft: 18, color: 'white', textDecoration: 'none', fontSize: 22, display: 'flex', alignItems: 'center' }}>
                  <span style={{ display: 'inline-block', width: 28, height: 28, borderRadius: '50%', background: '#fff', color: '#1a237e', textAlign: 'center', fontWeight: 700, lineHeight: '28px', marginRight: 6 }}>
                    {session.user.email ? session.user.email[0].toUpperCase() : '?'}
                  </span>
                  Profile
                </Link>
              )}
            </nav>
          </header>
          <main style={{ padding: '40px' }}>
            {children}
          </main>
        </SessionContextProvider>
      </body>
    </html>
  );
}
