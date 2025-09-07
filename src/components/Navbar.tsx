'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { useCartStore } from '@/lib/store/cartStore'
import Button from './ui/Button'
import CartDropdown from './CartDropdown'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const cartRef = useRef<HTMLDivElement>(null)
  const { items } = useCartStore()
  
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0)

  // Close cart dropdown when clicking outside
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
    if (signingOut) return // Prevent double clicks
    
    try {
      setSigningOut(true)
      console.log('🔄 Navbar: Handling sign out...')
      await signOut()
      console.log('✅ Navbar: Sign out successful, redirecting...')
      router.push('/login')
    } catch (error) {
      console.error('❌ Navbar: Sign out error:', error)
      // Even if there's an error, redirect to login page to clear the UI state
      router.push('/login')
    } finally {
      setSigningOut(false)
    }
  }

  const getDashboardLink = () => {
    if (!profile) return '/books'
    
    switch (profile.role) {
      case 'author': return '/author'
      case 'editor': return '/editor'
      case 'publisher': return '/publisher'
      default: return '/books'
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-gray-900">
            MyatPwint
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href="/books" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Browse Books
            </Link>
            
            {user && (
              <>
                <Link 
                  href={getDashboardLink()} 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
                {profile?.role !== 'editor' && (
                  <Link 
                    href="/library" 
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    My Library
                  </Link>
                )}
                <Link 
                  href="/profile" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Profile
                </Link>
                {profile?.role === 'user' && (
                  <Link 
                    href="/apply-as-author" 
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Apply as Author
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Cart and Auth Section */}
          <div className="flex items-center space-x-4">
            {/* Cart Dropdown */}
            <div className="relative" ref={cartRef}>
              <button
                onClick={() => setIsCartOpen(!isCartOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Shopping Cart"
              >
                <ShoppingCartIcon className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </button>
              
              {/* Cart Dropdown */}
              {isCartOpen && (
                <CartDropdown 
                  onClose={() => setIsCartOpen(false)}
                  onCheckout={() => {
                    setIsCartOpen(false)
                    router.push('/checkout')
                  }}
                />
              )}
            </div>
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  Welcome, {profile?.name || user.email}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? 'Signing Out...' : 'Sign Out'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}