/**
 * Database connection health monitoring utilities
 */

import { supabase } from '@/lib/supabase/client'

export interface ConnectionHealth {
  isHealthy: boolean
  latency: number
  error?: string
}

let lastHealthCheck: { result: ConnectionHealth; timestamp: number } | null = null
const HEALTH_CHECK_CACHE_TTL = 30000 // 30 seconds

/**
 * Check Supabase database connection health with caching
 */
export async function checkDatabaseHealth(forceRefresh = false): Promise<ConnectionHealth> {
  // Return cached result if available and not expired
  if (!forceRefresh && lastHealthCheck && Date.now() - lastHealthCheck.timestamp < HEALTH_CHECK_CACHE_TTL) {
    return lastHealthCheck.result
  }

  const startTime = Date.now()
  
  try {
    // Simple health check query
    const healthPromise = supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Health check timeout')), 5000)
    )
    
    await Promise.race([healthPromise, timeoutPromise])
    
    const latency = Date.now() - startTime
    const result: ConnectionHealth = {
      isHealthy: true,
      latency
    }
    
    lastHealthCheck = { result, timestamp: Date.now() }
    console.log(`✅ Database health check passed (${latency}ms)`)
    
    return result
  } catch (error) {
    const latency = Date.now() - startTime
    const result: ConnectionHealth = {
      isHealthy: false,
      latency,
      error: (error as Error).message
    }
    
    lastHealthCheck = { result, timestamp: Date.now() }
    console.warn(`⚠️ Database health check failed (${latency}ms):`, error)
    
    return result
  }
}

/**
 * Get recommended timeout based on current connection health
 */
export function getRecommendedTimeout(baseTimeout: number): number {
  if (!lastHealthCheck) return baseTimeout
  
  const { isHealthy, latency } = lastHealthCheck.result
  
  if (!isHealthy) {
    return Math.min(baseTimeout * 2, 30000) // Double timeout if unhealthy, max 30s
  }
  
  if (latency > 2000) {
    return Math.min(baseTimeout * 1.5, 25000) // 1.5x timeout if slow, max 25s
  }
  
  return baseTimeout
}

/**
 * Check if we should attempt database operation based on health
 */
export async function shouldAttemptDatabaseOperation(): Promise<boolean> {
  const health = await checkDatabaseHealth()
  
  // Always attempt if healthy or if we haven't checked recently
  if (health.isHealthy || !lastHealthCheck) {
    return true
  }
  
  // If unhealthy, only attempt if the error was recent (within 1 minute)
  const errorAge = Date.now() - lastHealthCheck.timestamp
  return errorAge < 60000
}