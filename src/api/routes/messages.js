/**
 * Messaging API Routes
 */

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { validateMessage, validateMessageFilters } = require('../validators/messageValidator');
const { authenticate } = require('../../auth/middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/messages
 * @desc    Get all messages with filtering
 * @access  Private
 */
router.get('/', validateMessageFilters, messageController.getMessages);

/**
 * @route   GET /api/messages/:id
 * @desc    Get specific message
 * @access  Private
 */
router.get('/:id', messageController.getMessageById);

/**
 * @route   POST /api/messages/send
 * @desc    Send email to lead
 * @access  Private
 */
router.post('/send', validateMessage, messageController.sendMessage);

/**
 * @route   POST /api/messages/send-bulk
 * @desc    Send bulk emails
 * @access  Private
 */
router.post('/send-bulk', messageController.sendBulkMessages);

/**
 * @route   GET /api/messages/templates
 * @desc    Get all available email templates
 * @access  Private
 */
router.get('/templates', messageController.getTemplates);

/**
 * @route   GET /api/messages/templates/:industry
 * @desc    Get templates for specific industry
 * @access  Private
 */
router.get('/templates/:industry', messageController.getTemplatesByIndustry);

/**
 * @route   POST /api/messages/templates/preview
 * @desc    Preview template with data
 * @access  Private
 */
router.post('/templates/preview', messageController.previewTemplate);

/**
 * @route   GET /api/messages/lead/:leadId
 * @desc    Get all messages for a specific lead
 * @access  Private
 */
router.get('/lead/:leadId', messageController.getMessagesByLead);

module.exports = router;
