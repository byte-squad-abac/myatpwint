# KBZPay Payment Flow Explanation

This document explains the complete payment flow from frontend to backend to KBZPay and back.

## Overview

The payment flow involves:
1. **Frontend (Next.js on Vercel)**: User initiates payment
2. **Payment Backend (Express on DigitalOcean)**: Handles KBZPay API communication
3. **KBZPay API**: Processes payment
4. **Supabase**: Stores order and purchase data

## Step-by-Step Flow

### 1. User Initiates Payment (Frontend)

```
User clicks "Pay with KBZPay" button
  ↓
Frontend collects:
  - User ID (from auth session)
  - Book IDs (from cart)
  - Amounts (calculated)
  ↓
POST /create-payment
{
  userId: "user-uuid",
  bookIds: ["book-1", "book-2"],
  amounts: [5000, 8000]
}
```

**Key Points:**
- Frontend **never** sees KBZPay credentials
- User must be authenticated
- Amounts are calculated on frontend but validated on backend

### 2. Backend Creates Order (Payment Backend)

```
Backend receives request
  ↓
Validates:
  - User ID exists
  - Book IDs are valid
  - Amounts match book IDs
  ↓
Creates order in Supabase:
  - Generates unique merchant_order_id
  - Stores order with status 'pending'
  ↓
Prepares KBZPay order request:
  - merch_order_id
  - total_amount
  - title (from book names)
  - callback_info (order metadata)
```

**Key Points:**
- All validation happens on backend
- Order is created in database before calling KBZPay
- Service role key is used for database operations

### 3. Backend Calls KBZPay API

```
Backend generates:
  - timestamp (Unix seconds)
  - nonce_str (random 32 chars)
  - signature (SHA256 hash)
  ↓
POST https://api.kbzpay.com/uat/precreate
{
  Request: {
    timestamp: "1234567890",
    notify_url: "https://backend.com/kbzpay-callback",
    method: "kbz.payment.precreate",
    nonce_str: "abc123...",
    sign_type: "SHA256",
    version: "1.0",
    biz_content: {
      appid: "...",
      merch_code: "...",
      merch_order_id: "ORDER_...",
      trade_type: "PWAAPP",
      total_amount: "13000",
      trans_currency: "MMK",
      timeout_express: "120m",
      title: "Book Title",
      callback_info: "..."
    },
    sign: "GENERATED_SIGNATURE"
  }
}
```

**Key Points:**
- Signature is generated using app key (never sent in request)
- KBZPay verifies signature on their end
- IP whitelisting required for API access

### 4. KBZPay Returns Payment URL

```
KBZPay API responds:
{
  Response: {
    result: "SUCCESS",
    prepay_id: "prepay-id-123",
    merch_order_id: "ORDER_...",
    ...
  }
}
  ↓
Backend updates order:
  - Stores prepay_id
  - Stores KBZPay response
  ↓
Backend generates PWA payment URL:
  https://static.kbzpay.com/pgw/uat/pwa/#/?appid=...&prepay_id=...&sign=...
  ↓
Backend returns to frontend:
{
  success: true,
  paymentUrl: "...",
  orderId: "...",
  merchantOrderId: "..."
}
```

**Key Points:**
- Payment URL includes signed parameters
- User will be redirected to this URL
- Order is still 'pending' at this point

### 5. User Completes Payment (KBZPay PWA)

```
User is redirected to KBZPay PWA
  ↓
User enters payment details
  ↓
User confirms payment
  ↓
KBZPay processes payment
  ↓
KBZPay redirects user back (optional)
  ↓
KBZPay sends webhook to backend:
  POST /kbzpay-callback
  {
    Request: {
      merch_order_id: "ORDER_...",
      trade_status: "PAY_SUCCESS",
      total_amount: "13000",
      mm_order_id: "kbz-order-id",
      ...
    }
  }
```

**Key Points:**
- Payment happens on KBZPay's secure platform
- Backend receives webhook (most reliable)
- Webhook signature is verified

### 6. Backend Processes Webhook

```
Backend receives webhook
  ↓
Verifies signature:
  - Extracts received signature
  - Generates expected signature
  - Compares (must match)
  ↓
If signature valid:
  - Finds order by merchant_order_id
  - Updates order status:
    - PAY_SUCCESS → 'completed'
    - PAY_FAILED → 'failed'
    - ORDER_EXPIRED → 'expired'
    - ORDER_CLOSED → 'cancelled'
  ↓
If payment successful:
  - Creates purchase records in Supabase
  - One purchase per book in order
  ↓
Returns "success" to KBZPay
```

**Key Points:**
- Webhook signature verification is critical for security
- Purchases are created automatically on successful payment
- Returns plain text "success" to acknowledge receipt

### 7. Frontend Verifies Payment (Optional)

```
User is redirected to success page
  ↓
Frontend calls:
  POST /verify-payment
  {
    merchantOrderId: "ORDER_..."
  }
  ↓
Backend queries KBZPay:
  - Calls queryorder API
  - Gets latest payment status
  ↓
Backend updates database if status changed
  ↓
Returns status to frontend:
  {
    status: "completed",
    paidAt: "...",
    ...
  }
```

**Key Points:**
- This is a backup verification method
- Webhook is the primary source of truth
- Used to verify payment if webhook was missed

## Status States

### Order Status (`kbzpay_orders.status`)

- **pending**: Order created, waiting for payment
- **completed**: Payment successful, purchases created
- **failed**: Payment failed
- **expired**: Order expired (timeout)
- **cancelled**: Order cancelled
- **completed_with_errors**: Payment succeeded but purchase creation failed

### Trade Status (KBZPay)

- **WAIT_PAY**: Waiting for payment
- **PAYING**: Payment in progress
- **PAY_SUCCESS**: Payment successful
- **PAY_FAILED**: Payment failed
- **ORDER_EXPIRED**: Order expired
- **ORDER_CLOSED**: Order closed

## Error Handling

### Frontend Errors

- **Network errors**: Retry with exponential backoff
- **Validation errors**: Show user-friendly messages
- **Payment failures**: Allow retry with new order

### Backend Errors

- **KBZPay API errors**: Log and return error to frontend
- **Database errors**: Log and return 500 error
- **Webhook errors**: Log but return "success" to prevent retries

### Webhook Retries

- KBZPay will retry webhooks if they don't receive "success"
- Always return "success" even if processing fails (log error instead)
- Use database to prevent duplicate processing

## Security Considerations

1. **Never expose KBZPay credentials** to frontend
2. **Always verify webhook signatures** before processing
3. **Validate all input** on backend
4. **Use service role key** only in backend (never in frontend)
5. **HTTPS required** in production
6. **IP whitelisting** required for KBZPay API access
7. **Idempotency**: Handle duplicate webhooks gracefully

## Testing

### UAT Testing

1. Use KBZPay UAT credentials
2. Test with small amounts
3. Verify webhooks are received
4. Check database records are correct

### Production Testing

1. Verify IP whitelisting
2. Test with real payment (refund after)
3. Monitor webhook delivery
4. Verify purchase records are created

## Troubleshooting

### Payment URL not working

- Check PWA URL is correct
- Verify signature in URL parameters
- Check KBZPay environment (UAT vs PROD)

### Webhook not received

- Check callback URL is accessible
- Verify IP whitelisting
- Check KBZPay merchant settings
- Monitor backend logs

### Order stuck in pending

- Verify payment was actually made
- Check KBZPay merchant dashboard
- Use verify-payment endpoint to query status
- Check webhook logs for errors

