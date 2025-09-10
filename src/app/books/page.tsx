'use client'

// React and Next.js
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// External libraries
import { createClient } from '@/lib/supabase/client'

// Hooks

// Types
import type { Book } from '@/types'

// Components  
import { Button, Card, Badge } from '@/components/ui'
import { SemanticSearch, useSearchContext } from '@/components'

export default function BooksPage() {
  const router = useRouter()
  const supabase = createClient()
  const { searchResults, hasActiveSearch, setSearchResults } = useSearchContext()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true)
      
      const query = supabase
        .from('books')
        .select('*')
        .order('published_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      
      setBooks(data || [])
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(book => book.category).filter(Boolean) || [])]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])


  const filteredBooks = books.filter(book => {
    const matchesSearch = book.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || book.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Keep all search results - don't filter based on purchases
  // (purchasedBookIds now only contains digital purchases for badge display)
  const filteredSearchResults = useMemo(() => {
    return searchResults
  }, [searchResults])

  // Use search results if there's an active search, otherwise show filtered books
  const displayBooks = hasActiveSearch && filteredSearchResults !== null ? filteredSearchResults : filteredBooks

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading books...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Books</h1>
        <p className="text-gray-600">Discover amazing books from Myanmar authors</p>
      </div>

      {/* AI-Powered Search */}
      <div className="mb-8">
        <SemanticSearch 
          placeholder="Search with AI: Try 'romance novels in Myanmar' or 'မြန်မာ့ပန်းချီအနှစ်သာရ'"
          autoNavigate={true}
          onResults={setSearchResults}
          category={selectedCategory}
        />
      </div>

      {/* Traditional Search and Filter - shown when AI search is not active */}
      {!hasActiveSearch && (
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Traditional search: books, authors, descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Search Status */}
      {hasActiveSearch && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            🤖 AI Search Results: Found {searchResults?.length || 0} books
            {searchResults && searchResults.length > 0 && searchResults[0].searchMetadata && (
              <span className="ml-2 text-sm">
                (using {searchResults[0].searchMetadata.model})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Books Grid */}
      {displayBooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayBooks.map((book) => (
            <Card key={book.id} className="h-full">
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
                    <span className="text-lg font-bold text-green-600">
                      ${book.price}
                    </span>
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
                    Published: {new Date(book.published_date).toLocaleDateString()}
                    {book.edition && ` • ${book.edition}`}
                  </div>
                  
                  <Button 
                    className="w-full"
                    onClick={() => router.push(`/books/${book.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No books found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory 
              ? "Try adjusting your search or filter criteria"
              : "No published books available at the moment"
            }
          </p>
        </div>
      )}

      {/* Stats */}
      {books.length > 0 && (
        <div className="mt-12 text-center text-sm text-gray-600">
          Showing {displayBooks.length} of {books.length} books
          {hasActiveSearch && ' (AI search active)'}
        </div>
      )}
    </div>
  )
}