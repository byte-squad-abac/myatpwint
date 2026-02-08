'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, firestore } from '@/lib/firebase/config'

export type UserRole = 'publisher' | 'user'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  refreshProfile: async () => {},
})

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const profileRef = doc(firestore, 'profiles', userId)
  const snap = await getDoc(profileRef)
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    id: snap.id,
    email: d.email || '',
    name: d.name || '',
    role: (d.role as UserRole) || 'user',
  }
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (uid: string) => {
    const p = await fetchProfile(uid)
    setProfile(p)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await loadProfile(u.uid)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      return {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign in failed'
      if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        return { error: 'Invalid email or password.' }
      }
      return { error: msg }
    }
  }

  const signUp = async (email: string, password: string, name: string, role: UserRole = 'user') => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      await setDoc(doc(firestore, 'profiles', cred.user.uid), {
        email: email.trim(),
        name: name.trim(),
        role,
        updatedAt: new Date().toISOString(),
      })
      return {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign up failed'
      return { error: msg }
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
    setProfile(null)
    window.location.href = '/login'
  }

  const refreshProfile = async () => {
    if (user) await loadProfile(user.uid)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useFirebaseAuth = () => useContext(AuthContext)

// Alias for backward compatibility
export const useAuthContext = useFirebaseAuth
