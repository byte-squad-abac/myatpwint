'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/lib/store/cartStore'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { formatMMK } from '@/lib/utils/currency'
import Button from '@/components/ui/Button'

export default function CartPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const { items, getTotal, clearCart, removeItem, updateQuantity } = useCartStore()
  const [isProcessing, setIsProcessing] = useState(false)

  const total = getTotal()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Your cart is empty</h1>
          <p className="text-gray-400 mb-6">Add some books to your cart before checking out.</p>
          <button
            onClick={() => router.push('/books')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Browse Books
          </button>
        </div>
      </div>
    )
  }

  const handleKBZPayment = async () => {
    if (!user) {
      router.push('/login')
      return
    }
    setIsProcessing(true)
    try {
      // Get Firebase ID token
      const idToken = await user.getIdToken()

      // Prepare order items
      const orderItems = items.map((item) => ({
        bookId: item.book.id,
        quantity: item.quantity,
      }))

      // Create order and get payment URL
      const response = await fetch('/api/kbzpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ items: orderItems }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order')
      }

      // Clear cart before redirecting to payment
      clearCart()

      // Redirect to KBZPay payment page
      window.location.href = data.paymentUrl
    } catch (err) {
      console.error('Payment error:', err)
      alert(err instanceof Error ? err.message : 'Failed to process payment. Please try again.')
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Cart ({items.length} items)</h1>

        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          {items.map((item) => (
            <div
              key={item.book.id}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-5 bg-gray-900/60 rounded-xl border border-gray-800"
            >
              <div className="flex gap-3 sm:gap-4 sm:flex-1 sm:min-w-0">
                <div className="w-16 h-24 sm:w-20 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                  {item.book.image ? (
                    <img
                      src={item.book.image}
                      alt={item.book.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs sm:text-sm">
                      No img
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h2 className="font-semibold text-white truncate">{item.book.name}</h2>
                    <p className="text-gray-400 text-sm">{item.book.author_name}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-3">
                    <div className="flex items-center gap-1 sm:gap-2 bg-gray-800 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.book.id, Math.max(1, item.quantity - 1))}
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white touch-manipulation"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-8 sm:w-9 text-center text-white font-medium tabular-nums text-sm sm:text-base">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.book.id, item.quantity + 1)}
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white touch-manipulation"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.book.id)}
                      className="text-red-400 hover:text-red-300 text-sm py-1.5 px-2 touch-manipulation"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-between sm:justify-end items-center sm:items-end sm:flex-col sm:text-right border-t border-gray-800 pt-3 sm:pt-0 sm:border-t-0">
                <span className="text-gray-400 sm:hidden">Subtotal</span>
                <p className="text-green-400 font-bold tabular-nums">{formatMMK(item.book.price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white">Total: {formatMMK(total)}</p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => router.push('/books')}
              className="w-full sm:w-auto bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 py-3"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={handleKBZPayment}
              loading={isProcessing}
              disabled={isProcessing || !user}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3"
            >
              {user
                ? isProcessing
                  ? 'Redirecting to Payment...'
                  : 'Pay with KBZPay'
                : 'Sign In to Pay'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
