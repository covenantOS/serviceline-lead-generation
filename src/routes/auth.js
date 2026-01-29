/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rate-limit');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const authValidation = require('../validation/auth-validation');

// Public routes (with rate limiting)
router.post('/register', 
  authLimiter,
  validate(authValidation.register),
  asyncHandler(authController.register)
);

router.post('/login',
  authLimiter,
  validate(authValidation.login),
  asyncHandler(authController.login)
);

router.post('/refresh',
  validate(authValidation.refresh),
  asyncHandler(authController.refresh)
);

// Protected routes
router.get('/me',
  authenticateToken,
  asyncHandler(authController.getProfile)
);

router.post('/logout',
  authenticateToken,
  asyncHandler(authController.logout)
);

router.post('/change-password',
  authenticateToken,
  validate(authValidation.changePassword),
  asyncHandler(authController.changePassword)
);

module.exports = router;
