'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useSupabaseClient,
  useSession,
} from '@supabase/auth-helpers-react';

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);

  const supabase = useSupabaseClient();
  const session  = useSession();
  const router   = useRouter();

  const [siteURL, setSiteURL] = useState<string | undefined>(
    process.env.NEXT_PUBLIC_SITE_URL
  );

  useEffect(() => {
    if (!siteURL && typeof window !== 'undefined') {
      setSiteURL(window.location.origin);
    }
  }, [siteURL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return setError(error.message);

      const userId = data.user?.id;
      if (userId) {
        await supabase.from('profiles').insert({ id: userId, role: 'user' });
      }

      router.push('/profile');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return setError(error.message);
    router.push('/profile');
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteURL ?? ''}/profile` },
    });
    if (error) setError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div
      style={{
        maxWidth: 340,
        margin: '48px auto',
        padding: 20,
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <h2
        style={{
          textAlign: 'center',
          marginBottom: 18,
          fontWeight: 700,
          fontSize: '1.7rem',
        }}
      >
        {isSignup ? 'Sign Up' : 'Login'}
      </h2>

      {session?.user && (
        <div
          style={{
            marginBottom: 18,
            color: '#007b55',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          Signed in as {session.user.email}
          <button
            onClick={handleLogout}
            style={{
              marginLeft: 12,
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid #ccc',
              background: '#fff',
              color: '#1a237e',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Log&nbsp;Out
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        {error && (
          <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>
        )}
        <button type="submit" style={primaryButton}>
          {isSignup ? 'Sign Up' : 'Login'}
        </button>
      </form>

      <button type="button" onClick={handleGoogleLogin} style={secondaryButton}>
        Continue&nbsp;with&nbsp;Google
      </button>

      <div style={{ textAlign: 'center', marginTop: 6, fontSize: '1.05rem' }}>
        {isSignup ? (
          <>
            Already have an account?{' '}
            <button
              onClick={() => setIsSignup(false)}
              style={linkButton}
            >
              Login
            </button>
          </>
        ) : (
          <>
            Don’t have an account?{' '}
            <button
              onClick={() => setIsSignup(true)}
              style={linkButton}
            >
              Sign&nbsp;Up
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  marginBottom: 12,
  borderRadius: 7,
  border: '1.5px solid #ccc',
  fontSize: '1.05rem',
  boxSizing: 'border-box',
  background: '#e9f0fc',
};

const primaryButton: React.CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 7,
  background: '#1a237e',
  color: '#fff',
  fontWeight: 700,
  border: 'none',
  marginBottom: 12,
  fontSize: '1.05rem',
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: '#fff',
  color: '#333',
  border: '1.5px solid #ccc',
};

const linkButton: React.CSSProperties = {
  color: '#1a237e',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: '1rem',
};
