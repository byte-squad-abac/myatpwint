/**
 * Base Service Class
 * 
 * Provides common functionality for all service classes
 * including error handling, logging, and response formatting.
 */

import { SupabaseResponse, ApiResponse } from '../types';
import { ERROR_MESSAGES } from '../config';

export abstract class BaseService {
  protected static handleError(error: any): never {
    console.error('Service Error:', error);
    
    // Handle Supabase specific errors
    if (error?.message) {
      throw new Error(error.message);
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
    
    // Default error
    throw new Error(ERROR_MESSAGES.UNEXPECTED_ERROR);
  }

  protected static formatResponse<T>(response: SupabaseResponse<T>): ApiResponse<T> {
    if (response.error) {
      this.handleError(response.error);
    }

    return {
      data: response.data!,
      message: 'Success',
    };
  }

  protected static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }

    this.handleError(lastError);
  }
}