'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { BookOpenIcon, PlayIcon, ClockIcon } from '@heroicons/react/24/outline'

interface Purchase {
  id: string
  user_id: string
  book_id: string
  delivery_type: 'digital' | 'physical'
  quantity: number
  unit_price: string
  total_price: string
  status: string
  created_at: string
  books: {
    id: string
    name: string
    author: string
    description: string
    category: string
    tags: string[]
    price: number
    image_url?: string
    published_date: string
    edition: string
  }
}

interface ReadingProgress {
  id: string
  user_id: string
  book_id: string
  reading_time_seconds: number
  last_read_at: string
  is_active_session: boolean
}

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [readingBookId, setReadingBookId] = useState<string | null>(null)
  const [readingProgress, setReadingProgress] = useState<Map<string, ReadingProgress>>(new Map())
  const [filter, setFilter] = useState<'all' | 'digital' | 'physical' | 'continue'>('all')

  const fetchPurchases = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          books (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPurchases(data || [])
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  const fetchReadingProgress = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/reading-progress?userId=${user.id}`)
      if (!response.ok) return

      const data = await response.json()
      const progressMap = new Map<string, ReadingProgress>()

      data.progress?.forEach((progress: ReadingProgress) => {
        progressMap.set(progress.book_id, progress)
      })

      setReadingProgress(progressMap)
    } catch (error) {
      console.error('Error fetching reading progress:', error)
    }
  }, [user])

  const handleReadNow = useCallback(async (bookId: string) => {
    try {
      setReadingBookId(bookId)
      router.push(`/read/${bookId}`)
    } catch (error) {
      console.error('Error navigating to reading page:', error)
      setReadingBookId(null)
    }
  }, [router])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      fetchPurchases()
      fetchReadingProgress()
    }
  }, [user, authLoading, router, fetchPurchases, fetchReadingProgress])

  const getReadingProgress = (bookId: string): ReadingProgress | undefined => {
    return readingProgress.get(bookId)
  }

  const getFilteredBooks = () => {
    const filtered = purchases.filter(purchase => {
      const book = purchase.books
      const matchesSearch = book.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           book.author.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      switch (filter) {
        case 'digital': return purchase.delivery_type === 'digital'
        case 'physical': return purchase.delivery_type === 'physical'
        case 'continue':
          const progress = getReadingProgress(book.id)
          return progress && progress.reading_time_seconds > 0
        default: return true
      }
    })

    // Deduplicate and consolidate quantities
    const uniqueBooks = new Map<string, Purchase>()
    const result: Purchase[] = []

    filtered.forEach(purchase => {
      if (purchase.delivery_type === 'digital') {
        // For digital books, only keep first purchase (no duplicates)
        const key = purchase.book_id
        if (!uniqueBooks.has(key)) {
          uniqueBooks.set(key, purchase)
          result.push(purchase)
        }
      } else {
        // For physical books, consolidate quantities into single entry
        const key = purchase.book_id
        const existing = uniqueBooks.get(key)
        if (existing) {
          // Sum up the quantities
          existing.quantity += purchase.quantity
        } else {
          uniqueBooks.set(key, { ...purchase })
          result.push(uniqueBooks.get(key)!)
        }
      }
    })

    return result
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-white/10 rounded-full"></div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-t-purple-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const filteredBooks = getFilteredBooks()

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              My Library
            </h1>
            <p className="text-gray-400 mt-1">{purchases.length} books in your collection</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search books or authors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'digital', label: 'Digital' },
              { key: 'physical', label: 'Physical' },
              { key: 'continue', label: 'Continue' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as 'all' | 'digital' | 'physical' | 'continue')}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  filter === key
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Books Grid */}
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {filteredBooks.map((purchase) => {
              const book = purchase.books
              const progress = getReadingProgress(book.id)
              const hasProgress = progress && progress.reading_time_seconds > 0

              return (
                <div key={purchase.id} className="group">
                  <div className="relative overflow-hidden rounded-lg">
                    {/* Book Cover */}
                    <div className="aspect-[3/4] bg-gradient-to-br from-gray-900 to-gray-800 relative">
                      {book.image_url ? (
                        <Image
                          src={book.image_url}
                          alt={book.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpenIcon className="w-12 h-12 text-gray-600" />
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-medium line-clamp-2 mb-1">
                            {book.name}
                          </p>
                          <p className="text-gray-300 text-xs mb-3">
                            {book.author}
                          </p>

                          {/* Action Button */}
                          {purchase.delivery_type === 'digital' ? (
                            <button
                              onClick={() => handleReadNow(book.id)}
                              disabled={readingBookId === book.id}
                              className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                            >
                              {readingBookId === book.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Loading...
                                </>
                              ) : (
                                <>
                                  {hasProgress ? (
                                    <>
                                      <ClockIcon className="w-3 h-3" />
                                      Continue
                                    </>
                                  ) : (
                                    <>
                                      <PlayIcon className="w-3 h-3" />
                                      Read
                                    </>
                                  )}
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="w-full py-2 bg-gray-800 text-gray-400 text-center rounded-lg text-sm">
                              {purchase.quantity > 1 ? `${purchase.quantity} Physical Copies` : 'Physical Copy'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Badge */}
                      {hasProgress && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                        </div>
                      )}

                      {/* Delivery Type & Quantity */}
                      <div className="absolute top-2 left-2">
                        {purchase.delivery_type === 'physical' ? (
                          <div className="bg-green-500/90 backdrop-blur px-2 py-1 rounded-full text-xs text-white font-medium">
                            {purchase.quantity}x
                          </div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                        )}
                      </div>
                    </div>

                    {/* Book Info - Simple */}
                    <div className="mt-3">
                      <h3 className="text-white font-medium text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
                        {book.name}
                      </h3>
                      <p className="text-gray-500 text-xs mt-1">
                        {book.author}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-900 rounded-full flex items-center justify-center">
              <BookOpenIcon className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              {searchTerm || filter !== 'all' ? 'No books found' : 'Your library is empty'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchTerm
                ? "Try a different search term"
                : filter !== 'all'
                ? `No ${filter} books in your library`
                : "Purchase books to start building your library"
              }
            </p>
            {!searchTerm && filter === 'all' && (
              <button
                onClick={() => router.push('/books')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all"
              >
                Browse Books
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}