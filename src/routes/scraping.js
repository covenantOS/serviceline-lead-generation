/**
 * Scraping Routes
 */

const express = require('express');
const router = express.Router();
const scrapingController = require('../controllers/scraping-controller');
const { validate } = require('../middleware/validate');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { scrapingLimiter } = require('../middleware/rate-limit');
const { asyncHandler } = require('../middleware/error-handler');
const scrapingValidation = require('../validation/scraping-validation');

// All routes require authentication and admin/user role
router.use(authenticateToken);
router.use(requireRole('admin', 'user'));

// Start scraping job
router.post('/start',
  scrapingLimiter,
  validate(scrapingValidation.start),
  asyncHandler(scrapingController.startScraping)
);

// Get scraping job status
router.get('/status/:jobId',
  validate(scrapingValidation.status),
  asyncHandler(scrapingController.getScrapingStatus)
);

// List scraping jobs
router.get('/jobs',
  validate(scrapingValidation.listJobs),
  asyncHandler(scrapingController.listScrapingJobs)
);

// Cancel scraping job
router.post('/cancel/:jobId',
  validate(scrapingValidation.cancel),
  asyncHandler(scrapingController.cancelScraping)
);

module.exports = router;
