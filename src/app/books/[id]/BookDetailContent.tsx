'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ShoppingCartIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import type { Book } from '@/types/book'
import { useCartStore } from '@/lib/store/cartStore'
import { formatMMK } from '@/lib/utils/currency'
import { usePreferences } from '@/components/PreferencesProvider'
import { pick, ui } from '@/lib/ui/bilingualLabels'
import { cn } from '@/lib/utils'

export default function BookDetailContent({ book }: { book: Book }) {
  const router = useRouter()
  const { locale } = usePreferences()
  const t = (e: { en: string; my: string }) => pick(e, locale)
  const [quantity, setQuantity] = useState(1)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const { addItem, isInCart, removeItem } = useCartStore()

  const inCart = isInCart(book.id)

  const handleAddToCart = () => {
    addItem(book, quantity)
  }

  const handleRemoveFromCart = () => {
    removeItem(book.id)
  }

  const handleBuyNow = () => {
    addItem(book, quantity)
    router.push('/cart')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col w-full bg-app text-app">
      <div className="relative overflow-hidden">
        {book.image && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src={book.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-[0.08] dark:opacity-0 blur-2xl scale-110"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="absolute inset-0 hidden dark:block bg-app" />
            <div
              className="absolute inset-0 dark:hidden"
              style={{
                background: `linear-gradient(to bottom, var(--app-bg), color-mix(in srgb, var(--app-bg) 85%, transparent))`,
              }}
            />
          </div>
        )}

        <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t(ui.bookDetail.back)}
            className="group mb-8 sm:mb-10 inline-flex max-w-full items-center gap-3 rounded-2xl py-2 pr-3 text-left touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app bg-app-card text-[var(--app-accent)] shadow-sm transition-colors group-hover:border-[var(--app-accent)]/40 group-hover:bg-[var(--app-accent-muted)]">
              <ArrowLeftIcon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 text-sm font-semibold text-app-muted transition-colors group-hover:text-[var(--app-accent)] sm:text-base">
              {t(ui.bookDetail.back)}
            </span>
          </button>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start pb-10 sm:pb-16">
            <div className="xl:col-span-6 flex justify-center xl:justify-start">
              <div className="relative w-full max-w-lg">
                <div className="bg-app-card rounded-2xl p-4 sm:p-6 border border-app shadow-lg">
                  {book.image ? (
                    <img
                      src={book.image}
                      alt={book.name}
                      className="w-full h-auto rounded-xl shadow-md"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="aspect-[2/3] bg-app-card-elevated rounded-xl flex items-center justify-center w-full border border-app">
                      <BookOpenIcon className="w-24 h-24 text-app-muted" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="xl:col-span-6 space-y-8">
              <div>
                <h1
                  className={cn(
                    'font-bold text-app mb-4',
                    locale === 'my'
                      ? 'text-3xl sm:text-4xl md:text-[2.15rem] leading-snug'
                      : 'text-3xl sm:text-4xl md:text-5xl leading-tight tracking-tight',
                  )}
                >
                  {book.name}
                </h1>
                <p className="text-lg sm:text-xl text-app-muted">
                  {t(ui.bookDetail.byAuthor)} {book.author_name}
                </p>
                {book.category && (
                  <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
                    <span className="px-3 py-1.5 bg-app-chip-bg border border-app rounded-full text-sm text-app-chip-fg">
                      {book.category}
                    </span>
                    {book.tags?.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-app-chip-bg border border-app rounded-full text-sm text-app-chip-fg"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {book.description && (
                <div className="bg-app-card rounded-2xl p-6 sm:p-8 border border-app">
                  <h3 className="text-xl font-bold mb-4 text-app flex items-center gap-2">
                    <BookOpenIcon className="w-6 h-6 text-[var(--app-accent)]" />
                    {t(ui.bookDetail.about)}
                  </h3>
                  <p className="text-app-muted leading-relaxed">
                    {showFullDescription ? book.description : book.description.substring(0, 400)}
                    {book.description.length > 400 && '...'}
                  </p>
                  {book.description.length > 400 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-[var(--app-accent)] hover:opacity-90 mt-4 text-sm font-semibold touch-manipulation"
                    >
                      {showFullDescription ? t(ui.bookDetail.showLess) : t(ui.bookDetail.readMore)}
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {book.edition && (
                  <div className="bg-app-card-elevated rounded-xl p-4 border border-app">
                    <span className="text-app-muted text-sm block mb-1">{t(ui.bookDetail.edition)}</span>
                    <span className="text-app font-semibold">{book.edition}</span>
                  </div>
                )}
                <div className="bg-app-card-elevated rounded-xl p-4 border border-app">
                  <span className="text-app-muted text-sm block mb-1">{t(ui.bookDetail.price)}</span>
                  <span className="text-[var(--app-price)] font-bold text-xl tabular-nums">
                    {formatMMK(book.price)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-app bg-app">
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-app-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-app shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6 sm:mb-8">
                <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--app-price)] tabular-nums">
                  {formatMMK(book.price)}
                </span>
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <label htmlFor="book-qty" className="text-app-muted text-sm sm:text-base">
                    {t(ui.common.quantity)}:
                  </label>
                  <div
                    id="book-qty"
                    className="flex items-center bg-app-card-elevated rounded-xl border border-app w-full sm:w-auto min-w-0"
                  >
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 sm:p-3 hover:bg-app-card rounded-l-xl transition-colors touch-manipulation flex-shrink-0 text-app"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-14 sm:w-16 py-2.5 sm:py-2 text-center bg-transparent border-0 text-app focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 sm:p-3 hover:bg-app-card rounded-r-xl transition-colors touch-manipulation flex-shrink-0 text-app"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {inCart ? (
                  <button
                    type="button"
                    onClick={handleRemoveFromCart}
                    className="py-3.5 sm:py-4 px-6 sm:px-8 bg-[var(--app-danger)] hover:opacity-95 text-white font-bold rounded-xl sm:rounded-2xl transition-all touch-manipulation w-full"
                  >
                    {t(ui.bookDetail.removeFromCart)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="py-3.5 sm:py-4 px-6 sm:px-8 bg-app-card-elevated border border-app hover:bg-app-card text-app font-bold rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 sm:gap-3 w-full touch-manipulation"
                  >
                    <ShoppingCartIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    {t(ui.bookDetail.addToCart)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="py-3.5 sm:py-4 px-6 sm:px-8 bg-[var(--app-accent)] hover:opacity-95 text-white font-bold rounded-xl sm:rounded-2xl transition-all touch-manipulation w-full sm:col-span-2 sm:col-span-1"
                >
                  {t(ui.bookDetail.buyNow)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
