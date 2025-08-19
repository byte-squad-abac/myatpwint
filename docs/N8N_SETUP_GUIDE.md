# 🚀 N8N Setup Guide for Myat Pwint Publishing House

## Overview

This guide walks you through setting up N8N workflow automation for the Myanmar publishing platform, including marketing automation and revenue analytics.

## 🛠️ Prerequisites

- Docker installed on your system
- Supabase project configured
- Stripe account with API keys
- Google Gemini API key
- SMTP email credentials

## 📦 1. N8N Installation

### Option A: Docker (Recommended)

```bash
# Create N8N directory
mkdir n8n-myatpwint
cd n8n-myatpwint

# Create environment file
cat > .env << EOF
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=myatpwint2024!

# Database connection to Supabase
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=your-supabase-host.supabase.co
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=postgres
DB_POSTGRESDB_USER=postgres
DB_POSTGRESDB_PASSWORD=your-supabase-password
DB_POSTGRESDB_SCHEMA=public

# Webhook URLs
WEBHOOK_URL=http://localhost:5678

# External API credentials
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
DASHBOARD_API_KEY=your-dashboard-api-key

# Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=${N8N_PORT}
      - N8N_PROTOCOL=${N8N_PROTOCOL}
      - N8N_BASIC_AUTH_ACTIVE=${N8N_BASIC_AUTH_ACTIVE}
      - N8N_BASIC_AUTH_USER=${N8N_BASIC_AUTH_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_BASIC_AUTH_PASSWORD}
      - DB_TYPE=${DB_TYPE}
      - DB_POSTGRESDB_HOST=${DB_POSTGRESDB_HOST}
      - DB_POSTGRESDB_PORT=${DB_POSTGRESDB_PORT}
      - DB_POSTGRESDB_DATABASE=${DB_POSTGRESDB_DATABASE}
      - DB_POSTGRESDB_USER=${DB_POSTGRESDB_USER}
      - DB_POSTGRESDB_PASSWORD=${DB_POSTGRESDB_PASSWORD}
      - DB_POSTGRESDB_SCHEMA=${DB_POSTGRESDB_SCHEMA}
      - WEBHOOK_URL=${WEBHOOK_URL}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - DASHBOARD_API_KEY=${DASHBOARD_API_KEY}
      - EMAIL_HOST=${EMAIL_HOST}
      - EMAIL_PORT=${EMAIL_PORT}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASSWORD=${EMAIL_PASSWORD}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  n8n_data:
  redis_data:
EOF

# Start N8N
docker-compose up -d
```

### Option B: NPM Installation

```bash
npm install -g n8n
n8n start --tunnel
```

## 🔑 2. Configure Credentials

Access N8N at `http://localhost:5678` and configure these credentials:

### Google Gemini API
1. Go to Credentials → Add Credential
2. Select "Google Gemini"
3. Enter your Gemini API Key
4. Test the connection

### Supabase
1. Add "Supabase" credential
2. Enter:
   - Host: `your-project.supabase.co`
   - Database: `postgres`
   - User: `postgres`
   - Password: Your project password
   - Service Role Key: For API access

### Stripe
1. Add "Stripe" credential
2. Enter:
   - Secret Key: `sk_test_...` or `sk_live_...`
   - Webhook Secret: `whsec_...`

### Email (SMTP)
1. Add "SMTP" credential
2. Configure Gmail App Password:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: Your Gmail address
   - Password: App-specific password

## 📋 3. Import Workflows

### Marketing Automation Workflow
```bash
# Copy the workflow JSON
cp n8n-workflows/marketing_automation_workflow.json ./workflows/

# Import via N8N UI:
# 1. Go to Workflows
# 2. Click "Import"
# 3. Upload marketing_automation_workflow.json
# 4. Configure credentials
# 5. Activate workflow
```

### Revenue Analytics Workflow
```bash
# Copy the workflow JSON
cp n8n-workflows/revenue_analytics_workflow.json ./workflows/

# Import via N8N UI:
# 1. Go to Workflows
# 2. Click "Import" 
# 3. Upload revenue_analytics_workflow.json
# 4. Configure credentials
# 5. Activate workflow
```

## 🗄️ 4. Database Setup

Run the database migrations:

```sql
-- In your Supabase SQL editor
\i 'supabase/migrations/002_n8n_analytics_schema_fixed.sql'
```

## ⚙️ 5. Application Integration

Update your Next.js app environment variables:

```env
# .env.local
N8N_WEBHOOK_URL=http://localhost:5678/webhook/book-published
N8N_STRIPE_WEBHOOK_URL=http://localhost:5678/webhook/stripe-revenue
DASHBOARD_API_KEY=your-secure-dashboard-key
```

## 🔗 6. Webhook Configuration

### Stripe Webhooks
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/n8n/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`

### Book Publishing Integration
Add to your book publishing flow:

```typescript
// When a book is published
const triggerMarketing = async (bookData: Book) => {
  await fetch('/api/n8n/book-published', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookData)
  });
};
```

## 📊 7. Testing the Workflows

### Test Marketing Automation
```bash
curl -X POST http://localhost:3000/api/n8n/book-published \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-book-123",
    "name": "Test Myanmar Book",
    "author": "Test Author",
    "description": "A test book for workflow validation",
    "category": "Fiction",
    "price": 15000,
    "language": "myanmar"
  }'
```

### Test Revenue Analytics
Use Stripe CLI to trigger test events:
```bash
stripe trigger checkout.session.completed
```

## 🔧 8. Monitoring and Debugging

### N8N Execution Logs
- Go to Executions in N8N UI
- Check for failed workflows
- Review error messages

### Database Monitoring
```sql
-- Check workflow logs
SELECT * FROM n8n_workflow_logs ORDER BY created_at DESC LIMIT 10;

-- Check marketing campaigns
SELECT * FROM marketing_campaigns ORDER BY created_at DESC LIMIT 5;

-- Check revenue analytics
SELECT * FROM revenue_analytics ORDER BY created_at DESC LIMIT 5;
```

### Application Logs
```bash
# Check Next.js logs
npm run dev

# Check N8N logs
docker-compose logs -f n8n
```

## 🚨 9. Troubleshooting

### Common Issues

**N8N Can't Connect to Supabase**
- Check database credentials
- Verify network connectivity
- Ensure Supabase allows connections from your IP

**Gemini API Errors**
- Verify API key is correct
- Check API quota limits
- Ensure model name is correct (`gemini-1.5-flash`)

**Email Not Sending**
- Use Gmail App Password, not account password
- Enable 2FA on Gmail account
- Check SMTP settings

**Webhooks Not Triggering**
- Verify webhook URLs are accessible
- Check firewall settings
- Use ngrok for local development:
  ```bash
  ngrok http 3000
  ```

### Debug Mode
Enable verbose logging:
```env
N8N_LOG_LEVEL=debug
```

## 🎯 10. Production Deployment

### Environment Variables
```env
# Production settings
N8N_HOST=n8n.yourdomain.com
N8N_PROTOCOL=https
N8N_BASIC_AUTH_ACTIVE=false  # Use proper authentication
WEBHOOK_URL=https://n8n.yourdomain.com

# Use production credentials
SUPABASE_URL=https://your-prod-project.supabase.co
STRIPE_WEBHOOK_SECRET=whsec_prod_webhook_secret
```

### SSL Configuration
Set up SSL certificates for N8N:
```yaml
# docker-compose.prod.yml
services:
  n8n:
    # ... existing config
    environment:
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.yourdomain.com
```

## 📈 11. Performance Optimization

### Redis Configuration
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Workflow Optimization
- Use error handling in all nodes
- Set appropriate timeouts
- Batch database operations
- Use caching for frequently accessed data

## 🎉 Success Indicators

After setup, you should see:

✅ **Marketing Automation**
- AI-generated social media posts
- Automated email campaigns
- Updated book recommendations
- Marketing campaign tracking

✅ **Revenue Analytics**
- Real-time payment processing
- Automated royalty calculations
- Daily analytics updates
- Dashboard notifications

✅ **Monitoring**
- Workflow execution logs
- Error tracking
- Performance metrics
- Database growth

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review N8N documentation: https://docs.n8n.io
3. Check workflow execution logs
4. Verify all credentials are correct

---

**🎯 You're now ready to automate your publishing workflows with N8N!**