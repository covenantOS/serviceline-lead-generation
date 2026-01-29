/**
 * Authentication Validation Schemas
 */

const Joi = require('joi');

const register = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string().min(8).required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'any.required': 'Password is required'
      }),
    name: Joi.string().min(2).max(100).required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'any.required': 'Name is required'
      })
  })
});

const login = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
});

const refresh = Joi.object({
  body: Joi.object({
    refreshToken: Joi.string().required()
      .messages({
        'any.required': 'Refresh token is required'
      })
  })
});

const changePassword = Joi.object({
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
      .messages({
        'string.min': 'New password must be at least 8 characters long'
      })
  })
});

module.exports = {
  register,
  login,
  refresh,
  changePassword
};
