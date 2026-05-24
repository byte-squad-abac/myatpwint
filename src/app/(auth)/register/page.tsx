'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { usePreferences } from '@/components/PreferencesProvider'
import { pick, ui } from '@/lib/ui/bilingualLabels'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'publisher',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { signUp, user } = useFirebaseAuth()
  const { locale } = usePreferences()
  const t = (e: { en: string; my: string }) => pick(e, locale)

  useEffect(() => {
    if (user) {
      router.replace('/books')
    }
  }, [user, router])

  if (user) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await signUp(formData.email, formData.password, formData.name, formData.role)
    if (err) {
      if (err.includes('email-already-in-use')) {
        setError(
          locale === 'my'
            ? 'ဤအီးမေးလ် မှတ်ပုံတင်ပြီးသားဖြစ်သည်။ ဝင်ရောက်ပါ။'
            : 'This email is already registered. Please use the login page.',
        )
      } else if (err.includes('weak-password') || err.includes('password')) {
        setError(
          locale === 'my'
            ? 'စကားဝှက် အနည်းဆုံး ၆ လုံးရှိရမည်။'
            : 'Password must be at least 6 characters.',
        )
      } else {
        setError(err)
      }
      setLoading(false)
      return
    }

    router.push('/books')
    setLoading(false)
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-app">{t(ui.auth.registerTitle)}</h2>
          <p className="mt-2 text-center text-sm text-app-muted">{t(ui.auth.registerSubtitle)}</p>
          <p className="mt-4 text-center text-sm text-app-muted leading-relaxed">{t(ui.auth.registerHelp)}</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-app mb-1">
                {t(ui.auth.fullName)}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-3 rounded-lg input-app focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
                placeholder={t(ui.auth.namePh)}
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-app mb-1">
                {t(ui.auth.email)}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
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
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-3 rounded-lg input-app focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
                placeholder={t(ui.auth.passwordHint)}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-app mb-1">
                {t(ui.auth.roleLabel)}
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-3 rounded-lg input-app focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
              >
                <option value="user">{t(ui.auth.customer)}</option>
                <option value="publisher">{t(ui.auth.publisher)}</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-[var(--app-danger-bg)] border border-[var(--app-danger)]/40 text-[var(--app-danger)] px-4 py-3 rounded-lg text-sm">
              {error}
              {error.includes('already') || error.includes('မှတ်ပုံတင်ပြီး') ? (
                <Link href="/login" className="block mt-2 text-[var(--app-accent)] font-medium hover:underline">
                  {t(ui.auth.goLogin)}
                </Link>
              ) : null}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--app-accent)] text-white px-4 py-3 rounded-lg font-semibold hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] disabled:opacity-50 touch-manipulation"
            >
              {loading ? t(ui.auth.creating) : t(ui.auth.signUpCta)}
            </button>
          </div>

          <div className="text-center">
            <Link href="/login" className="text-[var(--app-accent)] hover:underline text-sm font-medium">
              {t(ui.auth.hasAccount)}
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
