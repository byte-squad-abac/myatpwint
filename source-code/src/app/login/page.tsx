'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // TODO: Implement Supabase auth logic here
    if (isSignup) {
      // Signup logic
      alert(`Signup: ${email}`);
    } else {
      // Login logic
      alert(`Login: ${email}`);
    }
    // Redirect after successful login/signup
    // router.push(...)
  };

  return (
    <div style={{ maxWidth: 340, margin: '48px auto', padding: 20, background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 18, fontWeight: 700, fontSize: '1.7rem' }}>{isSignup ? 'Sign Up' : 'Login'}</h2>
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
