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

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const { locale } = usePreferences()
  const t = (e: { en: string; my: string }) => pick(e, locale)
  const [order, setOrder] = useState<Order | null>(null)
  const [books, setBooks] = useState<(Book | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [errorKey, setErrorKey] = useState<'not_found' | 'unauthorized' | 'failed' | null>(null)
  const [polling, setPolling] = useState(false)

  const orderId = params.id as string

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    loadOrder()
  }, [authLoading, user, orderId, router])

  const loadOrder = async () => {
    try {
      setLoading(true)
      const orderData = await getOrderById(orderId)
      if (!orderData) {
        setErrorKey('not_found')
        return
      }

      if (orderData.userId !== user?.uid) {
        setErrorKey('unauthorized')
        return
      }

      setOrder(orderData)
      setErrorKey(null)

      const booksPromises = orderData.bookIds.map((bookId) => getBookById(bookId))
      const booksData = await Promise.all(booksPromises)
      setBooks(booksData)
    } catch (err) {
      console.error('Error loading order:', err)
      setErrorKey('failed')
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
      <div className="flex flex-1 items-center justify-center bg-app">
        <div className="w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (errorKey || !order) {
    const msg =
      errorKey === 'unauthorized'
        ? t(ui.orders.unauthorized)
        : errorKey === 'failed'
          ? t(ui.orders.loadError)
          : t(ui.orders.notFound)
    return (
      <div className="flex flex-1 items-center justify-center bg-app px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-app mb-6">{msg}</h1>
          <Link
            href="/orders"
            className="inline-block px-6 py-3 bg-gradient-to-r from-[var(--app-gradient-from)] to-[var(--app-gradient-to)] text-white font-semibold rounded-xl"
          >
            {t(ui.orders.allOrders)}
          </Link>
        </div>
      </div>
    )
  }

  const dateFmt: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  const dateLocale = locale === 'my' ? 'my' : 'en-US'

  return (
    <div className="flex min-h-0 flex-1 flex-col w-full bg-app text-app py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t(ui.orders.receiptTitle)}</h1>
            <p className="text-app-muted">
              {t(ui.orders.orderId)}: {order.merchantOrderId}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span
              className={`inline-block px-4 py-2 rounded-lg border font-semibold text-sm ${statusColors[order.status]}`}
            >
              {orderStatusLabel(order.status, locale)}
            </span>
          </div>
        </div>

        <div className="bg-app-card rounded-xl border border-app p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-app-muted text-sm mb-1">{t(ui.orders.orderDate)}</p>
              <p className="text-app font-medium">
                {new Date(order.createdAt).toLocaleDateString(dateLocale, dateFmt)}
              </p>
            </div>
            {order.paidAt && (
              <div>
                <p className="text-app-muted text-sm mb-1">{t(ui.orders.paymentDate)}</p>
                <p className="text-app font-medium">
                  {new Date(order.paidAt).toLocaleDateString(dateLocale, dateFmt)}
                </p>
              </div>
            )}
            <div>
              <p className="text-app-muted text-sm mb-1">{t(ui.orders.paymentMethod)}</p>
              <p className="text-app font-medium uppercase">{order.paymentMethod}</p>
            </div>
            {order.kbzOrderId && (
              <div>
                <p className="text-app-muted text-sm mb-1">{t(ui.orders.transactionId)}</p>
                <p className="text-app font-medium font-mono text-sm break-all">{order.kbzOrderId}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-app-card rounded-xl border border-app p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">{t(ui.orders.itemsLabel)}</h2>
          <div className="space-y-4">
            {order.items.map((item, index) => {
              const book = books[index]
              return (
                <div
                  key={item.bookId}
                  className="flex gap-4 pb-4 border-b border-app last:border-b-0 last:pb-0"
                >
                  <div className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-app-card-elevated border border-app">
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
                      <div className="w-full h-full flex items-center justify-center text-app-muted text-xs">
                        —
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-app">{item.name}</h3>
                    {book && <p className="text-app-muted text-sm">{book.author_name}</p>}
                    <div className="flex items-center gap-4 mt-2 text-sm text-app-muted flex-wrap">
                      <span>
                        {t(ui.orders.qty)}: {item.quantity}
                      </span>
                      <span>×</span>
                      <span className="tabular-nums">{formatMMK(item.price)}</span>
                    </div>
                  </div>
                  <div className="text-right self-start">
                    <p className="text-[var(--app-price)] font-bold tabular-nums">
                      {formatMMK(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-app-card rounded-xl border border-app p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-center text-2xl font-bold gap-4">
            <span>{t(ui.common.total)}</span>
            <span className="text-[var(--app-price)] tabular-nums">{formatMMK(order.totalAmount)}</span>
          </div>
          {order.paidAmount && order.paidAmount !== order.totalAmount && (
            <div className="flex justify-between items-center text-lg text-app-muted mt-2">
              <span>{t(ui.orders.paidAmount)}</span>
              <span className="tabular-nums">{formatMMK(order.paidAmount)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link
            href="/orders"
            className="px-6 py-3 bg-app-card-elevated border border-app text-app font-semibold rounded-xl text-center hover:bg-app-card transition-colors"
          >
            {t(ui.orders.allOrders)}
          </Link>
          {order.status === 'pending' && (
            <button
              type="button"
              onClick={checkPaymentStatus}
              disabled={polling}
              className="px-6 py-3 bg-gradient-to-r from-[var(--app-gradient-from)] to-[var(--app-gradient-to)] disabled:opacity-60 text-white font-semibold rounded-xl touch-manipulation"
            >
              {polling ? t(ui.orders.checking) : t(ui.orders.checkPayment)}
            </button>
          )}
          <Link
            href="/books"
            className="px-6 py-3 bg-gradient-to-r from-[var(--app-gradient-from)] to-[var(--app-gradient-to)] text-white font-semibold rounded-xl text-center hover:opacity-95"
          >
            {t(ui.common.continueShopping)}
          </Link>
        </div>
      </div>
    </div>
  )
}
