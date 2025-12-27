# KBZPay Payment Backend

A minimal Node.js (Express) payment backend for KBZPay integration. This backend handles all KBZPay communication and must be deployed on a server with a fixed public IPv4 address (e.g., DigitalOcean) for IP whitelisting.

## Architecture

```
Frontend (Next.js on Vercel)
    ↓
Payment Backend (Express on DigitalOcean - Fixed IP)
    ↓
KBZPay API (UAT/Production)
    ↓
Supabase (Database + Auth)
```

## Features

- ✅ Secure KBZPay payment order creation
- ✅ Payment status verification
- ✅ Webhook callback handling
- ✅ Supabase integration with service role key
- ✅ Request validation
- ✅ Error handling
- ✅ CORS configuration
- ✅ Security headers (Helmet)

## Prerequisites

- Node.js 18+ and npm
- Supabase project with service role key
- KBZPay merchant credentials (App ID, Merchant Code, App Key)
- DigitalOcean droplet or similar with fixed IPv4

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# KBZPay Configuration (UAT Environment)
KBZPAY_APP_ID=your_kbzpay_app_id
KBZPAY_MERCHANT_CODE=your_kbzpay_merchant_code
KBZPAY_APP_KEY=your_kbzpay_app_key
KBZPAY_BASE_URL=https://api.kbzpay.com/uat
KBZPAY_NOTIFY_URL=https://your-backend-domain.com/kbzpay-callback

# Frontend URL (for CORS)
FRONTEND_URL=https://your-vercel-app.vercel.app

# KBZPay PWA URLs
KBZPAY_PWA_UAT_URL=https://static.kbzpay.com/pgw/uat/pwa/#/
KBZPAY_PWA_PROD_URL=https://static.kbzpay.com/pgw/pwa/#/
```

### 3. Build

```bash
npm run build
```

### 4. Run

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### POST /create-payment

Creates a KBZPay payment order.

**Request Body:**
```json
{
  "userId": "user-uuid",
  "bookIds": ["book-id-1", "book-id-2"],
  "amounts": [5000, 8000]
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order-uuid",
  "merchantOrderId": "ORDER_1234567890_abc123",
  "prepayId": "prepay-id-from-kbzpay",
  "paymentUrl": "https://static.kbzpay.com/pgw/uat/pwa/#/?...",
  "totalAmount": 13000,
  "currency": "MMK"
}
```

### POST /verify-payment

Verifies payment status with KBZPay.

**Request Body:**
```json
{
  "merchantOrderId": "ORDER_1234567890_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "status": "completed",
  "orderId": "order-uuid",
  "merchantOrderId": "ORDER_1234567890_abc123",
  "paidAt": "2024-01-01T12:00:00.000Z",
  "kbzOrderId": "kbz-order-id",
  "tradeStatus": "PAY_SUCCESS"
}
```

### POST /kbzpay-callback

Receives webhook callbacks from KBZPay. This endpoint is called by KBZPay server.

**Note:** Must return plain text "success" to acknowledge receipt.

## Database Schema

See `DATABASE_SCHEMA.md` for the required Supabase table schemas.

## Deployment to DigitalOcean

### 1. Create Droplet

- Choose Ubuntu 22.04 LTS
- Select a plan (Basic plan is sufficient for development)
- Choose a datacenter region
- **Important:** Reserve/assign a static IP address

### 2. SSH into Droplet

```bash
ssh root@your-droplet-ip
```

### 3. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 4. Clone and Setup Project

```bash
# Clone your repository
git clone <your-repo-url>
cd myatpwint/backend

# Install dependencies
npm install

# Create .env file
nano .env
# Paste your environment variables

# Build
npm run build
```

### 5. Setup PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start dist/server.js --name kbzpay-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 6. Setup Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/kbzpay-backend
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-backend-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/kbzpay-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-backend-domain.com
```

### 8. Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## IP Whitelisting with KBZPay

1. Get your DigitalOcean droplet's public IPv4 address
2. Contact KBZPay support to whitelist your IP address
3. Provide them with:
   - Your public IPv4 address
   - Merchant Code
   - Integration purpose (payment processing)

## Frontend Integration

Update your Next.js frontend to call the backend API:

```typescript
// Example: src/lib/services/payment.service.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_PAYMENT_BACKEND_URL || 'https://your-backend-domain.com';

export async function createKBZPayPayment(userId: string, bookIds: string[], amounts: number[]) {
  const response = await fetch(`${BACKEND_URL}/create-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      bookIds,
      amounts,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment');
  }

  return response.json();
}
```

See `FRONTEND_INTEGRATION.md` for more details.

## Monitoring

### Check PM2 Status

```bash
pm2 status
pm2 logs kbzpay-backend
```

### Restart Application

```bash
pm2 restart kbzpay-backend
```

## Security Considerations

1. **Never expose KBZPay credentials to the frontend**
2. **Use environment variables for all secrets**
3. **Keep service role key secure** (only use in backend)
4. **Enable HTTPS** in production
5. **Configure CORS** properly (restrict to your frontend URL)
6. **Use Helmet** for security headers
7. **Validate all incoming requests**
8. **Log errors** for debugging (but don't expose sensitive data)

## Troubleshooting

### Backend not accessible

- Check if the server is running: `pm2 status`
- Check firewall rules: `sudo ufw status`
- Check Nginx status: `sudo systemctl status nginx`
- Check application logs: `pm2 logs kbzpay-backend`

### KBZPay API errors

- Verify environment variables are set correctly
- Check KBZPay credentials
- Verify IP whitelisting status with KBZPay support
- Check KBZPay API documentation for error codes

### Database errors

- Verify Supabase URL and service role key
- Check Supabase project status
- Verify table schemas match expected structure

## License

ISC

