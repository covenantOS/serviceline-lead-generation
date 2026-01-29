/**
 * Campaign Management API Routes
 */

const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { validateCampaign, validateCampaignUpdate } = require('../validators/campaignValidator');
const { authenticate } = require('../../auth/middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns
 * @access  Private
 */
router.get('/', campaignController.getCampaigns);

/**
 * @route   GET /api/campaigns/:id
 * @desc    Get specific campaign
 * @access  Private
 */
router.get('/:id', campaignController.getCampaignById);

/**
 * @route   POST /api/campaigns
 * @desc    Create new campaign
 * @access  Private
 */
router.post('/', validateCampaign, campaignController.createCampaign);

/**
 * @route   PUT /api/campaigns/:id
 * @desc    Update campaign
 * @access  Private
 */
router.put('/:id', validateCampaignUpdate, campaignController.updateCampaign);

/**
 * @route   DELETE /api/campaigns/:id
 * @desc    Delete campaign
 * @access  Private
 */
router.delete('/:id', campaignController.deleteCampaign);

/**
 * @route   POST /api/campaigns/:id/start
 * @desc    Start campaign
 * @access  Private
 */
router.post('/:id/start', campaignController.startCampaign);

/**
 * @route   POST /api/campaigns/:id/pause
 * @desc    Pause campaign
 * @access  Private
 */
router.post('/:id/pause', campaignController.pauseCampaign);

/**
 * @route   POST /api/campaigns/:id/leads
 * @desc    Add leads to campaign
 * @access  Private
 */
router.post('/:id/leads', campaignController.addLeadsToCampaign);

/**
 * @route   GET /api/campaigns/:id/stats
 * @desc    Get campaign statistics
 * @access  Private
 */
router.get('/:id/stats', campaignController.getCampaignStats);

module.exports = router;
