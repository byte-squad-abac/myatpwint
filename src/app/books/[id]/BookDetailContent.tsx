'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ShoppingCartIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import type { Book } from '@/types/book'
import { useCartStore } from '@/lib/store/cartStore'
import { formatMMK } from '@/lib/utils/currency'

export default function BookDetailContent({ book }: { book: Book }) {
  const router = useRouter()
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
    <div className="min-h-screen bg-black text-white">
      <div className="relative overflow-hidden">
        {book.image && (
          <div className="absolute inset-0 z-0">
            <img
              src={book.image}
              alt={book.name}
              className="absolute inset-0 w-full h-full object-cover opacity-10 blur-lg scale-110"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
          </div>
        )}

        <div className="relative z-10 bg-black/30 backdrop-blur-sm border-b border-gray-800/30">
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-2 sm:gap-3 text-gray-400 hover:text-white transition-all touch-manipulation"
            >
              <div className="p-2 rounded-full bg-gray-900/50 group-hover:bg-gray-800/50 transition-colors">
                <ArrowLeftIcon className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm sm:text-base">Back to Books</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
            <div className="xl:col-span-6 flex justify-center xl:justify-start">
              <div className="relative w-full max-w-lg">
                <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30">
                  {book.image ? (
                    <img
                      src={book.image}
                      alt={book.name}
                      className="w-full h-auto rounded-xl shadow-2xl"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center w-full">
                      <BookOpenIcon className="w-24 h-24 text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="xl:col-span-6 space-y-8">
              <div>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-4">
                  <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                    {book.name}
                  </span>
                </h1>
                <p className="text-xl text-gray-300">by {book.author_name}</p>
                {book.category && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    <span className="px-4 py-2 bg-gray-900/60 border border-gray-700/50 rounded-full text-sm text-gray-300">
                      {book.category}
                    </span>
                    {book.tags?.map((tag, i) => (
                      <span
                        key={i}
                        className="px-4 py-2 bg-gray-900/60 border border-gray-700/50 rounded-full text-sm text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {book.description && (
                <div className="bg-gradient-to-r from-gray-900/60 to-gray-800/60 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/30">
                  <h3 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
                    <BookOpenIcon className="w-6 h-6 text-purple-400" />
                    About This Book
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {showFullDescription ? book.description : book.description.substring(0, 400)}
                    {book.description.length > 400 && '...'}
                  </p>
                  {book.description.length > 400 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-purple-400 hover:text-purple-300 mt-4 text-sm font-semibold"
                    >
                      {showFullDescription ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {book.edition && (
                  <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-800/50">
                    <span className="text-gray-400 text-sm block mb-1">Edition</span>
                    <span className="text-white font-semibold">{book.edition}</span>
                  </div>
                )}
                <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-800/50">
                  <span className="text-gray-400 text-sm block mb-1">Price</span>
                  <span className="text-green-400 font-bold text-xl">{formatMMK(book.price)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Section */}
      <div className="bg-gradient-to-b from-gray-900/50 to-black border-t border-gray-800/50">
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-gray-700/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6 sm:mb-8">
                <span className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  {formatMMK(book.price)}
                </span>
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <label className="text-gray-300 text-sm sm:text-base">Quantity:</label>
                  <div className="flex items-center bg-gray-800 rounded-xl border border-gray-700 w-full sm:w-auto min-w-0">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 sm:p-3 hover:bg-gray-700 rounded-l-xl transition-colors touch-manipulation flex-shrink-0"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 sm:w-16 py-2.5 sm:py-2 text-center bg-transparent border-0 text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 sm:p-3 hover:bg-gray-700 rounded-r-xl transition-colors touch-manipulation flex-shrink-0"
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
                    onClick={handleRemoveFromCart}
                    className="py-3.5 sm:py-4 px-6 sm:px-8 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl sm:rounded-2xl transition-all touch-manipulation w-full"
                  >
                    Remove from Cart
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="py-3.5 sm:py-4 px-6 sm:px-8 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 sm:gap-3 w-full touch-manipulation"
                  >
                    <ShoppingCartIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    Add to Cart
                  </button>
                )}
                <button
                  onClick={handleBuyNow}
                  className="py-3.5 sm:py-4 px-6 sm:px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl sm:rounded-2xl transition-all touch-manipulation w-full sm:col-span-2 sm:col-span-1"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
