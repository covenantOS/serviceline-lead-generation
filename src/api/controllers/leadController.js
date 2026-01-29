/**
 * Lead Controller
 * Handles lead management operations
 */

const { supabase } = require('../../database/supabase-client');
const LeadScorer = require('../../scoring/lead-scorer');
const logger = require('../../utils/logger');

const leadScorer = new LeadScorer();

/**
 * Get all leads with filtering
 */
exports.getLeads = async (req, res, next) => {
  try {
    const {
      industry,
      minScore,
      maxScore,
      status,
      location,
      tier,
      source,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase.from('leads').select('*', { count: 'exact' });

    // Apply filters
    if (industry) query = query.eq('industry', industry);
    if (status) query = query.eq('status', status);
    if (tier) query = query.eq('tier', tier);
    if (source) query = query.eq('source', source);
    if (location) query = query.ilike('location', `%${location}%`);
    if (minScore) query = query.gte('score', parseInt(minScore));
    if (maxScore) query = query.lte('score', parseInt(maxScore));

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
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
    logger.error('Error fetching leads:', error);
    next(error);
  }
};

/**
 * Get specific lead by ID
 */
exports.getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Error fetching lead:', error);
    next(error);
  }
};

/**
 * Create new lead
 */
exports.createLead = async (req, res, next) => {
  try {
    const leadData = {
      ...req.body,
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Calculate score if data available
    if (leadData.website || leadData.rating) {
      const scoreData = leadScorer.calculateScore(leadData);
      leadData.score = scoreData.totalScore;
      leadData.tier = scoreData.tier;
      leadData.component_scores = scoreData.componentScores;
      leadData.recommendations = scoreData.recommendations;
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) throw error;

    logger.info(`Lead created: ${data.company_name} (ID: ${data.id})`);

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: data
    });
  } catch (error) {
    logger.error('Error creating lead:', error);
    next(error);
  }
};

/**
 * Update lead
 */
exports.updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    logger.info(`Lead updated: ${data.company_name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: data
    });
  } catch (error) {
    logger.error('Error updating lead:', error);
    next(error);
  }
};

/**
 * Delete lead
 */
exports.deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info(`Lead deleted: ${id}`);

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting lead:', error);
    next(error);
  }
};

/**
 * Bulk import leads
 */
exports.bulkImportLeads = async (req, res, next) => {
  try {
    const { leads } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Leads array is required and must not be empty'
      });
    }

    // Add metadata to each lead
    const leadsWithMeta = leads.map(lead => ({
      ...lead,
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('leads')
      .insert(leadsWithMeta)
      .select();

    if (error) throw error;

    logger.info(`Bulk import: ${data.length} leads created`);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${data.length} leads`,
      data: {
        imported: data.length,
        leads: data
      }
    });
  } catch (error) {
    logger.error('Error bulk importing leads:', error);
    next(error);
  }
};

/**
 * Update lead status
 */
exports.updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const { data, error } = await supabase
      .from('leads')
      .update({
        status,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Lead status updated: ${id} -> ${status}`);

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: data
    });
  } catch (error) {
    logger.error('Error updating lead status:', error);
    next(error);
  }
};

/**
 * Recalculate lead score
 */
exports.recalculateScore = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch lead data
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Recalculate score
    const scoreData = leadScorer.calculateScore(lead);

    // Update lead with new score
    const { data, error } = await supabase
      .from('leads')
      .update({
        score: scoreData.totalScore,
        tier: scoreData.tier,
        component_scores: scoreData.componentScores,
        recommendations: scoreData.recommendations,
        scored_at: scoreData.calculatedAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Lead score recalculated: ${id} -> ${scoreData.totalScore}`);

    res.json({
      success: true,
      message: 'Score recalculated successfully',
      data: {
        lead: data,
        scoreBreakdown: scoreData
      }
    });
  } catch (error) {
    logger.error('Error recalculating score:', error);
    next(error);
  }
};

/**
 * Add note to lead
 */
exports.addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const noteData = {
      lead_id: id,
      content: note,
      created_by: req.user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('lead_notes')
      .insert([noteData])
      .select()
      .single();

    if (error) throw error;

    logger.info(`Note added to lead: ${id}`);

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: data
    });
  } catch (error) {
    logger.error('Error adding note:', error);
    next(error);
  }
};

/**
 * Get lead interaction history
 */
exports.getLeadHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get messages sent to this lead
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    if (msgError) throw msgError;

    // Get notes
    const { data: notes, error: noteError } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    if (noteError) throw noteError;

    res.json({
      success: true,
      data: {
        messages: messages || [],
        notes: notes || [],
        totalInteractions: (messages?.length || 0) + (notes?.length || 0)
      }
    });
  } catch (error) {
    logger.error('Error fetching lead history:', error);
    next(error);
  }
};

/**
 * Get lead statistics
 */
exports.getLeadStats = async (req, res, next) => {
  try {
    // Total leads
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // Leads by status
    const { data: statusData } = await supabase
      .from('leads')
      .select('status');

    const byStatus = statusData.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    // Leads by tier
    const { data: tierData } = await supabase
      .from('leads')
      .select('tier');

    const byTier = tierData.reduce((acc, lead) => {
      if (lead.tier) {
        acc[lead.tier] = (acc[lead.tier] || 0) + 1;
      }
      return acc;
    }, {});

    // Leads by industry
    const { data: industryData } = await supabase
      .from('leads')
      .select('industry');

    const byIndustry = industryData.reduce((acc, lead) => {
      if (lead.industry) {
        acc[lead.industry] = (acc[lead.industry] || 0) + 1;
      }
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total: totalLeads,
        byStatus,
        byTier,
        byIndustry
      }
    });
  } catch (error) {
    logger.error('Error fetching lead stats:', error);
    next(error);
  }
};
