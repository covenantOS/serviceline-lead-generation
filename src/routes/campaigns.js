/**
 * Campaign Management Routes
 */

const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaign-controller');
const { validate } = require('../middleware/validate');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const campaignValidation = require('../validation/campaign-validation');

// All routes require authentication
router.use(authenticateToken);

// List campaigns
router.get('/',
  validate(campaignValidation.list),
  asyncHandler(campaignController.listCampaigns)
);

// Get campaign by ID
router.get('/:id',
  validate(campaignValidation.getById),
  asyncHandler(campaignController.getCampaign)
);

// Create campaign
router.post('/',
  requireRole('admin', 'user'),
  validate(campaignValidation.create),
  asyncHandler(campaignController.createCampaign)
);

// Update campaign
router.put('/:id',
  requireRole('admin', 'user'),
  validate(campaignValidation.update),
  asyncHandler(campaignController.updateCampaign)
);

// Delete campaign
router.delete('/:id',
  requireRole('admin'),
  validate(campaignValidation.delete),
  asyncHandler(campaignController.deleteCampaign)
);

// Get campaign statistics
router.get('/:id/stats',
  validate(campaignValidation.getById),
  asyncHandler(campaignController.getCampaignStats)
);

module.exports = router;
