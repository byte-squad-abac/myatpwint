"use client";

import { useSession } from '@supabase/auth-helpers-react';

export default function ProfilePage() {
  const session = useSession();
  return (
    <div style={{ maxWidth: 400, margin: '60px auto', padding: 32, background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center' }}>
      <h2 style={{ fontWeight: 700, fontSize: '2rem', marginBottom: 24 }}>Profile</h2>
      {session && session.user ? (
        <>
          <div style={{ fontSize: '1.2rem', marginBottom: 12 }}>Signed in as:</div>
          <div style={{ fontWeight: 600, color: '#1a237e', fontSize: '1.1rem' }}>{session.user.email}</div>
        </>
      ) : (
        <div style={{ color: '#888', fontSize: '1.1rem' }}>You are not signed in.</div>
      )}
    </div>
  );
} 