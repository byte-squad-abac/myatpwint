# Deployment Guide for Digital Ocean

## Setting Up Environment Variables

The backend requires several environment variables to run. You have two options:

### Option 1: Using .env File (Recommended for Development/Testing)

1. Create a `.env` file in the `backend` directory:
   ```bash
   cd /var/myatpwint/backend
   nano .env
   ```

2. Copy all variables from `env.example.txt` and fill in your actual values:
   ```env
   PORT=3001
   NODE_ENV=production
   
   SUPABASE_URL=your_actual_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
   
   KBZPAY_APP_ID=your_actual_app_id
   KBZPAY_MERCHANT_CODE=your_actual_merchant_code
   KBZPAY_APP_KEY=your_actual_app_key
   KBZPAY_BASE_URL=https://api.kbzpay.com/uat
   KBZPAY_NOTIFY_URL=https://your-backend-domain.com/kbzpay-callback
   
   FRONTEND_URL=https://your-vercel-app.vercel.app
   
   KBZPAY_PWA_UAT_URL=https://static.kbzpay.com/pgw/uat/pwa/#/
   KBZPAY_PWA_PROD_URL=https://static.kbzpay.com/pgw/pwa/#/
   ```

3. Set proper permissions (optional but recommended):
   ```bash
   chmod 600 .env
   ```

### Option 2: Using System Environment Variables (Recommended for Production)

1. Set environment variables in your shell profile:
   ```bash
   # Edit your .bashrc or .profile
   nano ~/.bashrc
   
   # Add these lines:
   export KBZPAY_APP_ID="your_actual_app_id"
   export KBZPAY_MERCHANT_CODE="your_actual_merchant_code"
   export KBZPAY_APP_KEY="your_actual_app_key"
   export KBZPAY_BASE_URL="https://api.kbzpay.com/uat"
   export KBZPAY_NOTIFY_URL="https://your-backend-domain.com/kbzpay-callback"
   export SUPABASE_URL="your_actual_supabase_url"
   export SUPABASE_SERVICE_ROLE_KEY="your_actual_service_role_key"
   export FRONTEND_URL="https://your-vercel-app.vercel.app"
   export KBZPAY_PWA_UAT_URL="https://static.kbzpay.com/pgw/uat/pwa/#/"
   export KBZPAY_PWA_PROD_URL="https://static.kbzpay.com/pgw/pwa/#/"
   export NODE_ENV="production"
   export PORT="3001"
   
   # Reload the profile
   source ~/.bashrc
   ```

2. Or set them in PM2 ecosystem config (see `ecosystem.config.js`)

## Deployment Steps

1. **Build the application:**
   ```bash
   cd /var/myatpwint/backend
   npm install
   npm run build
   ```

2. **Verify environment variables are set:**
   ```bash
   # If using .env file, check it exists:
   ls -la .env
   
   # Test if variables are accessible:
   node -e "require('dotenv').config(); console.log('KBZPAY_APP_ID:', process.env.KBZPAY_APP_ID ? 'SET' : 'MISSING')"
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Check logs if there are errors:**
   ```bash
   pm2 logs kbzpay-backend
   ```

## Troubleshooting

### Error: "Missing required KBZPay configuration"

This means environment variables are not loaded. Check:

1. **If using .env file:**
   - Ensure `.env` file exists in `/var/myatpwint/backend/`
   - Check file permissions: `ls -la .env`
   - Verify file has correct values: `cat .env` (be careful not to expose secrets)

2. **If using system environment variables:**
   - Check if variables are set: `echo $KBZPAY_APP_ID`
   - Ensure you've reloaded your shell profile: `source ~/.bashrc`
   - PM2 might need to be restarted after setting env vars: `pm2 restart kbzpay-backend`

3. **Test environment loading:**
   ```bash
   cd /var/myatpwint/backend
   node -e "require('dotenv').config(); console.log(process.env.KBZPAY_APP_ID ? 'OK' : 'MISSING')"
   ```

### Verify All Required Variables

Run this command to check which variables are missing:
```bash
cd /var/myatpwint/backend
node -e "
require('dotenv').config();
const required = ['KBZPAY_APP_ID', 'KBZPAY_MERCHANT_CODE', 'KBZPAY_APP_KEY', 'KBZPAY_BASE_URL', 'KBZPAY_NOTIFY_URL'];
const missing = required.filter(v => !process.env[v]);
if (missing.length) {
  console.log('Missing:', missing.join(', '));
} else {
  console.log('All required variables are set!');
}
"
```

## Security Notes

- Never commit `.env` file to git
- Use strong, unique values for all secrets
- Restrict file permissions: `chmod 600 .env`
- Consider using a secrets management service for production
