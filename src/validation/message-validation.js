/**
 * Message Validation Schemas
 */

const Joi = require('joi');

const list = Joi.object({
  query: Joi.object({
    campaignId: Joi.string().uuid(),
    leadId: Joi.string().uuid(),
    status: Joi.string().valid('pending', 'sent', 'delivered', 'failed', 'bounced'),
    limit: Joi.number().min(1).max(100).default(50),
    offset: Joi.number().min(0).default(0)
  })
});

const send = Joi.object({
  body: Joi.object({
    leadId: Joi.string().uuid().required(),
    campaignId: Joi.string().uuid().allow(null),
    templateId: Joi.string().allow(null),
    variables: Joi.object().allow(null),
    subject: Joi.string().when('templateId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    body: Joi.string().when('templateId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    })
  })
});

const templatePreview = Joi.object({
  params: Joi.object({
    templateId: Joi.string().required()
  }),
  query: Joi.object({
    industry: Joi.string().valid('hvac', 'plumbing', 'roofing', 'electrical').default('hvac'),
    variables: Joi.object().allow(null)
  })
});

const getById = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required()
  })
});

module.exports = {
  list,
  send,
  templatePreview,
  getById
};
