/**
 * Lead Validation Schemas
 */

const Joi = require('joi');

const list = Joi.object({
  query: Joi.object({
    industry: Joi.string().valid('HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL'),
    status: Joi.string().valid('new', 'contacted', 'qualified', 'converted', 'lost'),
    location: Joi.string(),
    minScore: Joi.number().min(0).max(100),
    maxScore: Joi.number().min(0).max(100),
    tier: Joi.string().valid('Hot Lead', 'Warm Lead', 'Cold Lead', 'Low Priority'),
    search: Joi.string(),
    limit: Joi.number().min(1).max(100).default(50),
    offset: Joi.number().min(0).default(0),
    sortBy: Joi.string().valid('created_at', 'lead_score', 'company_name').default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
});

const getById = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required()
  })
});

const create = Joi.object({
  body: Joi.object({
    company_name: Joi.string().required(),
    website: Joi.string().uri().allow(null, ''),
    phone: Joi.string().allow(null, ''),
    email: Joi.string().email().allow(null, ''),
    address: Joi.string().allow(null, ''),
    city: Joi.string().allow(null, ''),
    state: Joi.string().length(2).allow(null, ''),
    zip_code: Joi.string().allow(null, ''),
    location: Joi.string().allow(null, ''),
    industry: Joi.string().required(),
    estimated_size: Joi.string().valid('Small', 'Medium', 'Large', 'Unknown'),
    rating: Joi.number().min(0).max(5).allow(null),
    review_count: Joi.number().min(0).allow(null),
    status: Joi.string().valid('new', 'contacted', 'qualified', 'converted', 'lost').default('new')
  })
});

const update = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    company_name: Joi.string(),
    website: Joi.string().uri().allow(null, ''),
    phone: Joi.string().allow(null, ''),
    email: Joi.string().email().allow(null, ''),
    address: Joi.string().allow(null, ''),
    city: Joi.string().allow(null, ''),
    state: Joi.string().length(2).allow(null, ''),
    zip_code: Joi.string().allow(null, ''),
    location: Joi.string().allow(null, ''),
    industry: Joi.string(),
    estimated_size: Joi.string().valid('Small', 'Medium', 'Large', 'Unknown'),
    rating: Joi.number().min(0).max(5).allow(null),
    review_count: Joi.number().min(0).allow(null),
    status: Joi.string().valid('new', 'contacted', 'qualified', 'converted', 'lost'),
    lead_score: Joi.number().min(0).max(100).allow(null),
    tier: Joi.string().allow(null, '')
  }).min(1)
});

const deleteLead = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required()
  })
});

const bulkImport = Joi.object({
  body: Joi.object({
    leads: Joi.array().items(
      Joi.object({
        company_name: Joi.string().required(),
        website: Joi.string().uri().allow(null, ''),
        phone: Joi.string().allow(null, ''),
        email: Joi.string().email().allow(null, ''),
        address: Joi.string().allow(null, ''),
        city: Joi.string().allow(null, ''),
        state: Joi.string().length(2).allow(null, ''),
        zip_code: Joi.string().allow(null, ''),
        location: Joi.string().allow(null, ''),
        industry: Joi.string().required(),
        estimated_size: Joi.string().valid('Small', 'Medium', 'Large', 'Unknown'),
        rating: Joi.number().min(0).max(5).allow(null),
        review_count: Joi.number().min(0).allow(null)
      })
    ).min(1).max(1000).required()
  })
});

const exportLeads = Joi.object({
  query: Joi.object({
    industry: Joi.string(),
    status: Joi.string(),
    minScore: Joi.number().min(0).max(100)
  })
});

module.exports = {
  list,
  getById,
  create,
  update,
  delete: deleteLead,
  bulkImport,
  export: exportLeads
};
