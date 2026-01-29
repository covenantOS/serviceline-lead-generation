/**
 * Campaign Controller
 * Handles campaign management operations
 */

const { supabase } = require('../../database/supabase-client');
const logger = require('../../utils/logger');

/**
 * Get all campaigns
 */
exports.getCampaigns = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = supabase.from('campaigns').select('*', { count: 'exact' });

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
    logger.error('Error fetching campaigns:', error);
    next(error);
  }
};

/**
 * Get specific campaign
 */
exports.getCampaignById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Error fetching campaign:', error);
    next(error);
  }
};

/**
 * Create new campaign
 */
exports.createCampaign = async (req, res, next) => {
  try {
    const campaignData = {
      ...req.body,
      status: 'draft',
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('campaigns')
      .insert([campaignData])
      .select()
      .single();

    if (error) throw error;

    logger.info(`Campaign created: ${data.name} (ID: ${data.id})`);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: data
    });
  } catch (error) {
    logger.error('Error creating campaign:', error);
    next(error);
  }
};

/**
 * Update campaign
 */
exports.updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;

    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Campaign updated: ${id}`);

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: data
    });
  } catch (error) {
    logger.error('Error updating campaign:', error);
    next(error);
  }
};

/**
 * Delete campaign
 */
exports.deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info(`Campaign deleted: ${id}`);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting campaign:', error);
    next(error);
  }
};

/**
 * Start campaign
 */
exports.startCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Campaign started: ${id}`);

    // TODO: Trigger campaign execution logic

    res.json({
      success: true,
      message: 'Campaign started successfully',
      data: data
    });
  } catch (error) {
    logger.error('Error starting campaign:', error);
    next(error);
  }
};

/**
 * Pause campaign
 */
exports.pauseCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Campaign paused: ${id}`);

    res.json({
      success: true,
      message: 'Campaign paused successfully',
      data: data
    });
  } catch (error) {
    logger.error('Error pausing campaign:', error);
    next(error);
  }
};

/**
 * Add leads to campaign
 */
exports.addLeadsToCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { leadIds } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'leadIds array is required'
      });
    }

    // Create campaign_leads entries
    const campaignLeads = leadIds.map(leadId => ({
      campaign_id: id,
      lead_id: leadId,
      added_at: new Date().toISOString(),
      status: 'pending'
    }));

    const { data, error } = await supabase
      .from('campaign_leads')
      .insert(campaignLeads)
      .select();

    if (error) throw error;

    logger.info(`${leadIds.length} leads added to campaign ${id}`);

    res.json({
      success: true,
      message: `Successfully added ${leadIds.length} leads to campaign`,
      data: data
    });
  } catch (error) {
    logger.error('Error adding leads to campaign:', error);
    next(error);
  }
};

/**
 * Get campaign statistics
 */
exports.getCampaignStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get campaign leads count
    const { count: totalLeads } = await supabase
      .from('campaign_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id);

    // Get messages sent
    const { count: messagesSent } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id);

    // Get opened messages
    const { count: messagesOpened } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('opened', true);

    // Get clicked messages
    const { count: messagesClicked } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('clicked', true);

    // Get replies
    const { count: replies } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('replied', true);

    const openRate = messagesSent > 0 ? ((messagesOpened / messagesSent) * 100).toFixed(2) : 0;
    const clickRate = messagesSent > 0 ? ((messagesClicked / messagesSent) * 100).toFixed(2) : 0;
    const replyRate = messagesSent > 0 ? ((replies / messagesSent) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        totalLeads,
        messagesSent,
        messagesOpened,
        messagesClicked,
        replies,
        openRate: `${openRate}%`,
        clickRate: `${clickRate}%`,
        replyRate: `${replyRate}%`
      }
    });
  } catch (error) {
    logger.error('Error fetching campaign stats:', error);
    next(error);
  }
};
