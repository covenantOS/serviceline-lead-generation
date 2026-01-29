/**
 * Lead Management Routes
 */

const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead-controller');
const { validate } = require('../middleware/validate');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { bulkOperationLimiter } = require('../middleware/rate-limit');
const { asyncHandler } = require('../middleware/error-handler');
const leadValidation = require('../validation/lead-validation');

// All routes require authentication
router.use(authenticateToken);

// List leads with filtering
router.get('/',
  validate(leadValidation.list),
  asyncHandler(leadController.listLeads)
);

// Get specific lead
router.get('/:id',
  validate(leadValidation.getById),
  asyncHandler(leadController.getLead)
);

// Create new lead
router.post('/',
  requireRole('admin', 'user'),
  validate(leadValidation.create),
  asyncHandler(leadController.createLead)
);

// Update lead
router.put('/:id',
  requireRole('admin', 'user'),
  validate(leadValidation.update),
  asyncHandler(leadController.updateLead)
);

// Delete lead
router.delete('/:id',
  requireRole('admin'),
  validate(leadValidation.delete),
  asyncHandler(leadController.deleteLead)
);

// Bulk import leads
router.post('/bulk/import',
  requireRole('admin', 'user'),
  bulkOperationLimiter,
  validate(leadValidation.bulkImport),
  asyncHandler(leadController.bulkImportLeads)
);

// Export leads
router.get('/export/csv',
  validate(leadValidation.export),
  asyncHandler(leadController.exportLeads)
);

module.exports = router;
