/**
 * ServiceLine Lead Generation System
 * Main Application Entry Point
 */

require('dotenv').config({ path: './config/.env' });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./api/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'ServiceLine Lead Generation System API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/leads', require('./api/routes/leads'));
app.use('/api/campaigns', require('./api/routes/campaigns'));
app.use('/api/messages', require('./api/routes/messages'));
app.use('/api/analytics', require('./api/routes/analytics'));
app.use('/api/scraping', require('./api/routes/scraping'));

// 404 handler
app.use(notFound);

// Error handling
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('='.repeat(60));
    logger.info('ServiceLine Lead Generation System');
    logger.info('='.repeat(60));
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`API Base: http://localhost:${PORT}/api`);
    logger.info('='.repeat(60));
  });
}

module.exports = app;
