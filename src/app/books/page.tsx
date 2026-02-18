'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBooks } from '@/lib/firebase/books'
import type { Book } from '@/types/book'
import { formatMMK } from '@/lib/utils/currency'

export default function BooksPage() {
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredBook, setHoveredBook] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getBooks(10)
        setBooks(data)
      } catch (err) {
        console.error('Error fetching books:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-white/10 rounded-full" />
          <div className="absolute inset-0 w-24 h-24 border-4 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Myat Pwint Books
              </span>
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-20">
        {books.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="group cursor-pointer"
                onClick={() => router.push(`/books/${book.id}`)}
                onMouseEnter={() => setHoveredBook(book.id)}
                onMouseLeave={() => setHoveredBook(null)}
              >
                <div className="relative overflow-hidden rounded-lg">
                  <div className="aspect-[3/4] bg-gradient-to-br from-gray-900 to-gray-800 relative">
                    {book.image ? (
                      <img
                        src={book.image}
                        alt={book.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        No Image
                      </div>
                    )}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 ${
                        hoveredBook === book.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white text-sm font-medium line-clamp-2 mb-1">{book.name}</p>
                        <p className="text-gray-300 text-xs">{book.author_name}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-green-400 font-bold">{formatMMK(book.price)}</span>
                          <span className="text-xs bg-white/20 backdrop-blur px-2 py-1 rounded">{book.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <h3 className="text-white font-medium text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
                    {book.name}
                  </h3>
                  <p className="text-gray-500 text-xs">{book.author_name}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32">
            <h3 className="text-xl font-semibold text-white mb-2">No books yet</h3>
            <p className="text-gray-400">Check back soon for new releases</p>
          </div>
        )}
      </div>
    </div>
  )
}
