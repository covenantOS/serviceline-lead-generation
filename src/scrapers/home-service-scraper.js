/**
 * Home Service Business Scraper
 * Targets HVAC, Plumbing, Roofing, and Electrical companies
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const rateLimiter = require('../utils/rate-limiter');
const { saveLeadToSupabase } = require('../database/supabase-client');

const HOME_SERVICE_INDUSTRIES = {
  HVAC: ['hvac', 'heating cooling', 'air conditioning', 'furnace repair'],
  PLUMBING: ['plumbing', 'plumber', 'drain cleaning', 'water heater'],
  ROOFING: ['roofing', 'roofer', 'roof repair', 'roof replacement'],
  ELECTRICAL: ['electrician', 'electrical contractor', 'electrical repair']
};

class HomeServiceScraper {
  constructor(options = {}) {
    this.options = {
      maxResults: options.maxResults || 50,
      location: options.location || 'United States',
      headless: options.headless !== false,
      timeout: options.timeout || 30000
    };
    this.browser = null;
    this.scrapedLeads = [];
  }

  /**
   * Initialize browser instance
   */
  async initBrowser() {
    if (!this.browser) {
      logger.info('Initializing Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  /**
   * Main scraping orchestrator
   */
  async scrapeAllSources(industry, location) {
    logger.info(`Starting scrape for ${industry} in ${location}`);
    const leads = [];

    try {
      // Scrape from multiple sources in parallel
      const [googleLeads, yelpLeads, yellowPagesLeads] = await Promise.allSettled([
        this.scrapeGoogleMaps(industry, location),
        this.scrapeYelp(industry, location),
        this.scrapeYellowPages(industry, location)
      ]);

      // Collect successful results
      if (googleLeads.status === 'fulfilled') leads.push(...googleLeads.value);
      if (yelpLeads.status === 'fulfilled') leads.push(...yelpLeads.value);
      if (yellowPagesLeads.status === 'fulfilled') leads.push(...yellowPagesLeads.value);

      // Deduplicate and enrich leads
      const uniqueLeads = this.deduplicateLeads(leads);
      const enrichedLeads = await this.enrichLeads(uniqueLeads);

      // Save to database
      await this.saveLeads(enrichedLeads, industry);

      logger.info(`Completed scraping ${enrichedLeads.length} unique leads for ${industry}`);
      return enrichedLeads;

    } catch (error) {
      logger.error(`Error scraping ${industry} in ${location}:`, error);
      throw error;
    }
  }

  /**
   * Scrape Google Maps for local businesses
   */
  async scrapeGoogleMaps(industry, location) {
    await rateLimiter.checkLimit('google');
    logger.info(`Scraping Google Maps for ${industry} in ${location}`);

    try {
      await this.initBrowser();
      const page = await this.browser.newPage();
      
      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      const searchQuery = `${industry} near ${location}`;
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: this.options.timeout });
      await page.waitForTimeout(3000); // Wait for results to load

      // Scroll to load more results
      await this.autoScroll(page);

      const leads = await page.evaluate(() => {
        const results = [];
        const businessCards = document.querySelectorAll('div[role="article"]');

        businessCards.forEach(card => {
          try {
            const name = card.querySelector('div.fontHeadlineSmall')?.textContent || '';
            const rating = card.querySelector('span[role="img"]')?.getAttribute('aria-label') || '';
            const reviewCount = card.querySelector('span[role="img"]')?.parentElement?.nextSibling?.textContent || '';
            const address = card.querySelector('div[class*="fontBodyMedium"]')?.textContent || '';
            const phone = card.querySelector('span[class*="fontBodyMedium"]')?.textContent || '';
            const website = card.querySelector('a[href*="http"]')?.href || '';

            if (name) {
              results.push({
                name: name.trim(),
                rating: parseFloat(rating.match(/[\d.]+/)?.[0] || '0'),
                reviewCount: parseInt(reviewCount.match(/\d+/)?.[0] || '0'),
                address: address.trim(),
                phone: phone.trim(),
                website: website,
                source: 'Google Maps'
              });
            }
          } catch (err) {
            console.error('Error parsing business card:', err);
          }
        });

        return results;
      });

      await page.close();
      logger.info(`Found ${leads.length} leads from Google Maps`);
      return leads;

    } catch (error) {
      logger.error('Error scraping Google Maps:', error);
      return [];
    }
  }

  /**
   * Scrape Yelp for business listings
   */
  async scrapeYelp(industry, location) {
    await rateLimiter.checkLimit('yelp');
    logger.info(`Scraping Yelp for ${industry} in ${location}`);

    try {
      await this.initBrowser();
      const page = await this.browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      const searchUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(industry)}&find_loc=${encodeURIComponent(location)}`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: this.options.timeout });
      await page.waitForTimeout(2000);

      const leads = await page.evaluate(() => {
        const results = [];
        const businesses = document.querySelectorAll('div[data-testid="serp-ia-card"]');

        businesses.forEach(business => {
          try {
            const name = business.querySelector('a[data-testid="business-name"]')?.textContent || '';
            const rating = business.querySelector('div[aria-label*="star rating"]')?.getAttribute('aria-label') || '';
            const reviewCount = business.querySelector('span[data-testid="review-count"]')?.textContent || '';
            const address = business.querySelector('address')?.textContent || '';
            const phone = business.querySelector('p[data-testid="phone-number"]')?.textContent || '';
            const website = business.querySelector('a[href*="biz_redir"]')?.href || '';

            if (name) {
              results.push({
                name: name.trim(),
                rating: parseFloat(rating.match(/[\d.]+/)?.[0] || '0'),
                reviewCount: parseInt(reviewCount.match(/\d+/)?.[0] || '0'),
                address: address.trim(),
                phone: phone.trim(),
                website: website,
                source: 'Yelp'
              });
            }
          } catch (err) {
            console.error('Error parsing Yelp listing:', err);
          }
        });

        return results;
      });

      await page.close();
      logger.info(`Found ${leads.length} leads from Yelp`);
      return leads;

    } catch (error) {
      logger.error('Error scraping Yelp:', error);
      return [];
    }
  }

  /**
   * Scrape Yellow Pages for business listings
   */
  async scrapeYellowPages(industry, location) {
    await rateLimiter.checkLimit('yellowpages');
    logger.info(`Scraping Yellow Pages for ${industry} in ${location}`);

    try {
      const searchUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(industry)}&geo_location_terms=${encodeURIComponent(location)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: this.options.timeout
      });

      const $ = cheerio.load(response.data);
      const leads = [];

      $('.result').each((i, element) => {
        try {
          const name = $(element).find('.business-name span').text().trim();
          const phone = $(element).find('.phones').text().trim();
          const address = $(element).find('.street-address').text().trim();
          const city = $(element).find('.locality').text().trim();
          const state = $(element).find('.region').text().trim();
          const website = $(element).find('.track-visit-website').attr('href') || '';

          if (name) {
            leads.push({
              name,
              phone,
              address: `${address}, ${city}, ${state}`.trim(),
              website,
              source: 'Yellow Pages'
            });
          }
        } catch (err) {
          logger.error('Error parsing Yellow Pages listing:', err);
        }
      });

      logger.info(`Found ${leads.length} leads from Yellow Pages`);
      return leads;

    } catch (error) {
      logger.error('Error scraping Yellow Pages:', error);
      return [];
    }
  }

  /**
   * Enrich leads with additional data
   */
  async enrichLeads(leads) {
    logger.info(`Enriching ${leads.length} leads...`);
    const enrichedLeads = [];

    for (const lead of leads) {
      try {
        await rateLimiter.checkLimit('enrichment');

        // Extract website if available
        if (lead.website) {
          const websiteData = await this.analyzeWebsite(lead.website);
          lead.websiteQuality = websiteData;
        }

        // Estimate company size
        lead.estimatedSize = this.estimateCompanySize(lead);

        // Check SEO rankings
        if (lead.website) {
          lead.seoData = await this.checkSEORankings(lead.website, lead.name);
        }

        // Check ad presence
        lead.adPresence = await this.checkAdPresence(lead.name, lead.address);

        enrichedLeads.push(lead);

      } catch (error) {
        logger.error(`Error enriching lead ${lead.name}:`, error);
        enrichedLeads.push(lead); // Add anyway without enrichment
      }
    }

    return enrichedLeads;
  }

  /**
   * Analyze website quality and characteristics
   */
  async analyzeWebsite(websiteUrl) {
    try {
      const startTime = Date.now();
      const response = await axios.get(websiteUrl, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const loadTime = Date.now() - startTime;

      const $ = cheerio.load(response.data);

      return {
        hasWebsite: true,
        loadTime,
        hasMobileViewport: !!$('meta[name="viewport"]').length,
        hasSSL: websiteUrl.startsWith('https'),
        titleLength: $('title').text().length,
        hasMetaDescription: !!$('meta[name="description"]').length,
        hasGoogleAnalytics: response.data.includes('google-analytics') || response.data.includes('gtag'),
        hasFacebookPixel: response.data.includes('facebook') && response.data.includes('pixel'),
        hasLiveChat: response.data.includes('livechat') || response.data.includes('intercom') || response.data.includes('drift')
      };

    } catch (error) {
      logger.debug(`Could not analyze website ${websiteUrl}:`, error.message);
      return { hasWebsite: false };
    }
  }

  /**
   * Check SEO rankings for the business
   */
  async checkSEORankings(website, businessName) {
    try {
      // Simplified SEO check - in production, use SEO APIs like SEMrush, Ahrefs, etc.
      const domain = new URL(website).hostname;
      
      return {
        domain,
        indexed: true, // Would check Google Search Console API
        estimatedRanking: Math.floor(Math.random() * 100), // Placeholder
        organicKeywords: Math.floor(Math.random() * 500) // Placeholder
      };

    } catch (error) {
      logger.debug(`Error checking SEO rankings:`, error.message);
      return { indexed: false };
    }
  }

  /**
   * Check for Google Ads presence
   */
  async checkAdPresence(businessName, location) {
    try {
      // Simplified ad check - in production, use Google Ads API or similar
      await this.initBrowser();
      const page = await this.browser.newPage();
      
      const searchQuery = `${businessName} ${location}`;
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`);
      await page.waitForTimeout(2000);

      const hasAds = await page.evaluate(() => {
        return !!document.querySelector('[data-text-ad], .uEierd');
      });

      await page.close();

      return {
        hasGoogleAds: hasAds,
        estimatedAdSpend: hasAds ? 'Active' : 'None'
      };

    } catch (error) {
      logger.debug(`Error checking ad presence:`, error.message);
      return { hasGoogleAds: false, estimatedAdSpend: 'Unknown' };
    }
  }

  /**
   * Estimate company size based on various indicators
   */
  estimateCompanySize(lead) {
    let sizeIndicators = 0;

    // Review count indicator
    if (lead.reviewCount > 200) sizeIndicators += 3;
    else if (lead.reviewCount > 100) sizeIndicators += 2;
    else if (lead.reviewCount > 50) sizeIndicators += 1;

    // Website quality indicator
    if (lead.websiteQuality?.hasLiveChat) sizeIndicators += 2;
    if (lead.websiteQuality?.hasFacebookPixel) sizeIndicators += 1;
    if (lead.websiteQuality?.hasGoogleAnalytics) sizeIndicators += 1;

    // Rating indicator (high rating with many reviews)
    if (lead.rating >= 4.5 && lead.reviewCount > 100) sizeIndicators += 1;

    // Classify size
    if (sizeIndicators >= 5) return 'Large';
    if (sizeIndicators >= 3) return 'Medium';
    return 'Small';
  }

  /**
   * Remove duplicate leads based on name and location
   */
  deduplicateLeads(leads) {
    const seen = new Set();
    return leads.filter(lead => {
      const key = `${lead.name.toLowerCase()}-${lead.address.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Auto-scroll page to load dynamic content
   */
  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight > 3000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  /**
   * Save leads to Supabase database
   */
  async saveLeads(leads, industry) {
    logger.info(`Saving ${leads.length} leads to database...`);
    let savedCount = 0;

    for (const lead of leads) {
      try {
        const leadData = {
          company_name: lead.name,
          website: lead.website || null,
          phone: lead.phone || null,
          address: lead.address || null,
          industry: industry,
          estimated_size: lead.estimatedSize || 'Unknown',
          rating: lead.rating || null,
          review_count: lead.reviewCount || null,
          source: lead.source,
          website_quality: lead.websiteQuality || {},
          seo_data: lead.seoData || {},
          ad_presence: lead.adPresence || {},
          scraped_at: new Date().toISOString(),
          status: 'new'
        };

        await saveLeadToSupabase(leadData);
        savedCount++;

      } catch (error) {
        logger.error(`Error saving lead ${lead.name}:`, error);
      }
    }

    logger.info(`Successfully saved ${savedCount}/${leads.length} leads`);
    return savedCount;
  }

  /**
   * Scrape all home service industries
   */
  async scrapeAllIndustries(location) {
    const results = {};

    for (const [industryName, keywords] of Object.entries(HOME_SERVICE_INDUSTRIES)) {
      try {
        logger.info(`Starting scrape for ${industryName}...`);
        const leads = await this.scrapeAllSources(keywords[0], location);
        results[industryName] = leads;
        
        // Wait between industries to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error) {
        logger.error(`Error scraping ${industryName}:`, error);
        results[industryName] = [];
      }
    }

    return results;
  }

  /**
   * Cleanup browser resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }
}

module.exports = HomeServiceScraper;
