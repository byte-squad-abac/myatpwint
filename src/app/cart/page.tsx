'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cartStore'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { formatMMK } from '@/lib/utils/currency'
import Button from '@/components/ui/Button'
import { usePreferences } from '@/components/PreferencesProvider'
import { pick, ui } from '@/lib/ui/bilingualLabels'

export default function CartPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const { locale } = usePreferences()
  const t = (e: { en: string; my: string }) => pick(e, locale)
  const { items, getTotal, clearCart, removeItem, updateQuantity } = useCartStore()
  const [isProcessing, setIsProcessing] = useState(false)

  const total = getTotal()

  const cartHeading =
    items.length === 1
      ? `${t(ui.cart.title)} (1 ${t(ui.common.itemCount)})`
      : `${t(ui.cart.title)} (${items.length} ${t(ui.common.itemsCount)})`

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-app">
        <div className="w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-app px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-app mb-3">{t(ui.cart.emptyTitle)}</h1>
          <p className="text-app-muted mb-8 leading-relaxed">{t(ui.cart.emptyHint)}</p>
          <button
            type="button"
            onClick={() => router.push('/books')}
            className="px-6 py-3 bg-[var(--app-accent)] hover:opacity-95 text-white font-semibold rounded-xl touch-manipulation shadow-sm"
          >
            {t(ui.common.browseBooks)}
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
      const idToken = await user.getIdToken()

      const orderItems = items.map((item) => ({
        bookId: item.book.id,
        quantity: item.quantity,
      }))

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
        throw new Error(data.error || t(ui.common.payError))
      }

      clearCart()
      window.location.href = data.paymentUrl
    } catch (err) {
      console.error('Payment error:', err)
      const msg = err instanceof Error ? err.message : t(ui.common.payError)
      alert(msg)
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col bg-app text-app py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">{cartHeading}</h1>

        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          {items.map((item) => (
            <div
              key={item.book.id}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-5 bg-app-card rounded-xl border border-app shadow-sm"
            >
              <div className="flex gap-3 sm:gap-4 sm:flex-1 sm:min-w-0">
                <div className="w-16 h-24 sm:w-20 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-app-card-elevated border border-app">
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
                    <div className="w-full h-full flex items-center justify-center text-app-muted text-xs sm:text-sm px-1 text-center">
                      —
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h2 className="font-semibold text-app truncate">{item.book.name}</h2>
                    <p className="text-app-muted text-sm">{item.book.author_name}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-3">
                    <div className="flex items-center gap-1 sm:gap-2 bg-app-card-elevated rounded-lg p-0.5 border border-app">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.book.id, Math.max(1, item.quantity - 1))}
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-md bg-app-card hover:bg-app-card-elevated flex items-center justify-center text-app touch-manipulation border border-app"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-8 sm:w-9 text-center text-app font-medium tabular-nums text-sm sm:text-base">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.book.id, item.quantity + 1)}
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-md bg-app-card hover:bg-app-card-elevated flex items-center justify-center text-app touch-manipulation border border-app"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.book.id)}
                      className="text-[var(--app-danger)] hover:opacity-90 text-sm py-1.5 px-2 touch-manipulation font-medium"
                    >
                      {t(ui.common.remove)}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-between sm:justify-end items-center sm:items-end sm:flex-col sm:text-right border-t border-app pt-3 sm:pt-0 sm:border-t-0">
                <span className="text-app-muted sm:hidden">{t(ui.common.subtotal)}</span>
                <p className="text-[var(--app-price)] font-bold tabular-nums">
                  {formatMMK(item.book.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-app pt-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <p className="text-xl sm:text-2xl font-bold text-app">
              {t(ui.common.total)}: {formatMMK(total)}
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => router.push('/books')}
              className="w-full sm:w-auto py-3 border-app text-app bg-app-card hover:bg-app-card-elevated"
            >
              {t(ui.common.continueShopping)}
            </Button>
            <Button
              onClick={handleKBZPayment}
              loading={isProcessing}
              disabled={isProcessing || !user}
              className="w-full sm:w-auto bg-[var(--app-accent)] hover:opacity-95 text-white border-0 py-3"
            >
              {user
                ? isProcessing
                  ? t(ui.cart.payRedirect)
                  : t(ui.cart.payKbz)
                : t(ui.cart.paySignIn)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
