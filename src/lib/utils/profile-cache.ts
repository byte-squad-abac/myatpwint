/**
 * Client-side profile caching to reduce database requests
 */

import type { Profile } from '@/lib/supabase/types'

interface CachedProfile {
  data: Profile
  timestamp: number
  userId: string
}

class ProfileCache {
  private cache = new Map<string, CachedProfile>()
  private readonly TTL = 10 * 60 * 1000 // 10 minutes TTL

  set(userId: string, profile: Profile): void {
    this.cache.set(userId, {
      data: profile,
      timestamp: Date.now(),
      userId
    })
    
    // Clean up expired entries periodically
    this.cleanupExpired()
  }

  get(userId: string): Profile | null {
    const cached = this.cache.get(userId)
    
    if (!cached) return null
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(userId)
      return null
    }
    
    return cached.data
  }

  has(userId: string): boolean {
    return this.get(userId) !== null
  }

  clear(userId?: string): void {
    if (userId) {
      this.cache.delete(userId)
    } else {
      this.cache.clear()
    }
  }

  private cleanupExpired(): void {
    const now = Date.now()
    for (const [userId, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.TTL) {
        this.cache.delete(userId)
      }
    }
  }

  getStats(): { size: number; expired: number } {
    const now = Date.now()
    let expired = 0
    
    for (const cached of this.cache.values()) {
      if (now - cached.timestamp > this.TTL) {
        expired++
      }
    }
    
    return {
      size: this.cache.size,
      expired
    }
  }
}

export const profileCache = new ProfileCache()