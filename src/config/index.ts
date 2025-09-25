/**
 * Application configuration
 */

import { AI_CONFIG, HUGGING_FACE_CONFIG } from '@/constants'

// Environment validation
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  HUGGING_FACE_TOKEN: process.env.HUGGING_FACE_TOKEN,
} as const

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars)
}

// Database Configuration
export const databaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
} as const

// AI Service Configuration
export const aiConfig = {
  huggingFace: {
    token: process.env.HUGGING_FACE_TOKEN!,
    model: AI_CONFIG.EMBEDDING_MODEL,
    apiUrl: HUGGING_FACE_CONFIG.API_URL,
    pipeline: HUGGING_FACE_CONFIG.PIPELINE,
  },
  embedding: {
    dimensions: AI_CONFIG.VECTOR_DIMENSIONS,
    batchSize: AI_CONFIG.BATCH_SIZE,
    batchDelay: AI_CONFIG.BATCH_DELAY,
  },
  search: {
    defaultThreshold: AI_CONFIG.DEFAULT_SEARCH_THRESHOLD,
    recommendationThreshold: AI_CONFIG.DEFAULT_RECOMMENDATION_THRESHOLD,
    maxResults: AI_CONFIG.MAX_SEARCH_RESULTS,
    maxRecommendations: AI_CONFIG.MAX_RECOMMENDATIONS,
  },
} as const

// OnlyOffice Configuration  
export const onlyOfficeConfig = {
  documentServerUrl: process.env.ONLYOFFICE_DOCUMENT_SERVER_URL || 'http://localhost:8080',
  jwtSecret: process.env.ONLYOFFICE_JWT_SECRET || 'mySecretKey',
  jwtHeader: process.env.ONLYOFFICE_JWT_HEADER || 'Authorization',
  callbackTimeout: 30000, // 30 seconds
} as const

// Stripe Configuration (consolidated from lib/stripe/config.ts)
export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  currency: 'usd' as const,
  displayCurrency: 'MMK' as const,
  country: 'MM' as const,
  appUrl: process.env.NODE_ENV === 'production'
    ? (process.env.NEXT_PUBLIC_PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  mmkToUsdRate: 0.00048,
  apiVersion: '2025-08-27.basil' as const,
} as const

// App Configuration
export const appConfig = {
  name: 'MyatPwint V2',
  description: 'Myanmar Digital Publishing Platform',
  url: process.env.NODE_ENV === 'production'
    ? (process.env.NEXT_PUBLIC_PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const

// Feature Flags
export const featureFlags = {
  aiSearch: true,
  bookRecommendations: true,
  onlyOfficeEditor: true,
  stripePayments: true,
} as const

// Export all configs as a single object for convenience
export const config = {
  app: appConfig,
  database: databaseConfig,
  ai: aiConfig,
  onlyOffice: onlyOfficeConfig,
  stripe: stripeConfig,
  features: featureFlags,
} as const

export default config