/**
 * Request Validation Middleware
 * Uses Joi for input validation
 */

const logger = require('../utils/logger');

/**
 * Validate request against Joi schema
 */
function validate(schema) {
  return (req, res, next) => {
    const validationTarget = {
      body: req.body,
      query: req.query,
      params: req.params
    };

    const { error, value } = schema.validate(validationTarget, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      logger.debug('Validation failed:', errors);

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request data with validated values
    req.body = value.body || req.body;
    req.query = value.query || req.query;
    req.params = value.params || req.params;

    next();
  };
}

module.exports = { validate };
