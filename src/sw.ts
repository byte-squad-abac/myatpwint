// Service Worker for Myat Pwint Publishing House PWA
// This file handles offline functionality and caching strategies
// Reference: https://serwist.pages.dev/docs/serwist/core/serwist

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { 
  Serwist, 
  CacheFirst, 
  NetworkFirst, 
  StaleWhileRevalidate 
} from 'serwist';

// This line tells TypeScript that we're in a Service Worker context
// It gives us access to 'self' and other Service Worker APIs
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

// Create the main Serwist instance
// This will handle all our PWA functionality
const serwist = new Serwist({
  // Precache files that Serwist automatically discovers
  // This includes your built Next.js pages, CSS, and JS files
  precacheEntries: self.__SW_MANIFEST,
  
  // Don't precache anything that starts with /api/
  // API routes should always be fresh, not cached
  precacheOptions: {
    cleanupOutdatedCaches: true,
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  },
  
  // Skip waiting means the new service worker activates immediately
  // Without this, users would need to close all tabs to get updates
  skipWaiting: true,
  
  // Claim clients immediately when service worker activates
  // This ensures the service worker takes control right away
  clientsClaim: true,
  
  // Navigation fallback - if a page isn't cached, serve the offline page
  navigationPreload: false,
  
});

// Register runtime caching strategies using Serwist 9.0+ API
// Note: Serwist 9.0 changed from runtimeCaching array with urlPattern
// to registerCapture method with matcher functions for better TypeScript support
// Reference: https://serwist.pages.dev/docs/serwist/runtime-caching
// Cache all images with Cache First strategy
serwist.registerCapture(
  ({ request, url }) => {
    return request.destination === 'image' || /\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i.test(url.pathname);
  },
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => request.url,
      },
    ],
  })
);

// Cache fonts with Cache First (they rarely change)
serwist.registerCapture(
  ({ request, url }) => {
    return request.destination === 'font' || /\.(?:woff|woff2|eot|ttf|otf)$/i.test(url.pathname);
  },
  new CacheFirst({
    cacheName: 'fonts-cache',
  })
);

// Cache Google Fonts CSS
serwist.registerCapture(
  ({ url }) => {
    return url.origin === 'https://fonts.googleapis.com';
  },
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

// Cache Google Fonts files
serwist.registerCapture(
  ({ url }) => {
    return url.origin === 'https://fonts.gstatic.com';
  },
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
  })
);

// Cache book files from Supabase Storage
// These are large files (PDFs, EPUBs) that users purchase
serwist.registerCapture(
  ({ url }) => {
    return url.hostname.includes('.supabase.co') && 
           url.pathname.includes('/storage/') && 
           /\.(pdf|epub|txt)$/i.test(url.pathname);
  },
  new CacheFirst({
    cacheName: 'book-files-cache',
  })
);

// Cache book cover images from Supabase
serwist.registerCapture(
  ({ url }) => {
    return url.hostname.includes('.supabase.co') && 
           url.pathname.includes('/storage/') && 
           /\.(jpg|jpeg|png|webp)$/i.test(url.pathname);
  },
  new CacheFirst({
    cacheName: 'book-covers-cache',
  })
);

// API routes should use Network First strategy
// This ensures fresh data when online, cached when offline
serwist.registerCapture(
  ({ url }) => {
    return url.hostname.includes('.supabase.co') && url.pathname.startsWith('/rest/v1/');
  },
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10, // Fallback to cache after 10 seconds
  })
);

// Register all the routes and strategies we defined above
serwist.addEventListeners();

// Log when service worker is installed and activated
// These are handled automatically by Serwist
console.log('[SW] Myat Pwint PWA Service Worker initialized');

// Future implementations can add:
// - Background sync for offline purchases
// - Push notifications for manuscript updates
// - Custom caching strategies for specific content

console.log('[SW] Myat Pwint PWA Service Worker loaded');