/**
 * Utility functions to add timeouts to API calls and prevent hanging requests
 */

export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 15000,
  timeoutMessage = 'Request timeout'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  )
  
  return Promise.race([promise, timeoutPromise])
}

export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 2,
  timeoutMs: number = 15000
): Promise<T> {
  let lastError: Error

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await withTimeout(fetchFn(), timeoutMs)
    } catch (error) {
      lastError = error as Error
      console.warn(`Attempt ${i + 1} failed:`, error)
      
      // Don't retry on final attempt
      if (i === maxRetries) break
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }

  throw lastError!
}

export interface TimeoutConfig {
  auth: number
  database: number  
  api: number
}

export const DEFAULT_TIMEOUTS: TimeoutConfig = {
  auth: 15000,      // 15 seconds for auth operations
  database: 20000,  // 20 seconds for database queries (increased for profile fetches)
  api: 15000       // 15 seconds for API calls
}