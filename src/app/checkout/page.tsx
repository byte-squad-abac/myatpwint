'use client'

// React and Next.js
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// External libraries
import { CreditCardIcon, TruckIcon, DocumentTextIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'

// Types
import type { CartItem } from '@/lib/store/cartStore'

// Components
import { Button, Card, Input } from '@/components/ui'

// Services
import { useCartStore } from '@/lib/store/cartStore'
import { redirectToCheckout } from '@/lib/stripe/client'

// Hooks
import { useAuth } from '@/hooks/useAuth'

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { items, getTotal, clearCart } = useCartStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = getTotal()
  const hasPhysicalItems = items.some(item => item.deliveryType === 'physical')

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">Add some books to your cart before checking out.</p>
          <Button onClick={() => router.push('/books')} className="w-full">
            Browse Books
          </Button>
        </Card>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in required</h1>
          <p className="text-gray-600 mb-6">Please sign in to continue with your purchase.</p>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => router.push('/login')} className="flex-1">
              Sign In
            </Button>
            <Button onClick={() => router.push('/register')} className="flex-1">
              Sign Up
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const handleStripeCheckout = async () => {
    if (!user) {
      setError('Please sign in to continue with your purchase.')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Convert cart items to checkout format
      const checkoutItems = items.map(item => ({
        bookId: item.book.id,
        quantity: item.quantity,
        deliveryType: item.deliveryType,
      }))

      // Redirect to Stripe Checkout
      await redirectToCheckout(checkoutItems)
    } catch (err: unknown) {
      console.error('Stripe checkout error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process checkout. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKBZPayCheckout = async () => {
    if (!user) {
      setError('Please sign in to continue with your purchase.')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Convert cart items to KBZPay format
      const bookIds = items.map(item => item.book.id)
      const amounts = items.map(item => item.book.price * item.quantity)

      // Create KBZPay order
      const response = await fetch('/api/kbzpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookIds,
          amounts
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment order')
      }

      const data = await response.json()

      if (data.success && data.paymentUrl) {
        // Store order ID for later reference
        sessionStorage.setItem('kbzpay_order_id', data.orderId)
        sessionStorage.setItem('kbzpay_merchant_order_id', data.merchantOrderId)

        // Redirect to KBZPay PWA payment page
        window.location.href = data.paymentUrl
      } else {
        throw new Error(data.error || 'Failed to get payment URL')
      }
    } catch (err: unknown) {
      console.error('KBZPay checkout error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process checkout. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDemoOrder = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Simulate order processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Clear cart (simulate successful order)
      clearCart()

      // Show success message and redirect
      alert('Order placed successfully! (Demo mode - no payment processed)')
      router.push('/library')
    } catch (error) {
      console.error('Error placing order:', error)
      setError('Error placing order. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Review */}
            <Card>
              <div className="flex items-center mb-4">
                <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold">Order Items ({items.length})</h2>
              </div>
              
              <div className="space-y-4">
                {items.map((item: CartItem) => (
                  <div key={`${item.book.id}-${item.deliveryType}`} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <Image
                      src={item.book.image_url}
                      alt={item.book.name}
                      width={64}
                      height={80}
                      className="w-16 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.book.name}</h3>
                      <p className="text-sm text-gray-600">{item.book.author}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-500 capitalize">
                          {item.deliveryType} • Qty: {item.quantity}
                        </span>
                        <span className="font-semibold text-green-600">
                          {(item.book.price * item.quantity).toLocaleString()} MMK
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Shipping Information */}
            {hasPhysicalItems && (
              <Card>
                <div className="flex items-center mb-4">
                  <TruckIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <h2 className="text-lg font-semibold">Shipping Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Full Name" placeholder="Enter your full name" />
                  <Input label="Phone" placeholder="Enter your phone number" />
                  <Input label="Address" placeholder="Enter your address" className="md:col-span-2" />
                  <Input label="City" placeholder="Enter your city" />
                  <Input label="State" placeholder="Enter your state" />
                  <Input label="Postal Code" placeholder="Enter postal code" />
                  <Input label="Email" placeholder="Enter your email" />
                </div>
              </Card>
            )}

            {/* Payment Methods */}
            <Card>
              <div className="flex items-center mb-4">
                <CreditCardIcon className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold">Payment Method</h2>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
              
              <div className="space-y-3">
                {/* KBZPay Payment Option */}
                <button
                  onClick={handleKBZPayCheckout}
                  disabled={isProcessing}
                  className="w-full p-4 border-2 border-orange-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-orange-600 text-white p-2 rounded">
                        <CreditCardIcon className="h-5 w-5" />
                      </div>
                      <div className="ml-3 text-left">
                        <h3 className="font-semibold text-gray-900">Pay with KBZPay</h3>
                        <p className="text-sm text-gray-600">Myanmar&apos;s leading mobile payment solution</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-orange-600 group-hover:text-orange-700">
                      Local Payment
                    </span>
                  </div>
                </button>

                {/* Stripe Payment Option */}
                <button
                  onClick={handleStripeCheckout}
                  disabled={isProcessing}
                  className="w-full p-4 border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-blue-600 text-white p-2 rounded">
                        <CreditCardIcon className="h-5 w-5" />
                      </div>
                      <div className="ml-3 text-left">
                        <h3 className="font-semibold text-gray-900">Secure Payment with Stripe</h3>
                        <p className="text-sm text-gray-600">Pay with card, digital wallets, and more</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                      International
                    </span>
                  </div>
                </button>

                {/* Demo Payment Option */}
                <button
                  onClick={handleDemoOrder}
                  disabled={isProcessing}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="bg-gray-500 text-white p-2 rounded">
                      <ShoppingBagIcon className="h-5 w-5" />
                    </div>
                    <div className="ml-3 text-left">
                      <h3 className="font-semibold text-gray-900">Demo Payment (Testing)</h3>
                      <p className="text-sm text-gray-600">Free checkout for demonstration purposes</p>
                    </div>
                  </div>
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  SSL secured checkout • 256-bit encryption
                </div>
              </div>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({items.length} items):</span>
                  <span>{(total - (hasPhysicalItems ? 5000 : 0)).toLocaleString()} MMK</span>
                </div>
                
                {hasPhysicalItems && (
                  <div className="flex justify-between text-sm">
                    <span>Shipping:</span>
                    <span>5,000 MMK</span>
                  </div>
                )}
                
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">{total.toLocaleString()} MMK</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/books')}
                  className="w-full"
                >
                  Continue Shopping
                </Button>
              </div>
              
              <div className="mt-6 text-xs text-gray-500">
                <p>🔒 Secure checkout powered by Stripe</p>
                <p className="mt-1">Your information is safe and secure.</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}