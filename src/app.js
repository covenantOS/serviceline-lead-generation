/**
 * ServiceLine Lead Generation API
 * Main Express Application
 */

require('dotenv').config({ path: './config/.env' });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');
const { apiLimiter } = require('./middleware/rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const campaignRoutes = require('./routes/campaigns');
const messageRoutes = require('./routes/messages');
const analyticsRoutes = require('./routes/analytics');
const scrapingRoutes = require('./routes/scraping');

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

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ServiceLine Lead Generation API',
    version: '1.0.0',
    description: 'RESTful API for lead management, scraping, and campaign automation',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      leads: '/api/leads',
      campaigns: '/api/campaigns',
      messages: '/api/messages',
      analytics: '/api/analytics',
      scraping: '/api/scraping'
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

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('='.repeat(60));
    logger.info('ServiceLine Lead Generation API');
    logger.info('='.repeat(60));
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API documentation: http://localhost:${PORT}/api/docs`);
    logger.info('='.repeat(60));
  });
}

module.exports = app;
