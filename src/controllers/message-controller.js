/**
 * Message Controller
 * Handles messaging operations
 */

const { supabase } = require('../database/supabase-client');
const templateRenderer = require('../templates/utils/template-renderer');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');

// Email transporter (configure based on your email service)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * List messages
 */
async function listMessages(req, res) {
  const { 
    campaignId, 
    leadId, 
    status, 
    limit = 50, 
    offset = 0 
  } = req.query;

  let query = supabase
    .from('messages')
    .select('*, leads(company_name), campaigns(name)', { count: 'exact' });

  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }
  if (leadId) {
    query = query.eq('lead_id', leadId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  query = query
    .order('sent_at', { ascending: false })
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
 * Send message
 */
async function sendMessage(req, res) {
  const { 
    leadId, 
    campaignId, 
    templateId, 
    variables, 
    subject, 
    body 
  } = req.body;

  // Get lead details
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Lead not found'
    });
  }

  if (!lead.email) {
    return res.status(400).json({
      error: 'Invalid lead',
      message: 'Lead has no email address'
    });
  }

  let emailSubject = subject;
  let emailBody = body;

  // Render template if provided
  if (templateId) {
    try {
      const rendered = await templateRenderer.render(templateId, {
        ...variables,
        companyName: lead.company_name,
        firstName: variables?.firstName || 'there',
        city: lead.city,
        website: lead.website
      });
      emailSubject = rendered.subject;
      emailBody = rendered.body;
    } catch (error) {
      return res.status(400).json({
        error: 'Template error',
        message: error.message
      });
    }
  }

  try {
    // Send email
    const info = await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: lead.email,
      subject: emailSubject,
      text: emailBody,
      html: emailBody.replace(/\n/g, '<br>')
    });

    // Save message record
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert([{
        lead_id: leadId,
        campaign_id: campaignId,
        template_id: templateId,
        subject: emailSubject,
        body: emailBody,
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: req.user.id,
        message_id: info.messageId
      }])
      .select()
      .single();

    if (messageError) throw messageError;

    logger.info(`Email sent to ${lead.email} (Lead: ${leadId})`);

    res.json({
      success: true,
      message: 'Email sent successfully',
      data: message
    });

  } catch (error) {
    logger.error('Error sending email:', error);
    
    // Save failed message record
    await supabase
      .from('messages')
      .insert([{
        lead_id: leadId,
        campaign_id: campaignId,
        template_id: templateId,
        subject: emailSubject,
        body: emailBody,
        status: 'failed',
        error_message: error.message,
        sent_by: req.user.id
      }]);

    return res.status(500).json({
      error: 'Email send failed',
      message: error.message
    });
  }
}

/**
 * List email templates
 */
async function listTemplates(req, res) {
  const { industry } = req.query;

  const templateConfig = require('../templates/template-config.json');
  
  let templates = [];

  if (industry) {
    const industryData = templateConfig.industries[industry.toLowerCase()];
    if (industryData) {
      templates = industryData.templates;
    }
  } else {
    // Return all templates
    Object.values(templateConfig.industries).forEach(ind => {
      templates.push(...ind.templates);
    });
  }

  // Add shared templates
  templates.push(...templateConfig.sharedTemplates);

  res.json({
    success: true,
    data: templates,
    count: templates.length
  });
}

/**
 * Preview template
 */
async function previewTemplate(req, res) {
  const { templateId } = req.params;
  const { industry = 'hvac', variables = {} } = req.query;

  try {
    const preview = await templateRenderer.preview(templateId, industry);
    
    res.json({
      success: true,
      preview: {
        subject: preview.subject,
        body: preview.body
      }
    });

  } catch (error) {
    return res.status(404).json({
      error: 'Template not found',
      message: error.message
    });
  }
}

/**
 * Get message by ID
 */
async function getMessage(req, res) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('messages')
    .select('*, leads(company_name, email), campaigns(name)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Message not found'
    });
  }

  res.json({
    success: true,
    data
  });
}

module.exports = {
  listMessages,
  sendMessage,
  listTemplates,
  previewTemplate,
  getMessage
};
