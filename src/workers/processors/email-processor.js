/**
 * Email Job Processor
 * Handles email sending jobs from the queue with retry logic
 */

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Email transporter configuration
let transporter;

function getTransporter() {
  if (!transporter) {
    if (process.env.EMAIL_SERVICE === 'sendgrid') {
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else {
      // Default SMTP
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }
  return transporter;
}

/**
 * Process email job
 */
async function process(job) {
  const { 
    leadId, 
    templateType, 
    industry, 
    campaignId,
    customVariables,
    priority 
  } = job.data;

  logger.info(`Processing email job for lead ${leadId}`);

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

    // Check if lead has email
    if (!lead.email) {
      logger.warn(`Lead ${leadId} has no email address, skipping`);
      return { skipped: true, reason: 'no_email' };
    }

    // Load and compile email template
    const emailContent = await loadEmailTemplate(
      templateType, 
      industry, 
      lead,
      customVariables
    );

    // Send email
    const result = await sendEmail(lead.email, emailContent);

    // Record message in database
    await recordMessage(leadId, campaignId, emailContent, result);

    // Update lead status
    await updateLeadStatus(leadId, 'contacted');

    logger.info(`Email sent successfully to lead ${leadId}`);

    return {
      success: true,
      leadId,
      messageId: result.messageId,
      recipient: lead.email
    };

  } catch (error) {
    logger.error(`Email job failed for lead ${leadId}:`, error);

    // Record failed message
    await recordMessage(leadId, job.data.campaignId, null, null, error.message);

    throw error;
  }
}

/**
 * Load and compile email template
 */
async function loadEmailTemplate(templateType, industry, lead, customVariables = {}) {
  const templatePath = path.join(
    __dirname, 
    '../../templates',
    industry?.toLowerCase() || 'generic',
    `${templateType}.hbs`
  );

  let templateContent;
  
  try {
    templateContent = await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    // Fall back to generic template
    const genericPath = path.join(__dirname, '../../templates/generic', `${templateType}.hbs`);
    templateContent = await fs.readFile(genericPath, 'utf-8');
  }

  // Compile template
  const template = handlebars.compile(templateContent);

  // Prepare variables
  const variables = {
    companyName: lead.company_name,
    contactName: extractFirstName(lead.company_name),
    industry: lead.industry,
    location: lead.city || lead.location || '',
    website: lead.website || 'your website',
    score: lead.lead_score,
    recommendations: lead.recommendations || [],
    senderName: process.env.FROM_NAME || 'ServiceLine Team',
    senderEmail: process.env.FROM_EMAIL,
    senderPhone: process.env.SENDER_PHONE || '',
    ...customVariables
  };

  // Compile HTML and text
  const html = template(variables);
  const subject = generateSubject(templateType, lead);

  return {
    subject,
    html,
    text: stripHtml(html)
  };
}

/**
 * Send email via transporter
 */
async function sendEmail(to, content) {
  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    headers: {
      'X-Lead-Generation': 'ServiceLine',
      'X-Auto-Generated': 'true'
    }
  };

  const transport = getTransporter();
  const result = await transport.sendMail(mailOptions);

  return result;
}

/**
 * Record message in database
 */
async function recordMessage(leadId, campaignId, content, result, errorMessage = null) {
  try {
    const messageData = {
      lead_id: leadId,
      campaign_id: campaignId || null,
      subject: content?.subject || null,
      body: content?.html || null,
      status: errorMessage ? 'failed' : 'sent',
      error_message: errorMessage,
      message_id: result?.messageId || null,
      sent_at: errorMessage ? null : new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('messages')
      .insert(messageData);

    if (error) {
      logger.error('Failed to record message:', error);
    }
  } catch (error) {
    logger.error('Error recording message:', error);
  }
}

/**
 * Update lead status
 */
async function updateLeadStatus(leadId, status) {
  try {
    const { error } = await supabase
      .from('leads')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) {
      logger.error('Failed to update lead status:', error);
    }
  } catch (error) {
    logger.error('Error updating lead status:', error);
  }
}

/**
 * Generate email subject based on template type
 */
function generateSubject(templateType, lead) {
  const subjects = {
    'intro': `Boost ${lead.company_name}'s Online Visibility`,
    'followup-1': `Following up: Digital Marketing for ${lead.company_name}`,
    'followup-2': `Quick question about ${lead.company_name}'s marketing`,
    'case-study': `How we helped similar ${lead.industry} businesses grow`,
    'hot-lead': `Exclusive offer for ${lead.company_name}`,
    'default': `ServiceLine - Digital Marketing Solutions`
  };

  return subjects[templateType] || subjects['default'];
}

/**
 * Extract first name from company name
 */
function extractFirstName(companyName) {
  // Try to extract owner name or use company name
  const name = companyName.split(/['\s-]/)[0];
  return name.replace(/[^a-zA-Z]/g, '');
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>.*<\/style>/gm, '')
    .replace(/<script[^>]*>.*<\/script>/gm, '')
    .replace(/<[^>]+>/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { process };
