/**
 * Centralized Configuration for Myat Pwint Publishing House
 * 
 * This file consolidates all application configuration,
 * environment variables, and constants in one place.
 */

import { AppConfig, FileType } from '../types';

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

// Validate required environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

// ============================================================================
// APPLICATION CONFIGURATION
// ============================================================================

export const config: AppConfig = {
  app: {
    name: 'Myat Pwint Publishing House',
    version: '1.0.0',
    description: 'Digital Publishing Platform for Myanmar Literature',
  },
  
  supabase: {
    url: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  
  features: {
    offline: true,
    realtime: true,
    pwa: true,
  },
  
  constants: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedFormats: ['pdf', 'epub', 'txt'] as FileType[],
    defaultPageSize: 20,
  },
} as const;

// ============================================================================
// APPLICATION CONSTANTS
// ============================================================================

export const APP_CONSTANTS = {
  // UI Constants
  BREAKPOINTS: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200,
  },
  
  // Theme Constants
  THEME: {
    PRIMARY_COLOR: '#641B2E',
    SECONDARY_COLOR: '#FBDB93',
    SUCCESS_COLOR: '#4caf50',
    WARNING_COLOR: '#ff9800',
    ERROR_COLOR: '#f44336',
    INFO_COLOR: '#2196f3',
  },
  
  // PWA Constants
  PWA: {
    CACHE_NAME: 'myat-pwint-cache-v1',
    OFFLINE_FALLBACK: '/offline.html',
    INSTALL_PROMPT_DELAY: 10000, // 10 seconds
  },
  
  // Storage Constants
  STORAGE: {
    OFFLINE_DB_NAME: 'MyatPwintOfflineDB',
    SYNC_DB_NAME: 'MyatPwintSyncDB',
    MAX_OFFLINE_BOOKS: 50,
    CLEANUP_THRESHOLD_DAYS: 30,
  },
  
  // API Constants
  API: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },
  
  // Routes
  ROUTES: {
    HOME: '/',
    BOOKS: '/books',
    MY_LIBRARY: '/my-library',
    READER: '/my-library/read',
    AUTHOR: '/author',
    EDITOR: '/editor',
    PUBLISHER: '/publisher',
    LOGIN: '/login',
    PROFILE: '/profile',
    CHECKOUT: '/checkout',
  },
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  // Core Features
  PWA_ENABLED: config.features.pwa,
  OFFLINE_READING: config.features.offline,
  REALTIME_CHAT: config.features.realtime,
  
  // Development Features
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  
  // Business Features
  PHYSICAL_DELIVERY: true,
  AUTHOR_DASHBOARD: true,
  PUBLISHER_PORTAL: true,
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  // Authentication
  INVALID_EMAIL: 'Please enter a valid email address',
  LOGIN_FAILED: 'Invalid email or password',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  
  // Network
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  
  // Books & Library
  BOOK_NOT_FOUND: 'Book not found in your library',
  NOT_FOUND: 'The requested item could not be found',
  DOWNLOAD_FAILED: 'Failed to download book for offline reading',
  
  // PWA
  OFFLINE_MODE: 'You are currently offline. Some features may be unavailable.',
  
  // Generic
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS) => FEATURE_FLAGS[feature];