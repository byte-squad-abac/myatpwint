'use client'

import { FirebaseAuthProvider, useFirebaseAuth } from '@/hooks/useFirebaseAuth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
}

// Re-export for backward compatibility
export const useAuthContext = useFirebaseAuth
