#!/usr/bin/env node
/**
 * Run Lead Scraper
 * Command-line script to execute scraping operations
 */

require('dotenv').config({ path: './config/.env' });
const HomeServiceScraper = require('../src/scrapers/home-service-scraper');
const logger = require('../src/utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const industry = args[0] || 'HVAC';
const location = args[1] || 'United States';
const maxResults = parseInt(args[2]) || 50;

async function main() {
  logger.info('='.repeat(60));
  logger.info('ServiceLine Lead Scraper');
  logger.info('='.repeat(60));
  logger.info(`Industry: ${industry}`);
  logger.info(`Location: ${location}`);
  logger.info(`Max Results: ${maxResults}`);
  logger.info('='.repeat(60));

  const scraper = new HomeServiceScraper({ maxResults });

  try {
    const leads = await scraper.scrapeAllSources(industry, location);
    
    logger.info('\n' + '='.repeat(60));
    logger.info('SCRAPING COMPLETE');
    logger.info('='.repeat(60));
    logger.info(`Total Leads Found: ${leads.length}`);
    
    if (leads.length > 0) {
      logger.info('\nSample Leads:');
      leads.slice(0, 5).forEach((lead, i) => {
        logger.info(`\n${i + 1}. ${lead.company_name || lead.name}`);
        logger.info(`   Phone: ${lead.phone || 'N/A'}`);
        logger.info(`   Website: ${lead.website || 'N/A'}`);
        logger.info(`   Rating: ${lead.rating || 'N/A'} (${lead.review_count || 0} reviews)`);
        logger.info(`   Size: ${lead.estimated_size || lead.estimatedSize || 'Unknown'}`);
      });
    }

    logger.info('\n' + '='.repeat(60));
    process.exit(0);

  } catch (error) {
    logger.error('Scraping failed:', error);
    process.exit(1);
  } finally {
    await scraper.cleanup();
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run
main();
