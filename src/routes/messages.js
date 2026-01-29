/**
 * Messaging Routes
 */

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message-controller');
const { validate } = require('../middleware/validate');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const messageValidation = require('../validation/message-validation');

// All routes require authentication
router.use(authenticateToken);

// List messages
router.get('/',
  validate(messageValidation.list),
  asyncHandler(messageController.listMessages)
);

// Send message
router.post('/send',
  requireRole('admin', 'user'),
  validate(messageValidation.send),
  asyncHandler(messageController.sendMessage)
);

// Get email templates
router.get('/templates',
  asyncHandler(messageController.listTemplates)
);

// Get template preview
router.get('/templates/:templateId/preview',
  validate(messageValidation.templatePreview),
  asyncHandler(messageController.previewTemplate)
);

// Get message by ID
router.get('/:id',
  validate(messageValidation.getById),
  asyncHandler(messageController.getMessage)
);

module.exports = router;
