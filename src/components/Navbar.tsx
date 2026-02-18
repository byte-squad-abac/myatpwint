'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { ShoppingCartIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useCartStore } from '@/lib/store/cartStore'
import CartDropdown from './CartDropdown'

export default function Navbar() {
  const { user, profile, signOut } = useFirebaseAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const cartRef = useRef<HTMLDivElement>(null)
  const { items } = useCartStore()
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0)

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
    return () => { document.body.style.overflow = '' }
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
      {/* ================= NAVBAR ================= */}
      <nav className="bg-black/95 backdrop-blur-lg border-b border-gray-800 relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 min-h-[3.5rem]">

            {/* Left section */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 -ml-2 text-gray-300 hover:text-white rounded-lg transition-colors"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>

              <Link
                href="/"
                className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent"
              >
                MyatPwint
              </Link>
            </div>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link href="/books" className="text-gray-300 hover:text-white transition">
                Browse Books
              </Link>

              {user && (
                <Link href="/orders" className="text-gray-300 hover:text-white transition">
                  My Orders
                </Link>
              )}

              <Link href="/cart" className="text-gray-300 hover:text-white transition">
                Cart
              </Link>

              {user && profile?.role === 'publisher' && (
                <Link href="/admin/add-book" className="text-gray-300 hover:text-white transition">
                  Add New Book
                </Link>
              )}
            </div>

            {/* Right section */}
            <div className="flex items-center space-x-4">

              {/* Cart */}
              <div className="relative" ref={cartRef}>
                <button
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  className="relative p-2 text-gray-300 hover:text-white transition rounded-lg"
                >
                  <ShoppingCartIcon className="h-6 w-6" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
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

              {/* Auth */}
              {user ? (
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="hidden sm:block px-4 py-2 text-sm border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-lg"
                >
                  {signingOut ? '...' : 'Sign Out'}
                </button>
              ) : (
                <Link href="/login" className="hidden sm:block">
                  <span className="px-4 py-2 text-sm border border-gray-700 text-gray-300 hover:text-white rounded-lg">
                    Sign In
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ================= MOBILE OVERLAY ================= */}
      {isMobileMenuOpen && (
        <>
          {/* Dark backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden"
            onClick={closeMobileMenu}
          />

          {/* Slide panel */}
          <div className="fixed top-0 left-0 h-full w-72 bg-black border-r border-gray-800 z-[60] lg:hidden transform transition-transform duration-300 translate-x-0">

            <div className="p-6 space-y-4">
              <Link href="/books" onClick={closeMobileMenu} className="block text-gray-200 hover:text-white">
                Browse Books
              </Link>

              {user && (
                <Link href="/orders" onClick={closeMobileMenu} className="block text-gray-200 hover:text-white">
                  My Orders
                </Link>
              )}

              <Link href="/cart" onClick={closeMobileMenu} className="block text-gray-200 hover:text-white">
                Cart
              </Link>

              {user && profile?.role === 'publisher' && (
                <Link href="/admin/add-book" onClick={closeMobileMenu} className="block text-gray-200 hover:text-white">
                  Add New Book
                </Link>
              )}

              <div className="border-t border-gray-800 pt-4">
                {user ? (
                  <>
                    <p className="text-gray-400 text-sm mb-2">
                      {profile?.name || user.email}
                    </p>
                    <button
                      onClick={handleSignOut}
                      className="w-full py-2 border border-gray-700 text-gray-300 rounded-lg"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link href="/login" onClick={closeMobileMenu}>
                    <span className="block text-center py-2 border border-gray-700 text-white rounded-lg">
                      Sign In
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
