import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'export',          // static export for Netlify
  typescript: {
    ignoreBuildErrors: true, // ← allow build to finish even with TS errors
  },
  eslint: {
    ignoreDuringBuilds: true // optional – skip lint errors in CI
  }
};

export default nextConfig;
