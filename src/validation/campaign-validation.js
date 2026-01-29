/**
 * Campaign Validation Schemas
 */

const Joi = require('joi');

const list = Joi.object({
  query: Joi.object({
    status: Joi.string().valid('draft', 'scheduled', 'active', 'paused', 'completed'),
    type: Joi.string().valid('email', 'sms', 'direct_mail'),
    limit: Joi.number().min(1).max(100).default(50),
    offset: Joi.number().min(0).default(0)
  })
});

const getById = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required()
  })
});

const create = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('email', 'sms', 'direct_mail').default('email'),
    template_id: Joi.string().allow(null, ''),
    target_industries: Joi.array().items(Joi.string()),
    target_tiers: Joi.array().items(Joi.string()),
    min_score: Joi.number().min(0).max(100),
    schedule_date: Joi.date().iso().allow(null),
    description: Joi.string().allow('', null)
  })
});

const update = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required()
  }),
  body: Joi.object({
    name: Joi.string(),
    status: Joi.string().valid('draft', 'scheduled', 'active', 'paused', 'completed'),
    template_id: Joi.string().allow(null, ''),
    target_industries: Joi.array().items(Joi.string()),
    target_tiers: Joi.array().items(Joi.string()),
    min_score: Joi.number().min(0).max(100),
    schedule_date: Joi.date().iso().allow(null),
    description: Joi.string().allow('', null)
  }).min(1)
});

const deleteCampaign = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required()
  })
});

module.exports = {
  list,
  getById,
  create,
  update,
  delete: deleteCampaign
};
