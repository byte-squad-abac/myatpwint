# MPU National Payment Gateway Implementation Plan

## Overview

This document outlines the implementation plan for integrating MPU National Payment Gateway into MyatPwint v2 alongside the existing Stripe payment system. This will provide Myanmar users with a local payment option using Myanmar Kyat (MMK) directly.

## Project Scope

### Merchant Configuration
- **Merchant Name**: OPENEYES PUBLISHING HOUSE
- **Merchant ID**: 205104001711159
- **Environment**: Test first, then Production
- **Currency**: Myanmar Kyat (MMK) - Code 104
- **Secret Key**: N8CWYXRDGW85SJK46XKS7228K26RJCCU

### Integration Approach
- **Dual Payment System**: Maintain Stripe for international users, add MPU for Myanmar users
- **Payment Method Selection**: Allow users to choose between Stripe and MPU
- **Currency Handling**: Direct MMK pricing for MPU, USD conversion for Stripe

## Technical Requirements

### 1. Environment Variables
Add to `.env.local`:
```bash
# MPU Payment Gateway
MPU_MERCHANT_ID=205104001711159
MPU_SECRET_KEY=N8CWYXRDGW85SJK46XKS7228K26RJCCU
MPU_TEST_URL=https://www.mpuecomuat.com/UAT/Payment/Payment/pay
MPU_PROD_URL=https://www.mpu-ecommerce.com/Payment/Payment/pay
MPU_INQUIRY_TEST_URL=https://www.mpuecomuat.com/UAT/Payment/Action/api
MPU_INQUIRY_PROD_URL=https://www.mpu-ecommerce.com/Payment/Action/api
MPU_FRONTEND_URL=https://myatpwint-pre.netlify.app/
MPU_BACKEND_URL=https://myatpwint-pre.netlify.app/
NODE_ENV=development
```

### 2. Database Schema Updates

#### New Table: `mpu_transactions`
```sql
CREATE TABLE mpu_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  book_id uuid REFERENCES books(id),
  invoice_no varchar(20) UNIQUE NOT NULL,
  amount numeric NOT NULL, -- MMK amount
  delivery_type text CHECK (delivery_type IN ('digital', 'physical')),
  quantity integer DEFAULT 1,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'failed', 'voided')),
  mpu_tran_ref varchar(28),
  approval_code varchar(6),
  date_time varchar(14),
  resp_code varchar(2),
  pan varchar(16), -- Masked card number
  fail_reason text,
  user_defined1 text,
  user_defined2 text,
  user_defined3 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE mpu_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own MPU transactions"
ON mpu_transactions FOR SELECT
USING (auth.uid() = user_id);
```

#### Update existing tables
```sql
-- Add MPU payment tracking to purchases table
ALTER TABLE purchases ADD COLUMN mpu_transaction_id uuid REFERENCES mpu_transactions(id);
ALTER TABLE purchases ADD COLUMN payment_method text DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'mpu'));
```

## Implementation Plan

### Phase 1: Core MPU Integration (Week 1-2)

#### 1.1 Create MPU Configuration
**File**: `src/config/mpu.ts`
```typescript
export const mpuConfig = {
  merchantId: process.env.MPU_MERCHANT_ID!,
  secretKey: process.env.MPU_SECRET_KEY!,
  testUrl: process.env.MPU_TEST_URL!,
  prodUrl: process.env.MPU_PROD_URL!,
  inquiryTestUrl: process.env.MPU_INQUIRY_TEST_URL!,
  inquiryProdUrl: process.env.MPU_INQUIRY_PROD_URL!,
  frontendUrl: process.env.MPU_FRONTEND_URL!,
  backendUrl: process.env.MPU_BACKEND_URL!,
  currencyCode: '104', // MMK
  version: '2.0',
  isProduction: process.env.NODE_ENV === 'production'
} as const;
```

#### 1.2 Implement HMACSHA1 Signature Service
**File**: `src/lib/mpu/signature.ts`
```typescript
import crypto from 'crypto';

export class MPUSignature {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  generateSignature(parameters: Record<string, string>): string {
    // Sort parameters by ASCII
    const sortedKeys = Object.keys(parameters).sort();
    const signatureString = sortedKeys
      .map(key => parameters[key])
      .join('');

    // Generate HMACSHA1 hash
    const hmac = crypto.createHmac('sha1', this.secretKey);
    hmac.update(signatureString, 'utf8');
    return hmac.digest('hex').toUpperCase();
  }

  verifySignature(parameters: Record<string, string>, receivedHash: string): boolean {
    const { hashValue, ...dataToVerify } = parameters;
    const expectedHash = this.generateSignature(dataToVerify);
    return expectedHash === receivedHash;
  }
}
```

#### 1.3 Create MPU Payment Service
**File**: `src/lib/mpu/payment.service.ts`
```typescript
import { MPUSignature } from './signature';
import { mpuConfig } from '@/config/mpu';

export interface MPUPaymentRequest {
  bookId: string;
  userId: string;
  amount: number; // MMK amount
  productDesc: string;
  deliveryType: 'digital' | 'physical';
  quantity: number;
  userDefined1?: string;
  userDefined2?: string;
  userDefined3?: string;
}

export interface MPUFormData {
  merchantID: string;
  invoiceNo: string;
  productDesc: string;
  amount: string;
  currencyCode: string;
  categoryCode?: string;
  userDefined1?: string;
  userDefined2?: string;
  userDefined3?: string;
  FrontendURL: string;
  BackendURL: string;
  hashValue: string;
  version: string;
}

export class MPUPaymentService {
  private signature: MPUSignature;

  constructor() {
    this.signature = new MPUSignature(mpuConfig.secretKey);
  }

  generateInvoiceNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`.padStart(20, '0');
  }

  formatAmount(amount: number): string {
    return (amount * 100).toString().padStart(12, '0'); // Convert to cents format
  }

  createPaymentForm(request: MPUPaymentRequest): MPUFormData {
    const invoiceNo = this.generateInvoiceNumber();
    const formattedAmount = this.formatAmount(request.amount);

    const parameters = {
      merchantID: mpuConfig.merchantId,
      invoiceNo,
      productDesc: request.productDesc,
      amount: formattedAmount,
      currencyCode: mpuConfig.currencyCode,
      userDefined1: request.userDefined1 || request.bookId,
      userDefined2: request.userDefined2 || request.userId,
      userDefined3: request.userDefined3 || request.deliveryType,
      FrontendURL: mpuConfig.frontendUrl,
      BackendURL: mpuConfig.backendUrl,
      version: mpuConfig.version
    };

    const hashValue = this.signature.generateSignature(parameters);

    return {
      ...parameters,
      hashValue
    };
  }

  getPaymentUrl(): string {
    return mpuConfig.isProduction ? mpuConfig.prodUrl : mpuConfig.testUrl;
  }
}
```

### Phase 2: API Routes Implementation (Week 2-3)

#### 2.1 Create MPU Checkout Session API
**File**: `src/app/api/mpu/create-payment/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { MPUPaymentService } from '@/lib/mpu/payment.service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, quantity, deliveryType, userId } = body;

    // Get book details
    const { data: book, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (error || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Calculate total amount
    let totalAmount = book.price * quantity;
    if (deliveryType === 'physical') {
      totalAmount += 5000; // Add shipping cost
    }

    const mpuService = new MPUPaymentService();
    const formData = mpuService.createPaymentForm({
      bookId,
      userId,
      amount: totalAmount,
      productDesc: `${book.name} by ${book.author}`,
      deliveryType,
      quantity
    });

    // Save transaction to database
    const { data: transaction, error: transactionError } = await supabase
      .from('mpu_transactions')
      .insert({
        user_id: userId,
        book_id: bookId,
        invoice_no: formData.invoiceNo,
        amount: totalAmount,
        delivery_type: deliveryType,
        quantity,
        status: 'pending',
        user_defined1: formData.userDefined1,
        user_defined2: formData.userDefined2,
        user_defined3: formData.userDefined3
      })
      .select()
      .single();

    if (transactionError) {
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    return NextResponse.json({
      formData,
      paymentUrl: mpuService.getPaymentUrl(),
      transactionId: transaction.id
    });

  } catch (error) {
    console.error('MPU payment creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### 2.2 Create MPU Callback Handler
**File**: `src/app/api/mpu/callback/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { MPUSignature } from '@/lib/mpu/signature';
import { mpuConfig } from '@/config/mpu';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};

    // Extract all form parameters
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    const {
      merchantID,
      respCode,
      pan,
      amount,
      invoiceNo,
      tranRef,
      approvalCode,
      dateTime,
      status,
      failReason,
      userDefined1,
      userDefined2,
      userDefined3,
      hashValue
    } = params;

    // Verify signature
    const signature = new MPUSignature(mpuConfig.secretKey);
    const { hashValue: receivedHash, ...dataToVerify } = params;

    if (!signature.verifySignature(dataToVerify, receivedHash)) {
      console.error('Invalid MPU signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Update transaction in database
    const { data: transaction, error } = await supabase
      .from('mpu_transactions')
      .update({
        status: respCode === '00' ? 'approved' : 'failed',
        mpu_tran_ref: tranRef,
        approval_code: approvalCode,
        date_time: dateTime,
        resp_code: respCode,
        pan,
        fail_reason: failReason,
        updated_at: new Date().toISOString()
      })
      .eq('invoice_no', invoiceNo)
      .select()
      .single();

    if (error) {
      console.error('Failed to update MPU transaction:', error);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // If payment successful, create purchase record
    if (respCode === '00' && transaction) {
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: transaction.user_id,
          book_id: transaction.book_id,
          delivery_type: transaction.delivery_type,
          quantity: transaction.quantity,
          unit_price: transaction.amount / transaction.quantity,
          total_price: transaction.amount,
          purchase_price: transaction.amount,
          status: 'completed',
          payment_method: 'mpu',
          mpu_transaction_id: transaction.id
        });

      if (purchaseError) {
        console.error('Failed to create purchase record:', purchaseError);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('MPU callback error:', error);
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 });
  }
}
```

#### 2.3 Create MPU Inquiry API
**File**: `src/app/api/mpu/inquiry/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { MPUSignature } from '@/lib/mpu/signature';
import { mpuConfig } from '@/config/mpu';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceNo = searchParams.get('invoiceNo');
    const inquiryDate = searchParams.get('inquiryDate'); // YYYYMMDD format

    if (!invoiceNo || !inquiryDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const signature = new MPUSignature(mpuConfig.secretKey);
    const parameters = {
      merchantID: mpuConfig.merchantId,
      invoiceNo,
      inquiryDate,
      actionType: 'I'
    };

    const hashValue = signature.generateSignature(parameters);
    const inquiryUrl = mpuConfig.isProduction ? mpuConfig.inquiryProdUrl : mpuConfig.inquiryTestUrl;

    // Build query string
    const queryParams = new URLSearchParams({
      ...parameters,
      hashValue
    });

    const fullUrl = `${inquiryUrl}?${queryParams.toString()}`;

    // Make request to MPU
    const response = await fetch(fullUrl);
    const result = await response.text();

    return NextResponse.json({ result });

  } catch (error) {
    console.error('MPU inquiry error:', error);
    return NextResponse.json({ error: 'Inquiry failed' }, { status: 500 });
  }
}
```

### Phase 3: Frontend Implementation (Week 3-4)

#### 3.1 Update Checkout Page
**File**: `src/app/checkout/page.tsx` (modify existing)

Add MPU payment option alongside Stripe:

```typescript
// Add to existing checkout page
const handleMPUCheckout = async () => {
  if (!user) {
    setError('Please sign in to continue with your purchase.');
    return;
  }

  setIsProcessing(true);
  setError(null);

  try {
    const checkoutItems = items.map(item => ({
      bookId: item.book.id,
      quantity: item.quantity,
      deliveryType: item.deliveryType,
    }));

    const response = await fetch('/api/mpu/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...checkoutItems[0], // For now, handle single item
        userId: user.id
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create MPU payment');
    }

    const { formData, paymentUrl } = await response.json();

    // Create and submit form to MPU
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentUrl;

    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();

  } catch (error) {
    console.error('MPU checkout error:', error);
    setError('Failed to process MPU payment. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};
```

#### 3.2 Create MPU Payment Component
**File**: `src/components/payment/MPUPaymentButton.tsx`
```typescript
interface MPUPaymentButtonProps {
  items: CartItem[];
  onPayment: () => Promise<void>;
  disabled?: boolean;
}

export function MPUPaymentButton({ items, onPayment, disabled }: MPUPaymentButtonProps) {
  return (
    <button
      onClick={onPayment}
      disabled={disabled}
      className="w-full p-4 border-2 border-green-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-green-600 text-white p-2 rounded">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z"/>
            </svg>
          </div>
          <div className="ml-3 text-left">
            <h3 className="font-semibold text-gray-900">MPU Payment Gateway</h3>
            <p className="text-sm text-gray-600">Pay with Myanmar local banks</p>
          </div>
        </div>
        <span className="text-sm font-medium text-green-600 group-hover:text-green-700">
          Local Payment
        </span>
      </div>
    </button>
  );
}
```

### Phase 4: Payment Success/Failure Pages (Week 4)

#### 4.1 Create MPU Success Page
**File**: `src/app/mpu/success/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function MPUSuccessPage() {
  const searchParams = useSearchParams();
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    // Extract transaction data from URL parameters
    const data = {
      merchantID: searchParams.get('merchantID'),
      respCode: searchParams.get('respCode'),
      amount: searchParams.get('amount'),
      invoiceNo: searchParams.get('invoiceNo'),
      tranRef: searchParams.get('tranRef'),
      status: searchParams.get('status')
    };
    setTransactionData(data);
  }, [searchParams]);

  if (!transactionData) {
    return <div>Loading...</div>;
  }

  const isSuccess = transactionData.respCode === '00';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {isSuccess ? (
          <>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">Payment Successful!</h2>
              <p className="mt-2 text-sm text-gray-600">
                Your payment has been processed successfully.
              </p>
            </div>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction Ref:</span>
                <span className="font-medium">{transactionData.tranRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">{parseInt(transactionData.amount) / 100} MMK</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">Payment Failed</h2>
              <p className="mt-2 text-sm text-gray-600">
                Your payment could not be processed. Please try again.
              </p>
            </div>
          </>
        )}

        <div className="mt-6">
          <button
            onClick={() => window.location.href = '/library'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Library
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Phase 5: Testing & Integration (Week 5)

#### 5.1 Testing Checklist
- [ ] MPU form generation with correct signature
- [ ] Payment flow redirection to MPU gateway
- [ ] Callback handling and signature verification
- [ ] Database transaction recording
- [ ] Purchase creation for successful payments
- [ ] Error handling for failed payments
- [ ] Inquiry API functionality

#### 5.2 Test Data
Use MPU test environment with test cards:
```
Test Card: 4544330000000001
Expiry: Any future date
CVV: Any 3 digits
```

### Phase 6: Production Deployment (Week 6)

#### 6.1 Production Configuration
- Update environment variables for production URLs
- Configure production secret keys
- Set up proper error logging and monitoring
- Configure frontend/backend URLs for production domain

#### 6.2 Go-Live Checklist
- [ ] All test scenarios passed
- [ ] Production credentials configured
- [ ] SSL certificates valid
- [ ] Monitoring and logging in place
- [ ] Rollback plan ready
- [ ] User documentation updated

## Configuration Updates

### Update constants file
**File**: `src/constants/index.ts`
```typescript
// Add MPU constants
export const MPU_CONFIG = {
  CURRENCY_CODE: '104', // MMK
  MIN_AMOUNT: 100, // 1 MMK minimum
  MAX_AMOUNT: 50000000, // 500,000 MMK maximum
  VERSION: '2.0'
} as const;

export const PAYMENT_METHODS = {
  STRIPE: 'stripe',
  MPU: 'mpu'
} as const;
```

### Update cart store
**File**: `src/lib/store/cartStore.ts`
```typescript
// Add payment method selection
interface CartStore {
  // ... existing properties
  paymentMethod: 'stripe' | 'mpu';
  setPaymentMethod: (method: 'stripe' | 'mpu') => void;
}

// Add to store implementation
setPaymentMethod: (method: 'stripe' | 'mpu') => set({ paymentMethod: method }),
```

## Security Considerations

1. **Secret Key Management**: Store MPU secret key securely in environment variables
2. **Signature Verification**: Always verify HMACSHA1 signatures on callbacks
3. **HTTPS Only**: Ensure all MPU communications use HTTPS
4. **Input Validation**: Validate all parameters before processing
5. **Error Handling**: Don't expose sensitive information in error messages
6. **Logging**: Log all transactions for audit trails
7. **Rate Limiting**: Implement rate limiting on payment APIs

## Monitoring & Analytics

1. **Payment Success Rates**: Track MPU vs Stripe success rates
2. **Transaction Volumes**: Monitor daily/monthly transaction volumes
3. **Error Rates**: Track and alert on payment failures
4. **Performance**: Monitor payment processing times
5. **User Preferences**: Track which payment method users prefer

## Future Enhancements

1. **Automatic Inquiry**: Scheduled jobs to check pending transaction status
2. **Void/Refund**: Implement MPU void and refund functionality
3. **Recurring Payments**: If supported by MPU in future
4. **Mobile App Integration**: Extend MPU integration to mobile apps
5. **Advanced Analytics**: Detailed payment analytics dashboard

## Risk Mitigation

1. **Fallback**: Always keep Stripe as backup payment method
2. **Testing**: Comprehensive testing in MPU test environment
3. **Gradual Rollout**: Enable MPU for subset of users initially
4. **Monitoring**: Real-time monitoring during initial rollout
5. **Quick Rollback**: Ability to disable MPU quickly if issues arise

## Support & Maintenance

1. **Documentation**: Maintain internal documentation for MPU integration
2. **Training**: Train support team on MPU payment flows
3. **Monitoring**: Set up alerts for payment failures
4. **Updates**: Plan for MPU API updates and changes
5. **Compliance**: Ensure ongoing compliance with MPU requirements