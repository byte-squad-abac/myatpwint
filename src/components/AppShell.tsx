'use client'

import { usePreferences } from '@/components/PreferencesProvider'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { locale } = usePreferences()
  return (
    <div
      className={`flex min-h-dvh flex-col bg-app text-app antialiased ${locale === 'my' ? 'font-myanmar' : ''}`}
    >
      {children}
    </div>
  )
}
