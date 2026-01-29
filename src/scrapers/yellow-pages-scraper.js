/**
 * Yellow Pages Scraper
 * Uses Axios + Cheerio for static content scraping
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class YellowPagesScraper {
  constructor() {
    this.baseUrl = 'https://www.yellowpages.com';
    this.axiosInstance = axios.create({
      headers: {
        'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });
  }

  /**
   * Search Yellow Pages for businesses
   */
  async search(keyword, location, options = {}) {
    const maxResults = options.maxResults || 20;
    const results = [];

    try {
      // Format location for URL
      const formattedLocation = location.replace(/,\s*/g, '-').replace(/\s+/g, '-');
      const url = `${this.baseUrl}/search?search_terms=${encodeURIComponent(keyword)}&geo_location_terms=${encodeURIComponent(formattedLocation)}`;
      
      logger.info(`Scraping Yellow Pages: ${url}`);

      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      // Extract business listings
      $('.result').each((index, element) => {
        if (results.length >= maxResults) return false;

        try {
          const $el = $(element);

          const name = $el.find('.business-name').text().trim();
          if (!name) return;

          const phone = $el.find('.phones').text().trim();
          const address = $el.find('.street-address').text().trim();
          const locality = $el.find('.locality').text().trim();
          const website = $el.find('.track-visit-website').attr('href');
          
          // Extract rating
          const ratingClass = $el.find('.result-rating').attr('class') || '';
          const ratingMatch = ratingClass.match(/result-rating-(\d+)/);
          const rating = ratingMatch ? parseInt(ratingMatch[1]) / 10 : null;

          // Extract review count
          const reviewText = $el.find('.count').text();
          const reviewMatch = reviewText.match(/(\d+)/);
          const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : null;

          // Extract years in business
          const yearsText = $el.find('.years-in-business').text();
          const yearsMatch = yearsText.match(/(\d+)/);
          const yearsInBusiness = yearsMatch ? parseInt(yearsMatch[1]) : null;

          results.push(this.standardizeResult({
            name,
            phone,
            address,
            locality,
            website,
            rating,
            reviewCount,
            yearsInBusiness
          }, location));

        } catch (err) {
          logger.warn('Error parsing Yellow Pages listing:', err.message);
        }
      });

      logger.info(`Extracted ${results.length} businesses from Yellow Pages`);

    } catch (error) {
      logger.error('Yellow Pages scraping error:', error.message);
      if (error.response) {
        logger.error('Response status:', error.response.status);
      }
    }

    return results;
  }

  /**
   * Standardize result format
   */
  standardizeResult(business, location) {
    const { city, state, zipCode } = this.parseLocality(business.locality);

    return {
      name: business.name,
      website: this.cleanWebsite(business.website),
      phone: this.cleanPhone(business.phone),
      address: business.address,
      city,
      state,
      zipCode,
      location,
      rating: business.rating,
      reviewCount: business.reviewCount,
      yearsInBusiness: business.yearsInBusiness,
      source: 'yellow_pages',
      sourceUrl: null
    };
  }

  /**
   * Parse locality (city, state, zip) from Yellow Pages format
   */
  parseLocality(locality) {
    if (!locality) return { city: null, state: null, zipCode: null };

    // Format: "City, ST 12345"
    const parts = locality.split(',');
    const city = parts[0]?.trim() || null;
    
    if (parts[1]) {
      const stateZip = parts[1].trim().split(/\s+/);
      return {
        city,
        state: stateZip[0] || null,
        zipCode: stateZip[1] || null
      };
    }

    return { city, state: null, zipCode: null };
  }

  /**
   * Clean website URL
   */
  cleanWebsite(url) {
    if (!url) return null;
    
    // Yellow Pages often wraps URLs in redirects
    try {
      const urlObj = new URL(url);
      const actualUrl = urlObj.searchParams.get('url');
      return actualUrl || url;
    } catch {
      return url;
    }
  }

  /**
   * Clean phone number
   */
  cleanPhone(phone) {
    if (!phone) return null;
    return phone.replace(/[^0-9+]/g, '');
  }
}

module.exports = new YellowPagesScraper();
