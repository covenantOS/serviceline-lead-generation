/**
 * Scraping Job Processor
 * Handles web scraping jobs from the queue
 */

const HomeServiceScraper = require('../../scrapers/home-service-scraper');
const logger = require('../../utils/logger');
const { addJob } = require('../../queues/queue-config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Process scraping job
 */
async function process(job) {
  const { industries, locations, maxLeadsPerIndustry } = job.data;
  
  logger.info('Starting scraping job', { 
    industries, 
    locations,
    maxLeadsPerIndustry 
  });

  const results = {
    totalLeadsScraped: 0,
    leadsByIndustry: {},
    errors: []
  };

  const scraper = new HomeServiceScraper({
    maxResults: maxLeadsPerIndustry || 50,
    headless: true
  });

  try {
    // Update job status in database
    await updateScrapingJobStatus(job.data.jobId, 'running');

    for (const industry of industries) {
      for (const location of locations) {
        try {
          logger.info(`Scraping ${industry} in ${location}`);
          
          const leads = await scraper.scrapeAllSources(industry, location);
          
          results.leadsByIndustry[`${industry}_${location}`] = leads.length;
          results.totalLeadsScraped += leads.length;

          // Automatically queue each lead for scoring
          for (const lead of leads) {
            await addJob('scoring', 'score-lead', {
              leadId: lead.id
            }, { priority: 8 });
          }

          // Wait between locations to avoid rate limits
          await sleep(5000);

        } catch (error) {
          logger.error(`Error scraping ${industry} in ${location}:`, error);
          results.errors.push({
            industry,
            location,
            error: error.message
          });
        }
      }
    }

    // Cleanup browser
    await scraper.cleanup();

    // Update job as completed
    await updateScrapingJobStatus(job.data.jobId, 'completed', results);

    logger.info('Scraping job completed', results);
    
    return results;

  } catch (error) {
    logger.error('Scraping job failed:', error);
    
    await scraper.cleanup();
    await updateScrapingJobStatus(job.data.jobId, 'failed', { 
      error: error.message 
    });

    throw error;
  }
}

/**
 * Update scraping job status in database
 */
async function updateScrapingJobStatus(jobId, status, results = null) {
  if (!jobId) return;

  try {
    const updateData = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'running') {
      updateData.started_at = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (results) {
      updateData.results = results;
    }

    if (status === 'failed' && results?.error) {
      updateData.error_message = results.error;
    }

    const { error } = await supabase
      .from('scraping_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      logger.error('Failed to update scraping job status:', error);
    }
  } catch (error) {
    logger.error('Error updating scraping job status:', error);
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { process };
