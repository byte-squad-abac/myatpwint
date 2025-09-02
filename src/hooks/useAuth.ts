'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/types'
import { DEFAULT_TIMEOUTS } from '@/lib/utils/api-timeout'
import { checkDatabaseHealth, getRecommendedTimeout, shouldAttemptDatabaseOperation } from '@/lib/utils/database-health'
import { profileCache } from '@/lib/utils/profile-cache'
import { debounce } from '@/lib/utils/debounce'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {}
})

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProfileFetching, setIsProfileFetching] = useState(false)

  const fetchProfile = useCallback(async (userId: string, retryCount = 0, skipIfFetching = true, forceRefresh = false) => {
    const maxRetries = 2
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && retryCount === 0) {
      const cachedProfile = profileCache.get(userId)
      if (cachedProfile) {
        console.log('📦 Using cached profile for:', userId)
        setProfile(cachedProfile)
        return
      }
    }
    
    // Prevent concurrent profile fetches
    if (skipIfFetching && isProfileFetching) {
      console.log('⏭️ Skipping profile fetch - already in progress')
      return
    }
    
    // Check if we should attempt database operations
    const shouldAttempt = await shouldAttemptDatabaseOperation()
    if (!shouldAttempt && retryCount === 0) {
      console.warn('⚠️ Skipping profile fetch due to database health issues')
      return
    }
    
    setIsProfileFetching(true)
    
    try {
      console.log(`🔄 Fetching profile for user: ${userId} (attempt ${retryCount + 1})`)
      
      // Get adaptive timeout based on connection health
      const adaptiveTimeout = getRecommendedTimeout(DEFAULT_TIMEOUTS.database)
      console.log(`⏱️ Using adaptive timeout: ${adaptiveTimeout}ms`)
      
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), adaptiveTimeout)
      )
      
      const result = await Promise.race([profilePromise, timeoutPromise])
      const { data, error } = result as { data: Profile | null; error: Error | null }

      if (error) {
        if (error.message?.includes('timeout')) {
          console.warn(`⏱️ Profile fetch timeout for user: ${userId} (attempt ${retryCount + 1})`)
          
          // Retry with exponential backoff
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
            console.log(`🔄 Retrying profile fetch in ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return fetchProfile(userId, retryCount + 1)
          } else {
            console.error(`❌ Profile fetch failed after ${maxRetries + 1} attempts for user: ${userId}`)
            setProfile(null)
            return
          }
        } else {
          console.error('Profile fetch error:', error)
          setProfile(null)
          return
        }
      }
      
      console.log('✅ Profile fetched successfully:', data?.email, data?.role)
      setProfile(data)
      
      // Cache the profile
      if (data) {
        profileCache.set(userId, data)
      }
    } catch (error) {
      if ((error as Error)?.message?.includes('timeout') && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000
        console.log(`🔄 Retrying profile fetch after timeout in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchProfile(userId, retryCount + 1, false, forceRefresh) // Don't skip on retry
      }
      
      console.error(`❌ Profile fetch failed after ${retryCount + 1} attempts:`, error)
      // Don't clear existing profile data on error, just stop fetching
    } finally {
      setIsProfileFetching(false)
    }
  }, [isProfileFetching])

  // Debounced version of fetchProfile to prevent rapid calls
  const debouncedFetchProfile = useCallback((userId: string) => {
    const debouncedFn = debounce(() => {
      fetchProfile(userId, 0, true, false) // skipIfFetching = true, forceRefresh = false
    }, 2000)
    debouncedFn()
  }, [fetchProfile])

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, 0, false, true) // Force refresh, bypass cache
    }
  }

  const signOut = async () => {
    console.log('🔄 Starting sign out process...')
    
    // Immediately clear local state to prevent UI hanging
    setUser(null)
    setProfile(null)
    
    // Clear profile cache
    if (user) {
      profileCache.clear(user.id)
    }
    
    try {
      const signOutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), DEFAULT_TIMEOUTS.auth)
      )
      
      const result = await Promise.race([signOutPromise, timeoutPromise])
      const { error } = result as { error: Error | null }
      
      if (error && !error.message?.includes('timeout')) {
        console.error('❌ Sign out API error:', error)
        // Don't throw - we already cleared state
      }
      
      console.log('✅ Sign out completed')
      
      // Force redirect to clear any cached state
      window.location.href = '/login'
      
    } catch (error) {
      console.error('❌ Sign out failed:', error)
      // State already cleared, force redirect anyway
      window.location.href = '/login'
    }
  }

  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), DEFAULT_TIMEOUTS.auth)
        )
        
        const result = await Promise.race([sessionPromise, timeoutPromise])
        const { data: { session }, error } = result as { 
          data: { session: { user: User } | null }; 
          error: Error | null 
        }
        
        if (error) {
          console.error('Error getting session:', error)
        }
        
        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchProfile(session.user.id)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Periodic database health check (every 5 minutes to reduce load)
    const healthCheckInterval = setInterval(() => {
      checkDatabaseHealth().catch(error => {
        console.warn('Periodic health check failed:', error)
      })
    }, 300000)

    // Listen for auth changes with enhanced error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email || 'No user')
        
        // Handle token refresh events
        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Token refreshed successfully')
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('✅ User signed out via auth state change')
        }
        
        if (mounted) {
          try {
            setUser(session?.user ?? null)
            if (session?.user) {
              // Use debounced fetch for auth state changes to prevent spam
              debouncedFetchProfile(session.user.id)
            } else {
              setProfile(null)
              profileCache.clear() // Clear all cache on sign out
            }
            setLoading(false)
          } catch (error) {
            console.error('Error in auth state change handler:', error)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval)
      }
    }
  }, [fetchProfile, debouncedFetchProfile])

  return {
    user,
    profile,
    loading,
    signOut,
    refreshProfile
  }
}

export const useAuthContext = () => useContext(AuthContext)