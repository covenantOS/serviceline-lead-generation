#!/usr/bin/env node
/**
 * Run Full Campaign
 * Command-line script to execute full scraping and scoring campaign
 */

require('dotenv').config({ path: './config/.env' });
const ScraperOrchestrator = require('../src/scrapers/scraper-orchestrator');
const logger = require('../src/utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const action = args[0] || 'run'; // run, schedule, score

async function main() {
  logger.info('='.repeat(60));
  logger.info('ServiceLine Lead Generation Campaign');
  logger.info('='.repeat(60));

  const orchestrator = new ScraperOrchestrator();

  try {
    switch (action) {
      case 'run':
        logger.info('Running full campaign...');
        const results = await orchestrator.runCampaign({
          industries: ['HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL'],
          locations: ['United States'],
          maxLeadsPerIndustry: 50
        });
        
        logger.info('\n' + '='.repeat(60));
        logger.info('CAMPAIGN RESULTS');
        logger.info('='.repeat(60));
        logger.info(`Total Leads: ${results.totalLeads}`);
        logger.info(`Total Scored: ${results.totalScored}`);
        logger.info(`Duration: ${results.duration}`);
        logger.info('\nIndustry Breakdown:');
        Object.entries(results.industries).forEach(([industry, data]) => {
          logger.info(`  ${industry}: ${data.leadsFound} found, ${data.leadsScored} scored`);
        });
        
        if (results.errors.length > 0) {
          logger.info('\nErrors:');
          results.errors.forEach(err => {
            logger.error(`  ${err.industry}: ${err.error}`);
          });
        }
        break;

      case 'score':
        logger.info('Scoring existing leads...');
        const scoreResults = await orchestrator.scoreExistingLeads();
        logger.info(`\nScored ${scoreResults.scored} leads`);
        break;

      case 'schedule':
        logger.info('Scheduling recurring campaign...');
        const cronSchedule = args[1] || '0 2 * * *'; // 2 AM daily by default
        orchestrator.scheduleCampaign(cronSchedule);
        logger.info(`Campaign scheduled: ${cronSchedule}`);
        logger.info('Press Ctrl+C to stop');
        
        // Keep process running
        process.on('SIGINT', () => {
          logger.info('\nStopping scheduled campaign...');
          orchestrator.stopSchedule();
          process.exit(0);
        });
        
        // Keep alive
        await new Promise(() => {});
        break;

      default:
        logger.error(`Unknown action: ${action}`);
        logger.info('Usage: npm run campaign [run|score|schedule] [cron-expression]');
        process.exit(1);
    }

    if (action !== 'schedule') {
      logger.info('\n' + '='.repeat(60));
      process.exit(0);
    }

  } catch (error) {
    logger.error('Campaign failed:', error);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run
main();
