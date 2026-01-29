/**
 * Webhook Routes
 * Handle webhooks from external services
 */

const express = require('express');
const router = express.Router();
const { 
  handleSendGridWebhook, 
  handleMailgunWebhook 
} = require('../webhooks/email-webhooks');
const logger = require('../utils/logger');

/**
 * SendGrid webhook endpoint
 * POST /api/webhooks/sendgrid
 */
router.post('/sendgrid', async (req, res) => {
  try {
    await handleSendGridWebhook(req, res);
  } catch (error) {
    logger.error('SendGrid webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Mailgun webhook endpoint
 * POST /api/webhooks/mailgun
 */
router.post('/mailgun', async (req, res) => {
  try {
    await handleMailgunWebhook(req, res);
  } catch (error) {
    logger.error('Mailgun webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Test webhook endpoint (for development)
 * POST /api/webhooks/test
 */
router.post('/test', (req, res) => {
  logger.info('Test webhook received:', req.body);
  res.status(200).json({ 
    received: true,
    timestamp: new Date().toISOString(),
    body: req.body
  });
});

module.exports = router;
