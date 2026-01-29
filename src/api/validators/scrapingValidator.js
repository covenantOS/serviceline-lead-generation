/**
 * Scraping Validation Schemas
 */

const Joi = require('joi');

const scrapingJobSchema = Joi.object({
  industries: Joi.array()
    .items(Joi.string().valid('HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL'))
    .min(1)
    .default(['HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL']),
  locations: Joi.array().items(Joi.string()).min(1).default(['United States']),
  maxLeadsPerIndustry: Joi.number().min(1).max(500).default(50)
});

exports.validateScrapingJob = (req, res, next) => {
  const { error, value } = scrapingJobSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(d => d.message)
    });
  }
  
  req.body = value;
  next();
};
