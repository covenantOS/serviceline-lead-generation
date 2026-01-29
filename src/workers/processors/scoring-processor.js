/**
 * Scoring Job Processor
 * Handles lead scoring jobs from the queue
 */

const LeadScorer = require('../../scoring/lead-scorer');
const logger = require('../../utils/logger');
const { addJob } = require('../../queues/queue-config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const scorer = new LeadScorer();

/**
 * Process scoring job
 */
async function process(job) {
  const { leadId, leadIds } = job.data;

  try {
    // Single lead scoring
    if (leadId) {
      return await scoreSingleLead(leadId);
    }

    // Batch lead scoring
    if (leadIds && Array.isArray(leadIds)) {
      return await scoreBatchLeads(leadIds);
    }

    throw new Error('No leadId or leadIds provided');

  } catch (error) {
    logger.error('Scoring job failed:', error);
    throw error;
  }
}

/**
 * Score a single lead
 */
async function scoreSingleLead(leadId) {
  logger.info(`Scoring lead ${leadId}`);

  // Fetch lead from database
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (error || !lead) {
    throw new Error(`Lead ${leadId} not found`);
  }

  // Calculate score
  const scoreData = scorer.calculateScore(lead);

  // Update lead with score
  const { error: updateError } = await supabase
    .from('leads')
    .update({
      lead_score: scoreData.totalScore,
      tier: scoreData.tier,
      component_scores: scoreData.componentScores,
      recommendations: scoreData.recommendations,
      scored_at: scoreData.calculatedAt,
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId);

  if (updateError) {
    throw new Error(`Failed to update lead score: ${updateError.message}`);
  }

  logger.info(`Lead ${leadId} scored: ${scoreData.totalScore} (${scoreData.tier})`);

  // Auto-trigger campaign for hot leads
  if (scoreData.totalScore >= 80) {
    await triggerHotLeadCampaign(leadId, lead, scoreData);
  }

  return {
    leadId,
    score: scoreData.totalScore,
    tier: scoreData.tier
  };
}

/**
 * Score multiple leads in batch
 */
async function scoreBatchLeads(leadIds) {
  logger.info(`Batch scoring ${leadIds.length} leads`);

  const results = [];
  const errors = [];

  for (const leadId of leadIds) {
    try {
      const result = await scoreSingleLead(leadId);
      results.push(result);
    } catch (error) {
      logger.error(`Failed to score lead ${leadId}:`, error);
      errors.push({ leadId, error: error.message });
    }
  }

  return {
    totalProcessed: leadIds.length,
    successful: results.length,
    failed: errors.length,
    results,
    errors
  };
}

/**
 * Trigger automated campaign for hot leads
 */
async function triggerHotLeadCampaign(leadId, lead, scoreData) {
  try {
    const hotLeadThreshold = parseInt(process.env.AUTO_EMAIL_THRESHOLD || '80');
    
    if (scoreData.totalScore < hotLeadThreshold) {
      return;
    }

    logger.info(`Triggering auto-campaign for hot lead ${leadId} (score: ${scoreData.totalScore})`);

    // Check if lead already has been contacted
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('lead_id', leadId)
      .limit(1);

    if (existingMessages && existingMessages.length > 0) {
      logger.info(`Lead ${leadId} already contacted, skipping auto-campaign`);
      return;
    }

    // Queue email job for this hot lead
    await addJob('email', 'send-intro-email', {
      leadId,
      templateType: 'intro',
      industry: lead.industry,
      priority: 'high',
      autoTriggered: true
    }, { 
      priority: 10, // High priority
      delay: 300000 // 5 minute delay to allow for manual review
    });

    // Schedule follow-up sequence
    await scheduleFollowUpSequence(leadId, lead);

    logger.info(`Auto-campaign scheduled for lead ${leadId}`);

  } catch (error) {
    logger.error(`Failed to trigger hot lead campaign for ${leadId}:`, error);
  }
}

/**
 * Schedule follow-up sequence for a lead
 */
async function scheduleFollowUpSequence(leadId, lead) {
  try {
    const followUpSchedule = [
      { delay: 3, type: 'followup-1' },  // 3 days
      { delay: 7, type: 'followup-2' },  // 7 days
      { delay: 14, type: 'case-study' }  // 14 days
    ];

    for (const followUp of followUpSchedule) {
      await addJob('followup', followUp.type, {
        leadId,
        industry: lead.industry,
        sequence: followUp.type
      }, {
        delay: followUp.delay * 24 * 60 * 60 * 1000, // Convert days to milliseconds
        priority: 5
      });
    }

    logger.info(`Follow-up sequence scheduled for lead ${leadId}`);

  } catch (error) {
    logger.error(`Failed to schedule follow-up sequence for ${leadId}:`, error);
  }
}

module.exports = { process };
