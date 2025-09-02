/**
 * Enhanced Supabase client wrapper with timeout, retry, and error recovery
 */

import { supabase } from './client'
import { withTimeout, fetchWithRetry, DEFAULT_TIMEOUTS } from '@/lib/utils/api-timeout'

export class SupabaseWrapper {
  private static instance: SupabaseWrapper
  
  static getInstance(): SupabaseWrapper {
    if (!SupabaseWrapper.instance) {
      SupabaseWrapper.instance = new SupabaseWrapper()
    }
    return SupabaseWrapper.instance
  }

  /**
   * Enhanced query with timeout and retry logic
   */
  async query<T>(
    queryFn: () => Promise<T>,
    options: {
      timeout?: number
      maxRetries?: number
      operation?: string
    } = {}
  ): Promise<T> {
    const {
      timeout = DEFAULT_TIMEOUTS.database,
      maxRetries = 2,
      operation = 'database query'
    } = options

    try {
      return await fetchWithRetry(
        () => withTimeout(queryFn(), timeout, `${operation} timeout`),
        maxRetries,
        timeout
      )
    } catch (error) {
      console.error(`❌ ${operation} failed:`, error)
      
      // Check if it's an auth error and attempt recovery
      if (this.isAuthError(error)) {
        console.log('🔄 Attempting auth recovery...')
        await this.attemptAuthRecovery()
        
        // Retry once after auth recovery
        try {
          return await withTimeout(queryFn(), timeout, `${operation} timeout (retry)`)
        } catch (retryError) {
          console.error(`❌ ${operation} failed after auth recovery:`, retryError)
          throw retryError
        }
      }
      
      throw error
    }
  }

  /**
   * Check if error is auth-related
   */
  private isAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    
    const errorObj = error as Record<string, unknown>
    const message = (typeof errorObj.message === 'string' ? errorObj.message.toLowerCase() : '') || ''
    const code = (typeof errorObj.code === 'string' ? errorObj.code : '') || ''
    
    return (
      message.includes('jwt') ||
      message.includes('unauthorized') ||
      message.includes('invalid') ||
      message.includes('expired') ||
      code === 'PGRST301' ||
      code === 'PGRST116'
    )
  }

  /**
   * Attempt to recover from auth errors
   */
  private async attemptAuthRecovery(): Promise<void> {
    try {
      // Force token refresh
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Auth recovery failed:', error)
        // Clear session and redirect to login
        await supabase.auth.signOut()
        window.location.href = '/login'
      } else {
        console.log('✅ Auth recovery successful')
      }
    } catch (error) {
      console.error('Auth recovery attempt failed:', error)
      window.location.href = '/login'
    }
  }

  /**
   * Enhanced profile fetch with caching
   */
  private profileCache = new Map<string, { data: unknown, timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  async fetchProfile(userId: string, forceRefresh = false): Promise<unknown> {
    const cacheKey = userId
    const cached = this.profileCache.get(cacheKey)
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📦 Using cached profile for:', userId)
      return cached.data
    }

    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), DEFAULT_TIMEOUTS.database)
    )
    
    const profile = await Promise.race([profilePromise, timeoutPromise])

    // Cache the result
    this.profileCache.set(cacheKey, { data: profile, timestamp: Date.now() })
    
    return profile
  }

  /**
   * Clear profile cache for user
   */
  clearProfileCache(userId?: string): void {
    if (userId) {
      this.profileCache.delete(userId)
    } else {
      this.profileCache.clear()
    }
  }
}

export const supabaseWrapper = SupabaseWrapper.getInstance()