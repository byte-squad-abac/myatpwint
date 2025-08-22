'use client';

import React, { useEffect } from 'react';
import { handleAuthError } from '@/lib/supabaseClient';

export default function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Listen for unhandled promise rejections that might contain auth errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Refresh Token Not Found') || 
          event.reason?.message?.includes('Invalid Refresh Token')) {
        console.warn('🔍 Caught unhandled auth error:', event.reason.message);
        handleAuthError(event.reason);
        event.preventDefault(); // Prevent error from showing in console
      }
    };

    // Listen for window errors that might be auth-related
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('Refresh Token Not Found') || 
          event.error?.message?.includes('Invalid Refresh Token')) {
        console.warn('🔍 Caught auth error:', event.error.message);
        handleAuthError(event.error);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return <>{children}</>;
}