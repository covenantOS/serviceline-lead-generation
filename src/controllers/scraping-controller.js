/**
 * Scraping Controller
 * Manages scraping jobs
 */

const ScraperOrchestrator = require('../scrapers/scraper-orchestrator');
const { supabase } = require('../database/supabase-client');
const logger = require('../utils/logger');

const activeJobs = new Map();

/**
 * Start scraping job
 */
async function startScraping(req, res) {
  const { industries, locations, maxLeadsPerIndustry = 50 } = req.body;

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('scraping_jobs')
    .insert([{
      industries,
      locations,
      max_leads_per_industry: maxLeadsPerIndustry,
      status: 'pending',
      started_by: req.user.id,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (jobError) throw jobError;

  logger.info(`Scraping job created: ${job.id} by user: ${req.user.email}`);

  // Start scraping asynchronously
  const orchestrator = new ScraperOrchestrator();
  const jobPromise = orchestrator.runCampaign({
    industries,
    locations,
    maxLeadsPerIndustry
  });

  activeJobs.set(job.id, { orchestrator, promise: jobPromise });

  // Update job status when complete
  jobPromise
    .then(async (results) => {
      await supabase
        .from('scraping_jobs')
        .update({
          status: 'completed',
          results,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      activeJobs.delete(job.id);
      logger.info(`Scraping job completed: ${job.id}`);
    })
    .catch(async (error) => {
      await supabase
        .from('scraping_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      activeJobs.delete(job.id);
      logger.error(`Scraping job failed: ${job.id}`, error);
    });

  res.status(202).json({
    success: true,
    message: 'Scraping job started',
    jobId: job.id,
    status: 'pending'
  });
}

/**
 * Get scraping job status
 */
async function getScrapingStatus(req, res) {
  const { jobId } = req.params;

  const { data: job, error } = await supabase
    .from('scraping_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Scraping job not found'
    });
  }

  res.json({
    success: true,
    data: job
  });
}

/**
 * List scraping jobs
 */
async function listScrapingJobs(req, res) {
  const { status, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('scraping_jobs')
    .select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  res.json({
    success: true,
    data,
    pagination: {
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + data.length < count
    }
  });
}

/**
 * Cancel scraping job
 */
async function cancelScraping(req, res) {
  const { jobId } = req.params;

  // Check if job is active
  const activeJob = activeJobs.get(jobId);
  
  if (activeJob) {
    // Stop orchestrator (implementation would need to be added)
    activeJobs.delete(jobId);
  }

  // Update job status
  const { data, error } = await supabase
    .from('scraping_jobs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;

  if (!data) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Scraping job not found'
    });
  }

  logger.info(`Scraping job cancelled: ${jobId} by user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Scraping job cancelled',
    data
  });
}

module.exports = {
  startScraping,
  getScrapingStatus,
  listScrapingJobs,
  cancelScraping
};
