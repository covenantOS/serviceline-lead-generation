/**
 * Main Scraper Orchestrator
 * Coordinates scraping from multiple sources for home service businesses
 */

const logger = require('../utils/logger');
const googleMapsScraper = require('./google-maps-scraper');
const yellowPagesScraper = require('./yellow-pages-scraper');
const yelpScraper = require('./yelp-scraper');
const directoryScrapers = require('./directory-scrapers');
const seoAnalyzer = require('./seo-analyzer');
const { saveLeadToDatabase } = require('../database/lead-repository');
const RateLimiter = require('../utils/rate-limiter');

const HOME_SERVICE_CATEGORIES = {
  hvac: ['hvac', 'heating', 'air conditioning', 'hvac repair', 'hvac installation'],
  plumbing: ['plumber', 'plumbing', 'plumbing services', 'emergency plumber'],
  roofing: ['roofer', 'roofing', 'roof repair', 'roof installation'],
  electrical: ['electrician', 'electrical services', 'electrical repair']
};

class LeadScraper {
  constructor(options = {}) {
    this.locations = options.locations || ['New York, NY', 'Los Angeles, CA', 'Chicago, IL'];
    this.categories = options.categories || Object.keys(HOME_SERVICE_CATEGORIES);
    this.maxLeadsPerCategory = options.maxLeadsPerCategory || 50;
    this.rateLimiter = new RateLimiter({
      maxRequests: 10,
      perMilliseconds: 60000 // 10 requests per minute
    });
    this.scrapedLeads = [];
    this.errors = [];
  }

  /**
   * Main scraping orchestrator
   */
  async scrapeAllSources() {
    logger.info('Starting lead scraping process...');
    const startTime = Date.now();

    try {
      for (const category of this.categories) {
        logger.info(`Scraping category: ${category}`);
        
        for (const location of this.locations) {
          logger.info(`Location: ${location}`);
          
          try {
            // Scrape from all sources in parallel
            const results = await Promise.allSettled([
              this.scrapeGoogleMaps(category, location),
              this.scrapeYellowPages(category, location),
              this.scrapeYelp(category, location),
              this.scrapeDirectories(category, location)
            ]);

            // Process results
            const allLeads = results
              .filter(r => r.status === 'fulfilled')
              .flatMap(r => r.value || []);

            logger.info(`Found ${allLeads.length} leads for ${category} in ${location}`);

            // Process and save each lead
            for (const lead of allLeads) {
              await this.processLead(lead, category, location);
            }

            // Track errors
            results
              .filter(r => r.status === 'rejected')
              .forEach(r => this.errors.push(r.reason));

          } catch (error) {
            logger.error(`Error scraping ${category} in ${location}:`, error);
            this.errors.push({ category, location, error: error.message });
          }

          // Rate limiting between locations
          await this.rateLimiter.wait();
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`Scraping completed in ${duration}s`);
      logger.info(`Total leads collected: ${this.scrapedLeads.length}`);
      logger.info(`Total errors: ${this.errors.length}`);

      return {
        success: true,
        leadsCollected: this.scrapedLeads.length,
        errors: this.errors.length,
        duration,
        leads: this.scrapedLeads
      };

    } catch (error) {
      logger.error('Fatal error in scraping process:', error);
      throw error;
    }
  }

  /**
   * Scrape Google Maps
   */
  async scrapeGoogleMaps(category, location) {
    try {
      await this.rateLimiter.wait();
      const keywords = HOME_SERVICE_CATEGORIES[category];
      const leads = [];

      for (const keyword of keywords.slice(0, 2)) { // Limit keywords to avoid rate limits
        const results = await googleMapsScraper.search(keyword, location, {
          maxResults: Math.floor(this.maxLeadsPerCategory / keywords.length)
        });
        leads.push(...results);
      }

      logger.info(`Google Maps: Found ${leads.length} leads`);
      return leads;
    } catch (error) {
      logger.error('Google Maps scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape Yellow Pages
   */
  async scrapeYellowPages(category, location) {
    try {
      await this.rateLimiter.wait();
      const keyword = HOME_SERVICE_CATEGORIES[category][0];
      const results = await yellowPagesScraper.search(keyword, location, {
        maxResults: this.maxLeadsPerCategory
      });

      logger.info(`Yellow Pages: Found ${results.length} leads`);
      return results;
    } catch (error) {
      logger.error('Yellow Pages scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape Yelp
   */
  async scrapeYelp(category, location) {
    try {
      await this.rateLimiter.wait();
      const keyword = HOME_SERVICE_CATEGORIES[category][0];
      const results = await yelpScraper.search(keyword, location, {
        maxResults: this.maxLeadsPerCategory
      });

      logger.info(`Yelp: Found ${results.length} leads`);
      return results;
    } catch (error) {
      logger.error('Yelp scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape Industry Directories
   */
  async scrapeDirectories(category, location) {
    try {
      await this.rateLimiter.wait();
      const results = await directoryScrapers.searchAll(category, location, {
        maxResults: this.maxLeadsPerCategory
      });

      logger.info(`Directories: Found ${results.length} leads`);
      return results;
    } catch (error) {
      logger.error('Directory scraping error:', error);
      return [];
    }
  }

  /**
   * Process and enrich individual lead
   */
  async processLead(rawLead, category, location) {
    try {
      // Check for duplicates
      const isDuplicate = this.scrapedLeads.some(lead => 
        lead.company_name === rawLead.name && lead.location === rawLead.location
      );

      if (isDuplicate) {
        logger.debug(`Duplicate lead skipped: ${rawLead.name}`);
        return;
      }

      // Enrich with SEO analysis
      let seoData = {};
      if (rawLead.website) {
        await this.rateLimiter.wait();
        seoData = await seoAnalyzer.analyze(rawLead.website).catch(err => {
          logger.warn(`SEO analysis failed for ${rawLead.website}:`, err.message);
          return {};
        });
      }

      // Build lead object for database
      const lead = {
        company_name: rawLead.name,
        website: rawLead.website || null,
        phone: rawLead.phone || null,
        email: rawLead.email || null,
        address: rawLead.address || null,
        city: rawLead.city || null,
        state: rawLead.state || null,
        zip_code: rawLead.zipCode || null,
        location: rawLead.location || location,
        industry: category,
        estimated_size: this.estimateCompanySize(rawLead),
        rating: rawLead.rating || null,
        review_count: rawLead.reviewCount || null,
        years_in_business: rawLead.yearsInBusiness || null,
        
        // SEO & Marketing data
        seo_score: seoData.seoScore || null,
        domain_authority: seoData.domainAuthority || null,
        has_google_ads: seoData.hasGoogleAds || false,
        has_facebook_ads: seoData.hasFacebookAds || false,
        organic_keywords: seoData.organicKeywords || null,
        backlinks_count: seoData.backlinksCount || null,
        
        // Metadata
        data_source: rawLead.source || 'unknown',
        source_url: rawLead.sourceUrl || null,
        scraped_at: new Date().toISOString(),
        
        // Lead status
        status: 'new',
        lead_score: null // Will be calculated by scoring algorithm
      };

      // Save to database
      const savedLead = await saveLeadToDatabase(lead);
      this.scrapedLeads.push(savedLead);
      
      logger.info(`Lead saved: ${lead.company_name} (${category})`);

    } catch (error) {
      logger.error(`Error processing lead ${rawLead.name}:`, error);
      this.errors.push({ lead: rawLead.name, error: error.message });
    }
  }

  /**
   * Estimate company size based on available data
   */
  estimateCompanySize(lead) {
    let score = 0;

    // Review count indicator
    if (lead.reviewCount > 200) score += 3;
    else if (lead.reviewCount > 50) score += 2;
    else if (lead.reviewCount > 10) score += 1;

    // Years in business
    if (lead.yearsInBusiness > 20) score += 2;
    else if (lead.yearsInBusiness > 10) score += 1;

    // Multiple locations
    if (lead.hasMultipleLocations) score += 2;

    // Website sophistication
    if (lead.website && lead.website.includes('enterprise')) score += 1;

    // Determine size
    if (score >= 6) return 'large';
    if (score >= 3) return 'medium';
    return 'small';
  }

  /**
   * Get scraping statistics
   */
  getStats() {
    return {
      totalLeads: this.scrapedLeads.length,
      totalErrors: this.errors.length,
      leadsByCategory: this.categories.reduce((acc, cat) => {
        acc[cat] = this.scrapedLeads.filter(l => l.industry === cat).length;
        return acc;
      }, {}),
      leadsBySource: this.scrapedLeads.reduce((acc, lead) => {
        acc[lead.data_source] = (acc[lead.data_source] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// CLI execution
if (require.main === module) {
  (async () => {
    const scraper = new LeadScraper({
      locations: process.env.SCRAPE_LOCATIONS?.split(',') || ['New York, NY'],
      categories: process.env.SCRAPE_CATEGORIES?.split(',') || ['hvac', 'plumbing', 'roofing', 'electrical'],
      maxLeadsPerCategory: parseInt(process.env.MAX_LEADS_PER_CATEGORY) || 50
    });

    try {
      const result = await scraper.scrapeAllSources();
      console.log('\n=== Scraping Results ===');
      console.log(JSON.stringify(result, null, 2));
      console.log('\n=== Statistics ===');
      console.log(JSON.stringify(scraper.getStats(), null, 2));
      process.exit(0);
    } catch (error) {
      console.error('Scraping failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = LeadScraper;
