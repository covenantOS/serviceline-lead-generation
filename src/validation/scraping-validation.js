/**
 * Scraping Validation Schemas
 */

const Joi = require('joi');

const start = Joi.object({
  body: Joi.object({
    industries: Joi.array()
      .items(Joi.string().valid('HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL'))
      .min(1)
      .required(),
    locations: Joi.array()
      .items(Joi.string())
      .min(1)
      .required(),
    maxLeadsPerIndustry: Joi.number().min(1).max(500).default(50)
  })
});

const status = Joi.object({
  params: Joi.object({
    jobId: Joi.string().uuid().required()
  })
});

const listJobs = Joi.object({
  query: Joi.object({
    status: Joi.string().valid('pending', 'running', 'completed', 'failed', 'cancelled'),
    limit: Joi.number().min(1).max(100).default(50),
    offset: Joi.number().min(0).default(0)
  })
});

const cancel = Joi.object({
  params: Joi.object({
    jobId: Joi.string().uuid().required()
  })
});

module.exports = {
  start,
  status,
  listJobs,
  cancel
};
