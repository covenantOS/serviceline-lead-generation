# 🚀 Quick Start Guide - Autonomous Lead Generation System

Get your autonomous lead generation system running in **under 10 minutes**!

---

## ⚡ Fast Track (Docker)

The fastest way to get started:

```bash
# 1. Clone repository
git clone https://github.com/covenantOS/serviceline-lead-generation.git
cd serviceline-lead-generation

# 2. Configure environment
cp config/.env.example config/.env
nano config/.env  # Add your Supabase and email credentials

# 3. Start everything with Docker
docker-compose up -d

# 4. Check health
curl http://localhost:3000/health
```

**That's it!** System is now running autonomously. ✅

---

## 📋 Manual Setup

### Step 1: Install Prerequisites

```bash
# Install Node.js 18+
node --version  # Should be >= 18

# Install Redis
# macOS:
brew install redis && brew services start redis

# Ubuntu/Debian:
sudo apt-get install redis-server && sudo systemctl start redis

# Windows:
# Download from https://github.com/microsoftarchive/redis/releases
```

### Step 2: Install Dependencies

```bash
npm install

# Install Playwright browsers for scraping
npx playwright install chromium
```

### Step 3: Configure Environment

```bash
# Copy example config
cp config/.env.example config/.env

# Edit configuration
nano config/.env
```

**Minimum required settings:**

```env
# Enable autonomous operation
ENABLE_CRON=true

# Supabase (get from https://supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# Email service (get from https://sendgrid.com)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=leads@yourcompany.com
FROM_NAME=Your Company

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Automation
AUTO_EMAIL_THRESHOLD=80
TARGET_INDUSTRIES=HVAC,PLUMBING,ROOFING,ELECTRICAL
TARGET_LOCATIONS=Phoenix AZ,Los Angeles CA,Houston TX
```

### Step 4: Setup Database

1. Go to [Supabase](https://supabase.com) and create a project
2. Open SQL Editor
3. Copy contents of `database/schema.sql`
4. Execute the SQL script

### Step 5: Start the System

Open **two terminal windows**:

```bash
# Terminal 1: API Server (with cron jobs)
npm start

# Terminal 2: Queue Workers
npm run worker
```

### Step 6: Verify It's Working

```bash
# Check system health
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-01-29T22:00:00.000Z",
  "components": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "queues": { "status": "healthy" }
  }
}
```

---

## 🎯 What Happens Next?

Once running, the system will automatically:

### ⏰ Today
- **2:00 AM tomorrow**: First scraping job runs (25 leads per industry)
- **9:00 AM tomorrow**: Hot leads campaign checks for high-score leads
- **10:00 AM tomorrow**: Follow-up check for contacted leads

### 📊 Within 24 Hours
1. Scrapes ~100 new leads from Google Maps, Yelp, Yellow Pages
2. Scores all leads automatically (0-100 scale)
3. Sends intro emails to "Hot Leads" (score ≥80)
4. Schedules follow-up sequences (Day 3, 7, 14)

### 📈 Within 1 Week
- Daily scraping: ~700 new leads
- Auto-scoring: All leads scored
- Auto-emails: 50-100 emails sent (hot leads only)
- Follow-ups: Intelligent sequences running
- Engagement tracking: Opens/clicks monitored

---

## 🔧 Configuration Tips

### Adjust Automation Thresholds

```env
# Only email leads with score ≥ 90 (more selective)
AUTO_EMAIL_THRESHOLD=90

# Or lower to ≥ 70 (more aggressive)
AUTO_EMAIL_THRESHOLD=70
```

### Change Target Industries

```env
# Add more industries
TARGET_INDUSTRIES=HVAC,PLUMBING,ROOFING,ELECTRICAL,LANDSCAPING,PEST_CONTROL

# Or focus on one
TARGET_INDUSTRIES=HVAC
```

### Change Target Locations

```env
# Target specific cities
TARGET_LOCATIONS=New York NY,Los Angeles CA,Chicago IL,Houston TX,Phoenix AZ

# Or target states
TARGET_LOCATIONS=California,Texas,Florida
```

### Adjust Schedule

Edit `src/automation/cron-scheduler.js`:

```javascript
// Daily scraping at 2 AM
'0 2 * * *'

// Change to run at 3 AM:
'0 3 * * *'

// Run twice daily (2 AM and 2 PM):
'0 2,14 * * *'
```

---

## 📧 Setup Email Webhooks

For engagement tracking (opens, clicks):

### SendGrid

1. Go to [SendGrid Settings](https://app.sendgrid.com/settings/mail_settings)
2. Click "Event Webhook"
3. Set HTTP POST URL:
   ```
   https://your-domain.com/api/webhooks/sendgrid
   ```
4. Enable: Delivered, Opened, Clicked, Bounced, Spam Report
5. Save

### Mailgun

1. Go to [Mailgun Webhooks](https://app.mailgun.com/app/sending/domains)
2. Select your domain → Webhooks
3. Add webhook URL:
   ```
   https://your-domain.com/api/webhooks/mailgun
   ```
4. Enable: delivered, opened, clicked, bounced, complained
5. Save

> **Note**: Use ngrok for local testing: `ngrok http 3000`

---

## 🎛️ Monitoring & Control

### Check System Status

```bash
# Health check (public)
curl http://localhost:3000/health

# Detailed metrics (requires login)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/monitoring/metrics

# Queue statistics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/monitoring/queues
```

### View Logs

```bash
# Real-time logs
tail -f logs/app.log

# Filter for specific events
tail -f logs/app.log | grep "scraping"
tail -f logs/app.log | grep "email"
tail -f logs/app.log | grep "ERROR"
```

### Manual Triggers (via API)

```bash
# Login first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Trigger manual scraping
curl -X POST http://localhost:3000/api/scraping/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "industries": ["HVAC"],
    "locations": ["Phoenix, AZ"],
    "maxLeadsPerIndustry": 10
  }'
```

---

## 🐛 Troubleshooting

### "Redis connection failed"

```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG

# If not, start Redis:
# macOS:
brew services start redis

# Linux:
sudo systemctl start redis
```

### "Cron jobs not running"

```bash
# Check environment variable
echo $ENABLE_CRON

# Should be: true

# Restart server
npm start
```

### "Emails not sending"

```bash
# Test email configuration
curl -X POST http://localhost:3000/api/messages/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead-id-here",
    "templateType": "intro",
    "industry": "HVAC"
  }'

# Check logs for errors
tail -f logs/app.log | grep "email"
```

### "No leads being scraped"

```bash
# Check scraping jobs
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/scraping/jobs

# Manually trigger scraping
curl -X POST http://localhost:3000/api/scraping/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "industries": ["HVAC"],
    "locations": ["Test City, ST"],
    "maxLeadsPerIndustry": 5
  }'
```

---

## 🎓 Next Steps

1. **Review Documentation**:
   - [Autonomous System Guide](./AUTONOMOUS_SYSTEM.md)
   - [API Documentation](./API_DOCUMENTATION.md)
   - [Scoring Guide](./SCORING_GUIDE.md)

2. **Customize Email Templates**:
   - Located in `src/templates/`
   - Edit for your brand voice
   - Test with sample leads

3. **Set Up Monitoring**:
   - Add Sentry for error tracking
   - Set up Slack notifications
   - Configure alerts

4. **Scale the System**:
   - Run multiple workers
   - Add more locations
   - Increase scraping frequency

---

## 📞 Need Help?

- **Documentation**: Check `/docs` folder
- **Logs**: `tail -f logs/app.log`
- **Health Check**: `curl http://localhost:3000/health`
- **GitHub Issues**: Open an issue on GitHub

---

## ✅ Success Checklist

- [ ] Redis running
- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] API server started
- [ ] Workers started
- [ ] Health check returns "healthy"
- [ ] Email webhooks configured (optional)
- [ ] First scraping job scheduled

**You're all set!** The system is now running autonomously. 🎉

Monitor the dashboard and let the system work for you!
