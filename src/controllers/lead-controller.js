/**
 * Lead Controller
 * Handles lead management operations
 */

const { 
  getLeads,
  getLeadById,
  saveLeadToDatabase,
  updateLead,
  deleteLead as deleteLeadFromDB,
  bulkInsertLeads
} = require('../database/lead-repository');
const LeadScorer = require('../scoring/lead-scorer');
const logger = require('../utils/logger');

const scorer = new LeadScorer();

/**
 * List leads with filtering and pagination
 */
async function listLeads(req, res) {
  const { 
    industry, 
    status, 
    location, 
    minScore, 
    maxScore, 
    tier,
    search,
    limit = 50, 
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const filters = {
    industry,
    status,
    location,
    minScore: minScore ? parseInt(minScore) : undefined,
    maxScore: maxScore ? parseInt(maxScore) : undefined,
    tier,
    search
  };

  const options = {
    limit: parseInt(limit),
    offset: parseInt(offset),
    sortBy,
    sortOrder
  };

  const result = await getLeads(filters, options);

  res.json({
    success: true,
    data: result.leads,
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.offset + result.leads.length < result.total
    }
  });
}

/**
 * Get specific lead by ID
 */
async function getLead(req, res) {
  const { id } = req.params;

  const lead = await getLeadById(id);

  if (!lead) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Lead not found'
    });
  }

  res.json({
    success: true,
    data: lead
  });
}

/**
 * Create new lead
 */
async function createLead(req, res) {
  const leadData = {
    ...req.body,
    created_by: req.user.id,
    status: req.body.status || 'new'
  };

  // Save lead
  const lead = await saveLeadToDatabase(leadData);

  // Score lead if data is available
  if (lead.website || lead.rating) {
    try {
      const scoreData = scorer.calculateScore(lead);
      const updatedLead = await updateLead(lead.id, {
        lead_score: scoreData.totalScore,
        tier: scoreData.tier,
        recommendations: scoreData.recommendations
      });
      
      return res.status(201).json({
        success: true,
        message: 'Lead created and scored successfully',
        data: updatedLead
      });
    } catch (error) {
      logger.error('Error scoring new lead:', error);
    }
  }

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: lead
  });
}

/**
 * Update lead
 */
async function updateLead(req, res) {
  const { id } = req.params;
  const updates = req.body;

  // Check if lead exists
  const existingLead = await getLeadById(id);
  if (!existingLead) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Lead not found'
    });
  }

  // Update lead
  const updatedLead = await updateLead(id, {
    ...updates,
    updated_by: req.user.id
  });

  res.json({
    success: true,
    message: 'Lead updated successfully',
    data: updatedLead
  });
}

/**
 * Delete lead
 */
async function deleteLead(req, res) {
  const { id } = req.params;

  // Check if lead exists
  const existingLead = await getLeadById(id);
  if (!existingLead) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Lead not found'
    });
  }

  await deleteLeadFromDB(id);

  logger.info(`Lead deleted: ${id} by user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Lead deleted successfully'
  });
}

/**
 * Bulk import leads
 */
async function bulkImportLeads(req, res) {
  const { leads } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Leads array is required and must not be empty'
    });
  }

  // Add metadata to each lead
  const leadsWithMetadata = leads.map(lead => ({
    ...lead,
    created_by: req.user.id,
    status: lead.status || 'new',
    imported_at: new Date().toISOString()
  }));

  // Bulk insert
  const insertedLeads = await bulkInsertLeads(leadsWithMetadata);

  logger.info(`Bulk import: ${insertedLeads.length} leads by user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: `Successfully imported ${insertedLeads.length} leads`,
    imported: insertedLeads.length
  });
}

/**
 * Export leads as CSV
 */
async function exportLeads(req, res) {
  const { industry, status, minScore } = req.query;

  const filters = { industry, status, minScore: minScore ? parseInt(minScore) : undefined };
  const result = await getLeads(filters, { limit: 10000 });

  // Generate CSV
  const csvHeader = 'Company Name,Email,Phone,Website,Industry,Score,Tier,Status,Location\n';
  const csvRows = result.leads.map(lead => 
    `"${lead.company_name || ''}","${lead.email || ''}","${lead.phone || ''}","${lead.website || ''}","${lead.industry || ''}",${lead.lead_score || ''},"${lead.tier || ''}","${lead.status || ''}","${lead.location || ''}"`
  ).join('\n');

  const csv = csvHeader + csvRows;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="leads-export-${Date.now()}.csv"`);
  res.send(csv);
}

module.exports = {
  listLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  bulkImportLeads,
  exportLeads
};
