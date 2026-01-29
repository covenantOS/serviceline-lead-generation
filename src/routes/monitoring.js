/**
 * Monitoring Routes
 * Health checks and system metrics endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { getSystemHealth, getDetailedMetrics } = require('../monitoring/health-monitor');
const { getAllQueueStats } = require('../queues/queue-config');
const logger = require('../utils/logger');

/**
 * Get system health status
 * GET /api/monitoring/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await getSystemHealth();
    
    const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 200 :
                      503;

    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'critical',
      error: error.message
    });
  }
});

/**
 * Get detailed system metrics (authenticated)
 * GET /api/monitoring/metrics
 */
router.get('/metrics', authenticate, authorizeRoles('admin', 'user'), async (req, res) => {
  try {
    const metrics = await getDetailedMetrics();
    res.json(metrics);

  } catch (error) {
    logger.error('Metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get queue statistics
 * GET /api/monitoring/queues
 */
router.get('/queues', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const stats = await getAllQueueStats();
    res.json(stats);

  } catch (error) {
    logger.error('Queue stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get system status dashboard
 * GET /api/monitoring/dashboard
 */
router.get('/dashboard', authenticate, authorizeRoles('admin', 'user'), async (req, res) => {
  try {
    const [health, metrics, queueStats] = await Promise.all([
      getSystemHealth(),
      getDetailedMetrics(),
      getAllQueueStats()
    ]);

    res.json({
      health,
      metrics,
      queues: queueStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
