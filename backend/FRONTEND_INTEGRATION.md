# Frontend Integration Guide

This guide shows how to integrate the KBZPay payment backend with your Next.js frontend on Vercel.

## Environment Variables

Add to your Next.js `.env.local`:

```env
NEXT_PUBLIC_PAYMENT_BACKEND_URL=https://your-backend-domain.com
```

## Payment Service

Create a payment service file:

### `src/lib/services/payment-backend.service.ts`

```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_PAYMENT_BACKEND_URL || '';

export interface CreatePaymentRequest {
  userId: string;
  bookIds: string[];
  amounts: number[];
}

export interface CreatePaymentResponse {
  success: boolean;
  orderId: string;
  merchantOrderId: string;
  prepayId: string;
  paymentUrl: string;
  totalAmount: number;
  currency: string;
}

export interface VerifyPaymentRequest {
  merchantOrderId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  status: 'pending' | 'completed' | 'failed' | 'expired' | 'cancelled';
  orderId: string;
  merchantOrderId: string;
  paidAt?: string;
  kbzOrderId?: string;
  tradeStatus?: string;
  error?: string;
}

/**
 * Create a KBZPay payment order
 */
export async function createKBZPayPayment(
  request: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  const response = await fetch(`${BACKEND_URL}/create-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment');
  }

  return response.json();
}

/**
 * Verify payment status
 */
export async function verifyKBZPayPayment(
  request: VerifyPaymentRequest
): Promise<VerifyPaymentResponse> {
  const response = await fetch(`${BACKEND_URL}/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify payment');
  }

  return response.json();
}
```

## Checkout Page Integration

Update your checkout page to use the backend:

### Example: `src/app/checkout/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/lib/store/cartStore';
import { createKBZPayPayment, verifyKBZPayPayment } from '@/lib/services/payment-backend.service';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKBZPayCheckout = async () => {
    if (!user) {
      setError('Please sign in to continue with your purchase.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Convert cart items to payment format
      const bookIds = items.map((item) => item.book.id);
      const amounts = items.map((item) => item.book.price * item.quantity);

      // Create payment order via backend
      const paymentResponse = await createKBZPayPayment({
        userId: user.id,
        bookIds,
        amounts,
      });

      if (paymentResponse.success && paymentResponse.paymentUrl) {
        // Store order ID for later reference
        sessionStorage.setItem('kbzpay_order_id', paymentResponse.orderId);
        sessionStorage.setItem('kbzpay_merchant_order_id', paymentResponse.merchantOrderId);

        // Redirect to KBZPay PWA payment page
        window.location.href = paymentResponse.paymentUrl;
      } else {
        throw new Error('Failed to get payment URL');
      }
    } catch (err: unknown) {
      console.error('KBZPay checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {/* Your checkout UI */}
      <button onClick={handleKBZPayCheckout} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Pay with KBZPay'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

## Payment Success Handler

Create a success page to verify payment:

### `src/app/checkout/success/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyKBZPayPayment } from '@/lib/services/payment-backend.service';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get merchant order ID from session storage (set before redirect)
        const merchantOrderId = sessionStorage.getItem('kbzpay_merchant_order_id');

        if (!merchantOrderId) {
          // Try to get from URL params if available
          const orderIdFromUrl = searchParams.get('merchantOrderId');
          if (!orderIdFromUrl) {
            throw new Error('Order ID not found');
          }
          merchantOrderId = orderIdFromUrl;
        }

        // Verify payment status
        const result = await verifyKBZPayPayment({
          merchantOrderId,
        });

        if (result.success && result.status === 'completed') {
          setStatus('success');
          // Clear cart and session storage
          sessionStorage.removeItem('kbzpay_order_id');
          sessionStorage.removeItem('kbzpay_merchant_order_id');
          // Optionally clear cart here
        } else {
          setStatus('failed');
          setError(result.error || 'Payment verification failed');
        }
      } catch (err: unknown) {
        console.error('Payment verification error:', err);
        setStatus('failed');
        setError(err instanceof Error ? err.message : 'Failed to verify payment');
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (status === 'loading') {
    return <div>Verifying payment...</div>;
  }

  if (status === 'success') {
    return (
      <div>
        <h1>Payment Successful!</h1>
        <p>Your order has been confirmed.</p>
        <button onClick={() => router.push('/library')}>View My Library</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Payment Verification Failed</h1>
      <p>{error}</p>
      <button onClick={() => router.push('/checkout')}>Try Again</button>
    </div>
  );
}
```

## Payment Flow Diagram

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │
       │ 1. POST /create-payment
       │    { userId, bookIds, amounts }
       ▼
┌──────────────────┐
│  Payment Backend │
│   (Express)      │
└──────┬───────────┘
       │
       │ 2. Create order in Supabase
       │ 3. Call KBZPay API
       │
       ▼
┌──────────────────┐
│   KBZPay API     │
└──────┬───────────┘
       │
       │ 4. Return prepay_id & payment URL
       │
       ▼
┌──────────────────┐
│  Payment Backend │
└──────┬───────────┘
       │
       │ 5. Return paymentUrl
       │
       ▼
┌─────────────┐
│   Frontend  │
│             │
│ 6. Redirect │
│    to       │
│  KBZPay PWA │
└─────────────┘
       │
       │ 7. User completes payment
       │
       ▼
┌──────────────────┐
│   KBZPay PWA     │
└──────┬───────────┘
       │
       │ 8. POST /kbzpay-callback
       │    (webhook)
       │
       ▼
┌──────────────────┐
│  Payment Backend │
│                  │
│ 9. Update order  │
│ 10. Create       │
│     purchases    │
└──────────────────┘
       │
       │ 11. User redirected back
       │     to frontend
       │
       ▼
┌─────────────┐
│   Frontend  │
│  (Success)  │
│             │
│ 12. Verify  │
│     status  │
└─────────────┘
```

## Error Handling

Always handle errors gracefully:

```typescript
try {
  const response = await createKBZPayPayment({ userId, bookIds, amounts });
  // Handle success
} catch (error) {
  if (error instanceof Error) {
    // Show user-friendly error message
    setError(error.message);
  } else {
    setError('An unexpected error occurred');
  }
  console.error('Payment error:', error);
}
```

## Testing

1. **Local Testing**: Update `NEXT_PUBLIC_PAYMENT_BACKEND_URL` to point to your local backend (e.g., `http://localhost:3001`)

2. **Production Testing**: 
   - Use UAT credentials from KBZPay
   - Test with small amounts
   - Verify webhook callbacks are received

## Security Notes

1. **Never send KBZPay credentials to the frontend**
2. **Always validate user authentication** before creating payments
3. **Use HTTPS** in production
4. **Don't store sensitive data** in sessionStorage (only order IDs)
5. **Verify payment status** on the success page before showing success

