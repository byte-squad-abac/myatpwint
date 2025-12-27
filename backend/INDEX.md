# KBZPay Payment Backend - Quick Reference

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.ts                 # Express server entry point
│   ├── controllers/
│   │   └── payment.controller.ts # Payment endpoints logic
│   ├── services/
│   │   ├── kbzpay.service.ts     # KBZPay API integration
│   │   └── supabase.service.ts   # Supabase database operations
│   ├── routes/
│   │   └── payment.routes.ts     # Route definitions
│   └── middleware/
│       └── errorHandler.ts       # Error handling middleware
├── dist/                         # Compiled JavaScript (generated)
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── ecosystem.config.js           # PM2 configuration
├── .env.example                  # Environment variables template
├── README.md                     # Main documentation
├── DATABASE_SCHEMA.md           # Database schema documentation
├── FRONTEND_INTEGRATION.md      # Frontend integration guide
└── PAYMENT_FLOW.md              # Payment flow explanation
```

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp env.example.txt .env
   # Edit .env with your credentials
   ```

3. **Build**
   ```bash
   npm run build
   ```

4. **Run**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create-payment` | Create KBZPay payment order |
| POST | `/verify-payment` | Verify payment status |
| POST | `/kbzpay-callback` | KBZPay webhook endpoint |
| GET | `/health` | Health check |

## 🔑 Environment Variables

See `env.example.txt` for all required environment variables.

**Critical Variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret!)
- `KBZPAY_APP_ID` - KBZPay App ID
- `KBZPAY_MERCHANT_CODE` - KBZPay Merchant Code
- `KBZPAY_APP_KEY` - KBZPay App Key (keep secret!)
- `KBZPAY_NOTIFY_URL` - Webhook callback URL (must be accessible)

## 📚 Documentation

- **[README.md](README.md)** - Complete setup and deployment guide
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Database table schemas
- **[FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md)** - How to integrate with Next.js frontend
- **[PAYMENT_FLOW.md](PAYMENT_FLOW.md)** - Detailed payment flow explanation

## 🔒 Security Checklist

- [ ] Use HTTPS in production
- [ ] Never expose KBZPay credentials to frontend
- [ ] Keep service role key secure
- [ ] Configure CORS properly
- [ ] Validate all incoming requests
- [ ] Verify webhook signatures
- [ ] Set up IP whitelisting with KBZPay
- [ ] Use environment variables for all secrets
- [ ] Enable Helmet security headers
- [ ] Log errors but don't expose sensitive data

## 🚢 Deployment

1. **DigitalOcean Droplet**
   - Ubuntu 22.04 LTS
   - Reserve static IPv4 address
   - Install Node.js 18+

2. **Setup Application**
   ```bash
   git clone <repo>
   cd backend
   npm install
   npm run build
   ```

3. **Configure PM2**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Setup Nginx** (see README.md for details)

5. **SSL Certificate**
   ```bash
   certbot --nginx -d your-domain.com
   ```

6. **IP Whitelisting**
   - Get your droplet's public IPv4
   - Contact KBZPay support to whitelist IP

## 🐛 Troubleshooting

### Server won't start
- Check environment variables are set
- Verify Node.js version (18+)
- Check port is not in use

### KBZPay API errors
- Verify credentials in .env
- Check IP whitelisting status
- Verify base URL (UAT vs PROD)

### Webhook not received
- Check callback URL is accessible
- Verify HTTPS is enabled
- Check KBZPay merchant settings
- Monitor backend logs

### Database errors
- Verify Supabase URL and service role key
- Check table schemas match documentation
- Verify foreign key constraints

## 📞 Support

For issues:
1. Check documentation files
2. Review error logs: `pm2 logs kbzpay-backend`
3. Verify environment configuration
4. Check KBZPay merchant dashboard

## 📝 Notes

- Backend uses TypeScript for type safety
- PM2 handles process management in production
- All secrets must be in environment variables
- Service role key bypasses RLS (intentional for backend operations)

