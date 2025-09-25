'use client'

// React and Next.js
import React, { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// External libraries
import { CheckCircleIcon, ShoppingBagIcon, BookOpenIcon, CreditCardIcon } from '@heroicons/react/24/solid'

// Components
import { Button, Card } from '@/components/ui'

// Services
import { useCartStore } from '@/lib/store/cartStore'

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { clearCart } = useCartStore()

  const sessionId = searchParams.get('session_id')
  const transactionId = searchParams.get('transaction')
  const prepayId = searchParams.get('prepay_id')
  const merchOrderId = searchParams.get('merch_order_id')

  const isStripePayment = !!sessionId
  const isKBZPayReturn = !!(prepayId && merchOrderId)
  const [paymentStatus, setPaymentStatus] = React.useState<{
    status?: string
    loading?: boolean
    error?: string
  }>({})

  useEffect(() => {
    // Handle KBZPay return from payment
    if (isKBZPayReturn) {
      const checkKBZPayStatus = async () => {
        setPaymentStatus({ loading: true })

        try {
          // Check if we have stored order info
          const storedOrderId = sessionStorage.getItem('kbzpay_order_id')
          const storedMerchantOrderId = sessionStorage.getItem('kbzpay_merchant_order_id')

          const orderIdToCheck = storedOrderId || undefined
          const merchantOrderIdToCheck = storedMerchantOrderId || merchOrderId

          const response = await fetch('/api/kbzpay/check-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: orderIdToCheck,
              merchantOrderId: merchantOrderIdToCheck
            })
          })

          if (!response.ok) {
            throw new Error('Failed to check payment status')
          }

          const data = await response.json()
          setPaymentStatus({ status: data.status })

          // If payment successful, clear cart
          if (data.status === 'completed') {
            clearCart()
            // Clean up session storage
            sessionStorage.removeItem('kbzpay_order_id')
            sessionStorage.removeItem('kbzpay_merchant_order_id')
          }
        } catch (error) {
          console.error('Error checking KBZPay status:', error)
          setPaymentStatus({ error: 'Unable to verify payment status' })
        }
      }

      checkKBZPayStatus()
    } else {
      // Clear cart for other payment methods
      clearCart()
    }

    // Auto redirect after 10 seconds (only for successful payments)
    if (!isKBZPayReturn || paymentStatus.status === 'completed') {
      const timeout = setTimeout(() => {
        router.push('/')
      }, 10000)

      return () => clearTimeout(timeout)
    }
  }, [router, clearCart, isKBZPayReturn, merchOrderId, paymentStatus.status])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-lg w-full text-center py-8">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 rounded-full p-4">
            <CheckCircleIcon className="h-16 w-16 text-green-600" />
          </div>
        </div>
        
        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {isKBZPayReturn ? (
            paymentStatus.loading ? 'Verifying Payment...' :
            paymentStatus.status === 'completed' ? 'Payment Successful!' :
            paymentStatus.status === 'failed' ? 'Payment Failed' :
            paymentStatus.status === 'expired' ? 'Payment Expired' :
            paymentStatus.error ? 'Payment Verification Failed' :
            'Payment Processing'
          ) : isStripePayment ? 'Payment Successful!' : 'Order Placed Successfully!'}
        </h1>

        <p className="text-lg text-gray-600 mb-6">
          {isKBZPayReturn ? (
            paymentStatus.loading ? 'Please wait while we verify your payment with KBZPay...' :
            paymentStatus.status === 'completed' ? 'Thank you for your purchase! Your KBZPay payment was successful.' :
            paymentStatus.status === 'failed' ? 'Your payment was not successful. Please try again.' :
            paymentStatus.status === 'expired' ? 'Your payment session has expired. Please try again.' :
            paymentStatus.error ? 'Unable to verify payment status. Please contact support if money was deducted.' :
            'Your payment is being processed. Please do not close this page.'
          ) : 'Thank you for your purchase! Your order has been received and is being processed.'}
        </p>

        {/* Payment Method Info */}
        {isKBZPayReturn ? (
          <div className={`border rounded-lg p-4 mb-6 ${
            paymentStatus.status === 'completed' ? 'bg-green-50 border-green-200' :
            paymentStatus.status === 'failed' || paymentStatus.status === 'expired' ? 'bg-red-50 border-red-200' :
            paymentStatus.error ? 'bg-yellow-50 border-yellow-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-center mb-2">
              {paymentStatus.loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-800 font-medium">Checking payment status...</span>
                </>
              ) : paymentStatus.status === 'completed' ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">KBZPay Payment Successful</span>
                </>
              ) : paymentStatus.status === 'failed' || paymentStatus.status === 'expired' ? (
                <>
                  <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-800 font-medium">KBZPay Payment {paymentStatus.status === 'failed' ? 'Failed' : 'Expired'}</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-orange-800 font-medium">Payment Verification Issue</span>
                </>
              )}
            </div>
            <p className={`text-sm ${
              paymentStatus.status === 'completed' ? 'text-green-700' :
              paymentStatus.status === 'failed' || paymentStatus.status === 'expired' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {paymentStatus.loading ? 'We are checking your payment status with KBZPay. This may take a few moments.' :
               paymentStatus.status === 'completed' ? 'Your books have been added to your library.' :
               paymentStatus.status === 'failed' ? 'Please try again with a different payment method.' :
               paymentStatus.status === 'expired' ? 'Your payment session timed out. Please start a new purchase.' :
               paymentStatus.error ? paymentStatus.error : 'Please wait for payment confirmation.'}
            </p>
            {merchOrderId && (
              <p className="text-xs mt-2 font-mono text-gray-600">
                Order ID: {merchOrderId}
              </p>
            )}
          </div>
        ) : isStripePayment ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-blue-800 font-medium">Payment processed by Stripe</span>
            </div>
            <p className="text-blue-700 text-sm">
              You will receive an email confirmation shortly with your receipt and order details.
            </p>
            {sessionId && (
              <p className="text-blue-600 text-xs mt-2 font-mono">
                Session ID: {sessionId}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <ShoppingBagIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">Demo Order Completed</span>
            </div>
            <p className="text-yellow-700 text-sm">
              This was a demonstration order. No actual payment was processed.
            </p>
            {transactionId && (
              <p className="text-yellow-600 text-xs mt-2 font-mono">
                Transaction ID: {transactionId}
              </p>
            )}
          </div>
        )}

        {/* Next Steps */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
          <div className="text-left space-y-2 text-sm text-gray-600">
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-1 mr-3 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <span>You&apos;ll receive an email confirmation with your order details</span>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-1 mr-3 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <span>Digital books will be available in your library immediately</span>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-1 mr-3 mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <span>Physical books will be shipped to your provided address</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isKBZPayReturn && (paymentStatus.status === 'failed' || paymentStatus.status === 'expired' || paymentStatus.error) ? (
            // Failed payment actions
            <>
              <Button
                onClick={() => router.push('/checkout')}
                className="w-full flex items-center justify-center"
              >
                <CreditCardIcon className="h-5 w-5 mr-2" />
                Try Again
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Continue Shopping
              </Button>
            </>
          ) : paymentStatus.loading ? (
            // Loading state - disable buttons
            <Button disabled className="w-full">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Verifying Payment...
            </Button>
          ) : (
            // Successful payment actions
            <>
              <Button
                onClick={() => router.push('/library')}
                className="w-full flex items-center justify-center"
              >
                <BookOpenIcon className="h-5 w-5 mr-2" />
                View My Library
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Continue Shopping
              </Button>
            </>
          )}
        </div>

        {/* Auto Redirect Notice */}
        {!paymentStatus.loading && (paymentStatus.status === 'completed' || !isKBZPayReturn) && (
          <p className="text-xs text-gray-500 mt-6">
            You will be redirected to the homepage in 10 seconds...
          </p>
        )}
      </Card>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}