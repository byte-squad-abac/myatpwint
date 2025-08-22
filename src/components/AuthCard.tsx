'use client';

import React, { useMemo, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';

type Props = { onSuccess?: () => void };

export default function AuthCard({ onSuccess }: Props) {
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const siteURL = useMemo(() => {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (typeof window !== 'undefined') return window.location.origin;
    return undefined;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // Profile will be created automatically by database trigger

        if (!data.session) {
          setInfo('Check your email to confirm your account.');
          return;
        }

        onSuccess?.();
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: siteURL ? { redirectTo: `${siteURL}` } : undefined,
      });
      if (error) throw error;
      // Redirect handled by Supabase
    } catch (err: any) {
      setError(err?.message ?? 'Google sign-in failed.');
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginTop: -8, marginBottom: 12, fontWeight: 800 }}>
        {isSignup ? 'Create account' : 'Welcome back'}
      </h2>

      <form onSubmit={handleSubmit} noValidate>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
          Email
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
            disabled={loading}
          />
        </label>

        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
          Password
          <input
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
            disabled={loading}
          />
        </label>

        {error && <div style={{ color: '#d32f2f', marginBottom: 8 }}>{error}</div>}
        {info && <div style={{ color: '#1b5e20', marginBottom: 8 }}>{info}</div>}

        <button
          type="submit"
          style={{ ...primaryButton, width: '100%', opacity: loading ? 0.7 : 1 }}
          disabled={loading}
        >
          {loading ? (isSignup ? 'Signing up…' : 'Logging in…') : isSignup ? 'Sign Up' : 'Login'}
        </button>
      </form>

      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{ ...secondaryButton, width: '100%' }}
        disabled={loading}
      >
        Continue with Google
      </button>

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        {isSignup ? (
          <>Already have an account?{' '}
            <button onClick={() => { setIsSignup(false); setError(null); setInfo(null); }} style={linkButton}>
              Login
            </button>
          </>
        ) : (
          <>Don’t have an account?{' '}
            <button onClick={() => { setIsSignup(true); setError(null); setInfo(null); }} style={linkButton}>
              Sign Up
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
  marginTop: 6,
  marginBottom: 12,
  borderRadius: 7,
  border: '1.5px solid #ccc',
  fontSize: '1.05rem',
  boxSizing: 'border-box',
  background: '#e9f0fc',
};
const primaryButton: React.CSSProperties = {
  padding: 12,
  borderRadius: 7,
  background: '#1a237e',
  color: '#fff',
  fontWeight: 700,
  border: 'none',
  fontSize: '1.05rem',
  cursor: 'pointer',
};
const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: '#fff',
  color: '#333',
  border: '1.5px solid #ccc',
  marginTop: 10,
};
const linkButton: React.CSSProperties = {
  color: '#1a237e',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: '1rem',
};
