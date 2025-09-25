'use client'

import { useState, useRef, useEffect } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'

export function NewsletterDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email })

    if (error) {
      if (error.code === '23505') {
        alert('This email is already subscribed!')
      } else {
        alert('Failed to subscribe. Please try again.')
      }
    } else {
      setSubscribed(true)
      setEmail('')
      setTimeout(() => {
        setSubscribed(false)
        setIsOpen(false)
      }, 2000)
    }

    setLoading(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Subscribe to newsletter"
      >
        <BellIcon className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl p-4 z-50">
          {subscribed ? (
            <div className="text-center py-4">
              <span className="text-2xl">✅</span>
              <p className="text-green-400 mt-2">Successfully subscribed!</p>
            </div>
          ) : (
            <>
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <BellIcon className="w-4 h-4 mr-2" />
                Get Book Updates
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Be the first to know about new releases!
              </p>

              <form onSubmit={handleSubscribe} className="space-y-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Subscribing...' : 'Subscribe to Newsletter'}
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-gray-800">
                <a
                  href="https://t.me/myatpwintbook"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.308-.346-.11l-6.4 4.02-2.76-.918c-.6-.187-.612-.6.125-.89l10.782-4.156c.5-.18.94.12.78.88z"/>
                  </svg>
                  <span>Join our Telegram Channel</span>
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}