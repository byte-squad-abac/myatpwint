// src/lib/supabaseClient.ts
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabase = createPagesBrowserClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
});

// Handle invalid refresh token errors
let isHandlingTokenError = false;

export const handleAuthError = async (error: any) => {
  if (isHandlingTokenError) return;
  
  if (error?.message?.includes('Refresh Token Not Found') || 
      error?.message?.includes('Invalid Refresh Token')) {
    isHandlingTokenError = true;
    console.warn('🔄 Invalid refresh token detected, clearing session...');
    
    try {
      // Clear the invalid session locally
      await supabase.auth.signOut({ scope: 'local' });
      
      // Clear localStorage items
      if (typeof window !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('supabase.auth.')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log('✅ Cleared stale authentication data');
      }
    } catch (clearError) {
      console.error('Error clearing auth:', clearError);
    } finally {
      isHandlingTokenError = false;
    }
  }
};

// Utility function to manually clear all authentication data
export const clearAllAuthData = async () => {
  console.log('🧹 Manually clearing all authentication data...');
  
  try {
    // Sign out from Supabase
    await supabase.auth.signOut({ scope: 'local' });
    
    // Clear all localStorage
    if (typeof window !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('supabase.') || key?.includes('auth')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('✅ Cleared all authentication data');
      
      // Reload the page to start fresh
      window.location.reload();
    }
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// Add auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    console.log('👤 User signed out');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('✅ Token refreshed successfully');
  }
});

export default supabase;
