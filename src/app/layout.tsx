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
          
          <header style={{ 
              position: 'fixed',      // stays at viewport top
              top: 0,                 // required for sticky/fixed
              left: 0,
              width: '100%',
              height: '64px',         // set a fixed height (e.g. 64 px)
              display: 'flex',
              alignItems: 'center',
              padding: '0 24px',
              background: '#641B2E',
              color: '#FBDB93',
              borderRadius: '0 0 16px 16px',
              zIndex: 1000, }}>
            <nav style={{ display: 'flex', gap: '20px' }}>
              <Link href="/" style={{ color: '#FBDB93', textDecoration: 'none' }}>Home</Link>
              <Link href="/books" style={{ color: '#FBDB93', textDecoration: 'none' }}>Books</Link>
              <Link href="/author" style={{ color: '#FBDB93', textDecoration: 'none' }}>Author</Link>
              <Link href="/publisher" style={{ color: '#FBDB93', textDecoration: 'none' }}>Publisher</Link>
              <Link href="/login" style={{ color: '#FBDB93', textDecoration: 'none', order: -1, position: 'absolute', right: '70px' }}>Login</Link>
              <Link href="/signup" style={{ color: '#FBDB93', textDecoration: 'none', order: -1, position: 'absolute', right: '140px' }}>Signup</Link> 
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
          <main style={{  left: '0px', top: '0px', position: 'absolute', width: '100%', paddingTop: '24px', minHeight: '100vh'}}>
            {children}
          </main>
        </SessionContextProvider>
      </body>
    </html>
  );
}
