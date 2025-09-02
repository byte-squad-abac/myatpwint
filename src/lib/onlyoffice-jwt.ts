import * as crypto from 'crypto';

const JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET || 'my_jwt_secret';

// Constants for better maintainability
export const MANUSCRIPT_KEY_PREFIX = 'manuscript-';
export const BOOK_KEY_PREFIX = 'book-';
export const VERSION_SEPARATOR = '-v';

// Base64 URL encode
function base64UrlEncode(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Create JWT signature
function sign(header: Record<string, unknown>, payload: Record<string, unknown>, secret: string): string {
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
    
  return `${data}.${signature}`;
}

// Generate JWT token for OnlyOffice
export function generateJWTToken(payload: Record<string, unknown>): string {
  const header = {
    "alg": "HS256",
    "typ": "JWT"
  };
  
  return sign(header, payload, JWT_SECRET);
}

// Generate document key for OnlyOffice - version-aware for change tracking
export function generateDocumentKey(documentId: string, updatedAt?: string): string {
  // Determine if this is a book or manuscript based on the ID format
  const isBook = documentId.startsWith('book-');
  const prefix = isBook ? '' : MANUSCRIPT_KEY_PREFIX; // book- already includes prefix
  
  if (updatedAt) {
    // Create version-aware key based on last update time
    const timestamp = new Date(updatedAt).getTime();
    return `${prefix}${documentId}${VERSION_SEPARATOR}${timestamp}`;
  }
  return `${prefix}${documentId}`;
}

// Generate book-specific document key
export function generateBookDocumentKey(bookId: string, updatedAt?: string): string {
  return generateDocumentKey(`book-${bookId}`, updatedAt);
}