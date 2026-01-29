/**
 * Lead Repository
 * Handles CRUD operations for leads in Supabase
 */

const supabaseClient = require('./supabase-client');
const logger = require('../utils/logger');

/**
 * Save lead to database
 */
async function saveLeadToDatabase(leadData) {
  try {
    const client = supabaseClient.getClient();

    // Check if lead already exists
    const existing = await findLeadByNameAndLocation(
      leadData.company_name,
      leadData.location
    );

    if (existing) {
      logger.info(`Lead already exists: ${leadData.company_name}`);
      return updateLead(existing.id, leadData);
    }

    // Insert new lead
    const { data, error } = await client
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) {
      logger.error('Error saving lead:', error);
      throw error;
    }

    logger.info(`Lead saved successfully: ${data.company_name} (ID: ${data.id})`);
    return data;

  } catch (error) {
    logger.error('Failed to save lead:', error);
    throw error;
  }
}

/**
 * Find lead by company name and location
 */
async function findLeadByNameAndLocation(companyName, location) {
  try {
    const client = supabaseClient.getClient();

    const { data, error } = await client
      .from('leads')
      .select('*')
      .eq('company_name', companyName)
      .eq('location', location)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data;

  } catch (error) {
    logger.error('Error finding lead:', error);
    return null;
  }
}

/**
 * Update existing lead
 */
async function updateLead(leadId, updates) {
  try {
    const client = supabaseClient.getClient();

    // Remove id from updates
    const { id, ...updateData } = updates;

    const { data, error } = await client
      .from('leads')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating lead:', error);
      throw error;
    }

    logger.info(`Lead updated: ${data.company_name}`);
    return data;

  } catch (error) {
    logger.error('Failed to update lead:', error);
    throw error;
  }
}

/**
 * Get lead by ID
 */
async function getLeadById(leadId) {
  try {
    const client = supabaseClient.getClient();

    const { data, error } = await client
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error) throw error;

    return data;

  } catch (error) {
    logger.error('Error fetching lead:', error);
    throw error;
  }
}

/**
 * Get all leads with filters
 */
async function getLeads(filters = {}, options = {}) {
  try {
    const client = supabaseClient.getClient();
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    let query = client
      .from('leads')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters.minScore) {
      query = query.gte('lead_score', filters.minScore);
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      leads: data,
      total: count,
      limit,
      offset
    };

  } catch (error) {
    logger.error('Error fetching leads:', error);
    throw error;
  }
}

/**
 * Delete lead
 */
async function deleteLead(leadId) {
  try {
    const client = supabaseClient.getClient();

    const { error } = await client
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) throw error;

    logger.info(`Lead deleted: ${leadId}`);
    return true;

  } catch (error) {
    logger.error('Error deleting lead:', error);
    throw error;
  }
}

/**
 * Bulk insert leads
 */
async function bulkInsertLeads(leads) {
  try {
    const client = supabaseClient.getClient();

    const { data, error } = await client
      .from('leads')
      .insert(leads)
      .select();

    if (error) throw error;

    logger.info(`Bulk inserted ${data.length} leads`);
    return data;

  } catch (error) {
    logger.error('Error bulk inserting leads:', error);
    throw error;
  }
}

/**
 * Get lead statistics
 */
async function getLeadStats() {
  try {
    const client = supabaseClient.getClient();

    // Total leads
    const { count: totalLeads } = await client
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // Leads by status
    const { data: statusData } = await client
      .from('leads')
      .select('status')
      .order('status');

    const leadsByStatus = statusData.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    // Leads by industry
    const { data: industryData } = await client
      .from('leads')
      .select('industry')
      .order('industry');

    const leadsByIndustry = industryData.reduce((acc, lead) => {
      acc[lead.industry] = (acc[lead.industry] || 0) + 1;
      return acc;
    }, {});

    return {
      totalLeads,
      leadsByStatus,
      leadsByIndustry
    };

  } catch (error) {
    logger.error('Error fetching lead stats:', error);
    throw error;
  }
}

module.exports = {
  saveLeadToDatabase,
  findLeadByNameAndLocation,
  updateLead,
  getLeadById,
  getLeads,
  deleteLead,
  bulkInsertLeads,
  getLeadStats
};
