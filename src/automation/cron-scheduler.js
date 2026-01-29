/**
 * Cron Scheduler - Automated Job Scheduling
 * Handles all scheduled tasks for autonomous operation
 */

const cron = require('node-cron');
const logger = require('../utils/logger');
const { addJob } = require('../queues/queue-config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Track running jobs
const activeJobs = new Map();

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
  if (process.env.ENABLE_CRON !== 'true') {
    logger.info('Cron jobs disabled via environment variable');
    return;
  }

  logger.info('='.repeat(60));
  logger.info('Initializing Cron Jobs for Autonomous Operation');
  logger.info('='.repeat(60));

  // Daily scraping job - runs at 2 AM every day
  const dailyScrapingJob = cron.schedule(
    process.env.SCRAPE_CRON_SCHEDULE || '0 2 * * *',
    async () => {
      logger.info('🤖 Starting automated daily scraping job');
      await runDailyScraping();
    },
    {
      scheduled: true,
      timezone: process.env.TZ || 'America/New_York'
    }
  );
  activeJobs.set('daily-scraping', dailyScrapingJob);
  logger.info('✓ Daily scraping job scheduled: 2 AM every day');

  // Weekly deep scraping - runs at 3 AM every Sunday
  const weeklyScrapingJob = cron.schedule(
    '0 3 * * 0',
    async () => {
      logger.info('🤖 Starting automated weekly deep scraping');
      await runWeeklyScraping();
    },
    {
      scheduled: true,
      timezone: process.env.TZ || 'America/New_York'
    }
  );
  activeJobs.set('weekly-scraping', weeklyScrapingJob);
  logger.info('✓ Weekly scraping job scheduled: 3 AM every Sunday');

  // Scoring job - runs every 4 hours
  const scoringJob = cron.schedule(
    '0 */4 * * *',
    async () => {
      logger.info('🤖 Starting automated scoring job');
      await runScoringJob();
    },
    {
      scheduled: true,
      timezone: process.env.TZ || 'America/New_York'
    }
  );
  activeJobs.set('scoring', scoringJob);
  logger.info('✓ Scoring job scheduled: Every 4 hours');

  // Hot leads campaign - runs at 9 AM every weekday
  const hotLeadsCampaign = cron.schedule(
    '0 9 * * 1-5',
    async () => {
      logger.info('🤖 Starting automated hot leads campaign');
      await runHotLeadsCampaign();
    },
    {
      scheduled: true,
      timezone: process.env.TZ || 'America/New_York'
    }
  );
  activeJobs.set('hot-leads-campaign', hotLeadsCampaign);
  logger.info('✓ Hot leads campaign scheduled: 9 AM weekdays');

  // Follow-up check - runs at 10 AM every day
  const followUpJob = cron.schedule(
    '0 10 * * *',
    async () => {
      logger.info('🤖 Checking for follow-up opportunities');
      await runFollowUpCheck();
    },
    {
      scheduled: true,
      timezone: process.env.TZ || 'America/New_York'
    }
  );
  activeJobs.set('follow-up', followUpJob);
  logger.info('✓ Follow-up check scheduled: 10 AM daily');

  // Queue cleanup - runs at midnight
  const cleanupJob = cron.schedule(
    '0 0 * * *',
    async () => {
      logger.info('🤖 Running queue cleanup');
      await runQueueCleanup();
    },
    {
      scheduled: true,
      timezone: process.env.TZ || 'America/New_York'
    }
  );
  activeJobs.set('cleanup', cleanupJob);
  logger.info('✓ Queue cleanup scheduled: Midnight daily');

  // Health check - runs every hour
  const healthCheckJob = cron.schedule(
    '0 * * * *',
    async () => {
      await runHealthCheck();
    },
    {
      scheduled: true,
      timezone: process.env.TZ || 'America/New_York'
    }
  );
  activeJobs.set('health-check', healthCheckJob);
  logger.info('✓ Health check scheduled: Every hour');

  logger.info('='.repeat(60));
  logger.info(`✓ ${activeJobs.size} cron jobs initialized successfully`);
  logger.info('System is now running autonomously');
  logger.info('='.repeat(60));
}

/**
 * Run daily scraping for new leads
 */
async function runDailyScraping() {
  try {
    const industries = process.env.TARGET_INDUSTRIES?.split(',') || 
                      ['HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL'];
    
    const locations = process.env.TARGET_LOCATIONS?.split(',') || 
                     ['Phoenix, AZ', 'Los Angeles, CA', 'Houston, TX'];

    const jobId = await createScrapingJobRecord(industries, locations, 'daily');

    await addJob('scraping', 'daily-scraping', {
      jobId,
      industries,
      locations,
      maxLeadsPerIndustry: 25 // Smaller daily batch
    }, {
      priority: 7
    });

    logger.info('Daily scraping job queued successfully');

  } catch (error) {
    logger.error('Failed to queue daily scraping job:', error);
  }
}

/**
 * Run weekly deep scraping
 */
async function runWeeklyScraping() {
  try {
    const industries = ['HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL'];
    const locations = [
      'Phoenix, AZ', 'Los Angeles, CA', 'Houston, TX', 'Miami, FL',
      'Atlanta, GA', 'Dallas, TX', 'Chicago, IL', 'New York, NY'
    ];

    const jobId = await createScrapingJobRecord(industries, locations, 'weekly');

    await addJob('scraping', 'weekly-scraping', {
      jobId,
      industries,
      locations,
      maxLeadsPerIndustry: 100 // Larger weekly batch
    }, {
      priority: 5
    });

    logger.info('Weekly scraping job queued successfully');

  } catch (error) {
    logger.error('Failed to queue weekly scraping job:', error);
  }
}

/**
 * Run scoring for unscored leads
 */
async function runScoringJob() {
  try {
    // Find unscored leads
    const { data: unscoredLeads, error } = await supabase
      .from('leads')
      .select('id')
      .is('lead_score', null)
      .limit(100);

    if (error) throw error;

    if (unscoredLeads && unscoredLeads.length > 0) {
      const leadIds = unscoredLeads.map(lead => lead.id);
      
      await addJob('scoring', 'batch-scoring', {
        leadIds
      }, {
        priority: 7
      });

      logger.info(`Queued ${leadIds.length} leads for scoring`);
    } else {
      logger.info('No unscored leads found');
    }

  } catch (error) {
    logger.error('Failed to queue scoring job:', error);
  }
}

/**
 * Run campaign for hot leads
 */
async function runHotLeadsCampaign() {
  try {
    const hotLeadThreshold = parseInt(process.env.AUTO_EMAIL_THRESHOLD || '80');

    // Find hot leads that haven't been contacted
    const { data: hotLeads, error } = await supabase
      .from('leads')
      .select('id')
      .gte('lead_score', hotLeadThreshold)
      .eq('status', 'new')
      .limit(50);

    if (error) throw error;

    if (hotLeads && hotLeads.length > 0) {
      // Create campaign record
      const { data: campaign } = await supabase
        .from('campaigns')
        .insert({
          name: `Auto Hot Leads - ${new Date().toISOString().split('T')[0]}`,
          type: 'email',
          status: 'scheduled',
          min_score: hotLeadThreshold,
          description: 'Automated daily campaign for hot leads',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (campaign) {
        await addJob('campaign', 'hot-leads-campaign', {
          campaignId: campaign.id,
          targetCriteria: {
            minScore: hotLeadThreshold,
            status: 'new'
          }
        }, {
          priority: 9
        });

        logger.info(`Hot leads campaign queued: ${hotLeads.length} targets`);
      }
    } else {
      logger.info('No hot leads found for campaign');
    }

  } catch (error) {
    logger.error('Failed to run hot leads campaign:', error);
  }
}

/**
 * Check and queue follow-ups
 */
async function runFollowUpCheck() {
  try {
    // Find leads that need follow-up
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: leadsForFollowUp, error } = await supabase
      .from('leads')
      .select('id, industry, updated_at')
      .eq('status', 'contacted')
      .or(`updated_at.lte.${threeDaysAgo.toISOString()},updated_at.lte.${sevenDaysAgo.toISOString()}`)
      .limit(30);

    if (error) throw error;

    if (leadsForFollowUp && leadsForFollowUp.length > 0) {
      for (const lead of leadsForFollowUp) {
        const daysSinceContact = Math.floor(
          (Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        let sequence = 'followup-1';
        if (daysSinceContact >= 14) sequence = 'case-study';
        else if (daysSinceContact >= 7) sequence = 'followup-2';

        await addJob('followup', sequence, {
          leadId: lead.id,
          industry: lead.industry,
          sequence
        }, {
          priority: 6
        });
      }

      logger.info(`Queued ${leadsForFollowUp.length} follow-up jobs`);
    }

  } catch (error) {
    logger.error('Failed to run follow-up check:', error);
  }
}

/**
 * Clean old queue jobs
 */
async function runQueueCleanup() {
  try {
    const { cleanQueue } = require('../queues/queue-config');
    const queueNames = ['scraping', 'scoring', 'email', 'campaign', 'followup', 'enrichment'];

    for (const queueName of queueNames) {
      await cleanQueue(queueName, 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    logger.info('Queue cleanup completed');

  } catch (error) {
    logger.error('Failed to run queue cleanup:', error);
  }
}

/**
 * Run health check
 */
async function runHealthCheck() {
  try {
    const { getAllQueueStats } = require('../queues/queue-config');
    const stats = await getAllQueueStats();

    // Check for stalled queues
    for (const [queueName, queueStats] of Object.entries(stats)) {
      if (queueStats.failed > 100) {
        logger.warn(`Queue ${queueName} has ${queueStats.failed} failed jobs`);
      }
    }

    logger.debug('Health check completed', { stats });

  } catch (error) {
    logger.error('Health check failed:', error);
  }
}

/**
 * Create scraping job record
 */
async function createScrapingJobRecord(industries, locations, type) {
  try {
    const { data, error } = await supabase
      .from('scraping_jobs')
      .insert({
        industries,
        locations,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return data.id;

  } catch (error) {
    logger.error('Failed to create scraping job record:', error);
    return null;
  }
}

/**
 * Stop all cron jobs
 */
function stopCronJobs() {
  logger.info('Stopping all cron jobs...');
  
  for (const [name, job] of activeJobs) {
    job.stop();
    logger.info(`Stopped cron job: ${name}`);
  }

  activeJobs.clear();
  logger.info('All cron jobs stopped');
}

module.exports = {
  initializeCronJobs,
  stopCronJobs,
  activeJobs
};
