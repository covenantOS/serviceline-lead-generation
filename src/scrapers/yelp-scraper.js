/**
 * Yelp Business Scraper
 * Note: For production use, consider Yelp Fusion API
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class YelpScraper {
  constructor() {
    this.baseUrl = 'https://www.yelp.com';
    this.apiKey = process.env.YELP_API_KEY;
    this.axiosInstance = axios.create({
      headers: {
        'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 30000
    });
  }

  /**
   * Search Yelp for businesses
   * Uses API if key available, falls back to scraping
   */
  async search(keyword, location, options = {}) {
    if (this.apiKey) {
      return this.searchViaAPI(keyword, location, options);
    } else {
      logger.warn('No Yelp API key found, using web scraping (less reliable)');
      return this.searchViaScraping(keyword, location, options);
    }
  }

  /**
   * Search using Yelp Fusion API (recommended)
   */
  async searchViaAPI(keyword, location, options = {}) {
    const maxResults = options.maxResults || 20;
    const results = [];

    try {
      const apiUrl = 'https://api.yelp.com/v3/businesses/search';
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        params: {
          term: keyword,
          location: location,
          limit: Math.min(maxResults, 50),
          sort_by: 'rating'
        }
      });

      const businesses = response.data.businesses || [];
      
      logger.info(`Yelp API returned ${businesses.length} businesses`);

      for (const business of businesses) {
        results.push(this.standardizeAPIResult(business, location));
      }

    } catch (error) {
      logger.error('Yelp API error:', error.message);
      if (error.response) {
        logger.error('Response status:', error.response.status);
        logger.error('Response data:', error.response.data);
      }
    }

    return results;
  }

  /**
   * Search via web scraping (fallback)
   */
  async searchViaScraping(keyword, location, options = {}) {
    const maxResults = options.maxResults || 20;
    const results = [];

    try {
      const url = `${this.baseUrl}/search?find_desc=${encodeURIComponent(keyword)}&find_loc=${encodeURIComponent(location)}`;
      
      logger.info(`Scraping Yelp: ${url}`);

      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      // Yelp's HTML structure (subject to change)
      $('[data-testid="serp-ia-card"]').each((index, element) => {
        if (results.length >= maxResults) return false;

        try {
          const $el = $(element);

          const name = $el.find('h3').first().text().trim();
          if (!name) return;

          const ratingText = $el.find('[aria-label*="star rating"]').attr('aria-label') || '';
          const ratingMatch = ratingText.match(/([0-9.]+)/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

          const reviewText = $el.find('[aria-label*="review"]').text();
          const reviewMatch = reviewText.match(/(\d+)/);
          const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : null;

          const address = $el.find('[data-testid="address"]').text().trim();
          const phone = $el.find('[data-testid="phone"]').text().trim();

          results.push(this.standardizeScrapedResult({
            name,
            rating,
            reviewCount,
            address,
            phone
          }, location));

        } catch (err) {
          logger.warn('Error parsing Yelp listing:', err.message);
        }
      });

      logger.info(`Extracted ${results.length} businesses from Yelp`);

    } catch (error) {
      logger.error('Yelp scraping error:', error.message);
    }

    return results;
  }

  /**
   * Standardize API result
   */
  standardizeAPIResult(business, location) {
    return {
      name: business.name,
      website: business.url,
      phone: business.phone,
      address: business.location.address1,
      city: business.location.city,
      state: business.location.state,
      zipCode: business.location.zip_code,
      location,
      rating: business.rating,
      reviewCount: business.review_count,
      source: 'yelp',
      sourceUrl: business.url
    };
  }

  /**
   * Standardize scraped result
   */
  standardizeScrapedResult(business, location) {
    const addressParts = this.parseAddress(business.address);

    return {
      name: business.name,
      website: null,
      phone: this.cleanPhone(business.phone),
      address: business.address,
      city: addressParts.city,
      state: addressParts.state,
      zipCode: addressParts.zipCode,
      location,
      rating: business.rating,
      reviewCount: business.reviewCount,
      source: 'yelp',
      sourceUrl: null
    };
  }

  /**
   * Parse address into components
   */
  parseAddress(address) {
    if (!address) return { city: null, state: null, zipCode: null };

    const zipMatch = address.match(/\b(\d{5})(?:-\d{4})?\b/);
    const stateMatch = address.match(/\b([A-Z]{2})\b/);
    
    return {
      city: null,
      state: stateMatch ? stateMatch[1] : null,
      zipCode: zipMatch ? zipMatch[1] : null
    };
  }

  /**
   * Clean phone number
   */
  cleanPhone(phone) {
    if (!phone) return null;
    return phone.replace(/[^0-9+]/g, '');
  }
}

module.exports = new YelpScraper();
