/**
 * Supabase utilities barrel exports
 */

export { createClient } from './client'
export { createClient as createServerClient } from './server'

// Re-export types
export type { Database, Book, Profile, Manuscript } from './types'