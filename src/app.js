/**
 * ServiceLine Lead Generation API
 * Main Express Application with Autonomous Features
 */

require('dotenv').config({ path: './config/.env' });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');
const { apiLimiter } = require('./middleware/rate-limit');
const { initializeCronJobs } = require('./automation/cron-scheduler');

// Import routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const campaignRoutes = require('./routes/campaigns');
const messageRoutes = require('./routes/messages');
const analyticsRoutes = require('./routes/analytics');
const scrapingRoutes = require('./routes/scraping');
const webhookRoutes = require('./routes/webhooks');
const monitoringRoutes = require('./routes/monitoring');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Enhanced health check endpoint (no auth required)
app.get('/health', async (req, res) => {
  try {
    const { getSystemHealth } = require('./monitoring/health-monitor');
    const health = await getSystemHealth();
    
    const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 200 :
                      503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ 
      status: 'critical',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ServiceLine Lead Generation API',
    version: '2.0.0',
    description: 'Autonomous lead generation, scoring, and campaign automation system',
    features: [
      'Automated web scraping (Google Maps, Yelp, Yellow Pages)',
      'AI-powered lead scoring',
      'Automated email campaigns',
      'Intelligent follow-up sequences',
      'Email engagement tracking',
      'Real-time monitoring and health checks'
    ],
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      leads: '/api/leads',
      campaigns: '/api/campaigns',
      messages: '/api/messages',
      analytics: '/api/analytics',
      scraping: '/api/scraping',
      webhooks: '/api/webhooks',
      monitoring: '/api/monitoring'
    },
    automation: {
      cronJobsEnabled: process.env.ENABLE_CRON === 'true',
      autoEmailThreshold: process.env.AUTO_EMAIL_THRESHOLD || 80,
      targetIndustries: process.env.TARGET_INDUSTRIES?.split(',') || ['HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL']
    }
  });
});

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/scraping', scrapingRoutes);

// Webhook routes (no rate limiting for webhooks)
app.use('/api/webhooks', webhookRoutes);

// Monitoring routes
app.use('/api/monitoring', monitoringRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('='.repeat(60));
    logger.info('ServiceLine Autonomous Lead Generation System');
    logger.info('='.repeat(60));
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API documentation: http://localhost:${PORT}/api/docs`);
    logger.info('='.repeat(60));
    
    // Initialize cron jobs for autonomous operation
    if (process.env.ENABLE_CRON === 'true') {
      logger.info('Initializing autonomous cron jobs...');
      initializeCronJobs();
    } else {
      logger.warn('⚠️  Cron jobs disabled. Set ENABLE_CRON=true for autonomous operation');
    }
    
    logger.info('='.repeat(60));
    logger.info('✓ System ready for autonomous operation');
    logger.info('  - Daily scraping: 2 AM');
    logger.info('  - Weekly deep scraping: 3 AM Sunday');
    logger.info('  - Auto-scoring: Every 4 hours');
    logger.info('  - Hot leads campaign: 9 AM weekdays');
    logger.info('  - Follow-up checks: 10 AM daily');
    logger.info('='.repeat(60));
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  const { stopCronJobs } = require('./automation/cron-scheduler');
  const { shutdownQueues } = require('./queues/queue-config');
  
  stopCronJobs();
  shutdownQueues().then(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  const { stopCronJobs } = require('./automation/cron-scheduler');
  const { shutdownQueues } = require('./queues/queue-config');
  
  stopCronJobs();
  shutdownQueues().then(() => {
    process.exit(0);
  });
});

module.exports = app;
