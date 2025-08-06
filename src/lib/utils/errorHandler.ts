/**
 * Error Handling Utilities
 * 
 * Centralized error handling system for consistent error processing
 * and user-friendly error messages across the application.
 */

import { ERROR_MESSAGES } from '../config';

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  code?: string;
  statusCode?: number;
  timestamp: Date;
}

// ============================================================================
// ERROR HANDLER CLASS
// ============================================================================

export class ErrorHandler {
  /**
   * Process and categorize errors
   */
  static handle(error: unknown, context?: string): AppError {
    const timestamp = new Date();
    
    // Handle known error types
    if (error instanceof Error) {
      // Network errors
      if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        return {
          type: ErrorType.NETWORK,
          message: ERROR_MESSAGES.NETWORK_ERROR,
          originalError: error,
          timestamp
        };
      }
      
      // Authentication errors
      if (error.message.includes('auth') || error.message.includes('unauthorized')) {
        return {
          type: ErrorType.AUTHENTICATION,
          message: ERROR_MESSAGES.AUTH_ERROR,
          originalError: error,
          timestamp
        };
      }
      
      // Validation errors
      if (error.message.includes('validation') || error.message.includes('invalid')) {
        return {
          type: ErrorType.VALIDATION,
          message: error.message,
          originalError: error,
          timestamp
        };
      }
    }
    
    // Handle Supabase errors
    if (typeof error === 'object' && error !== null) {
      const supabaseError = error as any;
      
      if (supabaseError.code) {
        switch (supabaseError.code) {
          case 'PGRST116':
            return {
              type: ErrorType.NOT_FOUND,
              message: ERROR_MESSAGES.NOT_FOUND,
              originalError: error,
              code: supabaseError.code,
              timestamp
            };
          case '23505':
            return {
              type: ErrorType.VALIDATION,
              message: 'This item already exists',
              originalError: error,
              code: supabaseError.code,
              timestamp
            };
          default:
            return {
              type: ErrorType.SERVER,
              message: supabaseError.message || ERROR_MESSAGES.SERVER_ERROR,
              originalError: error,
              code: supabaseError.code,
              timestamp
            };
        }
      }
    }
    
    // Default unknown error
    return {
      type: ErrorType.UNKNOWN,
      message: ERROR_MESSAGES.UNEXPECTED_ERROR,
      originalError: error,
      timestamp
    };
  }

  /**
   * Log error for debugging
   */
  static log(error: AppError, context?: string): void {
    const logData = {
      type: error.type,
      message: error.message,
      context,
      timestamp: error.timestamp,
      originalError: error.originalError
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Application Error:', logData);
    }
    
    // In production, you might want to send to error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Please check your internet connection and try again.';
      case ErrorType.AUTHENTICATION:
        return 'Please sign in to continue.';
      case ErrorType.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.';
      case ErrorType.NOT_FOUND:
        return 'The requested item could not be found.';
      case ErrorType.VALIDATION:
        return error.message;
      case ErrorType.SERVER:
        return 'Something went wrong on our end. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Check if error should trigger retry
   */
  static shouldRetry(error: AppError): boolean {
    return [ErrorType.NETWORK, ErrorType.SERVER].includes(error.type);
  }

  /**
   * Check if error should redirect to login
   */
  static shouldRedirectToLogin(error: AppError): boolean {
    return error.type === ErrorType.AUTHENTICATION;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Wrapper for async operations with error handling
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: AppError }> => {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const appError = ErrorHandler.handle(error, context);
    ErrorHandler.log(appError, context);
    return { error: appError };
  }
};

/**
 * Create error boundary for React components
 */
export const createErrorBoundaryConfig = (componentName: string) => ({
  onError: (error: Error, errorInfo: any) => {
    const appError = ErrorHandler.handle(error, componentName);
    ErrorHandler.log(appError, componentName);
  }
});