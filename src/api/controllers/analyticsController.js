/**
 * Analytics Controller
 * Provides analytics and reporting endpoints
 */

const { supabase } = require('../../database/supabase-client');
const logger = require('../../utils/logger');

/**
 * Get dashboard overview
 */
exports.getDashboard = async (req, res, next) => {
  try {
    // Total leads
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // Active campaigns
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Messages sent (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: messagesSent } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Hot leads
    const { count: hotLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'Hot Lead');

    // Average score
    const { data: scoreData } = await supabase
      .from('leads')
      .select('score')
      .not('score', 'is', null);

    const avgScore = scoreData.length > 0
      ? Math.round(scoreData.reduce((sum, l) => sum + l.score, 0) / scoreData.length)
      : 0;

    res.json({
      success: true,
      data: {
        totalLeads,
        activeCampaigns,
        messagesSent,
        hotLeads,
        averageScore: avgScore
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    next(error);
  }
};

/**
 * Get lead analytics
 */
exports.getLeadAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase.from('leads').select('*');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Analyze data
    const analytics = {
      total: data.length,
      byIndustry: {},
      bySource: {},
      byLocation: {},
      averageScore: 0,
      scoreDistribution: {
        '0-25': 0,
        '26-50': 0,
        '51-75': 0,
        '76-100': 0
      }
    };

    let totalScore = 0;
    let scoredCount = 0;

    data.forEach(lead => {
      // By industry
      if (lead.industry) {
        analytics.byIndustry[lead.industry] = (analytics.byIndustry[lead.industry] || 0) + 1;
      }

      // By source
      if (lead.source) {
        analytics.bySource[lead.source] = (analytics.bySource[lead.source] || 0) + 1;
      }

      // By location
      if (lead.location) {
        analytics.byLocation[lead.location] = (analytics.byLocation[lead.location] || 0) + 1;
      }

      // Score analysis
      if (lead.score !== null) {
        totalScore += lead.score;
        scoredCount++;

        if (lead.score <= 25) analytics.scoreDistribution['0-25']++;
        else if (lead.score <= 50) analytics.scoreDistribution['26-50']++;
        else if (lead.score <= 75) analytics.scoreDistribution['51-75']++;
        else analytics.scoreDistribution['76-100']++;
      }
    });

    analytics.averageScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching lead analytics:', error);
    next(error);
  }
};

/**
 * Get scoring analytics
 */
exports.getScoringAnalytics = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('score, tier, component_scores')
      .not('score', 'is', null);

    if (error) throw error;

    const analytics = {
      totalScored: data.length,
      averageScore: 0,
      tierDistribution: {},
      componentAverages: {
        websiteQuality: 0,
        seoRanking: 0,
        adPresence: 0,
        reviewScore: 0,
        socialPresence: 0,
        companySize: 0,
        marketCompetitiveness: 0
      }
    };

    let totalScore = 0;
    const componentTotals = { ...analytics.componentAverages };

    data.forEach(lead => {
      totalScore += lead.score;

      // Tier distribution
      if (lead.tier) {
        analytics.tierDistribution[lead.tier] = (analytics.tierDistribution[lead.tier] || 0) + 1;
      }

      // Component scores
      if (lead.component_scores) {
        Object.keys(componentTotals).forEach(key => {
          if (lead.component_scores[key] !== undefined) {
            componentTotals[key] += lead.component_scores[key];
          }
        });
      }
    });

    analytics.averageScore = Math.round(totalScore / data.length);

    // Calculate component averages
    Object.keys(componentTotals).forEach(key => {
      analytics.componentAverages[key] = Math.round(componentTotals[key] / data.length);
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching scoring analytics:', error);
    next(error);
  }
};

/**
 * Get campaign analytics
 */
exports.getCampaignAnalytics = async (req, res, next) => {
  try {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*');

    if (error) throw error;

    const analytics = {
      totalCampaigns: campaigns.length,
      byStatus: {},
      performance: []
    };

    // Status distribution
    campaigns.forEach(campaign => {
      analytics.byStatus[campaign.status] = (analytics.byStatus[campaign.status] || 0) + 1;
    });

    // Get performance for each campaign
    for (const campaign of campaigns) {
      const { count: sent } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id);

      const { count: opened } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('opened', true);

      const { count: replied } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('replied', true);

      analytics.performance.push({
        id: campaign.id,
        name: campaign.name,
        sent,
        opened,
        replied,
        openRate: sent > 0 ? ((opened / sent) * 100).toFixed(2) + '%' : '0%',
        replyRate: sent > 0 ? ((replied / sent) * 100).toFixed(2) + '%' : '0%'
      });
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching campaign analytics:', error);
    next(error);
  }
};

/**
 * Get conversion analytics
 */
exports.getConversionAnalytics = async (req, res, next) => {
  try {
    // Get all leads with status tracking
    const { data, error } = await supabase
      .from('leads')
      .select('status, created_at');

    if (error) throw error;

    const funnel = {
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
      lost: 0
    };

    data.forEach(lead => {
      if (funnel.hasOwnProperty(lead.status)) {
        funnel[lead.status]++;
      }
    });

    const conversionRate = funnel.new > 0
      ? ((funnel.won / funnel.new) * 100).toFixed(2) + '%'
      : '0%';

    res.json({
      success: true,
      data: {
        funnel,
        conversionRate,
        totalLeads: data.length
      }
    });
  } catch (error) {
    logger.error('Error fetching conversion analytics:', error);
    next(error);
  }
};

/**
 * Get revenue analytics
 */
exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('status, estimated_value, closed_at')
      .eq('status', 'won');

    if (error) throw error;

    const analytics = {
      totalRevenue: 0,
      averageDealSize: 0,
      dealsWon: data.length,
      byMonth: {}
    };

    data.forEach(lead => {
      if (lead.estimated_value) {
        analytics.totalRevenue += parseFloat(lead.estimated_value);
      }

      if (lead.closed_at) {
        const month = new Date(lead.closed_at).toISOString().slice(0, 7);
        analytics.byMonth[month] = (analytics.byMonth[month] || 0) + 1;
      }
    });

    analytics.averageDealSize = data.length > 0
      ? Math.round(analytics.totalRevenue / data.length)
      : 0;

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching revenue analytics:', error);
    next(error);
  }
};

/**
 * Get trends over time
 */
exports.getTrends = async (req, res, next) => {
  try {
    const { metric = 'leads', period = '30' } = req.query;
    const days = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase.from('leads').select('created_at');
    query = query.gte('created_at', startDate.toISOString());

    const { data, error } = await query;

    if (error) throw error;

    // Group by date
    const trendData = {};
    data.forEach(lead => {
      const date = new Date(lead.created_at).toISOString().split('T')[0];
      trendData[date] = (trendData[date] || 0) + 1;
    });

    // Fill in missing dates
    const allDates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      allDates.push({
        date: dateStr,
        count: trendData[dateStr] || 0
      });
    }

    res.json({
      success: true,
      data: allDates.reverse()
    });
  } catch (error) {
    logger.error('Error fetching trends:', error);
    next(error);
  }
};

/**
 * Get analytics by source
 */
exports.getSourceAnalytics = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('source, score, status');

    if (error) throw error;

    const sourceAnalytics = {};

    data.forEach(lead => {
      const source = lead.source || 'unknown';
      
      if (!sourceAnalytics[source]) {
        sourceAnalytics[source] = {
          total: 0,
          averageScore: 0,
          totalScore: 0,
          won: 0
        };
      }

      sourceAnalytics[source].total++;
      if (lead.score) {
        sourceAnalytics[source].totalScore += lead.score;
      }
      if (lead.status === 'won') {
        sourceAnalytics[source].won++;
      }
    });

    // Calculate averages
    Object.keys(sourceAnalytics).forEach(source => {
      const stats = sourceAnalytics[source];
      stats.averageScore = stats.total > 0
        ? Math.round(stats.totalScore / stats.total)
        : 0;
      stats.winRate = stats.total > 0
        ? ((stats.won / stats.total) * 100).toFixed(2) + '%'
        : '0%';
      delete stats.totalScore;
    });

    res.json({
      success: true,
      data: sourceAnalytics
    });
  } catch (error) {
    logger.error('Error fetching source analytics:', error);
    next(error);
  }
};
