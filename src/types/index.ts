/**
 * Centralized type definitions for the application
 */

// Import Supabase types
import type { Database, Book, Profile, Manuscript } from '@/lib/supabase/types'
import type { User } from '@supabase/supabase-js'

// Re-export Supabase types
export type { Database, Book, Profile, Manuscript }
export type { User }

// AI-related types
export interface EmbeddingResult {
  id: string
  embedding: number[]
  searchText: string
}

export interface BookWithSearchMetadata extends Book {
  searchMetadata: {
    similarity: number
    searchMethod: 'semantic'
    model: string
  }
}

export interface BookWithRecommendationMetadata extends Book {
  recommendationMetadata: {
    similarity: number
    reason: 'content-similarity'
    model: string
  }
}

export interface SemanticSearchOptions {
  limit?: number
  threshold?: number
  category?: string
}

export interface SemanticSearchResult {
  query: string
  results: BookWithSearchMetadata[]
  resultCount: number
  searchMethod: 'semantic'
  model: string
}

export interface RecommendationResult {
  bookId: string
  recommendations: BookWithRecommendationMetadata[]
  recommendationCount: number
  method: 'content-similarity'
  model: string
}

export interface EmbeddingBatchResult {
  success: number
  failed: number
  errors: string[]
}

// UI Component types
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

// Search Context types
export interface SearchContextType {
  searchResults: BookWithSearchMetadata[] | null
  hasActiveSearch: boolean
  setSearchResults: (results: BookWithSearchMetadata[], isActive: boolean) => void
  clearSearch: () => void
}

// Auth types
export interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>
  signOut: () => Promise<void>
}

// Semantic Search Component types
export interface SemanticSearchProps {
  onResults?: (results: BookWithSearchMetadata[], isActive: boolean) => void
  placeholder?: string
  category?: string
  autoNavigate?: boolean
  pageTitle?: string
  headerMode?: boolean
}

// Book Recommendations Component types
export interface BookRecommendationsProps {
  currentBookId: string
  title?: string
  limit?: number
}

// Manuscript Editor types
export interface EditorConfig {
  documentKey: string
  url: string
  fileType: string
  title: string
  permissions: {
    edit: boolean
    review: boolean
    comment: boolean
  }
  user: {
    id: string
    name: string
  }
}

// OnlyOffice types
export interface OnlyOfficeCallbackData {
  key: string
  status: number
  url?: string
  changeshistory?: Record<string, unknown>[]
  history?: Record<string, unknown>
  users?: string[]
}

// Constants for status values
export const MANUSCRIPT_STATUSES = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review', 
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published'
} as const

export const USER_ROLES = {
  USER: 'user',
  AUTHOR: 'author', 
  EDITOR: 'editor',
  PUBLISHER: 'publisher'
} as const

export const DELIVERY_TYPES = {
  PHYSICAL: 'physical',
  DIGITAL: 'digital'
} as const

export type ManuscriptStatus = typeof MANUSCRIPT_STATUSES[keyof typeof MANUSCRIPT_STATUSES]
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
export type DeliveryType = typeof DELIVERY_TYPES[keyof typeof DELIVERY_TYPES]

// Stripe and Payment types
export interface StripeProduct {
  id: string
  book_id: string
  stripe_product_id: string
  digital_price_id?: string
  physical_price_id?: string
  created_at: string
  updated_at: string
}

export interface PaymentRecord {
  id: string
  user_id: string
  book_id: string
  delivery_type: DeliveryType
  quantity: number
  unit_price: number
  total_price: number
  purchase_price: number
  status: 'completed' | 'pending' | 'cancelled'
  stripe_payment_intent_id?: string
  created_at: string
  updated_at: string
}

export interface CheckoutItem {
  bookId: string
  quantity: number
  deliveryType: DeliveryType
}

export interface CheckoutSessionRequest {
  items: CheckoutItem[]
  successUrl?: string
  cancelUrl?: string
  metadata?: Record<string, string>
}

export interface PaymentStats {
  totalRevenue: number
  totalOrders: number
  completedPayments: number
  pendingPayments: number
  cancelledPayments: number
}

// Purchase history with book details
export interface PurchaseWithBook extends PaymentRecord {
  books: {
    id: string
    name: string
    author: string
    image_url?: string
  }
}

// Author Application types
export interface AuthorApplication {
  id: string
  user_id: string
  
  // Author Profile Information
  legal_name: string
  author_name: string
  
  // Association Membership
  association_name?: string
  membership_id?: string
  association_proof_url?: string
  association_verified: boolean
  
  // Application Details
  why_publish_with_us: string
  
  // First Book Information
  book_title: string
  book_synopsis: string
  book_tags: string[]
  book_category: string
  preferred_price?: number
  
  // Application Status & Workflow
  status: ApplicationStatus
  publisher_feedback?: string
  reviewed_by?: string
  reviewed_at?: string
  
  // Resubmission Tracking
  submission_count: number
  last_resubmitted_at?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Related data
  profiles?: {
    name: string
    email: string
  }
  reviewer?: {
    name: string
    email: string
  }
}

export interface AuthorApplicationFormData {
  legal_name: string
  author_name: string
  association_name?: string
  membership_id?: string
  association_proof_url?: string
  why_publish_with_us: string
  book_title: string
  book_synopsis: string
  book_tags: string[]
  book_category: string
  preferred_price?: number
}

export interface AuthorApplicationWithProfile extends AuthorApplication {
  profiles: {
    name: string
    email: string
  }
}

// Application Status constants and types
export const APPLICATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const

export type ApplicationStatus = typeof APPLICATION_STATUSES[keyof typeof APPLICATION_STATUSES]

// File Upload types
export interface FileUploadResult {
  url: string
  path: string
  filename: string
  originalName: string
  size: number
  type: string
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface AuthorApplicationsResponse {
  data: AuthorApplication[]
}

export interface AuthorApplicationResponse {
  data: AuthorApplication
}