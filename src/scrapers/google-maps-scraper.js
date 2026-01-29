/**
 * Google Maps Business Scraper
 * Uses Playwright for dynamic content scraping
 */

const { chromium } = require('playwright');
const logger = require('../utils/logger');

class GoogleMapsScraper {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: process.env.HEADLESS_BROWSER !== 'false',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      this.context = await this.browser.newContext({
        userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }

  /**
   * Search Google Maps for businesses
   */
  async search(keyword, location, options = {}) {
    const maxResults = options.maxResults || 20;
    const results = [];

    try {
      await this.initialize();
      const page = await this.context.newPage();

      // Build search URL
      const searchQuery = `${keyword} ${location}`;
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      
      logger.info(`Searching Google Maps: ${searchQuery}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for results to load
      await page.waitForSelector('[role="feed"]', { timeout: 10000 }).catch(() => {
        logger.warn('No results found on Google Maps');
      });

      // Scroll to load more results
      await this.scrollResults(page, maxResults);

      // Extract business listings
      const businesses = await page.evaluate(() => {
        const listings = [];
        const elements = document.querySelectorAll('[role="article"]');

        elements.forEach(el => {
          try {
            const nameEl = el.querySelector('[role="heading"]');
            const name = nameEl?.textContent?.trim();
            
            if (!name) return;

            // Extract rating
            const ratingEl = el.querySelector('[role="img"][aria-label*="star"]');
            const ratingText = ratingEl?.getAttribute('aria-label') || '';
            const ratingMatch = ratingText.match(/([0-9.]+)/);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

            // Extract review count
            const reviewMatch = ratingText.match(/([0-9,]+)\s+review/);
            const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(',', '')) : null;

            // Extract address
            const addressEl = el.querySelector('[data-item-id*="address"]');
            const address = addressEl?.textContent?.trim();

            // Extract phone
            const phoneEl = el.querySelector('[data-item-id*="phone"]');
            const phone = phoneEl?.textContent?.trim();

            // Extract website (if visible)
            const websiteEl = el.querySelector('[data-item-id*="authority"]');
            const website = websiteEl?.textContent?.trim();

            listings.push({
              name,
              rating,
              reviewCount,
              address,
              phone,
              website
            });
          } catch (err) {
            console.error('Error extracting business:', err);
          }
        });

        return listings;
      });

      logger.info(`Extracted ${businesses.length} businesses from Google Maps`);

      // Process and standardize results
      for (const business of businesses.slice(0, maxResults)) {
        results.push(this.standardizeResult(business, location));
      }

      await page.close();

    } catch (error) {
      logger.error('Google Maps scraping error:', error);
      throw error;
    }

    return results;
  }

  /**
   * Scroll results panel to load more businesses
   */
  async scrollResults(page, targetCount) {
    try {
      const feedSelector = '[role="feed"]';
      let previousCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 5;

      while (scrollAttempts < maxScrollAttempts) {
        // Scroll the results panel
        await page.evaluate((selector) => {
          const feed = document.querySelector(selector);
          if (feed) {
            feed.scrollTop = feed.scrollHeight;
          }
        }, feedSelector);

        await page.waitForTimeout(2000);

        // Count current results
        const currentCount = await page.evaluate(() => {
          return document.querySelectorAll('[role="article"]').length;
        });

        if (currentCount >= targetCount || currentCount === previousCount) {
          break;
        }

        previousCount = currentCount;
        scrollAttempts++;
      }
    } catch (error) {
      logger.warn('Error scrolling results:', error.message);
    }
  }

  /**
   * Standardize result format
   */
  standardizeResult(business, location) {
    const addressParts = this.parseAddress(business.address);

    return {
      name: business.name,
      website: business.website || null,
      phone: this.cleanPhone(business.phone),
      address: business.address,
      city: addressParts.city,
      state: addressParts.state,
      zipCode: addressParts.zipCode,
      location: location,
      rating: business.rating,
      reviewCount: business.reviewCount,
      source: 'google_maps',
      sourceUrl: `https://www.google.com/maps/search/${encodeURIComponent(business.name + ' ' + location)}`
    };
  }

  /**
   * Parse address into components
   */
  parseAddress(address) {
    if (!address) return { city: null, state: null, zipCode: null };

    // Try to extract city, state, zip
    const zipMatch = address.match(/\b(\d{5})(?:-\d{4})?\b/);
    const stateMatch = address.match(/\b([A-Z]{2})\b/);
    
    let city = null;
    if (stateMatch) {
      const parts = address.split(',');
      if (parts.length >= 2) {
        city = parts[parts.length - 2].trim();
      }
    }

    return {
      city,
      state: stateMatch ? stateMatch[1] : null,
      zipCode: zipMatch ? zipMatch[1] : null
    };
  }

  /**
   * Clean and format phone number
   */
  cleanPhone(phone) {
    if (!phone) return null;
    return phone.replace(/[^0-9+]/g, '');
  }
}

// Singleton instance
const scraper = new GoogleMapsScraper();

// Cleanup on exit
process.on('exit', () => scraper.close());
process.on('SIGINT', () => scraper.close().then(() => process.exit()));

module.exports = scraper;
