/**
 * Scraping API Routes
 */

const express = require('express');
const router = express.Router();
const scrapingController = require('../controllers/scrapingController');
const { validateScrapingJob } = require('../validators/scrapingValidator');
const { authenticate } = require('../../auth/middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/scraping/start
 * @desc    Start new scraping job
 * @access  Private
 */
router.post('/start', validateScrapingJob, scrapingController.startScrapingJob);

/**
 * @route   GET /api/scraping/jobs
 * @desc    Get all scraping jobs
 * @access  Private
 */
router.get('/jobs', scrapingController.getScrapingJobs);

/**
 * @route   GET /api/scraping/jobs/:id
 * @desc    Get specific scraping job
 * @access  Private
 */
router.get('/jobs/:id', scrapingController.getScrapingJobById);

/**
 * @route   GET /api/scraping/status
 * @desc    Get current scraping status
 * @access  Private
 */
router.get('/status', scrapingController.getScrapingStatus);

/**
 * @route   POST /api/scraping/jobs/:id/cancel
 * @desc    Cancel running scraping job
 * @access  Private
 */
router.post('/jobs/:id/cancel', scrapingController.cancelScrapingJob);

/**
 * @route   POST /api/scraping/schedule
 * @desc    Schedule recurring scraping job
 * @access  Private
 */
router.post('/schedule', scrapingController.scheduleScrapingJob);

/**
 * @route   GET /api/scraping/schedule
 * @desc    Get scheduled jobs
 * @access  Private
 */
router.get('/schedule', scrapingController.getScheduledJobs);

/**
 * @route   DELETE /api/scraping/schedule/:id
 * @desc    Delete scheduled job
 * @access  Private
 */
router.delete('/schedule/:id', scrapingController.deleteScheduledJob);

module.exports = router;
