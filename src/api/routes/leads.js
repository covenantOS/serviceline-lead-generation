/**
 * Lead Management API Routes
 */

const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { validateLead, validateLeadUpdate, validateLeadFilters } = require('../validators/leadValidator');
const { authenticate } = require('../../auth/middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/leads
 * @desc    Get all leads with filtering
 * @access  Private
 */
router.get('/', validateLeadFilters, leadController.getLeads);

/**
 * @route   GET /api/leads/stats
 * @desc    Get lead statistics
 * @access  Private
 */
router.get('/stats', leadController.getLeadStats);

/**
 * @route   GET /api/leads/:id
 * @desc    Get specific lead by ID
 * @access  Private
 */
router.get('/:id', leadController.getLeadById);

/**
 * @route   POST /api/leads
 * @desc    Create new lead
 * @access  Private
 */
router.post('/', validateLead, leadController.createLead);

/**
 * @route   POST /api/leads/bulk
 * @desc    Bulk import leads
 * @access  Private
 */
router.post('/bulk', leadController.bulkImportLeads);

/**
 * @route   PUT /api/leads/:id
 * @desc    Update lead
 * @access  Private
 */
router.put('/:id', validateLeadUpdate, leadController.updateLead);

/**
 * @route   PATCH /api/leads/:id/status
 * @desc    Update lead status
 * @access  Private
 */
router.patch('/:id/status', leadController.updateLeadStatus);

/**
 * @route   PATCH /api/leads/:id/score
 * @desc    Recalculate lead score
 * @access  Private
 */
router.patch('/:id/score', leadController.recalculateScore);

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete lead
 * @access  Private
 */
router.delete('/:id', leadController.deleteLead);

/**
 * @route   POST /api/leads/:id/notes
 * @desc    Add note to lead
 * @access  Private
 */
router.post('/:id/notes', leadController.addNote);

/**
 * @route   GET /api/leads/:id/history
 * @desc    Get lead interaction history
 * @access  Private
 */
router.get('/:id/history', leadController.getLeadHistory);

module.exports = router;
