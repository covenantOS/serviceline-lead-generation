/**
 * Supabase Database Client
 * Handles all database operations for lead storage
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.warn('Supabase credentials not configured. Database operations will fail.');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Save a lead to Supabase
 */
async function saveLeadToSupabase(leadData) {
  if (!supabase) {
    logger.error('Supabase client not initialized');
    throw new Error('Database not configured');
  }

  try {
    // Check if lead already exists
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('company_name', leadData.company_name)
      .eq('address', leadData.address)
      .single();

    if (existing) {
      // Update existing lead
      const { data, error } = await supabase
        .from('leads')
        .update({
          ...leadData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();

      if (error) throw error;
      logger.debug(`Updated existing lead: ${leadData.company_name}`);
      return data[0];
    } else {
      // Insert new lead
      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select();

      if (error) throw error;
      logger.debug(`Inserted new lead: ${leadData.company_name}`);
      return data[0];
    }
  } catch (error) {
    logger.error('Error saving lead to Supabase:', error);
    throw error;
  }
}

/**
 * Update lead with scoring data
 */
async function updateLeadScore(leadId, scoreData) {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  try {
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
      .eq('id', leadId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    logger.error('Error updating lead score:', error);
    throw error;
  }
}

/**
 * Get leads by score range
 */
async function getLeadsByScore(minScore, maxScore = 100) {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .gte('score', minScore)
      .lte('score', maxScore)
      .order('score', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching leads by score:', error);
    throw error;
  }
}

/**
 * Get leads by tier
 */
async function getLeadsByTier(tier) {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('tier', tier)
      .order('score', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching leads by tier:', error);
    throw error;
  }
}

/**
 * Get leads by industry
 */
async function getLeadsByIndustry(industry) {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .ilike('industry', `%${industry}%`)
      .order('score', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching leads by industry:', error);
    throw error;
  }
}

/**
 * Update lead status
 */
async function updateLeadStatus(leadId, status) {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    logger.error('Error updating lead status:', error);
    throw error;
  }
}

/**
 * Get all unscored leads
 */
async function getUnscoredLeads() {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .is('score', null);

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching unscored leads:', error);
    throw error;
  }
}

module.exports = {
  supabase,
  saveLeadToSupabase,
  updateLeadScore,
  getLeadsByScore,
  getLeadsByTier,
  getLeadsByIndustry,
  updateLeadStatus,
  getUnscoredLeads
};
