/**
 * Analytics Controller
 * Provides statistical data and insights
 */

const { supabase } = require('../database/supabase-client');
const { getLeadStats } = require('../database/lead-repository');
const logger = require('../utils/logger');

/**
 * Get lead generation statistics
 */
async function getLeadStats(req, res) {
  const { startDate, endDate } = req.query;

  let query = supabase
    .from('leads')
    .select('industry, status, lead_score, tier, created_at');

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: leads, error } = await query;

  if (error) throw error;

  // Calculate statistics
  const stats = {
    total: leads.length,
    byIndustry: {},
    byStatus: {},
    byTier: {},
    averageScore: 0,
    timeline: {}
  };

  let totalScore = 0;
  let scoredLeads = 0;

  leads.forEach(lead => {
    // By industry
    stats.byIndustry[lead.industry] = (stats.byIndustry[lead.industry] || 0) + 1;
    
    // By status
    stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
    
    // By tier
    if (lead.tier) {
      stats.byTier[lead.tier] = (stats.byTier[lead.tier] || 0) + 1;
    }
    
    // Score calculation
    if (lead.lead_score) {
      totalScore += lead.lead_score;
      scoredLeads++;
    }

    // Timeline (by month)
    const month = lead.created_at.substring(0, 7); // YYYY-MM
    stats.timeline[month] = (stats.timeline[month] || 0) + 1;
  });

  stats.averageScore = scoredLeads > 0 ? Math.round(totalScore / scoredLeads) : 0;

  res.json({
    success: true,
    data: stats
  });
}

/**
 * Get scoring distribution
 */
async function getScoringStats(req, res) {
  const { startDate, endDate } = req.query;

  let query = supabase
    .from('leads')
    .select('lead_score, tier, industry')
    .not('lead_score', 'is', null);

  if (startDate) {
    query = query.gte('scored_at', startDate);
  }
  if (endDate) {
    query = query.lte('scored_at', endDate);
  }

  const { data: leads, error } = await query;

  if (error) throw error;

  const stats = {
    totalScored: leads.length,
    scoreDistribution: {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    },
    tierDistribution: {},
    averageByIndustry: {}
  };

  // Calculate distributions
  const industryScores = {};

  leads.forEach(lead => {
    const score = lead.lead_score;

    // Score distribution
    if (score <= 20) stats.scoreDistribution['0-20']++;
    else if (score <= 40) stats.scoreDistribution['21-40']++;
    else if (score <= 60) stats.scoreDistribution['41-60']++;
    else if (score <= 80) stats.scoreDistribution['61-80']++;
    else stats.scoreDistribution['81-100']++;

    // Tier distribution
    if (lead.tier) {
      stats.tierDistribution[lead.tier] = (stats.tierDistribution[lead.tier] || 0) + 1;
    }

    // Industry averages
    if (lead.industry) {
      if (!industryScores[lead.industry]) {
        industryScores[lead.industry] = { total: 0, count: 0 };
      }
      industryScores[lead.industry].total += score;
      industryScores[lead.industry].count++;
    }
  });

  // Calculate averages
  Object.keys(industryScores).forEach(industry => {
    const { total, count } = industryScores[industry];
    stats.averageByIndustry[industry] = Math.round(total / count);
  });

  res.json({
    success: true,
    data: stats
  });
}

/**
 * Get campaign performance statistics
 */
async function getCampaignStats(req, res) {
  const { startDate, endDate } = req.query;

  let campaignQuery = supabase
    .from('campaigns')
    .select('id, name, status, created_at');

  if (startDate) {
    campaignQuery = campaignQuery.gte('created_at', startDate);
  }
  if (endDate) {
    campaignQuery = campaignQuery.lte('created_at', endDate);
  }

  const { data: campaigns, error: campaignError } = await campaignQuery;

  if (campaignError) throw campaignError;

  // Get message stats for each campaign
  const campaignStats = await Promise.all(
    campaigns.map(async (campaign) => {
      const { data: messages } = await supabase
        .from('messages')
        .select('status, opened_at, clicked_at')
        .eq('campaign_id', campaign.id);

      const sent = messages?.length || 0;
      const opened = messages?.filter(m => m.opened_at).length || 0;
      const clicked = messages?.filter(m => m.clicked_at).length || 0;

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        sent,
        opened,
        clicked,
        openRate: sent > 0 ? ((opened / sent) * 100).toFixed(2) : 0,
        clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(2) : 0
      };
    })
  );

  // Overall stats
  const totals = campaignStats.reduce((acc, camp) => {
    acc.totalSent += camp.sent;
    acc.totalOpened += camp.opened;
    acc.totalClicked += camp.clicked;
    return acc;
  }, { totalSent: 0, totalOpened: 0, totalClicked: 0 });

  res.json({
    success: true,
    data: {
      campaigns: campaignStats,
      totals: {
        ...totals,
        overallOpenRate: totals.totalSent > 0 
          ? ((totals.totalOpened / totals.totalSent) * 100).toFixed(2) 
          : 0,
        overallClickRate: totals.totalSent > 0 
          ? ((totals.totalClicked / totals.totalSent) * 100).toFixed(2) 
          : 0
      }
    }
  });
}

/**
 * Get dashboard overview
 */
async function getDashboard(req, res) {
  try {
    // Get counts
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    const { count: hotLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'Hot Lead');

    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: messagesSent } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent');

    // Recent leads
    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id, company_name, industry, lead_score, tier, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Top scoring leads
    const { data: topLeads } = await supabase
      .from('leads')
      .select('id, company_name, industry, lead_score, tier')
      .order('lead_score', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          totalLeads,
          hotLeads,
          activeCampaigns,
          messagesSent
        },
        recentLeads,
        topLeads
      }
    });

  } catch (error) {
    logger.error('Dashboard error:', error);
    throw error;
  }
}

module.exports = {
  getLeadStats,
  getScoringStats,
  getCampaignStats,
  getDashboard
};
