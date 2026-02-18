'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { getUserOrders } from '@/lib/firebase/orders'
import { formatMMK } from '@/lib/utils/currency'
import type { Order } from '@/lib/firebase/orders'

export default function OrdersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    loadOrders()
  }, [authLoading, user])

  const loadOrders = async () => {
    if (!user) return
    try {
      setLoading(true)
      const ordersData = await getUserOrders(user.uid)
      setOrders(ordersData)
    } catch (err) {
      console.error('Error loading orders:', err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Orders</h1>
          <Link
            href="/books"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-4">No orders yet</h2>
            <p className="text-gray-400 mb-6">Start shopping to see your orders here.</p>
            <Link
              href="/books"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Browse Books
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-900/60 rounded-xl border border-gray-800 p-6">
                {/* Order Header */}
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4 pb-4 border-b border-gray-800">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Order ID</p>
                    <p className="text-white font-mono text-sm">{order.merchantOrderId}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Order Date</p>
                    <p className="text-white">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total</p>
                    <p className="text-green-400 font-bold text-lg">{formatMMK(order.totalAmount)}</p>
                  </div>
                  <div>
                    <span
                      className={`inline-block px-4 py-2 rounded-lg border font-semibold uppercase text-sm ${
                        statusColors[order.status]
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Order Items Summary */}
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2">Items ({order.items.length})</p>
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <p key={item.bookId} className="text-white text-sm">
                        • {item.name} (×{item.quantity})
                      </p>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <Link
                    href={`/order/${order.id}`}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
