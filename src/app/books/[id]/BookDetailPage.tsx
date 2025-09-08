'use client'

// React and Next.js
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// External libraries
import { MinusIcon, PlusIcon, StarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'

// Types
import type { Book, DeliveryType } from '@/types'

// Components
import { Button, Card, Badge } from '@/components/ui'
import { BookRecommendations } from '@/components'

// Services
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/store/cartStore'

// Hooks
import { useAuth } from '@/hooks/useAuth'

interface BookDetailPageProps {
  book: Book
}

export default function BookDetailPage({ book }: BookDetailPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  
  const [mounted, setMounted] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [quantityInput, setQuantityInput] = useState('1')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('digital') // Default to digital
  const [activeTab, setActiveTab] = useState<'description' | 'details' | 'reviews'>('description')
  const [isOwned, setIsOwned] = useState(false)
  const [physicalCopiesAvailable, setPhysicalCopiesAvailable] = useState(0)
  
  const { addItem, removeItem, isInCart, updateQuantity } = useCartStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check physical copies availability and set appropriate default delivery type
  useEffect(() => {
    const checkPhysicalAvailability = async () => {
      try {
        // Use the new database function to get available copies (bypasses RLS)
        const { data, error } = await supabase
          .rpc('get_available_physical_copies', { book_id_param: book.id })

        if (error) {
          throw error
        }

        const availableCopies = data || 0
        setPhysicalCopiesAvailable(availableCopies)
        
        // Set default delivery type based on availability
        if (availableCopies > 0) {
          setDeliveryType('physical') // Physical available, default to physical
          // Reset quantity if it exceeds available copies
          setQuantity(prev => prev > availableCopies ? availableCopies : prev)
        } else {
          setDeliveryType('digital') // No physical copies, force digital
        }
      } catch (error) {
        console.error('❌ Error checking physical availability:', error)
        setPhysicalCopiesAvailable(0)
        setDeliveryType('digital')
      }
    }
    
    checkPhysicalAvailability()
  }, [book.id, supabase])

  // Check if user already owns this book
  useEffect(() => {
    if (!user?.id) return
    
    const checkOwnership = async () => {
      try {
        // Only check for digital ownership - users can buy physical books multiple times
        const { data, error } = await supabase
          .from('purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('book_id', book.id)
          .eq('delivery_type', 'digital')
          .limit(1)
        
        if (!error && data && data.length > 0) {
          setIsOwned(true)
        }
      } catch (error) {
        console.error('Error checking book ownership:', error)
      }
    }
    
    checkOwnership()
  }, [user?.id, book.id, supabase])

  // Reset quantity when delivery type changes to physical (to ensure it's within limits)
  useEffect(() => {
    if (deliveryType === 'physical' && physicalCopiesAvailable > 0) {
      setQuantity(prev => {
        const newQty = prev > physicalCopiesAvailable ? 1 : prev
        setQuantityInput(newQty.toString())
        return newQty
      })
    }
  }, [deliveryType, physicalCopiesAvailable])

  const handleAddToCart = () => {
    if (isInCart(book.id, deliveryType)) {
      removeItem(book.id, deliveryType)
    } else {
      addItem(book, deliveryType, deliveryType === 'physical' ? quantity : 1)
    }
  }

  const handleQuantityChange = (newQuantity: number) => {
    // For physical books, limit to available inventory
    const maxQuantity = deliveryType === 'physical' ? physicalCopiesAvailable : 999
    
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity)
      setQuantityInput(newQuantity.toString())
      if (isInCart(book.id, deliveryType)) {
        updateQuantity(book.id, deliveryType, newQuantity)
      }
    }
  }

  const handleQuantityInputChange = (value: string) => {
    setQuantityInput(value)
    
    // Only update quantity if it's a valid number
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= 1 && numValue <= physicalCopiesAvailable) {
      setQuantity(numValue)
      if (isInCart(book.id, deliveryType)) {
        updateQuantity(book.id, deliveryType, numValue)
      }
    }
  }

  const handleQuantityInputBlur = () => {
    // On blur, ensure we have a valid quantity
    const numValue = parseInt(quantityInput)
    if (isNaN(numValue) || numValue < 1) {
      setQuantityInput('1')
      setQuantity(1)
    } else if (numValue > physicalCopiesAvailable) {
      setQuantityInput(physicalCopiesAvailable.toString())
      setQuantity(physicalCopiesAvailable)
    }
  }

  const handleCheckout = () => {
    if (!isInCart(book.id, deliveryType)) {
      addItem(book, deliveryType, deliveryType === 'physical' ? quantity : 1)
    }
    router.push('/checkout')
  }

  // Pre-compute button state to avoid hydration mismatch
  const getButtonState = () => {
    if (!mounted) return { text: 'Add to Cart', variant: 'primary' as const, disabled: false }
    if (isOwned) return { text: 'Already Owned', variant: 'success' as const, disabled: true }
    if (isInCart(book.id, deliveryType)) return { text: 'Remove from Cart', variant: 'error' as const, disabled: false }
    return { text: 'Add to Cart', variant: 'primary' as const, disabled: false }
  }

  const buttonState = getButtonState()

  const renderStars = (rating: number = 4.5) => {
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          i < Math.floor(rating) ? (
            <StarSolidIcon key={i} className="h-4 w-4 text-yellow-400" />
          ) : (
            <StarIcon key={i} className="h-4 w-4 text-gray-300" />
          )
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating})</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Book Cover */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative w-80 h-96">
                <Image
                  src={book.image_url}
                  alt={book.name}
                  fill
                  className="object-cover rounded-lg shadow-lg"
                  priority
                />
              </div>
            </div>

            {/* Book Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.name}</h1>
                <p className="text-xl text-blue-600 font-semibold mb-4">{book.author}</p>
                {renderStars()}
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold text-green-600">
                  {book.price.toLocaleString()} MMK
                </div>
                {deliveryType === 'physical' && (
                  <div className="text-sm text-red-600">
                    +5,000 MMK shipping fee
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Badge variant="primary">{book.category}</Badge>
                <Badge variant="secondary">Edition {book.edition}</Badge>
              </div>

              {/* Tabs */}
              <div className="border-b">
                <nav className="flex space-x-8">
                  {[
                    { id: 'description', label: 'Description' },
                    { id: 'details', label: 'Details' },
                    { id: 'reviews', label: 'Reviews' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="min-h-[120px]">
                {activeTab === 'description' && (
                  <p className="text-gray-700 leading-relaxed">{book.description}</p>
                )}
                {activeTab === 'details' && (
                  <div className="space-y-2">
                    <p><strong>Author:</strong> {book.author}</p>
                    <p><strong>Edition:</strong> {book.edition}</p>
                    <p><strong>Published Date:</strong> {new Date(book.published_date).toLocaleDateString()}</p>
                    <p><strong>Category:</strong> {book.category}</p>
                    <p><strong>Tags:</strong> {book.tags?.join(', ') || 'No tags'}</p>
                  </div>
                )}
                {activeTab === 'reviews' && (
                  <p className="text-gray-500">No reviews yet. (Reviews feature coming soon!)</p>
                )}
              </div>

              {/* Delivery Type Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Choose Type:</h3>
                <div className="flex space-x-4">
                  {/* Always show digital option */}
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deliveryType"
                      value="digital"
                      checked={deliveryType === 'digital'}
                      onChange={e => setDeliveryType(e.target.value as DeliveryType)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Digital
                    </span>
                  </label>
                  
                  {/* Only show physical option if copies are available */}
                  {physicalCopiesAvailable > 0 && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deliveryType"
                        value="physical"
                        checked={deliveryType === 'physical'}
                        onChange={e => setDeliveryType(e.target.value as DeliveryType)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Physical ({physicalCopiesAvailable} available)
                      </span>
                    </label>
                  )}
                </div>
                
                {/* Show message when only digital is available */}
                {physicalCopiesAvailable === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    📱 Only digital version available - physical copies out of stock
                  </p>
                )}
              </div>

              {/* Quantity Selection for Physical Books */}
              {deliveryType === 'physical' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Quantity:</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={quantityInput}
                      onChange={e => handleQuantityInputChange(e.target.value)}
                      onBlur={handleQuantityInputBlur}
                      min="1"
                      max={physicalCopiesAvailable}
                      className="w-16 text-center border border-gray-300 rounded-md py-1"
                    />
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= physicalCopiesAvailable}
                      className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Maximum {physicalCopiesAvailable} copies available
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <Button
                  variant={buttonState.variant}
                  onClick={isOwned ? () => router.push('/library') : handleAddToCart}
                  disabled={buttonState.disabled}
                  className="flex-1 py-3 text-base font-medium"
                >
                  {isOwned ? 'Go to Library' : buttonState.text}
                </Button>
                <Button
                  variant="secondary"
                  onClick={isOwned ? () => router.push('/library') : handleCheckout}
                  disabled={isOwned}
                  className="flex-1 py-3 text-base font-medium"
                >
                  {isOwned ? 'Read Now' : 'Buy Now'}
                </Button>
              </div>

              {/* Additional Info */}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">
                  Published: {new Date(book.published_date).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-1">
                  {book.tags?.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  )) || (
                    <span className="text-sm text-gray-500">No tags available</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* AI-Powered Recommendations */}
        <BookRecommendations 
          currentBookId={book.id}
          title="Similar Books You Might Like"
          limit={5}
        />
      </div>
    </div>
  )
}