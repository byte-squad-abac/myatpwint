'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = useSupabaseClient();
  const session = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isSignup) {
      // Signup logic
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }
    
      router.push('/profile');
    } else {
      // Login logic
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.push('/profile');
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined
      }
    });
    if (error) alert(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div style={{ maxWidth: 340, margin: '48px auto', padding: 20, background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 18, fontWeight: 700, fontSize: '1.7rem' }}>{isSignup ? 'Sign Up' : 'Login'}</h2>
      {session && session.user ? (
        <div style={{ marginBottom: 18, color: '#007b55', textAlign: 'center', fontWeight: 600 }}>
          Signed in as {session.user.email}
          <button onClick={handleLogout} style={{ marginLeft: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', color: '#1a237e', fontWeight: 600, cursor: 'pointer' }}>
            Log Out
          </button>
        </div>
      ) : null}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 7, border: '1.5px solid #ccc', fontSize: '1.05rem', boxSizing: 'border-box', background: '#e9f0fc' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 7, border: '1.5px solid #ccc', fontSize: '1.05rem', boxSizing: 'border-box', background: '#e9f0fc' }}
        />
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        <button type="submit" style={{ width: '100%', padding: 12, borderRadius: 7, background: '#1a237e', color: '#fff', fontWeight: 700, border: 'none', marginBottom: 12, fontSize: '1.05rem', cursor: 'pointer' }}>
          {isSignup ? 'Sign Up' : 'Login'}
        </button>
      </form>
      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{
          width: '100%',
          padding: 10,
          borderRadius: 7,
          background: '#fff',
          color: '#333',
          fontWeight: 600,
          border: '1.5px solid #ccc',
          marginBottom: 12,
          cursor: 'pointer'
        }}
      >
        Continue with Google
      </button>
      <div style={{ textAlign: 'center', marginTop: 6, fontSize: '1.05rem' }}>
        {isSignup ? (
          <span>Already have an account?{' '}
            <button onClick={() => setIsSignup(false)} style={{ color: '#1a237e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '1rem' }}>Login</button>
          </span>
        ) : (
          <span>Don&apos;t have an account?{' '}
            <button onClick={() => setIsSignup(true)} style={{ color: '#1a237e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '1rem' }}>Sign Up</button>
          </span>
        )}
      </div>
    </div>
  );
}
