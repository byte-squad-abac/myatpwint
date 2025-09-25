'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline'
import { Card, Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

export default function QRPaymentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [, setOrderId] = useState<string | null>(null)
  const [merchantOrderId, setMerchantOrderId] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending')
  const [isChecking, setIsChecking] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(120 * 60) // 120 minutes in seconds

  const checkPaymentStatus = useCallback(async () => {
    if (!merchantOrderId || isChecking) return

    setIsChecking(true)
    try {
      const response = await fetch(`/api/kbzpay/check-status?merchantOrderId=${merchantOrderId}`)
      const data = await response.json()

      if (data.success && data.status === 'paid') {
        setPaymentStatus('success')
        // Clear session storage
        sessionStorage.removeItem('kbzpay_qr_code')
        sessionStorage.removeItem('kbzpay_qr_order_id')
        sessionStorage.removeItem('kbzpay_qr_merchant_order_id')

        // Redirect to success page after a short delay
        setTimeout(() => {
          router.push('/checkout/success')
        }, 3000)
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
    } finally {
      setIsChecking(false)
    }
  }, [merchantOrderId, isChecking, router])

  useEffect(() => {
    // Get QR code and order details from session storage
    const storedQrCode = sessionStorage.getItem('kbzpay_qr_code')
    const storedOrderId = sessionStorage.getItem('kbzpay_qr_order_id')
    const storedMerchantOrderId = sessionStorage.getItem('kbzpay_qr_merchant_order_id')

    if (!storedQrCode || !storedOrderId || !storedMerchantOrderId) {
      router.push('/checkout')
      return
    }

    setQrCode(storedQrCode)
    setOrderId(storedOrderId)
    setMerchantOrderId(storedMerchantOrderId)

    // Start payment status checking
    const statusInterval = setInterval(() => {
      checkPaymentStatus()
    }, 5000)

    // Start countdown timer
    const timerInterval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(statusInterval)
          clearInterval(timerInterval)
          setPaymentStatus('failed')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(statusInterval)
      clearInterval(timerInterval)
    }
  }, [router, checkPaymentStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRetry = () => {
    // Clear session storage and go back to checkout
    sessionStorage.removeItem('kbzpay_qr_code')
    sessionStorage.removeItem('kbzpay_qr_order_id')
    sessionStorage.removeItem('kbzpay_qr_merchant_order_id')
    router.push('/checkout')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in required</h1>
          <p className="text-gray-600 mb-6">Please sign in to continue.</p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Sign In
          </Button>
        </Card>
      </div>
    )
  }

  if (!qrCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No QR Code Available</h1>
          <p className="text-gray-600 mb-6">Please try creating a new payment order.</p>
          <Button onClick={() => router.push('/checkout')} className="w-full">
            Back to Checkout
          </Button>
        </Card>
      </div>
    )
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <div className="text-green-600 mb-4">
            <CheckCircleIcon className="h-16 w-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">Your payment has been processed successfully. Redirecting...</p>
        </Card>
      </div>
    )
  }

  if (paymentStatus === 'failed' || timeRemaining <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <div className="text-red-600 mb-4">
            <XCircleIcon className="h-16 w-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Expired</h1>
          <p className="text-gray-600 mb-6">The QR code has expired. Please try again with a new payment order.</p>
          <Button onClick={handleRetry} className="w-full">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan QR Code to Pay</h1>
          <p className="text-gray-600">Use your KBZPay mobile app to scan the QR code below</p>
        </div>

        <Card className="text-center mb-6">
          {/* Timer */}
          <div className="mb-6">
            <div className="flex items-center justify-center text-orange-600 mb-2">
              <ClockIcon className="h-5 w-5 mr-2" />
              <span className="text-lg font-semibold">Time remaining: {formatTime(timeRemaining)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(timeRemaining / (120 * 60)) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* QR Code */}
          <div className="mb-6">
            <div className="bg-white p-6 rounded-lg shadow-inner mx-auto inline-block">
              <div
                className="bg-white p-4 rounded-lg"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg font-semibold text-center mb-4">How to pay:</h3>
            <div className="flex items-start space-x-3">
              <div className="bg-orange-100 text-orange-600 rounded-full p-1 text-sm font-bold min-w-[24px] h-6 flex items-center justify-center">1</div>
              <p className="text-gray-700">Open KBZPay mobile app on your phone</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-orange-100 text-orange-600 rounded-full p-1 text-sm font-bold min-w-[24px] h-6 flex items-center justify-center">2</div>
              <p className="text-gray-700">Tap on &quot;Scan QR Code&quot; or use the camera feature</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-orange-100 text-orange-600 rounded-full p-1 text-sm font-bold min-w-[24px] h-6 flex items-center justify-center">3</div>
              <p className="text-gray-700">Point your camera at the QR code above</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-orange-100 text-orange-600 rounded-full p-1 text-sm font-bold min-w-[24px] h-6 flex items-center justify-center">4</div>
              <p className="text-gray-700">Confirm the payment amount and complete the transaction</p>
            </div>
          </div>

          {/* Status checking indicator */}
          <div className="mt-6 flex items-center justify-center text-gray-500">
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            <span className="text-sm">Checking payment status...</span>
          </div>
        </Card>

        {/* Order Details */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono">{merchantOrderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method:</span>
              <span>KBZPay QR Code</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="text-orange-600 capitalize">Waiting for Payment</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex space-x-4">
          <Button variant="outline" onClick={() => router.push('/checkout')} className="flex-1">
            Back to Checkout
          </Button>
          <Button onClick={checkPaymentStatus} disabled={isChecking} className="flex-1">
            {isChecking ? 'Checking...' : 'Check Status'}
          </Button>
        </div>
      </div>
    </div>
  )
}