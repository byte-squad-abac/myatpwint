'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { getUserOrders } from '@/lib/firebase/orders'
import { formatMMK } from '@/lib/utils/currency'
import type { Order } from '@/lib/firebase/orders'
import { usePreferences } from '@/components/PreferencesProvider'
import { orderStatusLabel, pick, ui } from '@/lib/ui/bilingualLabels'

const statusColors: Record<Order['status'], string> = {
  pending:
    'text-amber-800 bg-amber-100 border-amber-200 dark:text-yellow-300 dark:bg-yellow-400/10 dark:border-yellow-400/25',
  completed:
    'text-emerald-800 bg-emerald-100 border-emerald-200 dark:text-green-300 dark:bg-green-400/10 dark:border-green-400/25',
  failed:
    'text-red-800 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-400/10 dark:border-red-400/25',
  expired:
    'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-400/10 dark:border-slate-500/25',
  cancelled:
    'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-400/10 dark:border-slate-500/25',
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const { locale } = usePreferences()
  const t = (e: { en: string; my: string }) => pick(e, locale)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    loadOrders()
  }, [authLoading, user, router])

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
      <div className="flex flex-1 items-center justify-center bg-app">
        <div className="w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col w-full bg-app text-app py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">{t(ui.orders.title)}</h1>
          <Link
            href="/books"
            className="inline-flex justify-center px-6 py-3 bg-gradient-to-r from-[var(--app-gradient-from)] to-[var(--app-gradient-to)] text-white font-semibold rounded-xl transition-opacity hover:opacity-95 text-center"
          >
            {t(ui.common.continueShopping)}
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <h2 className="text-2xl font-bold text-app mb-3">{t(ui.orders.noneTitle)}</h2>
            <p className="text-app-muted mb-8 max-w-md mx-auto leading-relaxed">{t(ui.orders.noneHint)}</p>
            <Link
              href="/books"
              className="inline-flex px-6 py-3 bg-gradient-to-r from-[var(--app-gradient-from)] to-[var(--app-gradient-to)] text-white font-semibold rounded-xl"
            >
              {t(ui.common.browseBooks)}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-app-card rounded-xl border border-app p-6 shadow-sm">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4 pb-4 border-b border-app">
                  <div>
                    <p className="text-app-muted text-sm mb-1">{t(ui.orders.orderId)}</p>
                    <p className="text-app font-mono text-sm">{order.merchantOrderId}</p>
                  </div>
                  <div>
                    <p className="text-app-muted text-sm mb-1">{t(ui.orders.orderDate)}</p>
                    <p className="text-app">
                      {new Date(order.createdAt).toLocaleDateString(locale === 'my' ? 'my' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-app-muted text-sm mb-1">{t(ui.common.total)}</p>
                    <p className="text-[var(--app-price)] font-bold text-lg tabular-nums">
                      {formatMMK(order.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-block px-4 py-2 rounded-lg border font-semibold text-sm ${statusColors[order.status]}`}
                    >
                      {orderStatusLabel(order.status, locale)}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-app-muted text-sm mb-2">
                    {t(ui.orders.itemsLabel)} ({order.items.length})
                  </p>
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <p key={item.bookId} className="text-app text-sm">
                        • {item.name} (×{item.quantity})
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link
                    href={`/order/${order.id}`}
                    className="px-6 py-2.5 bg-app-card-elevated border border-app text-app font-semibold rounded-xl hover:bg-app-card transition-colors"
                  >
                    {t(ui.common.viewDetails)}
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
