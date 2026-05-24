# Backend deployment guide (KBZPay + Supabase)

Express payment service for **Myat Pwint**. Handles KBZPay API calls, stores orders in **Supabase**, and creates **`purchases`** rows when payment succeeds.

> **Choose one payment path for production**
>
> | Path | Where checkout runs | Orders DB | Library access after pay |
> |------|---------------------|-----------|---------------------------|
> | **A — This backend** | Frontend → `POST /create-payment` on this server | Supabase `orders` | Yes — webhook creates `purchases` |
> | **B — Next.js only** | `src/app/api/kbzpay/*` on Vercel | Firebase Firestore | **No** — webhook does not create `purchases` yet |
>
> The shop UI today uses **Path B** (Firebase cart). To use this backend, wire the cart to `FRONTEND_INTEGRATION.md` and set `NEXT_PUBLIC_PAYMENT_BACKEND_URL`. Do **not** point KBZPay at both webhooks.

---

## What this backend does

```
Frontend (Next.js)
  POST /create-payment     → Supabase order (pending) + KBZPay precreate → paymentUrl
  User pays on KBZPay PWA
  KBZPay POST /kbzpay-callback → verify signature → order completed → purchases inserted
  POST /verify-payment     → poll KBZPay + sync order status (optional)
```

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Liveness |
| `/api/health` | GET | Service info |
| `/create-payment` | POST | Start payment (`userId`, `bookIds`, `amounts`) |
| `/verify-payment` | POST | Check status (`merchantOrderId`) |
| `/kbzpay-callback` | POST | KBZPay webhook (**set `KBZPAY_NOTIFY_URL` to this**) |

**Source layout**

| File | Role |
|------|------|
| `src/server.ts` | Express app, CORS, routes |
| `src/routes/payment.routes.ts` | Route definitions |
| `src/controllers/payment.controller.ts` | Create / verify / webhook logic |
| `src/services/kbzpay.service.ts` | KBZPay signing & API |
| `src/services/supabase.service.ts` | Orders & purchases in Supabase |

More detail: `PAYMENT_FLOW.md`, `FRONTEND_INTEGRATION.md`, `DATABASE_SCHEMA.md`.

---

## Left to do

### Before first real payment (this backend path)

- [ ] KBZPay merchant credentials (UAT, then production)
- [ ] Supabase project + `orders` / `purchases` tables (see `DATABASE_SCHEMA.md`)
- [ ] Fill `backend/.env` from `env.example.txt`
- [ ] Deploy server with **HTTPS** (KBZPay requires public notify URL)
- [ ] Set `KBZPAY_NOTIFY_URL=https://<your-api-domain>/kbzpay-callback` in KBZPay portal
- [ ] Set `FRONTEND_URL` to your Vercel app (CORS)
- [ ] Frontend: `NEXT_PUBLIC_PAYMENT_BACKEND_URL` + cart calls `/create-payment` with **Supabase user UUID** (not Firebase UID unless you bridge IDs)
- [ ] End-to-end UAT test: pay → webhook → `orders.status = completed` → rows in `purchases` → user can read in library

### If you keep Next.js-only payments (current cart)

- [ ] Either migrate cart to this backend **or** add Supabase `purchases` creation to `src/app/api/kbzpay/webhook/route.ts`
- [ ] Do not register two different `KBZPAY_NOTIFY_URL` values for the same merchant

### Production hardening

- [ ] Switch `KBZPAY_BASE_URL` and PWA URL to production (confirm URLs with KBZPay)
- [ ] `NODE_ENV=production`, restrict CORS (`FRONTEND_URL` only)
- [ ] Nginx/reverse proxy + TLS in front of Node
- [ ] PM2 logs rotation, monitoring, firewall (only 80/443 public)
- [ ] Never commit `.env` or service keys

---

## Environment variables

Copy `env.example.txt` → `backend/.env` and fill values.

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Default `3001` |
| `NODE_ENV` | Yes | `production` on server |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; never expose to browser |
| `KBZPAY_APP_ID` | Yes | From KBZPay merchant portal |
| `KBZPAY_MERCHANT_CODE` | Yes | From KBZPay merchant portal |
| `KBZPAY_APP_KEY` | Yes | Signing secret |
| `KBZPAY_BASE_URL` | Yes | UAT: `https://api.kbzpay.com/uat` — confirm prod URL with KBZPay |
| `KBZPAY_NOTIFY_URL` | Yes | **Must be** `https://<api-domain>/kbzpay-callback` |
| `FRONTEND_URL` | Yes | Next.js origin for CORS, e.g. `https://myatpwint.com` |
| `KBZPAY_PWA_UAT_URL` | Yes* | `https://static.kbzpay.com/pgw/uat/pwa/#/` |
| `KBZPAY_PWA_PROD_URL` | Yes* | `https://static.kbzpay.com/pgw/pwa/#/` |

\*Required by `kbzpay.service.ts` at startup.

### Example `.env` (UAT)

```env
PORT=3001
NODE_ENV=production

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

KBZPAY_APP_ID=your_app_id
KBZPAY_MERCHANT_CODE=your_merchant_code
KBZPAY_APP_KEY=your_app_key
KBZPAY_BASE_URL=https://api.kbzpay.com/uat
KBZPAY_NOTIFY_URL=https://api.myatpwint.com/kbzpay-callback

FRONTEND_URL=https://myatpwint.com

KBZPAY_PWA_UAT_URL=https://static.kbzpay.com/pgw/uat/pwa/#/
KBZPAY_PWA_PROD_URL=https://static.kbzpay.com/pgw/pwa/#/
```

### Frontend (Vercel) when using this backend

Add to Next.js `.env.local` / Vercel:

```env
NEXT_PUBLIC_PAYMENT_BACKEND_URL=https://api.myatpwint.com
```

See `FRONTEND_INTEGRATION.md` for the payment service example.

### Next.js-only KBZPay (if you do **not** use this backend)

Set on Vercel instead (see repo root `.env.example`):

- `KBZPAY_*`, `FIREBASE_ADMIN_*`, `KBZPAY_NOTIFY_URL=https://<vercel-domain>/api/kbzpay/webhook`

---

## Local development

```bash
cd backend
cp env.example.txt .env
# edit .env with real UAT credentials

npm install
npm run dev          # http://localhost:3001
```

Expose webhook for KBZPay UAT:

```bash
ngrok http 3001
# set KBZPAY_NOTIFY_URL=https://<id>.ngrok.io/kbzpay-callback
# restart backend after changing .env
```

Health check:

```bash
curl http://localhost:3001/api/health
```

---

## Deploy on DigitalOcean (or any VPS)

### 1. Server prep

```bash
# on server
sudo apt update && sudo apt install -y nodejs npm git
sudo npm install -g pm2
```

### 2. Clone and build

```bash
cd /var/myatpwint/backend
git pull
npm install
npm run build
```

### 3. Environment

**Option A — `.env` file (simple)**

```bash
nano .env
chmod 600 .env
```

**Option B — system env / PM2** — export vars in shell or `ecosystem.config.js` `env` block.

### 4. PM2

```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Reverse proxy (Nginx)

Point `https://api.myatpwint.com` → `http://127.0.0.1:3001`. KBZPay **must** hit HTTPS.

Example location block:

```nginx
location / {
  proxy_pass http://127.0.0.1:3001;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 6. KBZPay merchant portal

1. **Notify URL** = `KBZPAY_NOTIFY_URL` (this server’s `/kbzpay-callback`)
2. **Return URL** = your Next.js success page, e.g. `https://myatpwint.com/checkout/success`
3. Whitelist domains if required

### 7. Verify

```bash
pm2 logs kbzpay-backend
curl https://api.myatpwint.com/api/health
```

---

## Verify environment variables

```bash
cd /var/myatpwint/backend
node -e "
require('dotenv').config();
const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'KBZPAY_APP_ID',
  'KBZPAY_MERCHANT_CODE',
  'KBZPAY_APP_KEY',
  'KBZPAY_BASE_URL',
  'KBZPAY_NOTIFY_URL',
  'KBZPAY_PWA_UAT_URL',
  'KBZPAY_PWA_PROD_URL',
];
const missing = required.filter(v => !process.env[v]);
if (missing.length) console.log('Missing:', missing.join(', '));
else console.log('All required variables are set!');
"
```

---

## Troubleshooting

### `Missing required KBZPay configuration`

Env vars not loaded at startup.

- Confirm `backend/.env` exists and `dotenv` runs (`src/server.ts`)
- After editing `.env`: `pm2 restart kbzpay-backend`
- For system env: `echo $KBZPAY_APP_ID` in the same shell PM2 uses

### Webhook never updates order

- `KBZPAY_NOTIFY_URL` must match the URL KBZPay calls (path `/kbzpay-callback`)
- URL must be **public HTTPS** (not `localhost`)
- Check `pm2 logs` for `Invalid webhook signature` or `Order not found`
- Firewall must allow KBZPay IPs if you use IP allowlists

### Payment succeeds but library empty

- Confirm `purchases` rows in Supabase after webhook
- `userId` in `/create-payment` must be the **Supabase auth user UUID** used by library RLS
- Book IDs must exist in Supabase `books` table

### CORS errors from frontend

- Set `FRONTEND_URL` exactly to the browser origin (scheme + host, no trailing slash mismatch)
- Restart backend after change

### `Invalid user ID format` on create-payment

Backend expects a UUID (`userId`). Firebase UIDs are not UUIDs — bridge accounts or use Supabase Auth for checkout.

---

## UAT → production checklist

| Step | UAT | Production |
|------|-----|------------|
| KBZPay keys | UAT credentials | Production credentials from KBZPay |
| `KBZPAY_BASE_URL` | `https://api.kbzpay.com/uat` | Confirm with KBZPay support |
| PWA redirect | `KBZPAY_PWA_UAT_URL` | `NODE_ENV=production` uses `KBZPAY_PWA_PROD_URL` |
| Notify URL | ngrok or staging API | `https://api.<domain>/kbzpay-callback` |
| Supabase | Same or separate prod project | Service role key on server only |

---

## Security

- Never commit `.env` (listed in `backend/.gitignore`)
- `chmod 600 .env`
- Use **service role** key only on this server, never in Next.js `NEXT_PUBLIC_*`
- Rotate `KBZPAY_APP_KEY` if leaked
- Keep Express behind TLS terminator; do not expose port 3001 publicly without a proxy

---

## Related docs

| Document | Contents |
|----------|----------|
| `env.example.txt` | Env template |
| `PAYMENT_FLOW.md` | Step-by-step payment sequence |
| `FRONTEND_INTEGRATION.md` | Next.js client for this API |
| `DATABASE_SCHEMA.md` | Supabase tables |
| `README.md` | Quick start |
| `../.env.example` | Next.js app env (Firebase + optional Next.js KBZPay) |
