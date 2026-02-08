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

  const handleBuyClick = async () => {
    if (!user) {
      router.push('/login')
      return
    }
    setIsProcessing(true)
    try {
      await new Promise((r) => setTimeout(r, 1500))
      clearCart()
      alert('Order placed successfully! (Demo - no payment processed)')
      router.push('/books')
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Cart ({items.length} items)</h1>

        <div className="space-y-6 mb-8">
          {items.map((item) => (
            <div
              key={item.book.id}
              className="flex gap-4 p-4 bg-gray-900/60 rounded-xl border border-gray-800"
            >
              <div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
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
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                    No img
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-white truncate">{item.book.name}</h2>
                <p className="text-gray-400 text-sm">{item.book.author_name}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.book.id, Math.max(1, item.quantity - 1))}
                      className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.book.id, item.quantity + 1)}
                      className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.book.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold">{formatMMK(item.book.price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-6 flex justify-between items-center">
          <div>
            <p className="text-2xl font-bold text-white">Total: {formatMMK(total)}</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push('/books')} className="bg-gray-600 border-gray-600 text-gray-300 hover:bg-gray-700">
              Continue Shopping
            </Button>
            <Button onClick={handleBuyClick} loading={isProcessing} disabled={isProcessing} className="bg-purple-600 hover:bg-purple-700">
              {user ? (isProcessing ? 'Processing...' : 'Buy Now (Demo)') : 'Sign In to Buy'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
