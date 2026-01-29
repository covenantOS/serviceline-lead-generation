/**
 * Follow-up Job Processor
 * Handles automated follow-up sequences
 */

const logger = require('../../utils/logger');
const { addJob } = require('../../queues/queue-config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Process follow-up job
 */
async function process(job) {
  const { leadId, industry, sequence } = job.data;

  logger.info(`Processing follow-up ${sequence} for lead ${leadId}`);

  try {
    // Fetch lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    // Check if lead has already converted or been lost
    if (lead.status === 'converted' || lead.status === 'lost') {
      logger.info(`Lead ${leadId} is ${lead.status}, skipping follow-up`);
      return { skipped: true, reason: `lead_${lead.status}` };
    }

    // Check if lead has replied (we'll implement webhook tracking)
    const hasReplied = await checkIfLeadReplied(leadId);
    if (hasReplied) {
      logger.info(`Lead ${leadId} has replied, skipping automated follow-up`);
      return { skipped: true, reason: 'lead_replied' };
    }

    // Determine template based on sequence
    const templateType = getFollowUpTemplate(sequence, lead);

    // Queue follow-up email
    await addJob('email', 'send-followup-email', {
      leadId,
      templateType,
      industry,
      sequence,
      priority: 'normal',
      autoTriggered: true
    }, {
      priority: 6
    });

    // Record follow-up attempt
    await recordFollowUpAttempt(leadId, sequence);

    logger.info(`Follow-up ${sequence} queued for lead ${leadId}`);

    return {
      success: true,
      leadId,
      sequence,
      templateType
    };

  } catch (error) {
    logger.error(`Follow-up ${sequence} failed for lead ${leadId}:`, error);
    throw error;
  }
}

/**
 * Check if lead has replied to any emails
 */
async function checkIfLeadReplied(leadId) {
  try {
    // Check messages table for reply indicators
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .not('clicked_at', 'is', null);

    // If lead has clicked links in email, consider them engaged
    if (messages && messages.length > 0) {
      return true;
    }

    // Check if status was manually updated to 'qualified'
    const { data: lead } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .single();

    if (lead?.status === 'qualified') {
      return true;
    }

    return false;

  } catch (error) {
    logger.error('Error checking lead reply status:', error);
    return false;
  }
}

/**
 * Get appropriate follow-up template
 */
function getFollowUpTemplate(sequence, lead) {
  const templates = {
    'followup-1': 'followup-1', // First follow-up (3 days)
    'followup-2': 'followup-2', // Second follow-up (7 days)
    'case-study': 'case-study', // Case study (14 days)
    'final-touch': 'final-touch' // Final follow-up (21 days)
  };

  return templates[sequence] || 'followup-1';
}

/**
 * Record follow-up attempt in lead notes
 */
async function recordFollowUpAttempt(leadId, sequence) {
  try {
    const note = `Automated follow-up ${sequence} sent`;
    
    await supabase
      .from('lead_notes')
      .insert({
        lead_id: leadId,
        user_id: null, // System-generated
        note,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    logger.error('Error recording follow-up attempt:', error);
  }
}

/**
 * Check follow-up eligibility for a lead
 */
async function isEligibleForFollowUp(leadId, sequence) {
  try {
    // Get last message sent to this lead
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastMessage) {
      return false; // No initial email sent
    }

    // Check if enough time has passed
    const daysSinceLastEmail = Math.floor(
      (Date.now() - new Date(lastMessage.sent_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const minimumDays = {
      'followup-1': 3,
      'followup-2': 7,
      'case-study': 14,
      'final-touch': 21
    };

    return daysSinceLastEmail >= (minimumDays[sequence] || 3);

  } catch (error) {
    logger.error('Error checking follow-up eligibility:', error);
    return false;
  }
}

module.exports = { process, isEligibleForFollowUp };
