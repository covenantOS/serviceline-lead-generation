/**
 * Global Error Handler Middleware
 * Catches and formats all errors
 */

const logger = require('../utils/logger');

/**
 * Not Found Handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
}

/**
 * Global Error Handler
 */
function errorHandler(err, req, res, next) {
  // Log error
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.email
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let errorResponse = {
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong'
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse = {
      error: 'Validation Error',
      message: err.message,
      details: err.details
    };
  }

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse = {
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    };
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    errorResponse = {
      error: 'Conflict',
      message: 'Resource already exists'
    };
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    errorResponse = {
      error: 'Invalid Reference',
      message: 'Referenced resource does not exist'
    };
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    };
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Async handler wrapper
 * Catches errors from async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler
};
