'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

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
      // Navigate to reading page
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


  const filteredBooks = purchases.filter(purchase => {
    const book = purchase.books
    return book.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
           book.description.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your library...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will be redirected by useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Library</h1>
        <p className="text-gray-600">Your purchased books and reading collection</p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search your books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Books Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((purchase) => {
            const book = purchase.books
            const progress = getReadingProgress(book.id)
            const hasProgress = progress && progress.reading_time_seconds > 0
            return (
              <Card key={purchase.id} className="h-full">
                <div className="p-6">
                  {book.image_url && (
                    <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 overflow-hidden">
                      <Image 
                        src={book.image_url} 
                        alt={book.name}
                        width={200}
                        height={267}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {book.name}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                    
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                      {book.description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary">{book.category}</Badge>
                      <div className="flex items-center gap-2">
                        <Badge variant={purchase.delivery_type === 'digital' ? 'default' : 'outline'} size="sm">
                          {purchase.delivery_type}
                        </Badge>
                        <span className="text-sm text-green-600 font-medium">
                          Purchased
                        </span>
                      </div>
                    </div>
                    
                    {book.tags && book.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {book.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" size="sm">
                            {tag}
                          </Badge>
                        ))}
                        {book.tags.length > 3 && (
                          <Badge variant="outline" size="sm">
                            +{book.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mb-4">
                      Purchased: {new Date(purchase.created_at).toLocaleDateString()}
                      {purchase.quantity > 1 && ` • Qty: ${purchase.quantity}`}
                    </div>
                    
                    
                    <div className="space-y-2">
                      {purchase.delivery_type === 'digital' ? (
                        <>
                          <Button 
                            onClick={() => handleReadNow(book.id)}
                            className="w-full"
                            variant="primary"
                            disabled={readingBookId === book.id}
                          >
                            {readingBookId === book.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Opening Book...
                              </>
                            ) : (
                              <>{hasProgress ? '📖 Continue Reading' : '📖 Start Reading'}</>
                            )}
                          </Button>
                          <div className="text-xs text-center text-gray-500">
                            {hasProgress ? 'Pick up where you left off' : 'Full-screen reading experience'}
                          </div>
                        </>
                      ) : (
                        <div className="w-full text-center py-2 px-4 rounded text-sm bg-gray-100 text-gray-600">
                          📦 Physical Copy Ordered
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your library is empty</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? "No books in your library match your search"
              : "You haven't purchased any books yet. Digital books can be read instantly with our full-screen reading experience!"
            }
          </p>
          {!searchTerm && (
            <Button onClick={() => router.push('/books')}>
              Browse Books
            </Button>
          )}
        </div>
      )}

      {/* Stats */}
      {purchases.length > 0 && (
        <div className="mt-12 text-center text-sm text-gray-600">
          {filteredBooks.length} of {purchases.length} books in your library
        </div>
      )}
    </div>
  )
}