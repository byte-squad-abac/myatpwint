"use client";

import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', padding: 32, background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center' }}>
      <h2 style={{ fontWeight: 700, fontSize: '2rem', marginBottom: 24 }}>Profile</h2>
      {session && session.user ? (
        <>
          <div style={{ fontSize: '1.2rem', marginBottom: 12 }}>Signed in as:</div>
          <div style={{ fontWeight: 600, color: '#1a237e', fontSize: '1.1rem', marginBottom: 24 }}>{session.user.email}</div>
          <button onClick={handleLogout} style={{ padding: '8px 24px', borderRadius: 8, border: '1.5px solid #1a237e', background: '#fff', color: '#1a237e', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer' }}>
            Log Out
          </button>
        </>
      ) : (
        <div style={{ color: '#888', fontSize: '1.1rem' }}>You are not signed in.</div>
      )}
    </div>
  );
} 