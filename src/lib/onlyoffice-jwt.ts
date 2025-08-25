import * as crypto from 'crypto';

const JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET || 'my_jwt_secret';

// Constants for better maintainability
export const MANUSCRIPT_KEY_PREFIX = 'manuscript-';
export const VERSION_SEPARATOR = '-v';

// Base64 URL encode
function base64UrlEncode(obj: any): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Create JWT signature
function sign(header: any, payload: any, secret: string): string {
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
export function generateJWTToken(payload: any): string {
  const header = {
    "alg": "HS256",
    "typ": "JWT"
  };
  
  return sign(header, payload, JWT_SECRET);
}

// Generate document key for OnlyOffice - version-aware for change tracking
export function generateDocumentKey(manuscriptId: string, updatedAt?: string): string {
  if (updatedAt) {
    // Create version-aware key based on last update time
    const timestamp = new Date(updatedAt).getTime();
    return `${MANUSCRIPT_KEY_PREFIX}${manuscriptId}${VERSION_SEPARATOR}${timestamp}`;
  }
  return `${MANUSCRIPT_KEY_PREFIX}${manuscriptId}`;
}

