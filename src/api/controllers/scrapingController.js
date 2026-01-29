/**
 * Scraping Controller
 * Handles scraping job management
 */

const { supabase } = require('../../database/supabase-client');
const ScraperOrchestrator = require('../../scrapers/scraper-orchestrator');
const logger = require('../../utils/logger');

const orchestrator = new ScraperOrchestrator();
const activeJobs = new Map();

/**
 * Start new scraping job
 */
exports.startScrapingJob = async (req, res, next) => {
  try {
    const { industries, locations, maxLeadsPerIndustry } = req.body;

    // Create job record
    const jobData = {
      industries: industries || ['HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL'],
      locations: locations || ['United States'],
      max_leads_per_industry: maxLeadsPerIndustry || 50,
      status: 'pending',
      started_by: req.user.id,
      created_at: new Date().toISOString()
    };

    const { data: job, error } = await supabase
      .from('scraping_jobs')
      .insert([jobData])
      .select()
      .single();

    if (error) throw error;

    // Start scraping in background
    const jobId = job.id;
    
    setImmediate(async () => {
      try {
        // Update status to running
        await supabase
          .from('scraping_jobs')
          .update({ status: 'running', started_at: new Date().toISOString() })
          .eq('id', jobId);

        // Run scraping campaign
        const results = await orchestrator.runCampaign({
          industries: jobData.industries,
          locations: jobData.locations,
          maxLeadsPerIndustry: jobData.max_leads_per_industry
        });

        // Update job with results
        await supabase
          .from('scraping_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            results: results,
            total_leads: results.totalLeads,
            total_scored: results.totalScored
          })
          .eq('id', jobId);

        logger.info(`Scraping job ${jobId} completed successfully`);

      } catch (error) {
        logger.error(`Scraping job ${jobId} failed:`, error);
        
        await supabase
          .from('scraping_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', jobId);
      }
    });

    activeJobs.set(jobId, { status: 'running', startedAt: new Date() });

    res.status(202).json({
      success: true,
      message: 'Scraping job started',
      data: {
        jobId: job.id,
        status: 'pending',
        estimatedDuration: '15-30 minutes'
      }
    });
  } catch (error) {
    logger.error('Error starting scraping job:', error);
    next(error);
  }
};

/**
 * Get all scraping jobs
 */
exports.getScrapingJobs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = supabase.from('scraping_jobs').select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);

    query = query.order('created_at', { ascending: false });

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching scraping jobs:', error);
    next(error);
  }
};

/**
 * Get specific scraping job
 */
exports.getScrapingJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Scraping job not found'
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Error fetching scraping job:', error);
    next(error);
  }
};

/**
 * Get current scraping status
 */
exports.getScrapingStatus = async (req, res, next) => {
  try {
    // Get running jobs
    const { data: runningJobs, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('status', 'running')
      .order('started_at', { ascending: false });

    if (error) throw error;

    const status = {
      isRunning: runningJobs.length > 0,
      activeJobs: runningJobs.length,
      jobs: runningJobs.map(job => ({
        id: job.id,
        industries: job.industries,
        startedAt: job.started_at,
        duration: job.started_at
          ? Math.floor((Date.now() - new Date(job.started_at)) / 1000)
          : 0
      }))
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error fetching scraping status:', error);
    next(error);
  }
};

/**
 * Cancel running scraping job
 */
exports.cancelScrapingJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Update job status
    const { data, error } = await supabase
      .from('scraping_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    activeJobs.delete(id);

    logger.info(`Scraping job ${id} cancelled`);

    res.json({
      success: true,
      message: 'Scraping job cancelled',
      data: data
    });
  } catch (error) {
    logger.error('Error cancelling scraping job:', error);
    next(error);
  }
};

/**
 * Schedule recurring scraping job
 */
exports.scheduleScrapingJob = async (req, res, next) => {
  try {
    const { cronSchedule, industries, locations, maxLeadsPerIndustry, enabled = true } = req.body;

    if (!cronSchedule) {
      return res.status(400).json({
        success: false,
        message: 'cronSchedule is required'
      });
    }

    const scheduleData = {
      cron_schedule: cronSchedule,
      industries: industries || ['HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL'],
      locations: locations || ['United States'],
      max_leads_per_industry: maxLeadsPerIndustry || 50,
      enabled: enabled,
      created_by: req.user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('scraping_schedules')
      .insert([scheduleData])
      .select()
      .single();

    if (error) throw error;

    logger.info(`Scraping schedule created: ${cronSchedule}`);

    res.status(201).json({
      success: true,
      message: 'Scraping schedule created',
      data: data
    });
  } catch (error) {
    logger.error('Error creating scraping schedule:', error);
    next(error);
  }
};

/**
 * Get scheduled jobs
 */
exports.getScheduledJobs = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scraping_schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Error fetching scheduled jobs:', error);
    next(error);
  }
};

/**
 * Delete scheduled job
 */
exports.deleteScheduledJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('scraping_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info(`Scraping schedule deleted: ${id}`);

    res.json({
      success: true,
      message: 'Scraping schedule deleted'
    });
  } catch (error) {
    logger.error('Error deleting scraping schedule:', error);
    next(error);
  }
};
