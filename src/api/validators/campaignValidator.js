/**
 * Campaign Validation Schemas
 */

const Joi = require('joi');

const campaignSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().allow(null, ''),
  industry: Joi.string().valid('HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL', 'ALL').required(),
  template_path: Joi.string().required(),
  target_tier: Joi.string().valid('Hot Lead', 'Warm Lead', 'Cold Lead', 'All').default('All'),
  target_score_min: Joi.number().min(0).max(100).allow(null),
  target_score_max: Joi.number().min(0).max(100).allow(null),
  schedule_type: Joi.string().valid('immediate', 'scheduled', 'drip').default('immediate'),
  schedule_date: Joi.date().iso().allow(null),
  drip_days: Joi.number().min(0).allow(null),
  variables: Joi.object().allow(null)
});

const campaignUpdateSchema = Joi.object({
  name: Joi.string().max(255),
  description: Joi.string().allow(null, ''),
  industry: Joi.string().valid('HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL', 'ALL'),
  template_path: Joi.string(),
  target_tier: Joi.string().valid('Hot Lead', 'Warm Lead', 'Cold Lead', 'All'),
  target_score_min: Joi.number().min(0).max(100).allow(null),
  target_score_max: Joi.number().min(0).max(100).allow(null),
  schedule_type: Joi.string().valid('immediate', 'scheduled', 'drip'),
  schedule_date: Joi.date().iso().allow(null),
  drip_days: Joi.number().min(0).allow(null),
  variables: Joi.object().allow(null),
  status: Joi.string().valid('draft', 'active', 'paused', 'completed')
}).min(1);

exports.validateCampaign = (req, res, next) => {
  const { error } = campaignSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  
  next();
};

exports.validateCampaignUpdate = (req, res, next) => {
  const { error } = campaignUpdateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  
  next();
};
