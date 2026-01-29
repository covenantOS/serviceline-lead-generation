/**
 * Analytics Routes
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics-controller');
const { validate } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const analyticsValidation = require('../validation/analytics-validation');

// All routes require authentication
router.use(authenticateToken);

// Lead statistics
router.get('/leads',
  validate(analyticsValidation.dateRange),
  asyncHandler(analyticsController.getLeadStats)
);

// Scoring distribution
router.get('/scoring',
  validate(analyticsValidation.dateRange),
  asyncHandler(analyticsController.getScoringStats)
);

// Campaign performance
router.get('/campaigns',
  validate(analyticsValidation.dateRange),
  asyncHandler(analyticsController.getCampaignStats)
);

// Dashboard overview
router.get('/dashboard',
  asyncHandler(analyticsController.getDashboard)
);

module.exports = router;
