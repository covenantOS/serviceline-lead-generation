# ServiceLine Lead Generation System

An automated lead scraping, scoring, and email outreach system designed to identify and engage potential ServiceLine customers.

## Overview

This system automates the process of:
- **Web Scraping**: Extracting potential leads from ServiceLine and related platforms
- **Lead Scoring**: Intelligently scoring leads based on multiple criteria
- **Email Outreach**: Automating personalized email campaigns to qualified leads
- **API Integration**: RESTful API for managing leads and campaigns
- **Authentication**: Secure access control for team members

## Features

- 🔍 **Multi-Source Scraping**: Support for various web scraping techniques (Puppeteer, Playwright, Axios/Cheerio)
- 📊 **Smart Lead Scoring**: Configurable scoring algorithms based on company size, industry, engagement, etc.
- 📧 **Email Automation**: Template-based email campaigns with personalization
- 🔐 **Secure Authentication**: JWT-based auth system
- 📈 **RESTful API**: Full CRUD operations for leads and campaigns
- 🗄️ **Database Support**: PostgreSQL and MongoDB support
- ⏰ **Scheduled Tasks**: Cron-based automation for scraping and outreach
- 📝 **Logging**: Comprehensive logging with Winston

## Project Structure

```
serviceline-lead-generation/
├── src/
│   ├── scrapers/          # Web scraping modules
│   ├── scoring/           # Lead scoring algorithms
│   ├── templates/         # Email templates
│   ├── api/              # API routes and controllers
│   ├── auth/             # Authentication middleware
│   └── index.js          # Main application entry point
├── config/               # Configuration and environment variables
├── tests/               # Test files
├── logs/                # Application logs
├── package.json         # Project dependencies
└── README.md           # This file
```

## Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL or MongoDB database
- Email service credentials (SendGrid, Mailgun, or SMTP)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/covenantOS/serviceline-lead-generation.git
cd serviceline-lead-generation
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp config/.env.example config/.env
```

Edit `config/.env` with your credentials:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/leads
MONGO_URI=mongodb://localhost:27017/serviceline

# Email Service
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_api_key
FROM_EMAIL=leads@yourcompany.com

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=7d

# Scraping Configuration
SCRAPE_INTERVAL=24h
MAX_CONCURRENT_SCRAPES=5

# API
PORT=3000
NODE_ENV=development
```

4. Run the application:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run scraper only
npm run scrape
```

## Usage

### Scraping Leads

The scraper can be configured to run on a schedule or manually triggered:

```javascript
// Manual scraping
const scraper = require('./src/scrapers/serviceline-scraper');
const leads = await scraper.scrapeLeads();
```

### Scoring Leads

Leads are automatically scored based on configurable criteria:

```javascript
const scorer = require('./src/scoring/lead-scorer');
const score = scorer.calculateScore(lead);
```

### Sending Emails

Use templates for personalized outreach:

```javascript
const emailer = require('./src/templates/email-sender');
await emailer.sendTemplate('intro-email', lead, variables);
```

### API Endpoints

```
POST   /api/auth/login          # Authenticate user
GET    /api/leads               # Get all leads
GET    /api/leads/:id           # Get specific lead
POST   /api/leads               # Create new lead
PUT    /api/leads/:id           # Update lead
DELETE /api/leads/:id           # Delete lead
POST   /api/campaigns           # Create email campaign
GET    /api/campaigns/:id       # Get campaign status
```

## Configuration

### Scoring Algorithm

Customize scoring weights in `config/scoring-config.json`:

```json
{
  "weights": {
    "companySize": 0.3,
    "industry": 0.2,
    "engagement": 0.25,
    "budget": 0.15,
    "decisionMaker": 0.1
  }
}
```

### Email Templates

Create templates in `src/templates/` using Handlebars or EJS syntax.

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Security Considerations

- Never commit `.env` files or credentials
- Use rate limiting on API endpoints
- Implement proper error handling
- Validate all user inputs
- Follow web scraping best practices and respect robots.txt
- Comply with GDPR and CAN-SPAM regulations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.

## Roadmap

- [ ] Add support for LinkedIn scraping
- [ ] Implement AI-powered lead scoring with machine learning
- [ ] Add dashboard UI for lead management
- [ ] Integrate with CRM systems (Salesforce, HubSpot)
- [ ] Add A/B testing for email templates
- [ ] Implement webhook notifications
- [ ] Add data enrichment APIs (Clearbit, Hunter.io)

---

**Note**: Always ensure compliance with website terms of service and applicable laws when scraping data.
