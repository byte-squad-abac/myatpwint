'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import {
  ShoppingCartIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useCartStore } from '@/lib/store/cartStore'
import { usePreferences } from '@/components/PreferencesProvider'
import { pick, ui } from '@/lib/ui/bilingualLabels'
import { cn } from '@/lib/utils'
import CartDropdown from './CartDropdown'

export default function Navbar() {
  const { user, profile, signOut } = useFirebaseAuth()
  const { locale, setLocale, theme, toggleTheme } = usePreferences()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const cartRef = useRef<HTMLDivElement>(null)
  const { items } = useCartStore()
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0)

  const t = (entry: { en: string; my: string }) => pick(entry, locale)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        setIsCartOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const handleSignOut = async () => {
    if (signingOut) return
    try {
      setSigningOut(true)
      await signOut()
      router.push('/login')
    } catch {
      router.push('/login')
    } finally {
      setSigningOut(false)
    }
  }

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <>
      <nav className="shrink-0 bg-app-nav backdrop-blur-lg border-b border-app relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              'flex justify-between items-center gap-2',
              locale === 'my' ? 'min-h-[3.75rem] sm:min-h-[4.25rem] py-1' : 'h-14 sm:h-16 min-h-[3.5rem]',
            )}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 -ml-2 text-app-muted hover:text-app rounded-lg transition-colors touch-manipulation"
                aria-label={isMobileMenuOpen ? t(ui.common.closeMenu) : t(ui.common.openMenu)}
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>

              <Link
                href="/"
                className={cn(
                  'font-bold text-[var(--app-accent)] hover:opacity-90 transition-opacity',
                  locale === 'my'
                    ? 'text-lg sm:text-xl md:text-[1.9rem] leading-snug tracking-normal py-0.5 whitespace-normal max-w-[9rem] sm:max-w-none'
                    : 'text-lg sm:text-xl leading-tight truncate max-w-[9rem] sm:max-w-none',
                )}
              >
                {t(ui.nav.brand)}
              </Link>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              <Link
                href="/books"
                className="text-app-muted hover:text-app transition font-medium"
              >
                {t(ui.nav.books)}
              </Link>

              {user && (
                <Link
                  href="/orders"
                  className="text-app-muted hover:text-app transition font-medium"
                >
                  {t(ui.nav.orders)}
                </Link>
              )}

              <Link href="/cart" className="text-app-muted hover:text-app transition font-medium">
                {t(ui.nav.cart)}
              </Link>

              {user && profile?.role === 'publisher' && (
                <Link
                  href="/admin/add-book"
                  className="text-app-muted hover:text-app transition font-medium"
                >
                  {t(ui.nav.addBook)}
                </Link>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div
                className="hidden sm:flex items-center rounded-full border border-app bg-app-card p-0.5"
                role="group"
                aria-label={t(ui.common.language)}
              >
                <button
                  type="button"
                  onClick={() => setLocale('en')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-full transition touch-manipulation ${
                    locale === 'en'
                      ? 'bg-[var(--app-accent)] text-white shadow-sm'
                      : 'text-app-muted hover:text-app'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLocale('my')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-full transition touch-manipulation ${
                    locale === 'my'
                      ? 'bg-[var(--app-accent)] text-white shadow-sm'
                      : 'text-app-muted hover:text-app'
                  }`}
                >
                  MY
                </button>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg text-app-muted hover:text-app hover:bg-app-card-elevated border border-transparent hover:border-app transition touch-manipulation"
                aria-label={theme === 'dark' ? t(ui.common.themeLight) : t(ui.common.themeDark)}
                title={theme === 'dark' ? t(ui.common.themeLight) : t(ui.common.themeDark)}
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-6 w-6" />
                ) : (
                  <MoonIcon className="h-6 w-6" />
                )}
              </button>

              <div className="relative" ref={cartRef}>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  className="relative p-2 text-app-muted hover:text-app rounded-lg touch-manipulation"
                  aria-label={t(ui.nav.cart)}
                >
                  <ShoppingCartIcon className="h-6 w-6" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[var(--app-accent)] text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-bold tabular-nums">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                </button>

                {isCartOpen && (
                  <CartDropdown
                    onClose={() => setIsCartOpen(false)}
                    onCheckout={() => {
                      setIsCartOpen(false)
                      router.push('/cart')
                    }}
                  />
                )}
              </div>

              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="hidden sm:inline-flex px-3 py-2 text-sm border border-app text-app-muted hover:text-app hover:bg-app-card-elevated rounded-lg touch-manipulation disabled:opacity-50"
                >
                  {signingOut ? '…' : t(ui.nav.signOut)}
                </button>
              ) : (
                <Link href="/login" className="hidden sm:block">
                  <span className="inline-flex px-3 py-2 text-sm border border-app text-app hover:bg-app-card-elevated rounded-lg font-medium">
                    {t(ui.nav.signIn)}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 lg:hidden bg-[var(--app-overlay)] backdrop-blur-sm"
            onClick={closeMobileMenu}
            aria-hidden
          />

          <div className="fixed top-0 left-0 h-full w-[min(20rem,92vw)] bg-app-card border-r border-app z-[60] lg:hidden shadow-xl">
            <div className="p-5 space-y-4">
              <p className="text-xs font-semibold text-app-muted uppercase tracking-wide">
                {t(ui.common.language)}
              </p>
              <div className="flex rounded-lg border border-app overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLocale('en')}
                  className={`flex-1 py-3 text-sm font-semibold touch-manipulation ${
                    locale === 'en' ? 'bg-[var(--app-accent)] text-white' : 'bg-app-card-elevated text-app'
                  }`}
                >
                  {t(ui.common.english)}
                </button>
                <button
                  type="button"
                  onClick={() => setLocale('my')}
                  className={`flex-1 py-3 text-sm font-semibold touch-manipulation ${
                    locale === 'my' ? 'bg-[var(--app-accent)] text-white' : 'bg-app-card-elevated text-app'
                  }`}
                >
                  {t(ui.common.myanmar)}
                </button>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-app text-app font-medium touch-manipulation"
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
                {theme === 'dark' ? t(ui.common.themeLight) : t(ui.common.themeDark)}
              </button>

              <div className="border-t border-app pt-4 space-y-1">
                <Link
                  href="/books"
                  onClick={closeMobileMenu}
                  className="block py-3 px-1 text-app font-medium border-b border-app/60"
                >
                  {t(ui.nav.books)}
                </Link>

                {user && (
                  <Link
                    href="/orders"
                    onClick={closeMobileMenu}
                    className="block py-3 px-1 text-app font-medium border-b border-app/60"
                  >
                    {t(ui.nav.orders)}
                  </Link>
                )}

                <Link
                  href="/cart"
                  onClick={closeMobileMenu}
                  className="block py-3 px-1 text-app font-medium border-b border-app/60"
                >
                  {t(ui.nav.cart)}
                </Link>

                {user && profile?.role === 'publisher' && (
                  <Link
                    href="/admin/add-book"
                    onClick={closeMobileMenu}
                    className="block py-3 px-1 text-app font-medium border-b border-app/60"
                  >
                    {t(ui.nav.addBook)}
                  </Link>
                )}
              </div>

              <div className="border-t border-app pt-4">
                {user ? (
                  <>
                    <p className="text-app-muted text-sm mb-3">{profile?.name || user.email}</p>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full py-3 border border-app rounded-lg text-app font-medium touch-manipulation"
                    >
                      {t(ui.nav.signOut)}
                    </button>
                  </>
                ) : (
                  <Link href="/login" onClick={closeMobileMenu}>
                    <span className="block text-center py-3 border border-app rounded-lg text-app font-semibold">
                      {t(ui.nav.signIn)}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
