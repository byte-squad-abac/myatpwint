'use client'

// React and Next.js
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// Types
import type { Book } from '@/types'

// Components
import BookDetailPage from './BookDetailPage'

// Services
import { createClient } from '@/lib/supabase/client'

export default function BookPage() {
  const params = useParams()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!params.id) return

    const fetchBook = async () => {
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) {
          console.error('Error fetching book:', error)
          setError(error.message)
          return
        }

        if (!data) {
          setError('Book not found')
          return
        }

        setBook(data as Book)
      } catch (err) {
        console.error('Error fetching book:', err)
        setError('Failed to load book')
      } finally {
        setLoading(false)
      }
    }

    fetchBook()
  }, [params.id, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading book...</p>
        </div>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Book Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The book you are looking for does not exist.'}</p>
          <Link 
            href="/books" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Browse Books
          </Link>
        </div>
      </div>
    )
  }

  return <BookDetailPage book={book} />
}