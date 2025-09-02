/**
 * Centralized API error handling utilities
 */

import { NextResponse } from 'next/server'

export interface ApiError {
  code: string
  message: string
  statusCode: number
  details?: unknown
}

export class ApiException extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(code: string, message: string, statusCode = 500, details?: unknown) {
    super(message)
    this.name = 'ApiException'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

// Predefined error types
export const API_ERRORS = {
  VALIDATION_ERROR: (message: string, details?: unknown) => 
    new ApiException('VALIDATION_ERROR', message, 400, details),
  
  UNAUTHORIZED: (message = 'Authentication required') =>
    new ApiException('UNAUTHORIZED', message, 401),
  
  FORBIDDEN: (message = 'Permission denied') =>
    new ApiException('FORBIDDEN', message, 403),
  
  NOT_FOUND: (resource: string) =>
    new ApiException('NOT_FOUND', `${resource} not found`, 404),
  
  CONFLICT: (message: string) =>
    new ApiException('CONFLICT', message, 409),
  
  RATE_LIMIT: (message = 'Too many requests') =>
    new ApiException('RATE_LIMIT', message, 429),
  
  INTERNAL_ERROR: (message = 'Internal server error', details?: unknown) =>
    new ApiException('INTERNAL_ERROR', message, 500, details),
  
  SERVICE_UNAVAILABLE: (service: string) =>
    new ApiException('SERVICE_UNAVAILABLE', `${service} service is currently unavailable`, 503)
} as const

/**
 * Handles API errors and returns appropriate NextResponse
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  if (error instanceof ApiException) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {})
      },
      { status: error.statusCode }
    )
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { code: string; message: string }
    
    switch (supabaseError.code) {
      case 'PGRST116':
        return NextResponse.json(
          { error: 'Resource not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      case '23505':
        return NextResponse.json(
          { error: 'Resource already exists', code: 'CONFLICT' },
          { status: 409 }
        )
      case '42501':
        return NextResponse.json(
          { error: 'Insufficient permissions', code: 'FORBIDDEN' },
          { status: 403 }
        )
      default:
        return NextResponse.json(
          { error: supabaseError.message, code: 'DATABASE_ERROR' },
          { status: 500 }
        )
    }
  }

  // Handle standard errors
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }

  // Unknown error
  return NextResponse.json(
    { error: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' },
    { status: 500 }
  )
}

/**
 * Validates request body against required fields
 */
export function validateRequestBody(body: unknown, requiredFields: string[]): void {
  if (!body || typeof body !== 'object') {
    throw API_ERRORS.VALIDATION_ERROR('Invalid request body')
  }

  const missingFields = requiredFields.filter(
    field => !(field in body) || (body as Record<string, unknown>)[field] == null
  )

  if (missingFields.length > 0) {
    throw API_ERRORS.VALIDATION_ERROR(
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    )
  }
}

/**
 * Validates UUID format
 */
export function validateUuid(id: string, fieldName = 'id'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(id)) {
    throw API_ERRORS.VALIDATION_ERROR(`Invalid ${fieldName} format`)
  }
}

/**
 * Success response helper
 */
export function successResponse(data: unknown, message?: string, status = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message })
    },
    { status }
  )
}