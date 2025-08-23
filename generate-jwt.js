const crypto = require('crypto');

// JWT Header
const header = {
  "alg": "HS256",
  "typ": "JWT"
};

// JWT Payload - basic config for OnlyOffice
const payload = {
  "document": {
    "fileType": "txt",
    "key": "test-document-key-002", 
    "title": "Test Document.txt",
    "url": "http://host.docker.internal:3001/test-document.txt"
  },
  "documentType": "word",
  "editorConfig": {
    "user": {
      "id": "test-user",
      "name": "Test User"
    }
  },
  "height": "600px",
  "width": "100%"
};

// Base64 URL encode
function base64UrlEncode(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Create signature
function sign(header, payload, secret) {
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

const token = sign(header, payload, 'my_jwt_secret');
console.log('JWT Token:', token);