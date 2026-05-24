import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { PreferencesProvider } from '@/components/PreferencesProvider'
import AppShell from '@/components/AppShell'
import Navbar from '@/components/Navbar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'MyatPwint - Myanmar Digital Publishing',
  description: 'Discover Myanmar literature',
}

const themeInit = `
(() => {
  try {
    var t = localStorage.getItem('myatpwint-theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script id="myatpwint-theme" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <AuthProvider>
          <PreferencesProvider>
            <AppShell>
              <Navbar />
              <main className="flex min-h-0 flex-1 flex-col">{children}</main>
            </AppShell>
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
