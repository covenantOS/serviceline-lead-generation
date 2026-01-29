# Lead Scraping Guide

## Overview

The ServiceLine lead scraper targets home service businesses across multiple industries:
- **HVAC** - Heating, ventilation, and air conditioning
- **Plumbing** - Plumbers and drain services
- **Roofing** - Roofing contractors and repair
- **Electrical** - Electricians and electrical contractors

## Data Sources

### 1. Google Maps
- Local business listings
- Reviews and ratings
- Contact information
- Business hours

### 2. Yelp
- Business profiles
- Customer reviews
- Photos and amenities
- Response rates

### 3. Yellow Pages
- Business directories
- Contact details
- Service areas

## Running the Scraper

### Basic Usage

```bash
# Scrape HVAC businesses in United States
npm run scrape HVAC "United States" 50

# Scrape plumbers in California
npm run scrape PLUMBING "California" 100

# Scrape all industries
npm run campaign run
```

### Programmatic Usage

```javascript
const HomeServiceScraper = require('./src/scrapers/home-service-scraper');

const scraper = new HomeServiceScraper({
  maxResults: 100,
  headless: true,
  timeout: 30000
});

// Scrape single industry
const leads = await scraper.scrapeAllSources('HVAC', 'California');

// Scrape all industries
const allLeads = await scraper.scrapeAllIndustries('California');

// Cleanup
await scraper.cleanup();
```

## Data Collected

For each business, we collect:

### Basic Information
- Company name
- Phone number
- Physical address
- Website URL
- Industry/category

### Online Presence
- Google rating (1-5 stars)
- Number of reviews
- Review response rate
- Social media profiles

### Website Analysis
- Mobile responsiveness
- Page load speed
- SSL certificate
- SEO elements (title, meta description)
- Tracking pixels (Google Analytics, Facebook)
- Live chat presence

### SEO Data
- Current search rankings
- Organic keyword count
- Domain authority
- Backlink profile

### Advertising
- Google Ads presence
- Estimated ad spend
- Facebook Ads detection

### Company Size Indicators
- Review volume
- Website sophistication
- Multiple locations
- Employee count estimates

## Rate Limiting

The scraper implements automatic rate limiting:

- **Google Maps**: 10 requests/minute
- **Yelp**: 15 requests/minute
- **Yellow Pages**: 20 requests/minute
- **Enrichment**: 30 requests/minute

Random delays (500-1500ms) are added between requests.

## Error Handling

- Failed requests are logged but don't stop the scrape
- Timeouts default to 30 seconds
- Browser crashes trigger automatic restart
- Database errors are caught and reported

## Best Practices

1. **Respect robots.txt** - Always check site policies
2. **Use delays** - Don't overwhelm servers
3. **Rotate user agents** - Appear as different browsers
4. **Run during off-peak hours** - Less likely to be detected
5. **Monitor logs** - Watch for blocked requests
6. **Store raw data** - Keep original scraped data
7. **Regular updates** - Scrapers break when sites change

## Scheduled Scraping

```bash
# Schedule daily scraping at 2 AM
npm run campaign schedule "0 2 * * *"

# Schedule weekly scraping
npm run campaign schedule "0 2 * * 0"
```

## Troubleshooting

### Browser Won't Launch
```bash
# Install Chromium dependencies
sudo apt-get install -y chromium-browser
```

### Blocked by Cloudflare
- Enable headful mode: `headless: false`
- Add more realistic browser behavior
- Use residential proxies (not included)

### Slow Performance
- Reduce `maxResults`
- Increase `timeout` value
- Run during off-peak hours

### Database Connection Failed
- Check Supabase credentials in `.env`
- Verify network connection
- Check table schema matches

## Legal Considerations

⚠️ **Important**: Web scraping may violate terms of service. Always:

1. Check robots.txt
2. Review terms of service
3. Obtain permission when required
4. Don't overload servers
5. Respect copyright and data protection laws
6. Comply with GDPR, CCPA, and local regulations

## API Alternatives

Consider using official APIs instead:

- **Google Places API** - More reliable than scraping
- **Yelp Fusion API** - Official business data
- **Data enrichment services** - Clearbit, Hunter.io, ZoomInfo

These are more stable and legally compliant.
