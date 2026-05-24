'use client'

import React, { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircleIcon, BookOpenIcon, CreditCardIcon } from '@heroicons/react/24/solid'
import { useCartStore } from '@/lib/store/cartStore'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { usePreferences } from '@/components/PreferencesProvider'
import { pick, ui } from '@/lib/ui/bilingualLabels'

type PaymentState = { status?: string; loading?: boolean; error?: string }

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { clearCart } = useCartStore()
  const { user } = useFirebaseAuth()
  const { locale } = usePreferences()
  const t = (e: { en: string; my: string }) => pick(e, locale)

  const prepayId = searchParams.get('prepay_id')
  const merchOrderId = searchParams.get('merch_order_id')
  const isKBZPayReturn = !!(prepayId && merchOrderId)

  const [payState, setPayState] = React.useState<PaymentState>({})

  useEffect(() => {
    if (!isKBZPayReturn) {
      clearCart()
      return
    }

    const storedOrderId = sessionStorage.getItem('kbzpay_order_id')
    const storedMerchId = sessionStorage.getItem('kbzpay_merchant_order_id')
    const orderIdToCheck = storedOrderId
    const merchantIdToCheck = storedMerchId || merchOrderId

    // If we have the Firestore orderId, go straight to the order receipt page
    // (which handles auth + live status correctly)
    if (orderIdToCheck) {
      sessionStorage.removeItem('kbzpay_order_id')
      sessionStorage.removeItem('kbzpay_merchant_order_id')
      router.replace(`/order/${orderIdToCheck}`)
      return
    }

    // Fallback: poll check-status using the authenticated user's token
    const check = async () => {
      if (!user) {
        setPayState({ error: 'Please sign in to verify your payment.' })
        return
      }
      setPayState({ loading: true })
      try {
        const idToken = await user.getIdToken()
        const res = await fetch('/api/kbzpay/check-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ merchantOrderId: merchantIdToCheck }),
        })
        const data = await res.json()
        setPayState({ status: data.status })

        if (data.status === 'completed') {
          clearCart()
          // Redirect to order receipt if we have the orderId
          if (data.orderId) {
            router.replace(`/order/${data.orderId}`)
            return
          }
        }
      } catch {
        setPayState({ error: 'Unable to verify payment. Go to My Orders to check.' })
      }
    }
    check()
  }, [isKBZPayReturn, merchOrderId, user, clearCart, router])

  const labelMap = {
    completed: locale === 'my' ? 'ငွေပေးချေမှု အောင်မြင်သည်' : 'Payment successful!',
    failed: locale === 'my' ? 'ငွေပေးချေမှု မအောင်မြင်ပါ' : 'Payment failed',
    expired: locale === 'my' ? 'ငွေပေးချေချိန် ကုန်သွားသည်' : 'Payment expired',
  }

  const heading = payState.loading
    ? (locale === 'my' ? 'စစ်ဆေးနေသည်…' : 'Verifying payment…')
    : payState.error
    ? (locale === 'my' ? 'စစ်ဆေး၍မရပါ' : 'Could not verify')
    : (labelMap[payState.status as keyof typeof labelMap] ?? (locale === 'my' ? 'ငွေပေးချေနေသည်…' : 'Processing…'))

  return (
    <div className="flex flex-1 items-center justify-center bg-app px-4 py-12">
      <div className="w-full max-w-md bg-app-card rounded-2xl border border-app shadow-sm p-8 text-center space-y-6">

        <div className="flex justify-center">
          {payState.loading ? (
            <div className="w-16 h-16 rounded-full border-4 border-[var(--app-accent)] border-t-transparent animate-spin" />
          ) : payState.status === 'completed' ? (
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4">
              <CheckCircleIcon className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : (
            <div className="rounded-full bg-[var(--app-danger-bg)] p-4">
              <CreditCardIcon className="h-16 w-16 text-[var(--app-danger)]" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-app">{heading}</h1>
          {payState.error && (
            <p className="text-app-muted text-sm">{payState.error}</p>
          )}
          {payState.status === 'failed' && (
            <p className="text-app-muted text-sm">
              {locale === 'my' ? 'ငွေမကောက်ဘဲ ပြန်ကြိုးစားနိုင်သည်။' : 'No money was taken. You can try again.'}
            </p>
          )}
        </div>

        <div className="space-y-3 pt-2">
          {(payState.status === 'failed' || payState.status === 'expired') ? (
            <>
              <button
                type="button"
                onClick={() => router.push('/cart')}
                className="w-full py-3 bg-[var(--app-accent)] hover:opacity-95 text-white font-semibold rounded-xl touch-manipulation"
              >
                <span className="flex items-center justify-center gap-2">
                  <CreditCardIcon className="h-5 w-5" />
                  {t(ui.cart.payKbz)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/books')}
                className="w-full py-3 border border-app text-app rounded-xl hover:bg-app-card-elevated touch-manipulation"
              >
                {t(ui.common.browseBooks)}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="w-full py-3 bg-[var(--app-accent)] hover:opacity-95 text-white font-semibold rounded-xl touch-manipulation"
              >
                <span className="flex items-center justify-center gap-2">
                  <BookOpenIcon className="h-5 w-5" />
                  {t(ui.orders.title)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/books')}
                className="w-full py-3 border border-app text-app rounded-xl hover:bg-app-card-elevated touch-manipulation"
              >
                {t(ui.common.continueShopping)}
              </button>
            </>
          )}
        </div>

        {merchOrderId && (
          <p className="text-xs font-mono text-app-muted break-all">
            {locale === 'my' ? 'မှာယူမှုနံပါတ်' : 'Order ref'}: {merchOrderId}
          </p>
        )}
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-app">
          <div className="w-10 h-10 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
