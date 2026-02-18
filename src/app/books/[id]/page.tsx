'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getBookById } from '@/lib/firebase/books'
import type { Book } from '@/types/book'
import BookDetailContent from './BookDetailContent'

export default function BookPage() {
  const params = useParams()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params.id) return

    const load = async () => {
      try {
        const data = await getBookById(params.id as string)
        setBook(data)
        if (!data) setError('Book not found')
      } catch (err) {
        setError('Failed to load book')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Book Not Found</h1>
          <p className="text-gray-400 mb-6">{error || 'The book you are looking for does not exist.'}</p>
          <Link
            href="/books"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Browse Books
          </Link>
        </div>
      </div>
    )
  }

  return <BookDetailContent book={book} />
}
