/**
 * Industry Directory Scrapers
 * Scrapes specialized home service directories
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class DirectoryScrapers {
  constructor() {
    this.directories = [
      {
        name: 'Angi',
        baseUrl: 'https://www.angi.com',
        categories: {
          hvac: 'hvac-repair',
          plumbing: 'plumbing',
          roofing: 'roofing',
          electrical: 'electrician'
        }
      },
      {
        name: 'HomeAdvisor',
        baseUrl: 'https://www.homeadvisor.com',
        categories: {
          hvac: 'hvac',
          plumbing: 'plumber',
          roofing: 'roofer',
          electrical: 'electrician'
        }
      },
      {
        name: 'Thumbtack',
        baseUrl: 'https://www.thumbtack.com',
        categories: {
          hvac: 'hvac-service',
          plumbing: 'plumbing',
          roofing: 'roofing',
          electrical: 'electrical'
        }
      }
    ];

    this.axiosInstance = axios.create({
      headers: {
        'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
  }

  /**
   * Search all directories
   */
  async searchAll(category, location, options = {}) {
    const allResults = [];

    for (const directory of this.directories) {
      try {
        const results = await this.searchDirectory(directory, category, location, options);
        allResults.push(...results);
      } catch (error) {
        logger.error(`Error scraping ${directory.name}:`, error.message);
      }
    }

    return allResults;
  }

  /**
   * Search specific directory
   */
  async searchDirectory(directory, category, location, options = {}) {
    const maxResults = Math.floor((options.maxResults || 20) / this.directories.length);
    
    logger.info(`Searching ${directory.name} for ${category} in ${location}`);

    // Each directory requires custom logic
    switch (directory.name) {
      case 'Angi':
        return this.scrapeAngi(category, location, maxResults);
      case 'HomeAdvisor':
        return this.scrapeHomeAdvisor(category, location, maxResults);
      case 'Thumbtack':
        return this.scrapeThumbtack(category, location, maxResults);
      default:
        return [];
    }
  }

  /**
   * Scrape Angi (formerly Angie's List)
   */
  async scrapeAngi(category, location, maxResults) {
    const results = [];

    try {
      // Note: Angi requires complex interaction, this is a simplified example
      logger.info('Angi scraping: Limited data available without API');
      
      // In production, you would:
      // 1. Use Playwright for dynamic content
      // 2. Handle authentication if needed
      // 3. Navigate through search results
      
      // Placeholder for actual implementation
      return [];

    } catch (error) {
      logger.error('Angi scraping error:', error.message);
      return [];
    }
  }

  /**
   * Scrape HomeAdvisor
   */
  async scrapeHomeAdvisor(category, location, maxResults) {
    const results = [];

    try {
      logger.info('HomeAdvisor scraping: Complex site structure');
      
      // HomeAdvisor has anti-scraping measures
      // Best approach: Use their API if available or partner program
      
      return [];

    } catch (error) {
      logger.error('HomeAdvisor scraping error:', error.message);
      return [];
    }
  }

  /**
   * Scrape Thumbtack
   */
  async scrapeThumbtack(category, location, maxResults) {
    const results = [];

    try {
      logger.info('Thumbtack scraping: Requires authentication');
      
      // Thumbtack is a marketplace that requires user interaction
      // Professional scraping would need:
      // 1. Account creation
      // 2. Browse as customer
      // 3. Extract pro information
      
      return [];

    } catch (error) {
      logger.error('Thumbtack scraping error:', error.message);
      return [];
    }
  }

  /**
   * Generic directory scraper template
   */
  async scrapeGenericDirectory(url, selectors) {
    const results = [];

    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      $(selectors.listingSelector).each((index, element) => {
        try {
          const $el = $(element);

          const name = $el.find(selectors.nameSelector).text().trim();
          if (!name) return;

          const phone = $el.find(selectors.phoneSelector).text().trim();
          const address = $el.find(selectors.addressSelector).text().trim();
          const website = $el.find(selectors.websiteSelector).attr('href');
          const rating = this.extractRating($el, selectors.ratingSelector);

          results.push({
            name,
            phone,
            address,
            website,
            rating,
            source: 'directory'
          });

        } catch (err) {
          logger.warn('Error parsing directory listing:', err.message);
        }
      });

    } catch (error) {
      logger.error('Directory scraping error:', error.message);
    }

    return results;
  }

  /**
   * Extract rating from various formats
   */
  extractRating($el, selector) {
    const ratingText = $el.find(selector).text();
    const match = ratingText.match(/([0-9.]+)/);
    return match ? parseFloat(match[1]) : null;
  }
}

module.exports = new DirectoryScrapers();
