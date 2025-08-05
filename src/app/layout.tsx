import type { Metadata, Viewport } from 'next';
import { PWAProvider } from '@/components/PWA/PWAProvider';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'Myat Pwint Publishing House',
  description: 'Digital Publishing Platform for Myanmar Literature',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Myat Pwint Publishing House',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#641B2E',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};