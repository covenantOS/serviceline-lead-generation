/**
 * Queue Worker - Processes jobs from Bull queues
 * Run this as a separate process: npm run worker
 */

require('dotenv').config({ path: './config/.env' });
const { queues } = require('../queues/queue-config');
const logger = require('../utils/logger');

// Import processors
const scrapingProcessor = require('./processors/scraping-processor');
const scoringProcessor = require('./processors/scoring-processor');
const emailProcessor = require('./processors/email-processor');
const campaignProcessor = require('./processors/campaign-processor');
const followupProcessor = require('./processors/followup-processor');
const enrichmentProcessor = require('./processors/enrichment-processor');

/**
 * Setup queue processors
 */
function setupWorkers() {
  logger.info('='.repeat(60));
  logger.info('Starting Queue Workers');
  logger.info('='.repeat(60));

  // Scraping queue processor
  queues.scraping.process(async (job) => {
    logger.info(`Processing scraping job ${job.id}`, { data: job.data });
    return await scrapingProcessor.process(job);
  });

  // Scoring queue processor
  queues.scoring.process(async (job) => {
    logger.info(`Processing scoring job ${job.id}`, { data: job.data });
    return await scoringProcessor.process(job);
  });

  // Email queue processor (with concurrency)
  queues.email.process(5, async (job) => { // Process 5 emails concurrently
    logger.info(`Processing email job ${job.id}`, { data: job.data });
    return await emailProcessor.process(job);
  });

  // Campaign queue processor
  queues.campaign.process(async (job) => {
    logger.info(`Processing campaign job ${job.id}`, { data: job.data });
    return await campaignProcessor.process(job);
  });

  // Follow-up queue processor
  queues.followup.process(3, async (job) => { // Process 3 follow-ups concurrently
    logger.info(`Processing follow-up job ${job.id}`, { data: job.data });
    return await followupProcessor.process(job);
  });

  // Enrichment queue processor
  queues.enrichment.process(2, async (job) => { // Process 2 enrichments concurrently
    logger.info(`Processing enrichment job ${job.id}`, { data: job.data });
    return await enrichmentProcessor.process(job);
  });

  logger.info('All queue workers started successfully');
  logger.info('Worker is running. Press Ctrl+C to stop.');
}

// Start workers
setupWorkers();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down workers...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in worker:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in worker:', { reason, promise });
  process.exit(1);
});
