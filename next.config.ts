import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

// Configure Serwist for PWA functionality
// Reference: https://serwist.pages.dev/docs/next/getting-started
const withSerwist = withSerwistInit({
  // Disable in development for faster builds and easier debugging
  disable: process.env.NODE_ENV === 'development',
  
  // Source file for our service worker (we'll create this)
  swSrc: 'src/sw.ts',
  
  // Where the generated service worker will be placed
  swDest: 'public/sw.js',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // output: 'export', // Uncomment if you want static export
};

// Wrap the Next.js config with Serwist PWA capabilities
export default withSerwist(nextConfig);

