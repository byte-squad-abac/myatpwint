'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Book } from '@/types'
import { SemanticSearch, useSearchContext } from '@/components'
import { formatMMK } from '@/lib/utils/currency'

// Price range will be calculated dynamically from actual book data

export default function BooksPage() {
  const router = useRouter()
  const supabase = createClient()
  const { searchResults, hasActiveSearch, setSearchResults } = useSearchContext()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredBook, setHoveredBook] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(0)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0])
  const [showPriceDropdown, setShowPriceDropdown] = useState(false)
  const [selectedAuthor, setSelectedAuthor] = useState('')
  const [authors, setAuthors] = useState<string[]>([])
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const priceDropdownRef = useRef<HTMLDivElement>(null)
  const priceButtonRef = useRef<HTMLButtonElement>(null)
  const authorDropdownRef = useRef<HTMLDivElement>(null)
  const authorButtonRef = useRef<HTMLButtonElement>(null)

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('published_date', { ascending: false })

      if (error) throw error

      setBooks(data || [])

      // Calculate dynamic price range from actual data
      const prices = data?.map(book => book.price) || []
      if (prices.length > 0) {
        const min = Math.min(...prices)
        const max = Math.max(...prices)
        setMinPrice(min)
        setMaxPrice(max)
        // Only set initial priceRange if it hasn't been set yet
        if (priceRange[0] === 0 && priceRange[1] === 0) {
          setPriceRange([min, max])
        }
      }

      // Parse categories properly - split by comma and clean up
      const allCategories = data?.flatMap(book =>
        book.category ? book.category.split(',').map((cat: string) => cat.trim()).filter((cat: string) => cat.length > 0) : []
      ) || []
      const uniqueCategories = [...new Set(allCategories)].sort()
      setCategories(uniqueCategories)

      // Extract authors
      const allAuthors = data?.map(book => book.author).filter(Boolean) || []
      const uniqueAuthors = [...new Set(allAuthors)].sort()
      setAuthors(uniqueAuthors)
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, priceRange])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close category dropdown
      if (
        showCategoryDropdown &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowCategoryDropdown(false)
      }

      // Close price dropdown
      if (
        showPriceDropdown &&
        priceDropdownRef.current &&
        priceButtonRef.current &&
        !priceDropdownRef.current.contains(event.target as Node) &&
        !priceButtonRef.current.contains(event.target as Node)
      ) {
        setShowPriceDropdown(false)
      }

      // Close author dropdown
      if (
        showAuthorDropdown &&
        authorDropdownRef.current &&
        authorButtonRef.current &&
        !authorDropdownRef.current.contains(event.target as Node) &&
        !authorButtonRef.current.contains(event.target as Node)
      ) {
        setShowAuthorDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCategoryDropdown, showPriceDropdown, showAuthorDropdown])

  const displayBooks = useMemo(() => {
    // Start with either search results or all books
    let filteredBooks = hasActiveSearch && searchResults !== null ? searchResults : books

    // Filter by category
    if (selectedCategory) {
      filteredBooks = filteredBooks.filter(book => {
        if (!book.category) return false
        const bookCategories = book.category.split(',').map((cat: string) => cat.trim())
        return bookCategories.includes(selectedCategory)
      })
    }

    // Filter by price range
    filteredBooks = filteredBooks.filter(book => {
      const price = book.price
      return price >= priceRange[0] && price <= priceRange[1]
    })

    // Filter by author
    if (selectedAuthor) {
      filteredBooks = filteredBooks.filter(book => book.author === selectedAuthor)
    }

    return filteredBooks
  }, [hasActiveSearch, searchResults, selectedCategory, priceRange, selectedAuthor, books])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-white/10 rounded-full"></div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Unified Search */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent"></div>

        <div className="container mx-auto px-6 py-20 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Myat Pwint Books
              </span>
            </h1>

            {/* Search and Filter Section */}
            <div className="flex flex-col items-center gap-4 max-w-6xl mx-auto">
              {/* Search Bar */}
              <div className="relative group flex-1 w-full max-w-4xl">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative bg-gray-900 rounded-2xl">
                  <SemanticSearch
                    placeholder="Search books, authors, or topics..."
                    autoNavigate={false}
                    onResults={setSearchResults}
                    category={selectedCategory}
                  />
                </div>
              </div>

              {/* Filter Dropdowns */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {/* Category Filter Dropdown */}
                {categories.length > 0 && (
                  <div className="relative">
                    <button
                      ref={buttonRef}
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="group flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl text-gray-200 hover:from-gray-800/90 hover:to-gray-700/90 hover:border-gray-600/50 transition-all shadow-lg whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span className="font-medium">{selectedCategory || 'All Categories'}</span>
                      <svg className={`w-4 h-4 transition-transform text-gray-400 ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Price Filter Dropdown */}
                <div className="relative">
                  <button
                    ref={priceButtonRef}
                    onClick={() => setShowPriceDropdown(!showPriceDropdown)}
                    className="group flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl text-gray-200 hover:from-gray-800/90 hover:to-gray-700/90 hover:border-gray-600/50 transition-all shadow-lg whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span className="font-medium">
                      {priceRange[0] === minPrice && priceRange[1] === maxPrice
                        ? 'All Prices'
                        : `${formatMMK(priceRange[0])} - ${formatMMK(priceRange[1])}`}
                    </span>
                    <svg className={`w-4 h-4 transition-transform text-gray-400 ${showPriceDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Author Filter Dropdown */}
                {authors.length > 0 && (
                  <div className="relative">
                    <button
                      ref={authorButtonRef}
                      onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
                      className="group flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl text-gray-200 hover:from-gray-800/90 hover:to-gray-700/90 hover:border-gray-600/50 transition-all shadow-lg whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">{selectedAuthor || 'All Authors'}</span>
                      <svg className={`w-4 h-4 transition-transform text-gray-400 ${showAuthorDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      <div className="container mx-auto px-6 pb-20 relative z-10">
        {displayBooks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {displayBooks.map((book) => (
              <div
                key={book.id}
                className="group cursor-pointer"
                onClick={() => router.push(`/books/${book.id}`)}
                onMouseEnter={() => setHoveredBook(book.id)}
                onMouseLeave={() => setHoveredBook(null)}
              >
                <div className="relative overflow-hidden rounded-lg">
                  {/* Book Cover */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-gray-900 to-gray-800 relative">
                    {book.image_url ? (
                      <img
                        src={book.image_url}
                        alt={book.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        No Image
                      </div>
                    )}

                    {/* Overlay on Hover */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 ${
                      hoveredBook === book.id ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <div className="absolute bottom-0 left-0 right-0 p-4 transform transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
                        <p className="text-white text-sm font-medium line-clamp-2 mb-1">
                          {book.name}
                        </p>
                        <p className="text-gray-300 text-xs">
                          {book.author}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-green-400 font-bold">
                            {formatMMK(book.price)}
                          </span>
                          <span className="text-xs bg-white/20 backdrop-blur px-2 py-1 rounded">
                            {book.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Minimal Book Info */}
                <div className="mt-3 space-y-1">
                  <h3 className="text-white font-medium text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
                    {book.name}
                  </h3>
                  <p className="text-gray-500 text-xs">
                    {book.author}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center mb-6">
              <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No books found</h3>
            <p className="text-gray-400 text-center max-w-md">
              {selectedCategory || hasActiveSearch
                ? "Try adjusting your search or filters"
                : "Check back soon for new releases"}
            </p>
          </div>
        )}

        {/* Floating Stats */}
        {books.length > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gray-900/95 backdrop-blur-lg border border-gray-800 rounded-full px-6 py-3 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">
                  {displayBooks.length} books
                </span>
              </div>
              {hasActiveSearch && (
                <>
                  <div className="w-px h-4 bg-gray-700"></div>
                  <span className="text-xs text-purple-400">AI Search Active</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Category Dropdown Portal */}
      {showCategoryDropdown && categories.length > 0 && buttonRef.current && (
        <div
          ref={dropdownRef}
          className="fixed w-64 bg-gradient-to-b from-gray-900 to-gray-950 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            zIndex: 99999,
            top: buttonRef.current.getBoundingClientRect().bottom + 12,
            right: window.innerWidth - buttonRef.current.getBoundingClientRect().right,
          }}
        >
          <div className="max-h-96 overflow-y-auto">
            <button
              onClick={() => {
                setSelectedCategory('')
                setShowCategoryDropdown(false)
              }}
              className={`w-full text-left px-5 py-3 text-sm font-medium transition-all ${
                !selectedCategory
                  ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-white border-l-4 border-purple-500'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
              }`}
            >
              ✨ All Categories
            </button>
            <div className="border-t border-gray-800/50"></div>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat)
                  setShowCategoryDropdown(false)
                }}
                className={`w-full text-left px-5 py-3 text-sm transition-all ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-white border-l-4 border-purple-500 font-medium'
                    : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:pl-6'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Dropdown Portal */}
      {showPriceDropdown && priceButtonRef.current && (
        <div
          ref={priceDropdownRef}
          className="fixed w-72 bg-gradient-to-b from-gray-900 to-gray-950 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            zIndex: 99999,
            top: priceButtonRef.current.getBoundingClientRect().bottom + 12,
            right: window.innerWidth - priceButtonRef.current.getBoundingClientRect().right,
          }}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Price Range
              </h3>
              <button
                onClick={() => setShowPriceDropdown(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Price Range Display */}
            <div className="text-center mb-6">
              <div className="text-xl font-bold text-white mb-1">
                {formatMMK(priceRange[0])} - {formatMMK(priceRange[1])}
              </div>
              <div className="text-sm text-gray-400">
                Drag handles to adjust range
              </div>
            </div>

            {/* Range Slider */}
            <div className="mb-8">
              <div className="relative py-3">
                {/* Track */}
                <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-700 rounded-full transform -translate-y-1/2"></div>

                {/* Active track */}
                <div
                  className="absolute top-1/2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transform -translate-y-1/2"
                  style={{
                    left: `${((priceRange[0] - minPrice) / (maxPrice - minPrice)) * 100}%`,
                    width: `${((priceRange[1] - priceRange[0]) / (maxPrice - minPrice)) * 100}%`
                  }}
                ></div>

                {/* Min slider */}
                <input
                  type="range"
                  min={minPrice}
                  max={maxPrice}
                  step={1000}
                  value={priceRange[0]}
                  onChange={(e) => {
                    const newMin = parseInt(e.target.value)
                    if (newMin < priceRange[1]) {
                      setPriceRange([newMin, priceRange[1]])
                    }
                  }}
                  className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-400 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-green-400/20"
                />

                {/* Max slider */}
                <input
                  type="range"
                  min={minPrice}
                  max={maxPrice}
                  step={1000}
                  value={priceRange[1]}
                  onChange={(e) => {
                    const newMax = parseInt(e.target.value)
                    if (newMax > priceRange[0]) {
                      setPriceRange([priceRange[0], newMax])
                    }
                  }}
                  className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-emerald-400/20"
                />
              </div>

              {/* Min/Max labels */}
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{formatMMK(minPrice)}</span>
                <span>{formatMMK(maxPrice)}</span>
              </div>
            </div>

            {/* Reset button */}
            <button
              onClick={() => {
                setPriceRange([minPrice, maxPrice])
                setShowPriceDropdown(false)
              }}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Reset to All Prices
            </button>
          </div>
        </div>
      )}

      {/* Author Dropdown Portal */}
      {showAuthorDropdown && authors.length > 0 && authorButtonRef.current && (
        <div
          ref={authorDropdownRef}
          className="fixed w-64 bg-gradient-to-b from-gray-900 to-gray-950 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            zIndex: 99999,
            top: authorButtonRef.current.getBoundingClientRect().bottom + 12,
            right: window.innerWidth - authorButtonRef.current.getBoundingClientRect().right,
          }}
        >
          <div className="max-h-96 overflow-y-auto">
            <button
              onClick={() => {
                setSelectedAuthor('')
                setShowAuthorDropdown(false)
              }}
              className={`w-full text-left px-5 py-3 text-sm font-medium transition-all ${
                !selectedAuthor
                  ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-white border-l-4 border-blue-500'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
              }`}
            >
              👤 All Authors
            </button>
            <div className="border-t border-gray-800/50"></div>
            {authors.map((author) => (
              <button
                key={author}
                onClick={() => {
                  setSelectedAuthor(author)
                  setShowAuthorDropdown(false)
                }}
                className={`w-full text-left px-5 py-3 text-sm transition-all ${
                  selectedAuthor === author
                    ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-white border-l-4 border-blue-500 font-medium'
                    : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:pl-6'
                }`}
              >
                {author}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}