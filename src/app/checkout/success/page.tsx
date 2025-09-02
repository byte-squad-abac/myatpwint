'use client'

// React and Next.js
import React, { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// External libraries
import { CheckCircleIcon, ShoppingBagIcon, BookOpenIcon } from '@heroicons/react/24/solid'

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
  const isStripePayment = !!sessionId

  useEffect(() => {
    // Clear cart on successful payment
    clearCart()
    
    // Auto redirect after 10 seconds
    const timeout = setTimeout(() => {
      router.push('/')
    }, 10000)

    return () => clearTimeout(timeout)
  }, [router, clearCart])

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
          {isStripePayment ? 'Payment Successful!' : 'Order Placed Successfully!'}
        </h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Thank you for your purchase! Your order has been received and is being processed.
        </p>

        {/* Payment Method Info */}
        {isStripePayment ? (
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
        </div>

        {/* Auto Redirect Notice */}
        <p className="text-xs text-gray-500 mt-6">
          You will be redirected to the homepage in 10 seconds...
        </p>
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