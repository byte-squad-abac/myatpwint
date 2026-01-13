# Database Schema for KBZPay Payment Backend

This document describes the required Supabase table schemas for the KBZPay payment backend.

## Tables

### 1. `kbzpay_orders`

Stores KBZPay payment orders.

```sql
CREATE TABLE kbzpay_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_order_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_ids TEXT[] NOT NULL,
  amounts NUMERIC[] NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MMK',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  prepay_id VARCHAR(255),
  kbz_order_id VARCHAR(255),
  paid_amount NUMERIC,
  paid_at TIMESTAMPTZ,
  error_code VARCHAR(50),
  error_message TEXT,
  kbzpay_response JSONB,
  webhook_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_kbzpay_orders_user_id ON kbzpay_orders(user_id);
CREATE INDEX idx_kbzpay_orders_merchant_order_id ON kbzpay_orders(merchant_order_id);
CREATE INDEX idx_kbzpay_orders_status ON kbzpay_orders(status);
CREATE INDEX idx_kbzpay_orders_created_at ON kbzpay_orders(created_at DESC);
```

**Status Values:**
- `pending` - Order created, waiting for payment
- `completed` - Payment successful
- `failed` - Payment failed
- `expired` - Order expired
- `cancelled` - Order cancelled
- `completed_with_errors` - Payment succeeded but purchase creation failed

### 2. `purchases`

Stores user purchases (books).

```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MMK',
  payment_method VARCHAR(50) NOT NULL,
  payment_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  quantity INTEGER DEFAULT 1,
  delivery_type VARCHAR(20) DEFAULT 'digital',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_book_id ON purchases(book_id);
CREATE INDEX idx_purchases_payment_id ON purchases(payment_id);
CREATE INDEX idx_purchases_purchased_at ON purchases(purchased_at DESC);

-- Unique constraint to prevent duplicate purchases
CREATE UNIQUE INDEX idx_purchases_user_book_unique ON purchases(user_id, book_id) 
WHERE payment_method = 'kbzpay' AND status = 'completed';
```

**Payment Method Values:**
- `kbzpay` - KBZPay payment
- `mpu` - MPU payment

**Delivery Type Values:**
- `digital` - Digital book
- `physical` - Physical book

### 3. `books`

Reference table for books (should already exist).

```sql
-- Assuming this table already exists, but here's a reference structure:
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  price NUMERIC NOT NULL,
  -- ... other book fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Row Level Security (RLS) Policies

The backend uses the service role key, which bypasses RLS. However, you should still set up RLS policies for frontend access:

### `kbzpay_orders` RLS Policies

```sql
-- Enable RLS
ALTER TABLE kbzpay_orders ENABLE ROW LEVEL SECURITY;

-- Users can only view their own orders
CREATE POLICY "Users can view their own orders"
  ON kbzpay_orders
  FOR SELECT
  USING (auth.uid() = user_id);
```

### `purchases` RLS Policies

```sql
-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Users can only view their own purchases
CREATE POLICY "Users can view their own purchases"
  ON purchases
  FOR SELECT
  USING (auth.uid() = user_id);
```

## Sample Data

### Sample Order

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "merchant_order_id": "ORDER_1704067200000_abc12345",
  "user_id": "user-uuid-here",
  "book_ids": ["book-id-1", "book-id-2"],
  "amounts": [5000, 8000],
  "total_amount": 13000,
  "currency": "MMK",
  "status": "completed",
  "prepay_id": "prepay-id-from-kbzpay",
  "kbz_order_id": "kbz-order-id",
  "paid_amount": 13000,
  "paid_at": "2024-01-01T12:00:00.000Z",
  "created_at": "2024-01-01T11:55:00.000Z",
  "updated_at": "2024-01-01T12:00:00.000Z"
}
```

## Migration Script

If you're using Supabase migrations, create a new migration file:

```sql
-- migrations/YYYYMMDDHHMMSS_create_kbzpay_orders.sql

-- Create kbzpay_orders table (if not exists)
CREATE TABLE IF NOT EXISTS kbzpay_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_order_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_ids TEXT[] NOT NULL,
  amounts NUMERIC[] NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MMK',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  prepay_id VARCHAR(255),
  kbz_order_id VARCHAR(255),
  paid_amount NUMERIC,
  paid_at TIMESTAMPTZ,
  error_code VARCHAR(50),
  error_message TEXT,
  kbzpay_response JSONB,
  webhook_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kbzpay_orders_user_id ON kbzpay_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_kbzpay_orders_merchant_order_id ON kbzpay_orders(merchant_order_id);
CREATE INDEX IF NOT EXISTS idx_kbzpay_orders_status ON kbzpay_orders(status);
CREATE INDEX IF NOT EXISTS idx_kbzpay_orders_created_at ON kbzpay_orders(created_at DESC);

-- Enable RLS
ALTER TABLE kbzpay_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view their own orders"
  ON kbzpay_orders
  FOR SELECT
  USING (auth.uid() = user_id);
```

## Notes

1. **Service Role Key**: The backend uses the service role key, which bypasses RLS. This is intentional as the backend needs to perform admin operations.

2. **Arrays**: PostgreSQL arrays (`TEXT[]`, `NUMERIC[]`) are used for `book_ids` and `amounts` to store multiple items in a single order.

3. **JSONB**: `kbzpay_response` and `webhook_data` use JSONB for flexible storage of KBZPay API responses.

4. **Timestamps**: All timestamps use `TIMESTAMPTZ` (timestamp with timezone) for proper timezone handling.

5. **Foreign Keys**: `user_id` references `auth.users(id)` to ensure referential integrity. Consider adding foreign key constraints for `book_id` if needed.

