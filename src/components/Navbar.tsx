'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { useCartStore } from '@/lib/store/cartStore'
import CartDropdown from './CartDropdown'

export default function Navbar() {
  const { user, profile, signOut } = useFirebaseAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
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

  return (
    <nav className="bg-black/95 backdrop-blur-lg border-b border-gray-800 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
            MyatPwint
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/books" className="text-gray-300 hover:text-white transition-colors">
              Browse Books
            </Link>
            <Link href="/cart" className="text-gray-300 hover:text-white transition-colors">
              Cart
            </Link>
            {user && profile?.role === 'publisher' && (
              <Link href="/admin/add-book" className="text-gray-300 hover:text-white transition-colors">
                Add New Book
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative" ref={cartRef}>
              <button
                onClick={() => setIsCartOpen(!isCartOpen)}
                className="relative p-2 text-gray-300 hover:text-white transition-colors"
                aria-label="Cart"
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

            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-300">
                  {profile?.name || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="px-4 py-2 text-sm border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-lg transition-all disabled:opacity-50"
                >
                  {signingOut ? 'Signing Out...' : 'Sign Out'}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <button className="px-4 py-2 text-sm border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-lg transition-all">
                    Sign In
                  </button>
                </Link>
                <Link href="/register">
                  <button className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all">
                    Sign Up
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
