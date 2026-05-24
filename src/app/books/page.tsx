'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBooks } from '@/lib/firebase/books'
import type { Book } from '@/types/book'
import { formatMMK } from '@/lib/utils/currency'
import { usePreferences } from '@/components/PreferencesProvider'
import { pick, ui } from '@/lib/ui/bilingualLabels'
import { cn } from '@/lib/utils'

export default function BooksPage() {
  const router = useRouter()
  const { locale } = usePreferences()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredBook, setHoveredBook] = useState<string | null>(null)
  const t = (e: { en: string; my: string }) => pick(e, locale)

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
      <div className="flex flex-1 items-center justify-center bg-app">
        <div className="w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col w-full bg-app text-app">
      <div className="relative overflow-hidden">
        {/* <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, var(--app-hero-tint), transparent)` }}
        /> */}
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16 relative">
  <div className="max-w-3xl mx-auto text-center space-y-4">
    <h1
      className={cn(
        'font-bold text-[var(--app-accent)] hover:opacity-90 transition-opacity',
        locale === 'my'
          ? 'text-3xl sm:text-4xl md:text-5xl leading-snug tracking-normal'
          : 'text-3xl sm:text-4xl md:text-5xl leading-tight tracking-tight',
      )}
    >
      {t(ui.booksPage.title)}
    </h1>

    <p className="text-app-muted text-base sm:text-lg max-w-xl mx-auto">
      {t(ui.booksPage.subtitle)}
    </p>
  </div>
</div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-20">
        {books.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="group cursor-pointer touch-manipulation"
                onClick={() => router.push(`/books/${book.id}`)}
                onMouseEnter={() => setHoveredBook(book.id)}
                onMouseLeave={() => setHoveredBook(null)}
                onFocus={() => setHoveredBook(book.id)}
                onBlur={() => setHoveredBook(null)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(`/books/${book.id}`)
                  }
                }}
              >
                <div className="relative overflow-hidden rounded-xl border border-app shadow-sm bg-app-card">
                  <div className="aspect-[3/4] bg-app-card-elevated relative">
                    {book.image ? (
                      <img
                        src={book.image}
                        alt={book.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-app-muted text-sm px-2 text-center">
                        {t(ui.booksPage.noImage)}
                      </div>
                    )}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-[var(--app-bg)] via-[var(--app-bg)]/70 to-transparent transition-opacity duration-300 ${
                        hoveredBook === book.id ? 'opacity-100' : 'opacity-0 md:opacity-0'
                      } md:group-hover:opacity-100`}
                    >
                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                        <p className="text-app text-sm font-medium line-clamp-2 mb-1">{book.name}</p>
                        <p className="text-app-muted text-xs">{book.author_name}</p>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <span className="text-[var(--app-price)] font-bold tabular-nums text-sm">
                            {formatMMK(book.price)}
                          </span>
                          <span className="text-xs bg-app-chip-bg text-app-chip-fg px-2 py-1 rounded-md border border-app truncate max-w-[45%]">
                            {book.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <h3 className="text-app font-medium text-sm line-clamp-2 group-hover:text-[var(--app-accent)] transition-colors">
                    {book.name}
                  </h3>
                  <p className="text-app-muted text-xs line-clamp-1">{book.author_name}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <h3 className="text-xl font-semibold text-app mb-2">{t(ui.booksPage.noBooks)}</h3>
            <p className="text-app-muted max-w-md">{t(ui.booksPage.noBooksHint)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
