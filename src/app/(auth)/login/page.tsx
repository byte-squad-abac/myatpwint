'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { usePreferences } from '@/components/PreferencesProvider'
import { pick, ui } from '@/lib/ui/bilingualLabels'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { signIn, user, profile, loading: authLoading } = useFirebaseAuth()
  const { locale } = usePreferences()
  const t = (e: { en: string; my: string }) => pick(e, locale)

  useEffect(() => {
    if (!authLoading && user) {
      const path = profile?.role === 'publisher' ? '/admin/add-book' : '/books'
      router.replace(path)
    }
  }, [user, profile, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await signIn(email.trim(), password)
    if (err) {
      setError(err)
      setLoading(false)
      return
    }

    router.push('/books')
    setLoading(false)
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-app">{t(ui.auth.loginTitle)}</h2>
          <p className="mt-2 text-center text-sm text-app-muted">{t(ui.auth.loginSubtitle)}</p>
          <p className="mt-4 text-center text-sm text-app-muted leading-relaxed">{t(ui.auth.loginHelp)}</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-app mb-1">
                {t(ui.auth.email)}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-3 rounded-lg input-app focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
                placeholder={t(ui.auth.emailPh)}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-app mb-1">
                {t(ui.auth.password)}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-3 rounded-lg input-app focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
                placeholder={t(ui.auth.passwordPh)}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-[var(--app-danger-bg)] border border-[var(--app-danger)]/40 text-[var(--app-danger)] px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--app-accent)] text-white px-4 py-3 rounded-lg font-semibold hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] disabled:opacity-50 touch-manipulation"
            >
              {loading ? t(ui.auth.signingIn) : t(ui.auth.signInCta)}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/register"
              className="text-[var(--app-accent)] hover:underline text-sm font-medium"
            >
              {t(ui.auth.noAccount)}
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
