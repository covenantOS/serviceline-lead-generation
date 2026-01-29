/**
 * Health Monitoring System
 * Monitors system health and alerts on issues
 */

const logger = require('../utils/logger');
const { getAllQueueStats, redisClient } = require('../queues/queue-config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get comprehensive system health status
 */
async function getSystemHealth() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {},
    issues: []
  };

  try {
    // Check database connection
    health.components.database = await checkDatabaseHealth();

    // Check Redis connection
    health.components.redis = await checkRedisHealth();

    // Check queue health
    health.components.queues = await checkQueueHealth();

    // Check recent scraping jobs
    health.components.scraping = await checkScrapingHealth();

    // Check email service
    health.components.email = await checkEmailHealth();

    // Check disk space (if applicable)
    health.components.system = await checkSystemResources();

    // Determine overall status
    const componentStatuses = Object.values(health.components).map(c => c.status);
    if (componentStatuses.includes('critical')) {
      health.status = 'critical';
    } else if (componentStatuses.includes('degraded')) {
      health.status = 'degraded';
    }

    // Collect issues
    for (const [component, data] of Object.entries(health.components)) {
      if (data.status !== 'healthy' && data.message) {
        health.issues.push({
          component,
          severity: data.status,
          message: data.message
        });
      }
    }

  } catch (error) {
    logger.error('Health check failed:', error);
    health.status = 'critical';
    health.error = error.message;
  }

  return health;
}

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    const { error } = await supabase.from('leads').select('id').limit(1);
    const responseTime = Date.now() - start;

    if (error) {
      return {
        status: 'critical',
        message: `Database error: ${error.message}`,
        responseTime
      };
    }

    if (responseTime > 1000) {
      return {
        status: 'degraded',
        message: `Slow database response: ${responseTime}ms`,
        responseTime
      };
    }

    return {
      status: 'healthy',
      responseTime
    };

  } catch (error) {
    return {
      status: 'critical',
      message: `Database connection failed: ${error.message}`
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedisHealth() {
  try {
    const start = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - start;

    if (responseTime > 500) {
      return {
        status: 'degraded',
        message: `Slow Redis response: ${responseTime}ms`,
        responseTime
      };
    }

    return {
      status: 'healthy',
      responseTime
    };

  } catch (error) {
    return {
      status: 'critical',
      message: `Redis connection failed: ${error.message}`
    };
  }
}

/**
 * Check queue health
 */
async function checkQueueHealth() {
  try {
    const stats = await getAllQueueStats();
    const issues = [];

    for (const [queueName, queueStats] of Object.entries(stats)) {
      // Check for excessive failed jobs
      if (queueStats.failed > 100) {
        issues.push(`${queueName} queue has ${queueStats.failed} failed jobs`);
      }

      // Check for stuck active jobs
      if (queueStats.active > 50) {
        issues.push(`${queueName} queue has ${queueStats.active} active jobs (possible stall)`);
      }
    }

    if (issues.length > 0) {
      return {
        status: 'degraded',
        message: issues.join('; '),
        stats
      };
    }

    return {
      status: 'healthy',
      stats
    };

  } catch (error) {
    return {
      status: 'critical',
      message: `Queue health check failed: ${error.message}`
    };
  }
}

/**
 * Check scraping job health
 */
async function checkScrapingHealth() {
  try {
    // Check last scraping job
    const { data: lastJob, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !lastJob) {
      return {
        status: 'degraded',
        message: 'No scraping jobs found'
      };
    }

    // Check if last job is too old (>48 hours)
    const lastJobTime = new Date(lastJob.created_at).getTime();
    const hoursSinceLastJob = (Date.now() - lastJobTime) / (1000 * 60 * 60);

    if (hoursSinceLastJob > 48) {
      return {
        status: 'degraded',
        message: `Last scraping job was ${Math.floor(hoursSinceLastJob)} hours ago`,
        lastJob: lastJob.created_at
      };
    }

    // Check if last job failed
    if (lastJob.status === 'failed') {
      return {
        status: 'degraded',
        message: `Last scraping job failed: ${lastJob.error_message}`,
        lastJob: lastJob.created_at
      };
    }

    return {
      status: 'healthy',
      lastJob: lastJob.created_at,
      lastJobStatus: lastJob.status
    };

  } catch (error) {
    return {
      status: 'degraded',
      message: `Scraping health check failed: ${error.message}`
    };
  }
}

/**
 * Check email service health
 */
async function checkEmailHealth() {
  try {
    // Check recent email success rate
    const { data: recentMessages, error } = await supabase
      .from('messages')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    if (error) {
      return {
        status: 'degraded',
        message: `Cannot check email status: ${error.message}`
      };
    }

    if (!recentMessages || recentMessages.length === 0) {
      return {
        status: 'healthy',
        message: 'No recent emails sent'
      };
    }

    const total = recentMessages.length;
    const failed = recentMessages.filter(m => m.status === 'failed' || m.status === 'bounced').length;
    const failureRate = (failed / total) * 100;

    if (failureRate > 20) {
      return {
        status: 'critical',
        message: `High email failure rate: ${failureRate.toFixed(1)}%`,
        stats: { total, failed, failureRate }
      };
    }

    if (failureRate > 10) {
      return {
        status: 'degraded',
        message: `Elevated email failure rate: ${failureRate.toFixed(1)}%`,
        stats: { total, failed, failureRate }
      };
    }

    return {
      status: 'healthy',
      stats: { total, failed, failureRate }
    };

  } catch (error) {
    return {
      status: 'degraded',
      message: `Email health check failed: ${error.message}`
    };
  }
}

/**
 * Check system resources
 */
async function checkSystemResources() {
  try {
    const used = process.memoryUsage();
    const memoryUsageMB = Math.round(used.heapUsed / 1024 / 1024);
    const memoryLimitMB = Math.round(used.heapTotal / 1024 / 1024);
    const memoryPercent = (memoryUsageMB / memoryLimitMB) * 100;

    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);

    const status = {
      status: 'healthy',
      memory: {
        used: `${memoryUsageMB}MB`,
        total: `${memoryLimitMB}MB`,
        percent: `${memoryPercent.toFixed(1)}%`
      },
      uptime: `${uptimeHours}h`,
      nodeVersion: process.version
    };

    if (memoryPercent > 90) {
      status.status = 'critical';
      status.message = `High memory usage: ${memoryPercent.toFixed(1)}%`;
    } else if (memoryPercent > 75) {
      status.status = 'degraded';
      status.message = `Elevated memory usage: ${memoryPercent.toFixed(1)}%`;
    }

    return status;

  } catch (error) {
    return {
      status: 'degraded',
      message: `System resource check failed: ${error.message}`
    };
  }
}

/**
 * Get detailed metrics for monitoring
 */
async function getDetailedMetrics() {
  try {
    // Lead metrics
    const { data: leadMetrics } = await supabase
      .from('leads')
      .select('status, tier, industry');

    // Message metrics (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: messageMetrics } = await supabase
      .from('messages')
      .select('status')
      .gte('created_at', sevenDaysAgo);

    // Campaign metrics
    const { data: campaignMetrics } = await supabase
      .from('campaigns')
      .select('status, type')
      .gte('created_at', sevenDaysAgo);

    // Queue metrics
    const queueStats = await getAllQueueStats();

    return {
      leads: calculateLeadMetrics(leadMetrics),
      messages: calculateMessageMetrics(messageMetrics),
      campaigns: calculateCampaignMetrics(campaignMetrics),
      queues: queueStats,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Failed to get detailed metrics:', error);
    return null;
  }
}

function calculateLeadMetrics(leads) {
  if (!leads) return {};

  return {
    total: leads.length,
    byStatus: leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {}),
    byTier: leads.reduce((acc, l) => {
      acc[l.tier] = (acc[l.tier] || 0) + 1;
      return acc;
    }, {}),
    byIndustry: leads.reduce((acc, l) => {
      acc[l.industry] = (acc[l.industry] || 0) + 1;
      return acc;
    }, {})
  };
}

function calculateMessageMetrics(messages) {
  if (!messages) return {};

  return {
    total: messages.length,
    byStatus: messages.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {}),
    successRate: messages.length > 0 
      ? ((messages.filter(m => m.status === 'sent' || m.status === 'delivered').length / messages.length) * 100).toFixed(1) + '%'
      : '0%'
  };
}

function calculateCampaignMetrics(campaigns) {
  if (!campaigns) return {};

  return {
    total: campaigns.length,
    byStatus: campaigns.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {}),
    byType: campaigns.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {})
  };
}

module.exports = {
  getSystemHealth,
  getDetailedMetrics
};
