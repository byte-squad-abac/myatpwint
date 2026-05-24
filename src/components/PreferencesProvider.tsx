'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type ThemePreference = 'light' | 'dark'
export type Locale = 'en' | 'my'

const STORAGE_THEME = 'myatpwint-theme'
const STORAGE_LOCALE = 'myatpwint-locale'

type PreferencesContextValue = {
  theme: ThemePreference
  setTheme: (t: ThemePreference) => void
  toggleTheme: () => void
  locale: Locale
  setLocale: (l: Locale) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function applyThemeClass(theme: ThemePreference) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('light')
  const [locale, setLocaleState] = useState<Locale>('en')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(STORAGE_THEME) as ThemePreference | null
      const storedLocale = localStorage.getItem(STORAGE_LOCALE) as Locale | null
      if (storedTheme === 'dark') setThemeState('dark')
      else setThemeState('light')
      if (storedLocale === 'my') setLocaleState('my')
      else setLocaleState('en')
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    applyThemeClass(theme)
    try {
      localStorage.setItem(STORAGE_THEME, theme)
    } catch {
      /* ignore */
    }
  }, [theme, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_LOCALE, locale)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === 'my' ? 'my' : 'en'
  }, [locale, hydrated])

  const setTheme = useCallback((t: ThemePreference) => setThemeState(t), [])
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  )
  const setLocale = useCallback((l: Locale) => setLocaleState(l), [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, locale, setLocale }),
    [theme, setTheme, toggleTheme, locale, setLocale],
  )

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider')
  }
  return ctx
}
