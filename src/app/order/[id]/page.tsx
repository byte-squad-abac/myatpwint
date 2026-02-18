'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { getOrderById } from '@/lib/firebase/orders'
import { getBookById } from '@/lib/firebase/books'
import { formatMMK } from '@/lib/utils/currency'
import type { Order } from '@/lib/firebase/orders'
import type { Book } from '@/types/book'

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [books, setBooks] = useState<(Book | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const orderId = params.id as string

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    loadOrder()
  }, [authLoading, user, orderId])

  const loadOrder = async () => {
    try {
      setLoading(true)
      const orderData = await getOrderById(orderId)
      if (!orderData) {
        setError('Order not found')
        return
      }

      if (orderData.userId !== user?.uid) {
        setError('Unauthorized')
        return
      }

      setOrder(orderData)

      // Load books
      const booksPromises = orderData.bookIds.map((bookId) => getBookById(bookId))
      const booksData = await Promise.all(booksPromises)
      setBooks(booksData)
    } catch (err) {
      console.error('Error loading order:', err)
      setError('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (!user || !order) return

    setPolling(true)
    try {
      const idToken = await user.getIdToken()
      const response = await fetch('/api/kbzpay/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      })

      const data = await response.json()

      if (response.ok && data.status) {
        // Reload order to get updated status
        await loadOrder()
      }
    } catch (err) {
      console.error('Status check error:', err)
    } finally {
      setPolling(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{error || 'Order not found'}</h1>
          <Link
            href="/orders"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            View All Orders
          </Link>
        </div>
      </div>
    )
  }

  const statusColors = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    completed: 'text-green-400 bg-green-400/10 border-green-400/30',
    failed: 'text-red-400 bg-red-400/10 border-red-400/30',
    expired: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
    cancelled: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Order Receipt</h1>
            <p className="text-gray-400">Order ID: {order.merchantOrderId}</p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-4 py-2 rounded-lg border font-semibold uppercase text-sm ${
                statusColors[order.status]
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Order Info Card */}
        <div className="bg-gray-900/60 rounded-xl border border-gray-800 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Order Date</p>
              <p className="text-white font-medium">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {order.paidAt && (
              <div>
                <p className="text-gray-400 text-sm mb-1">Payment Date</p>
                <p className="text-white font-medium">
                  {new Date(order.paidAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-400 text-sm mb-1">Payment Method</p>
              <p className="text-white font-medium uppercase">{order.paymentMethod}</p>
            </div>
            {order.kbzOrderId && (
              <div>
                <p className="text-gray-400 text-sm mb-1">Transaction ID</p>
                <p className="text-white font-medium font-mono text-sm">{order.kbzOrderId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-gray-900/60 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Items</h2>
          <div className="space-y-4">
            {order.items.map((item, index) => {
              const book = books[index]
              return (
                <div key={item.bookId} className="flex gap-4 pb-4 border-b border-gray-800 last:border-b-0">
                  <div className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                    {book?.image ? (
                      <img
                        src={book.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    {book && <p className="text-gray-400 text-sm">{book.author_name}</p>}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-400">Qty: {item.quantity}</span>
                      <span className="text-gray-400">×</span>
                      <span className="text-gray-400">{formatMMK(item.price)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">{formatMMK(item.price * item.quantity)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-900/60 rounded-xl border border-gray-800 p-6 mb-6">
          <div className="flex justify-between items-center text-2xl font-bold">
            <span>Total</span>
            <span className="text-green-400">{formatMMK(order.totalAmount)}</span>
          </div>
          {order.paidAmount && order.paidAmount !== order.totalAmount && (
            <div className="flex justify-between items-center text-lg text-gray-400 mt-2">
              <span>Paid Amount</span>
              <span>{formatMMK(order.paidAmount)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Link
            href="/orders"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            View All Orders
          </Link>
          {order.status === 'pending' && (
            <button
              onClick={checkPaymentStatus}
              disabled={polling}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              {polling ? 'Checking...' : 'Check Payment Status'}
            </button>
          )}
          <Link
            href="/books"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
