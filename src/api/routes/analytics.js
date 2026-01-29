/**
 * Analytics API Routes
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../../auth/middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard overview statistics
 * @access  Private
 */
router.get('/dashboard', analyticsController.getDashboard);

/**
 * @route   GET /api/analytics/leads
 * @desc    Get lead generation statistics
 * @access  Private
 */
router.get('/leads', analyticsController.getLeadAnalytics);

/**
 * @route   GET /api/analytics/scoring
 * @desc    Get scoring distribution analytics
 * @access  Private
 */
router.get('/scoring', analyticsController.getScoringAnalytics);

/**
 * @route   GET /api/analytics/campaigns
 * @desc    Get campaign performance analytics
 * @access  Private
 */
router.get('/campaigns', analyticsController.getCampaignAnalytics);

/**
 * @route   GET /api/analytics/conversion
 * @desc    Get conversion funnel analytics
 * @access  Private
 */
router.get('/conversion', analyticsController.getConversionAnalytics);

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Private
 */
router.get('/revenue', analyticsController.getRevenueAnalytics);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get trends over time
 * @access  Private
 */
router.get('/trends', analyticsController.getTrends);

/**
 * @route   GET /api/analytics/sources
 * @desc    Get analytics by lead source
 * @access  Private
 */
router.get('/sources', analyticsController.getSourceAnalytics);

module.exports = router;
