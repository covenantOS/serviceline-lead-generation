# ServiceLine Autonomous Lead Generation System

## 🤖 Overview

The ServiceLine system is designed to run **completely autonomously** with minimal user intervention. Once configured, the system will:

1. **Automatically scrape** new leads daily
2. **Score leads** using AI-powered algorithms
3. **Send targeted emails** to hot leads (score ≥ 80)
4. **Follow up automatically** with intelligent sequences
5. **Track engagement** and update lead status
6. **Self-monitor** and alert on issues

---

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Cron Scheduler                            │
│  (Triggers jobs at scheduled times)                          │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Bull Job Queues (Redis)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐        │
│  │Scraping │ │ Scoring │ │  Email  │ │  Follow-up │        │
│  └─────────┘ └─────────┘ └─────────┘ └────────────┘        │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Queue Workers                             │
│  (Process jobs asynchronously with retry logic)              │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic                            │
│  • Web Scrapers    • Lead Scorer    • Email Service          │
│  • Supabase DB     • Analytics      • Monitoring             │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites

Install required services:

```bash
# Install Redis (required for job queues)
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Windows (using WSL or Memurai)
https://memurai.com/
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy example configuration
cp config/.env.example config/.env

# Edit config/.env with your settings
nano config/.env
```

**Required Configuration:**

```env
# Enable autonomous operation
ENABLE_CRON=true

# Redis (for queues)
REDIS_HOST=localhost
REDIS_PORT=6379

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# Email service (choose one)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_key

# Automation thresholds
AUTO_EMAIL_THRESHOLD=80
TARGET_INDUSTRIES=HVAC,PLUMBING,ROOFING,ELECTRICAL
TARGET_LOCATIONS=Phoenix AZ,Los Angeles CA,Houston TX
```

### 4. Setup Database

Run the database schema in Supabase SQL Editor:

```bash
# Copy schema from database/schema.sql and execute in Supabase
```

### 5. Start the System

```bash
# Terminal 1: Start API server (with cron jobs)
npm start

# Terminal 2: Start queue workers
npm run worker
```

---

## 📅 Automated Schedules

### Daily Operations

| Time | Task | Description |
|------|------|-------------|
| **2:00 AM** | Daily Scraping | Scrapes 25 leads per industry from target locations |
| **Every 4 hours** | Lead Scoring | Scores all unscored leads automatically |
| **9:00 AM (Weekdays)** | Hot Leads Campaign | Sends intro emails to hot leads (score ≥80) |
| **10:00 AM** | Follow-up Check | Queues follow-ups for contacted leads |
| **12:00 AM** | Queue Cleanup | Cleans old completed jobs |
| **Every hour** | Health Check | Monitors system health |

### Weekly Operations

| Day | Time | Task |
|-----|------|------|
| **Sunday** | 3:00 AM | Deep Scraping (100 leads/industry, 8+ cities) |

---

## 🔄 Automated Workflows

### 1. Lead Discovery → Scoring → Campaign

```
New Lead Scraped
       ↓
Automatically Queued for Scoring
       ↓
Score Calculated (0-100)
       ↓
Score ≥ 80? → YES → Auto-queue intro email (5 min delay)
       ↓              ↓
       NO            Schedule follow-up sequence
       ↓              • Day 3: Follow-up 1
Stored in DB         • Day 7: Follow-up 2
                     • Day 14: Case study
```

### 2. Follow-up Sequence

```
Intro Email Sent
       ↓
Wait 3 days → Email opened? → YES → Mark as "Qualified"
       ↓                              Cancel automated follow-ups
       NO
       ↓
Send Follow-up #1
       ↓
Wait 4 days → Email clicked? → YES → Mark as "Qualified"
       ↓                               Alert sales team
       NO
       ↓
Send Follow-up #2
       ↓
Wait 7 days → No engagement? → Mark as "Lost"
       ↓
Send Case Study
```

### 3. Email Engagement Tracking

```
Email Delivered → Webhook from SendGrid/Mailgun
       ↓
Email Opened → Update lead status to "Qualified"
       ↓          Add +5 to engagement score
Email Clicked → Update to "Qualified"
       ↓          Add +10 to engagement score
                  Cancel scheduled follow-ups
                  Queue enrichment job
```

---

## 📊 Monitoring Dashboard

### Health Check Endpoint

```bash
# Check system health
curl http://localhost:3000/health

# Response
{
  "status": "healthy",
  "components": {
    "database": { "status": "healthy", "responseTime": 45 },
    "redis": { "status": "healthy", "responseTime": 12 },
    "queues": { "status": "healthy" },
    "scraping": { "status": "healthy", "lastJob": "2026-01-29T02:00:00Z" }
  }
}
```

### Monitoring Dashboard

Access detailed metrics (requires authentication):

```bash
# Get system metrics
GET /api/monitoring/metrics

# Get queue statistics
GET /api/monitoring/queues

# Get comprehensive dashboard
GET /api/monitoring/dashboard
```

---

## 🔧 Queue System

### Queue Types

1. **Scraping Queue**: Web scraping jobs
   - Timeout: 10 minutes
   - Retries: 2
   - Concurrency: 1

2. **Scoring Queue**: Lead scoring
   - Timeout: 1 minute
   - Retries: 3
   - Concurrency: 1

3. **Email Queue**: Email sending
   - Timeout: 30 seconds
   - Retries: 5
   - Concurrency: 5 (sends 5 emails in parallel)

4. **Campaign Queue**: Campaign execution
   - Timeout: 5 minutes
   - Retries: 3
   - Concurrency: 1

5. **Follow-up Queue**: Follow-up sequences
   - Timeout: 2 minutes
   - Retries: 3
   - Concurrency: 3

6. **Enrichment Queue**: Data enrichment
   - Timeout: 90 seconds
   - Retries: 3
   - Concurrency: 2

### Managing Queues

```bash
# View queue statistics via API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/monitoring/queues

# Pause a queue (admin only)
# Implement via admin panel or direct Redis commands
```

---

## 🎯 Lead Scoring Logic

The system uses **inverse scoring** - poor digital presence = high score = more opportunity.

### Scoring Components

| Component | Weight | What's Checked |
|-----------|--------|----------------|
| Website Quality | 25% | SSL, mobile, speed, analytics, meta tags |
| SEO Ranking | 20% | Google indexing, keyword rankings |
| Ad Presence | 15% | Google Ads, Facebook Ads |
| Review Score | 15% | Rating, review count, response rate |
| Social Presence | 10% | Facebook, Instagram, LinkedIn, etc. |
| Company Size | 10% | Employees, review volume |
| Market Competition | 5% | Location competitiveness |

### Lead Tiers

- **Hot Lead (80-100)**: Auto-email triggered immediately
- **Warm Lead (60-79)**: Added to campaign pool
- **Cold Lead (40-59)**: Monitored, no auto-contact
- **Low Priority (0-39)**: Stored for future campaigns

---

## 📧 Email Webhooks

### SendGrid Webhook Setup

1. Go to SendGrid Settings → Mail Settings → Event Webhook
2. Set URL: `https://your-domain.com/api/webhooks/sendgrid`
3. Enable events:
   - Delivered
   - Opened
   - Clicked
   - Bounced
   - Spam Report

### Mailgun Webhook Setup

1. Go to Mailgun → Sending → Webhooks
2. Add webhook: `https://your-domain.com/api/webhooks/mailgun`
3. Enable events:
   - delivered
   - opened
   - clicked
   - bounced
   - complained

---

## 🚨 Error Handling & Recovery

### Automatic Retry Logic

- **Scraping failures**: 2 retries with exponential backoff
- **Email failures**: 5 retries (handles temporary issues)
- **Scoring failures**: 3 retries
- **Campaign failures**: 3 retries

### Failed Job Management

```bash
# View failed jobs in monitoring dashboard
GET /api/monitoring/queues

# Failed jobs are kept for 500 jobs (debugging)
# Completed jobs are kept for 100 jobs
```

### Health Monitoring

System automatically checks every hour:
- Database connectivity
- Redis connectivity
- Queue health (failed jobs, stalls)
- Recent scraping success
- Email delivery rate
- System resources (memory, uptime)

**Status Levels:**
- `healthy`: All systems operational
- `degraded`: Some issues detected, system still functional
- `critical`: Major issues, requires attention

---

## 🔐 Security Considerations

### Webhook Security

Webhooks are public endpoints. For production:

1. **Validate webhook signatures** (SendGrid/Mailgun provide signing)
2. **Use HTTPS** for all webhook URLs
3. **Implement IP whitelisting** if provider supports it
4. **Monitor webhook failures** for potential attacks

### Queue Security

- Redis should not be exposed to public internet
- Use Redis password authentication
- Implement rate limiting on job creation

---

## 📈 Scaling the System

### Horizontal Scaling

1. **Multiple Workers**: Run multiple `npm run worker` instances
2. **Load Balancer**: Put API servers behind load balancer
3. **Redis Cluster**: Use Redis cluster for high availability
4. **Database Read Replicas**: Scale Supabase with read replicas

### Performance Tuning

```env
# Increase email concurrency
# In queue-config.js, adjust email queue concurrency

# Adjust scraping limits
MAX_CONCURRENT_SCRAPES=10

# Tune worker concurrency
# Run more worker processes on different machines
```

---

## 🐛 Troubleshooting

### Cron Jobs Not Running

```bash
# Check if cron is enabled
echo $ENABLE_CRON  # Should be 'true'

# Check logs
tail -f logs/app.log | grep "cron"

# Verify cron jobs are initialized
curl http://localhost:3000/health
```

### Queue Workers Not Processing

```bash
# Check if Redis is running
redis-cli ping  # Should return 'PONG'

# Check if workers are running
ps aux | grep queue-worker

# Restart workers
npm run worker
```

### Emails Not Sending

```bash
# Check email configuration
echo $EMAIL_SERVICE
echo $SENDGRID_API_KEY

# Check failed email jobs
GET /api/monitoring/queues
# Look at 'email' queue failed count

# Test email manually
POST /api/messages/send
```

### High Memory Usage

```bash
# Check system health
GET /api/monitoring/health

# Clean old queue jobs
# Runs automatically at midnight
# Or trigger manually via Redis CLI
```

---

## 🎓 Best Practices

### 1. Monitor Daily

- Check `/api/monitoring/dashboard` each morning
- Review failed jobs weekly
- Monitor email delivery rates

### 2. Adjust Thresholds

```env
# If too many auto-emails
AUTO_EMAIL_THRESHOLD=85

# If too few leads
MIN_SCORE_THRESHOLD=50
```

### 3. Review Templates

- Update email templates monthly
- A/B test subject lines
- Personalize based on industry

### 4. Database Maintenance

- Run `VACUUM` on PostgreSQL monthly
- Archive old leads (>6 months no activity)
- Back up database weekly

### 5. Security Updates

```bash
# Check for updates monthly
npm audit
npm update

# Update dependencies
npm install
```

---

## 📞 Support

For issues or questions:
- Check logs: `tail -f logs/app.log`
- Review queue stats: `GET /api/monitoring/queues`
- Check health: `GET /api/monitoring/health`
- Open GitHub issue

---

## 🚀 Quick Start Checklist

- [ ] Redis installed and running
- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] API server started (`npm start`)
- [ ] Workers started (`npm run worker`)
- [ ] `ENABLE_CRON=true` set
- [ ] Email webhooks configured
- [ ] Health check returns "healthy"
- [ ] First scraping job scheduled

**System is now running autonomously!** 🎉
