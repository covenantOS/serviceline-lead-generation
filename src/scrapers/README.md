# Scrapers Directory

This directory contains web scraping modules for collecting leads from ServiceLine and other sources.

## Structure

- `serviceline-scraper.js` - Main ServiceLine scraper
- `linkedin-scraper.js` - LinkedIn profile scraper
- `company-scraper.js` - General company information scraper
- `utils/` - Scraping utilities and helpers

## Usage Example

```javascript
const servicelineScraper = require('./serviceline-scraper');

const leads = await servicelineScraper.scrapeLeads({
  pages: 10,
  filters: {
    industry: 'healthcare',
    size: 'medium'
  }
});
```

## Best Practices

1. Respect robots.txt
2. Implement rate limiting
3. Use rotating user agents
4. Handle errors gracefully
5. Store raw data before processing
6. Log all scraping activities
