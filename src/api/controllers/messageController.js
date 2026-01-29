/**
 * Message Controller
 * Handles email messaging operations
 */

const { supabase } = require('../../database/supabase-client');
const templateRenderer = require('../../templates/utils/template-renderer');
const emailService = require('../../services/email-service');
const logger = require('../../utils/logger');
const templateConfig = require('../../templates/template-config.json');

/**
 * Get all messages with filtering
 */
exports.getMessages = async (req, res, next) => {
  try {
    const {
      leadId,
      campaignId,
      status,
      page = 1,
      limit = 50
    } = req.query;

    let query = supabase.from('messages').select('*', { count: 'exact' });

    if (leadId) query = query.eq('lead_id', leadId);
    if (campaignId) query = query.eq('campaign_id', campaignId);
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
    logger.error('Error fetching messages:', error);
    next(error);
  }
};

/**
 * Get specific message
 */
exports.getMessageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Error fetching message:', error);
    next(error);
  }
};

/**
 * Send email to lead
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { leadId, templatePath, variables, campaignId } = req.body;

    // Fetch lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;

    if (!lead || !lead.email) {
      return res.status(400).json({
        success: false,
        message: 'Lead not found or email missing'
      });
    }

    // Render template
    const mergedVariables = {
      firstName: lead.company_name.split(' ')[0],
      companyName: lead.company_name,
      city: lead.city,
      ...variables
    };

    const rendered = await templateRenderer.render(templatePath, mergedVariables);

    // Send email
    const result = await emailService.send({
      to: lead.email,
      subject: rendered.subject,
      body: rendered.body
    });

    // Save message record
    const messageData = {
      lead_id: leadId,
      campaign_id: campaignId || null,
      template_path: templatePath,
      subject: rendered.subject,
      body: rendered.body,
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: req.user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select()
      .single();

    if (error) throw error;

    logger.info(`Email sent to ${lead.email}: ${rendered.subject}`);

    res.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        message: data,
        emailResult: result
      }
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    next(error);
  }
};

/**
 * Send bulk emails
 */
exports.sendBulkMessages = async (req, res, next) => {
  try {
    const { leadIds, templatePath, variables, campaignId } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'leadIds array is required'
      });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const leadId of leadIds) {
      try {
        // Fetch lead
        const { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (!lead || !lead.email) {
          results.failed++;
          results.errors.push({ leadId, error: 'Lead not found or email missing' });
          continue;
        }

        // Render template
        const mergedVariables = {
          firstName: lead.company_name.split(' ')[0],
          companyName: lead.company_name,
          city: lead.city,
          ...variables
        };

        const rendered = await templateRenderer.render(templatePath, mergedVariables);

        // Send email
        await emailService.send({
          to: lead.email,
          subject: rendered.subject,
          body: rendered.body
        });

        // Save message record
        await supabase.from('messages').insert([{
          lead_id: leadId,
          campaign_id: campaignId || null,
          template_path: templatePath,
          subject: rendered.subject,
          body: rendered.body,
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_by: req.user.id,
          created_at: new Date().toISOString()
        }]);

        results.sent++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.failed++;
        results.errors.push({ leadId, error: error.message });
        logger.error(`Error sending to lead ${leadId}:`, error);
      }
    }

    logger.info(`Bulk send complete: ${results.sent} sent, ${results.failed} failed`);

    res.json({
      success: true,
      message: `Sent ${results.sent} emails, ${results.failed} failed`,
      data: results
    });
  } catch (error) {
    logger.error('Error sending bulk messages:', error);
    next(error);
  }
};

/**
 * Get all available templates
 */
exports.getTemplates = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: templateConfig
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    next(error);
  }
};

/**
 * Get templates for specific industry
 */
exports.getTemplatesByIndustry = async (req, res, next) => {
  try {
    const { industry } = req.params;
    const industryLower = industry.toLowerCase();

    const industryConfig = templateConfig.industries[industryLower];

    if (!industryConfig) {
      return res.status(404).json({
        success: false,
        message: 'Industry not found'
      });
    }

    res.json({
      success: true,
      data: industryConfig
    });
  } catch (error) {
    logger.error('Error fetching industry templates:', error);
    next(error);
  }
};

/**
 * Preview template with data
 */
exports.previewTemplate = async (req, res, next) => {
  try {
    const { templatePath, variables, industry } = req.body;

    if (!templatePath) {
      return res.status(400).json({
        success: false,
        message: 'templatePath is required'
      });
    }

    let previewData;
    if (variables) {
      previewData = await templateRenderer.render(templatePath, variables);
    } else {
      previewData = await templateRenderer.preview(templatePath, industry || 'hvac');
    }

    res.json({
      success: true,
      data: previewData
    });
  } catch (error) {
    logger.error('Error previewing template:', error);
    next(error);
  }
};

/**
 * Get all messages for a specific lead
 */
exports.getMessagesByLead = async (req, res, next) => {
  try {
    const { leadId } = req.params;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Error fetching messages by lead:', error);
    next(error);
  }
};
