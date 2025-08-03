declare module 'next-pwa' {
  import { NextConfig } from 'next';

  interface PWAConfig {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    sw?: string;
    publicExcludes?: string[];
    buildExcludes?: (RegExp | string | ((chunk: any) => boolean))[];
    runtimeCaching?: {
      urlPattern: RegExp | string;
      handler: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'CacheOnly' | 'NetworkOnly';
      options?: {
        cacheName?: string;
        expiration?: {
          maxEntries?: number;
          maxAgeSeconds?: number;
        };
        networkTimeoutSeconds?: number;
        cacheableResponse?: {
          statuses?: number[];
          headers?: Record<string, string>;
        };
      };
    }[];
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  
  export default withPWA;
}