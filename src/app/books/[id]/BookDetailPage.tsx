'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, ShoppingCartIcon, PlayIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/solid'

import type { Book, DeliveryType } from '@/types'
import { BookRecommendations } from '@/components'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/store/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { formatMMK } from '@/lib/utils/currency'

interface BookDetailPageProps {
  book: Book
}

export default function BookDetailPage({ book }: BookDetailPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [mounted, setMounted] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('digital')
  const [isOwned, setIsOwned] = useState(false)
  const [physicalCopiesAvailable, setPhysicalCopiesAvailable] = useState(0)
  const [showFullDescription, setShowFullDescription] = useState(false)

  const { addItem, isInCart, removeItem } = useCartStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check physical copies availability
  useEffect(() => {
    const checkPhysicalAvailability = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_available_physical_copies', { book_id_param: book.id })

        if (error) throw error

        const availableCopies = data || 0
        setPhysicalCopiesAvailable(availableCopies)

        if (availableCopies === 0) {
          setDeliveryType('digital')
        }
      } catch (error) {
        console.error('Error checking physical availability:', error)
        setPhysicalCopiesAvailable(0)
      }
    }

    if (mounted && book.id) {
      checkPhysicalAvailability()
    }
  }, [book.id, mounted, supabase])

  // Check if user owns this book
  useEffect(() => {
    const checkOwnership = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('book_id', book.id)
          .eq('status', 'completed')
          .limit(1)

        if (error) throw error
        setIsOwned(data && data.length > 0)
      } catch (error) {
        console.error('Error checking ownership:', error)
      }
    }

    if (mounted && user && book.id) {
      checkOwnership()
    }
  }, [user, book.id, mounted, supabase])

  const bookCategories = useMemo(() => {
    if (!book.category) return []
    return book.category.split(',').map((cat: string) => cat.trim()).filter((cat: string) => cat.length > 0)
  }, [book.category])

  const handleAddToCart = () => {
    if (!mounted) return

    // Digital books always have quantity 1, physical books use selected quantity
    const itemQuantity = deliveryType === 'digital' ? 1 : quantity
    addItem(book, deliveryType, itemQuantity)
  }

  const handleRemoveFromCart = () => {
    removeItem(book.id, deliveryType)
  }


  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-white/10 rounded-full"></div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  const inCart = isInCart(book.id, deliveryType)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Background */}
      <div className="relative overflow-hidden">
        {/* Background Image with Blur */}
        {book.image_url && (
          <div className="absolute inset-0 z-0">
            <Image
              src={book.image_url}
              alt={book.name}
              fill
              className="object-cover opacity-10 blur-lg scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black"></div>
          </div>
        )}

        {/* Navigation */}
        <div className="relative z-10 bg-black/30 backdrop-blur-sm border-b border-gray-800/30">
          <div className="container mx-auto px-6 py-4">
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-3 text-gray-400 hover:text-white transition-all"
            >
              <div className="p-2 rounded-full bg-gray-900/50 group-hover:bg-gray-800/50 transition-colors">
                <ArrowLeftIcon className="w-4 h-4" />
              </div>
              <span className="font-medium">Back to Books</span>
            </button>
          </div>
        </div>

        {/* Main Hero Content */}
        <div className="relative z-10 container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
            {/* Book Cover - Much larger and more prominent */}
            <div className="xl:col-span-6 flex justify-center xl:justify-start">
              <div className="relative group w-full max-w-lg">
                <div className="absolute -inset-8 bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-purple-600/30 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-all duration-700"></div>
                <div className="relative">
                  <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-2xl">
                    {book.image_url ? (
                      <Image
                        src={book.image_url}
                        alt={book.name}
                        width={800}
                        height={1200}
                        className="w-full h-auto rounded-xl shadow-2xl"
                      />
                    ) : (
                      <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center w-full">
                        <BookOpenIcon className="w-24 h-24 text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Book Information */}
            <div className="xl:col-span-6 space-y-8">
              {/* Title Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <SparklesIcon className="w-6 h-6 text-purple-400" />
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-600/30 rounded-full text-sm text-purple-300">
                    Featured Book
                  </span>
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                  <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                    {book.name}
                  </span>
                </h1>

                <p className="text-xl md:text-2xl text-gray-300">by <span className="text-white font-medium">{book.author}</span></p>

                {/* Categories */}
                {bookCategories.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {bookCategories.map((category, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-gradient-to-r from-gray-900/60 to-gray-800/60 backdrop-blur-lg border border-gray-700/50 rounded-full text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-gradient-to-r from-gray-900/60 to-gray-800/60 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/30">
                <h3 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
                  <BookOpenIcon className="w-6 h-6 text-purple-400" />
                  About This Book
                </h3>
                <div className="text-gray-300 leading-relaxed text-lg">
                  {showFullDescription ? (
                    <p>{book.description}</p>
                  ) : (
                    <p>{book.description.substring(0, 400)}...</p>
                  )}
                  {book.description.length > 400 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-purple-400 hover:text-purple-300 mt-4 text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                      {showFullDescription ? 'Show Less' : 'Read More'}
                      <ArrowLeftIcon className={`w-4 h-4 transform transition-transform ${showFullDescription ? 'rotate-90' : '-rotate-90'}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Book Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-900/40 backdrop-blur-lg rounded-xl p-4 border border-gray-800/50">
                  <span className="text-gray-400 text-sm block mb-1">Published</span>
                  <span className="text-white font-semibold">
                    {new Date(book.published_date).toLocaleDateString()}
                  </span>
                </div>
                {book.edition && (
                  <div className="bg-gray-900/40 backdrop-blur-lg rounded-xl p-4 border border-gray-800/50">
                    <span className="text-gray-400 text-sm block mb-1">Edition</span>
                    <span className="text-white font-semibold">{book.edition}</span>
                  </div>
                )}
                <div className="bg-gray-900/40 backdrop-blur-lg rounded-xl p-4 border border-gray-800/50">
                  <span className="text-gray-400 text-sm block mb-1">Language</span>
                  <span className="text-white font-semibold">Myanmar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Section */}
      <div className="bg-gradient-to-b from-gray-900/50 to-black border-t border-gray-800/50">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl">
              {/* Price Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-4 mb-4">
                  <span className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    {formatMMK(book.price)}
                  </span>
                  <div className="text-left">
                    <p className="text-gray-400 text-sm">
                      {deliveryType === 'digital' ? 'Digital Copy' : 'Physical Copy'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {deliveryType === 'digital' ? 'Instant Download' : 'Ships in 2-3 days'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Options */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Choose Your Format</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setDeliveryType('digital')
                      setQuantity(1) // Reset quantity for digital books
                    }}
                    className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 ${
                      deliveryType === 'digital'
                        ? 'border-purple-500 bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                        : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${deliveryType === 'digital' ? 'bg-purple-500' : 'bg-gray-700'} transition-colors`}>
                        <PlayIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg text-white">Digital Edition</div>
                        <div className="text-sm text-gray-400">Read instantly on any device</div>
                        <div className="text-xs text-green-400 font-medium">✓ Available now</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setDeliveryType('physical')}
                    disabled={physicalCopiesAvailable === 0}
                    className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 ${
                      deliveryType === 'physical'
                        ? 'border-purple-500 bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                        : physicalCopiesAvailable === 0
                        ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                        : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${deliveryType === 'physical' ? 'bg-purple-500' : physicalCopiesAvailable === 0 ? 'bg-gray-700' : 'bg-gray-700'} transition-colors`}>
                        <BookOpenIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg text-white">Physical Book</div>
                        <div className="text-sm text-gray-400">Premium paperback edition</div>
                        <div className={`text-xs font-medium ${physicalCopiesAvailable === 0 ? 'text-red-400' : 'text-orange-400'}`}>
                          {physicalCopiesAvailable === 0 ? '✗ Out of stock' : `✓ ${physicalCopiesAvailable} copies left`}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quantity Selector - Only for Physical Books */}
              {deliveryType === 'physical' && (
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-white">Quantity:</span>
                    <div className="flex items-center bg-gray-800/80 rounded-xl border border-gray-700/50">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-3 hover:bg-gray-700 rounded-l-xl transition-colors text-white font-bold"
                      >
                        −
                      </button>
                      <span className="px-6 py-3 text-xl font-bold text-white min-w-16 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(physicalCopiesAvailable, quantity + 1))}
                        disabled={quantity >= physicalCopiesAvailable}
                        className="p-3 hover:bg-gray-700 rounded-r-xl transition-colors text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-400">Total:</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                      {formatMMK(book.price * quantity)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Max {physicalCopiesAvailable} available
                    </p>
                  </div>
                </div>
              )}

              {/* Price Display for Digital Books */}
              {deliveryType === 'digital' && (
                <div className="text-center mb-8">
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    {formatMMK(book.price)}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Digital Copy - Instant Download</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-4">
                {isOwned && deliveryType === 'digital' ? (
                  <div className="flex items-center justify-center gap-3 py-6 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-600/30 rounded-2xl">
                    <CheckIcon className="w-6 h-6 text-green-400" />
                    <span className="text-lg font-semibold text-green-400">You Already Own This Book</span>
                    <button className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                      Read Now
                    </button>
                  </div>
                ) : (
                  <>
                    {isOwned && deliveryType === 'physical' && (
                      <div className="mb-4 p-4 bg-blue-600/20 border border-blue-600/30 rounded-xl">
                        <p className="text-sm text-blue-300 text-center">
                          ℹ️ You already own the digital version. Want a physical copy too?
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inCart ? (
                        <button
                          onClick={handleRemoveFromCart}
                          className="py-4 px-8 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all text-lg shadow-lg hover:shadow-xl"
                        >
                          Remove from Cart
                        </button>
                      ) : (
                        <button
                          onClick={handleAddToCart}
                          disabled={deliveryType === 'physical' && physicalCopiesAvailable === 0}
                          className="py-4 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingCartIcon className="w-6 h-6" />
                          Add to Cart
                        </button>
                      )}

                      <button
                        onClick={() => {
                          handleAddToCart()
                          router.push('/checkout')
                        }}
                        disabled={deliveryType === 'physical' && physicalCopiesAvailable === 0}
                        className="py-4 px-8 bg-white text-black font-bold rounded-2xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Buy Now
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>


      {/* Book Recommendations */}
      <div className="border-t border-gray-800/50 bg-gradient-to-b from-gray-900/20 to-black">
        <div className="container mx-auto px-6 py-16">
          <BookRecommendations
            currentBookId={book.id}
            title="You Might Also Like"
            limit={6}
          />
        </div>
      </div>
    </div>
  )
}