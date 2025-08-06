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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#641B2E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Myat Pwint Publishing House" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body style={{ margin: 0 }}>
        <PWAProvider>
          <ClientLayout>{children}</ClientLayout>
        </PWAProvider>
      </body>
    </html>
  );
}