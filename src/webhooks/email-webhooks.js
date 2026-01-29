/**
 * Email Webhook Handlers
 * Process webhooks from SendGrid, Mailgun, etc. for email tracking
 */

const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');
const { addJob } = require('../queues/queue-config');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Handle SendGrid webhook events
 */
async function handleSendGridWebhook(req, res) {
  try {
    const events = req.body;

    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    for (const event of events) {
      await processSendGridEvent(event);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('SendGrid webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Process individual SendGrid event
 */
async function processSendGridEvent(event) {
  const { 
    event: eventType, 
    email, 
    sg_message_id,
    timestamp,
    url 
  } = event;

  logger.info(`SendGrid event: ${eventType} for ${email}`);

  try {
    // Find message by SendGrid message ID
    const { data: message } = await supabase
      .from('messages')
      .select('*, leads(id, status)')
      .eq('message_id', sg_message_id)
      .single();

    if (!message) {
      logger.warn(`Message not found for SendGrid ID: ${sg_message_id}`);
      return;
    }

    const leadId = message.lead_id;
    const updateData = {};

    // Handle different event types
    switch (eventType) {
      case 'delivered':
        updateData.status = 'delivered';
        updateData.delivered_at = new Date(timestamp * 1000).toISOString();
        await updateLeadStatus(leadId, 'contacted');
        break;

      case 'open':
        updateData.opened_at = new Date(timestamp * 1000).toISOString();
        await handleEmailOpened(leadId, message);
        break;

      case 'click':
        updateData.clicked_at = new Date(timestamp * 1000).toISOString();
        await handleEmailClicked(leadId, message, url);
        break;

      case 'bounce':
      case 'dropped':
        updateData.status = 'bounced';
        updateData.error_message = event.reason || 'Email bounced';
        await updateLeadStatus(leadId, 'lost', 'Email bounced');
        break;

      case 'spam_report':
        updateData.status = 'failed';
        updateData.error_message = 'Marked as spam';
        await updateLeadStatus(leadId, 'lost', 'Marked as spam');
        break;

      default:
        logger.debug(`Unhandled event type: ${eventType}`);
    }

    // Update message record
    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('messages')
        .update(updateData)
        .eq('id', message.id);
    }

  } catch (error) {
    logger.error('Error processing SendGrid event:', error);
  }
}

/**
 * Handle Mailgun webhook events
 */
async function handleMailgunWebhook(req, res) {
  try {
    const event = req.body;

    logger.info(`Mailgun event: ${event.event} for ${event.recipient}`);

    // Find message by Mailgun message ID
    const messageId = event['message-id']?.replace(/[<>]/g, '');
    
    const { data: message } = await supabase
      .from('messages')
      .select('*, leads(id, status)')
      .eq('message_id', messageId)
      .single();

    if (!message) {
      logger.warn(`Message not found for Mailgun ID: ${messageId}`);
      return res.status(200).json({ received: true });
    }

    const leadId = message.lead_id;
    const updateData = {};

    // Handle event
    switch (event.event) {
      case 'delivered':
        updateData.status = 'delivered';
        updateData.delivered_at = new Date(event.timestamp * 1000).toISOString();
        await updateLeadStatus(leadId, 'contacted');
        break;

      case 'opened':
        updateData.opened_at = new Date(event.timestamp * 1000).toISOString();
        await handleEmailOpened(leadId, message);
        break;

      case 'clicked':
        updateData.clicked_at = new Date(event.timestamp * 1000).toISOString();
        await handleEmailClicked(leadId, message, event.url);
        break;

      case 'bounced':
      case 'failed':
        updateData.status = 'bounced';
        updateData.error_message = event.error || 'Email bounced';
        await updateLeadStatus(leadId, 'lost', 'Email bounced');
        break;

      case 'complained':
        updateData.status = 'failed';
        updateData.error_message = 'Spam complaint';
        await updateLeadStatus(leadId, 'lost', 'Spam complaint');
        break;
    }

    // Update message
    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('messages')
        .update(updateData)
        .eq('id', message.id);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Mailgun webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle email opened event
 */
async function handleEmailOpened(leadId, message) {
  try {
    logger.info(`Lead ${leadId} opened email`);

    // Update lead engagement score
    await incrementEngagementScore(leadId, 5);

    // Record activity note
    await recordLeadActivity(leadId, 'Email opened', 'system');

    // If this is first open, consider it qualified interest
    const { data: opens } = await supabase
      .from('messages')
      .select('opened_at')
      .eq('lead_id', leadId)
      .not('opened_at', 'is', null);

    if (opens && opens.length === 1) {
      // First email open - high interest signal
      await updateLeadStatus(leadId, 'qualified', 'Opened first email');
      
      // Queue enrichment job to get more data
      await addJob('enrichment', 'enrich-engaged-lead', {
        leadId,
        enrichmentType: 'all'
      }, {
        priority: 7
      });
    }

  } catch (error) {
    logger.error('Error handling email opened:', error);
  }
}

/**
 * Handle email clicked event
 */
async function handleEmailClicked(leadId, message, url) {
  try {
    logger.info(`Lead ${leadId} clicked link: ${url}`);

    // Update lead engagement score
    await incrementEngagementScore(leadId, 10);

    // Record activity
    await recordLeadActivity(leadId, `Clicked link: ${url}`, 'system');

    // High engagement signal - mark as qualified
    await updateLeadStatus(leadId, 'qualified', 'Clicked email link');

    // Cancel automated follow-ups (they're engaged!)
    await cancelScheduledFollowUps(leadId);

    // Notify sales team (can be extended to Slack/email notification)
    logger.info(`🔥 Hot lead alert: Lead ${leadId} is highly engaged!`);

  } catch (error) {
    logger.error('Error handling email clicked:', error);
  }
}

/**
 * Update lead status
 */
async function updateLeadStatus(leadId, status, notes = null) {
  try {
    await supabase
      .from('leads')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (notes) {
      await recordLeadActivity(leadId, notes, 'system');
    }

  } catch (error) {
    logger.error('Error updating lead status:', error);
  }
}

/**
 * Increment lead engagement score
 */
async function incrementEngagementScore(leadId, points) {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('lead_score')
      .eq('id', leadId)
      .single();

    if (lead) {
      const newScore = Math.min((lead.lead_score || 0) + points, 100);
      
      await supabase
        .from('leads')
        .update({
          lead_score: newScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);
    }

  } catch (error) {
    logger.error('Error incrementing engagement score:', error);
  }
}

/**
 * Record lead activity
 */
async function recordLeadActivity(leadId, note, userId = null) {
  try {
    await supabase
      .from('lead_notes')
      .insert({
        lead_id: leadId,
        user_id: userId,
        note,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    logger.error('Error recording lead activity:', error);
  }
}

/**
 * Cancel scheduled follow-ups for engaged lead
 */
async function cancelScheduledFollowUps(leadId) {
  try {
    const { queues } = require('../queues/queue-config');
    const followupQueue = queues.followup;

    // Get all delayed jobs
    const delayedJobs = await followupQueue.getDelayed();

    // Cancel jobs for this lead
    for (const job of delayedJobs) {
      if (job.data.leadId === leadId) {
        await job.remove();
        logger.info(`Cancelled follow-up job ${job.id} for engaged lead ${leadId}`);
      }
    }

  } catch (error) {
    logger.error('Error cancelling follow-ups:', error);
  }
}

module.exports = {
  handleSendGridWebhook,
  handleMailgunWebhook
};
