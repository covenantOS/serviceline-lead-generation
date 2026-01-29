/**
 * Lead Validation Schemas
 */

const Joi = require('joi');

const leadSchema = Joi.object({
  company_name: Joi.string().required().max(255),
  website: Joi.string().uri().allow(null, ''),
  phone: Joi.string().max(20).allow(null, ''),
  email: Joi.string().email().allow(null, ''),
  address: Joi.string().allow(null, ''),
  city: Joi.string().max(100).allow(null, ''),
  state: Joi.string().max(50).allow(null, ''),
  zip_code: Joi.string().max(20).allow(null, ''),
  location: Joi.string().max(255).allow(null, ''),
  industry: Joi.string().valid('HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL').required(),
  estimated_size: Joi.string().valid('Small', 'Medium', 'Large').allow(null),
  rating: Joi.number().min(0).max(5).allow(null),
  review_count: Joi.number().min(0).allow(null),
  years_in_business: Joi.number().min(0).allow(null),
  status: Joi.string().valid('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost').default('new'),
  source: Joi.string().max(100).allow(null),
  notes: Joi.string().allow(null, '')
});

const leadUpdateSchema = Joi.object({
  company_name: Joi.string().max(255),
  website: Joi.string().uri().allow(null, ''),
  phone: Joi.string().max(20).allow(null, ''),
  email: Joi.string().email().allow(null, ''),
  address: Joi.string().allow(null, ''),
  city: Joi.string().max(100).allow(null, ''),
  state: Joi.string().max(50).allow(null, ''),
  zip_code: Joi.string().max(20).allow(null, ''),
  location: Joi.string().max(255).allow(null, ''),
  industry: Joi.string().valid('HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL'),
  estimated_size: Joi.string().valid('Small', 'Medium', 'Large').allow(null),
  rating: Joi.number().min(0).max(5).allow(null),
  review_count: Joi.number().min(0).allow(null),
  years_in_business: Joi.number().min(0).allow(null),
  status: Joi.string().valid('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'),
  source: Joi.string().max(100).allow(null),
  notes: Joi.string().allow(null, '')
}).min(1);

const leadFiltersSchema = Joi.object({
  industry: Joi.string(),
  minScore: Joi.number().min(0).max(100),
  maxScore: Joi.number().min(0).max(100),
  status: Joi.string(),
  location: Joi.string(),
  tier: Joi.string(),
  source: Joi.string(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(50),
  sortBy: Joi.string().default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Validate lead creation
 */
exports.validateLead = (req, res, next) => {
  const { error } = leadSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  
  next();
};

/**
 * Validate lead update
 */
exports.validateLeadUpdate = (req, res, next) => {
  const { error } = leadUpdateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  
  next();
};

/**
 * Validate lead filters
 */
exports.validateLeadFilters = (req, res, next) => {
  const { error, value } = leadFiltersSchema.validate(req.query);
  
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
