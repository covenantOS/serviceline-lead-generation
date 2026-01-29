# ServiceLine Lead Generation System

🚀 **Complete lead generation, scoring, and campaign automation system for home service businesses (HVAC, Plumbing, Roofing, Electrical)**

## 🎯 Features

### Lead Generation
- ✅ **Multi-source web scraping** (Google Maps, Yelp, Yellow Pages)
- ✅ **Home service industries**: HVAC, Plumbing, Roofing, Electrical
- ✅ **Automated data enrichment** (website analysis, SEO metrics, ad presence)
- ✅ **Company size estimation**
- ✅ **Duplicate detection**

### Intelligent Lead Scoring (0-100)
- ✅ **7 scoring components** with customizable weights
- ✅ **Inverse scoring** (poor digital presence = high scores = more opportunity)
- ✅ **Tier classification**: Hot Lead, Warm Lead, Cold Lead, Low Priority
- ✅ **Actionable recommendations** for each lead
- ✅ **Batch scoring** support

### Email Campaign Automation
- ✅ **Professional templates** for each industry
- ✅ **Handlebars templating** with personalization
- ✅ **Email sequences** (intro, follow-ups, case studies)
- ✅ **Variable interpolation**
- ✅ **Template preview** functionality

### RESTful API
- ✅ **JWT authentication** with role-based access
- ✅ **Lead management** (CRUD + bulk operations)
- ✅ **Campaign management**
- ✅ **Message sending** with template support
- ✅ **Analytics** (lead stats, scoring distribution, campaign performance)
- ✅ **Scraping job management**
- ✅ **Rate limiting** and security middleware
- ✅ **Input validation** with Joi
- ✅ **Comprehensive error handling**

### Database
- ✅ **Supabase/PostgreSQL** integration
- ✅ **Row Level Security (RLS)** policies
- ✅ **Optimized indexes**
- ✅ **Full-text search** support
- ✅ **Automatic timestamps**

## 📊 System Architecture

```
┌─────────────────┐
│  Web Scrapers   │
│ (Puppeteer/Axios)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Lead Enrichment │
│  & Analysis     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lead Scoring   │
│   Algorithm     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Supabase     │
│    Database     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   RESTful API   │
│  (Express.js)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Campaign│ │Analytics │
│Manager │ │Dashboard │
└────────┘ └──────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase account (free tier works)
- Email service (SMTP, SendGrid, or Mailgun)

### Installation

```bash
# Clone repository
git clone https://github.com/covenantOS/serviceline-lead-generation.git
cd serviceline-lead-generation

# Install dependencies
npm install

# Install Playwright browsers (for scraping)
npx playwright install chromium
```

### Configuration

```bash
# Copy environment template
cp config/.env.example config/.env

# Edit config/.env with your credentials
```

**Required environment variables**:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# JWT
JWT_SECRET=your_very_secure_secret_key_here

# Email (choose one)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=leads@yourcompany.com
FROM_NAME=ServiceLine
```

### Database Setup

```bash
# 1. Create Supabase project at https://supabase.com

# 2. Run database schema
#    - Open Supabase SQL Editor
#    - Copy/paste contents of database/schema.sql
#    - Execute

# 3. Create admin user (see database/README.md)
```

### Run the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

API will be available at: `http://localhost:3000`

## 📖 Usage Examples

### 1. Scrape Leads

```bash
# Scrape HVAC businesses in California
npm run scrape HVAC "California" 50

# Scrape all industries in multiple locations
npm run campaign run
```

### 2. Score Leads

```bash
# Score all unscored leads
npm run score
```

### 3. Use the API

**Register and login**:

```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'

# Login (returns access token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

**Get leads**:

```bash
curl -X GET "http://localhost:3000/api/leads?industry=HVAC&minScore=80" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Send email**:

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead-uuid-here",
    "templateId": "hvac/intro-email.hbs",
    "variables": {
      "firstName": "John",
      "senderName": "Sarah Johnson",
      "senderTitle": "Marketing Consultant",
      "senderPhone": "555-1234",
      "senderEmail": "sarah@serviceline.com"
    }
  }'
```

**Start scraping job**:

```bash
curl -X POST http://localhost:3000/api/scraping/start \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "industries": ["HVAC", "PLUMBING"],
    "locations": ["Phoenix, AZ"],
    "maxLeadsPerIndustry": 50
  }'
```

## 📚 Documentation

- **API Documentation**: [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
- **Scraping Guide**: [docs/SCRAPING_GUIDE.md](docs/SCRAPING_GUIDE.md)
- **Scoring Guide**: [docs/SCORING_GUIDE.md](docs/SCORING_GUIDE.md)
- **Database Setup**: [database/README.md](database/README.md)
- **Email Templates**: [src/templates/README.md](src/templates/README.md)

## 🏗️ Project Structure

```
serviceline-lead-generation/
├── src/
│   ├── controllers/       # API request handlers
│   ├── routes/           # Express route definitions
│   ├── middleware/       # Auth, validation, error handling
│   ├── validation/       # Joi schemas
│   ├── database/         # Supabase client & repositories
│   ├── scrapers/         # Web scraping modules
│   ├── scoring/          # Lead scoring algorithm
│   ├── templates/        # Email templates (Handlebars)
│   ├── utils/           # Logger, rate limiter
│   ├── app.js           # Express app setup
│   └── index.js         # Entry point
├── scripts/             # CLI scripts
├── database/            # SQL schema & setup docs
├── docs/               # Documentation
├── config/             # Configuration & .env
└── tests/              # Test files (coming soon)
```

## 🔐 Security Features

- ✅ JWT-based authentication with refresh tokens
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Role-based access control (admin, user, viewer)
- ✅ Rate limiting (API, auth, scraping endpoints)
- ✅ Helmet.js security headers
- ✅ Input validation with Joi
- ✅ SQL injection protection (parameterized queries)
- ✅ Row Level Security (RLS) in database
- ✅ CORS configuration

## 📊 API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/change-password` - Change password

### Leads
- `GET /api/leads` - List leads (with filtering)
- `GET /api/leads/:id` - Get specific lead
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead (admin only)
- `POST /api/leads/bulk/import` - Bulk import
- `GET /api/leads/export/csv` - Export CSV

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id/stats` - Campaign statistics

### Messages
- `GET /api/messages` - List messages
- `POST /api/messages/send` - Send email
- `GET /api/messages/templates` - List templates

### Analytics
- `GET /api/analytics/leads` - Lead statistics
- `GET /api/analytics/scoring` - Scoring distribution
- `GET /api/analytics/campaigns` - Campaign performance
- `GET /api/analytics/dashboard` - Dashboard overview

### Scraping
- `POST /api/scraping/start` - Start scraping job
- `GET /api/scraping/status/:jobId` - Get job status
- `GET /api/scraping/jobs` - List jobs

## 🎯 ServiceLine Value Propositions

The system is designed to promote ServiceLine's unique offerings:

1. **Pay-Per-Ranking SEO**
   - Only pay when ranked on page 1
   - Transparent pricing: $50-$150/keyword
   - 90-day ranking guarantee

2. **$0 Google Ads Management**
   - No 15-20% management fees
   - Keep 100% of ad budget
   - Full campaign optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with Express.js, Supabase, Puppeteer, and Node.js
- Email templates use Handlebars templating
- Lead scoring algorithm inspired by marketing automation best practices

## 📧 Support

For questions or issues:
- Open a GitHub issue
- Email: support@serviceline.com

---

**Note**: Always ensure compliance with website terms of service, robots.txt, and applicable laws (GDPR, CAN-SPAM, etc.) when scraping data and sending emails.
