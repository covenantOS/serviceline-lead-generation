/**
 * Message Validation Schemas
 */

const Joi = require('joi');

const messageSchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  templatePath: Joi.string().required(),
  variables: Joi.object().default({}),
  campaignId: Joi.string().uuid().allow(null)
});

const messageFiltersSchema = Joi.object({
  leadId: Joi.string().uuid(),
  campaignId: Joi.string().uuid(),
  status: Joi.string().valid('sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed'),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(50)
});

exports.validateMessage = (req, res, next) => {
  const { error } = messageSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  
  next();
};

exports.validateMessageFilters = (req, res, next) => {
  const { error, value } = messageFiltersSchema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  
  req.query = value;
  next();
};
