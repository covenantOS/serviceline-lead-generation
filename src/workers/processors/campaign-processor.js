/**
 * Campaign Job Processor
 * Handles automated campaign execution
 */

const logger = require('../../utils/logger');
const { addJob } = require('../../queues/queue-config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Process campaign job
 */
async function process(job) {
  const { campaignId, targetCriteria } = job.data;

  logger.info(`Processing campaign ${campaignId}`);

  try {
    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Update campaign status
    await updateCampaignStatus(campaignId, 'active');

    // Build query for target leads
    let query = supabase
      .from('leads')
      .select('*');

    // Apply filters
    if (campaign.target_industries && campaign.target_industries.length > 0) {
      query = query.in('industry', campaign.target_industries);
    }

    if (campaign.target_tiers && campaign.target_tiers.length > 0) {
      query = query.in('tier', campaign.target_tiers);
    }

    if (campaign.min_score) {
      query = query.gte('lead_score', campaign.min_score);
    }

    // Additional criteria from job
    if (targetCriteria?.status) {
      query = query.eq('status', targetCriteria.status);
    }

    // Exclude already contacted leads (optional)
    if (targetCriteria?.excludeContacted !== false) {
      query = query.neq('status', 'contacted');
    }

    // Fetch target leads
    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }

    logger.info(`Campaign ${campaignId}: Found ${leads.length} target leads`);

    // Queue email jobs for each lead
    const emailJobs = [];
    for (const lead of leads) {
      const emailJob = await addJob('email', 'send-campaign-email', {
        leadId: lead.id,
        campaignId,
        templateType: campaign.template_id || 'intro',
        industry: lead.industry,
        priority: 'normal'
      }, {
        priority: 5,
        delay: Math.random() * 60000 // Random delay up to 1 minute to avoid spam filters
      });

      emailJobs.push(emailJob.id);
    }

    // Update campaign with results
    await updateCampaignStatus(campaignId, 'completed', {
      totalTargeted: leads.length,
      emailsQueued: emailJobs.length,
      completedAt: new Date().toISOString()
    });

    logger.info(`Campaign ${campaignId} completed: ${emailJobs.length} emails queued`);

    return {
      campaignId,
      leadsTargeted: leads.length,
      emailsQueued: emailJobs.length
    };

  } catch (error) {
    logger.error(`Campaign ${campaignId} failed:`, error);
    await updateCampaignStatus(campaignId, 'failed', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Update campaign status
 */
async function updateCampaignStatus(campaignId, status, metadata = {}) {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...metadata
    };

    const { error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId);

    if (error) {
      logger.error('Failed to update campaign status:', error);
    }
  } catch (error) {
    logger.error('Error updating campaign status:', error);
  }
}

module.exports = { process };
