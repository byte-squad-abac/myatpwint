/**
 * Application constants
 */

// AI Configuration
export const AI_CONFIG = {
  EMBEDDING_MODEL: 'intfloat/multilingual-e5-base',
  VECTOR_DIMENSIONS: 768,
  BATCH_SIZE: 5,
  BATCH_DELAY: 1000, // ms
  DEFAULT_SEARCH_THRESHOLD: 0.7,
  DEFAULT_RECOMMENDATION_THRESHOLD: 0.8,
  MAX_SEARCH_RESULTS: 50,
  MAX_RECOMMENDATIONS: 20,
} as const

// HuggingFace Configuration
export const HUGGING_FACE_CONFIG = {
  API_URL: 'https://router.huggingface.co/hf-inference/models',
  PIPELINE: 'pipeline/feature-extraction',
} as const

// UI Constants
export const UI_CONFIG = {
  HEADER_HEIGHT: 64,
  SIDEBAR_WIDTH: 256,
  MAX_CONTAINER_WIDTH: 1200,
  ANIMATION_DURATION: 200,
} as const

// Search Configuration
export const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  DEBOUNCE_DELAY: 500,
  PLACEHOLDER_ANIMATION_SPEED: 100,
  PLACEHOLDER_PAUSE_DURATION: 2000,
} as const

// File Upload Limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  BOOKS_PER_PAGE: 12,
  MANUSCRIPTS_PER_PAGE: 10,
} as const

// Myanmar Text Processing
export const MYANMAR_CONFIG = {
  PUNCTUATION_MAPPING: {
    '၊': ', ',
    '။': '. ',
  },
  NORMALIZATION_FORM: 'NFC' as const,
} as const

// API Routes
export const API_ROUTES = {
  AI: {
    SEARCH: '/api/ai/search',
    SIMILAR: '/api/ai/similar',
    GENERATE_EMBEDDINGS: '/api/ai/generate-embeddings',
    GENERATE_SINGLE_EMBEDDING: '/api/ai/generate-single-embedding',
  },
  ONLYOFFICE: {
    CONFIG: '/api/onlyoffice/config',
    CALLBACK: '/api/onlyoffice/callback',
  },
} as const

// External URLs
export const EXTERNAL_URLS = {
  SUPABASE: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  HUGGING_FACE: 'https://huggingface.co',
} as const

// Default Values
export const DEFAULTS = {
  BOOK_COVER: '/images/default-book-cover.jpg',
  AVATAR: '/images/default-avatar.png',
  EDITION: 'First Edition',
  CURRENCY: 'MMK',
  LANGUAGE: 'en',
} as const

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  AUTH_REQUIRED: 'Authentication required',
  PERMISSION_DENIED: 'Permission denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Please check your input and try again',
  AI_SERVICE_ERROR: 'AI service temporarily unavailable',
  UPLOAD_ERROR: 'File upload failed',
  PAYMENT_ERROR: 'Payment processing failed',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  BOOK_PUBLISHED: 'Book published successfully!',
  MANUSCRIPT_SUBMITTED: 'Manuscript submitted successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PAYMENT_SUCCESS: 'Payment completed successfully!',
  EMBEDDING_GENERATED: 'AI embeddings generated successfully!',
} as const

// Status Colors (for UI)
export const STATUS_COLORS = {
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
  primary: 'blue',
  secondary: 'gray',
} as const

// Theme Configuration
export const THEME = {
  COLORS: {
    PRIMARY: '#3b82f6',
    SECONDARY: '#6b7280', 
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    MYANMAR_GOLD: '#FFD700',
    MYANMAR_RED: '#CE1126',
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',  
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px',
  },
} as const