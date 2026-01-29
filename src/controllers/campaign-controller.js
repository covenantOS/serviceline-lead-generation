/**
 * Campaign Controller
 * Handles email campaign operations
 */

const { supabase } = require('../database/supabase-client');
const logger = require('../utils/logger');

/**
 * List campaigns
 */
async function listCampaigns(req, res) {
  const { status, type, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('campaigns')
    .select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }
  if (type) {
    query = query.eq('type', type);
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
 * Get campaign by ID
 */
async function getCampaign(req, res) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Campaign not found'
    });
  }

  res.json({
    success: true,
    data
  });
}

/**
 * Create campaign
 */
async function createCampaign(req, res) {
  const campaignData = {
    ...req.body,
    created_by: req.user.id,
    status: 'draft',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('campaigns')
    .insert([campaignData])
    .select()
    .single();

  if (error) throw error;

  logger.info(`Campaign created: ${data.name} by user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Campaign created successfully',
    data
  });
}

/**
 * Update campaign
 */
async function updateCampaign(req, res) {
  const { id } = req.params;
  const updates = {
    ...req.body,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (!data) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Campaign not found'
    });
  }

  res.json({
    success: true,
    message: 'Campaign updated successfully',
    data
  });
}

/**
 * Delete campaign
 */
async function deleteCampaign(req, res) {
  const { id } = req.params;

  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) throw error;

  logger.info(`Campaign deleted: ${id} by user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Campaign deleted successfully'
  });
}

/**
 * Get campaign statistics
 */
async function getCampaignStats(req, res) {
  const { id } = req.params;

  // Get campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (campaignError || !campaign) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Campaign not found'
    });
  }

  // Get message stats
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('status, sent_at, opened_at, clicked_at')
    .eq('campaign_id', id);

  if (messagesError) throw messagesError;

  const stats = {
    totalSent: messages.length,
    delivered: messages.filter(m => m.status === 'delivered').length,
    failed: messages.filter(m => m.status === 'failed').length,
    opened: messages.filter(m => m.opened_at).length,
    clicked: messages.filter(m => m.clicked_at).length,
    openRate: 0,
    clickRate: 0
  };

  if (stats.delivered > 0) {
    stats.openRate = ((stats.opened / stats.delivered) * 100).toFixed(2);
    stats.clickRate = ((stats.clicked / stats.delivered) * 100).toFixed(2);
  }

  res.json({
    success: true,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status
    },
    stats
  });
}

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignStats
};
