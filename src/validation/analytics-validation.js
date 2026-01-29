/**
 * Analytics Validation Schemas
 */

const Joi = require('joi');

const dateRange = Joi.object({
  query: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate'))
  })
});

module.exports = {
  dateRange
};
