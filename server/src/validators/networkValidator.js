import Joi from 'joi';

export const networkAuthSchema = Joi.object({
  credentials: Joi.object({
    mobile: Joi.string().trim().pattern(/^[0-9]{10}$/).required().messages({
      'string.pattern.base': 'Mobile number must be 10 digits',
      'any.required': 'Mobile number is required'
    }),
    studentId: Joi.string().trim().required().messages({
      'any.required': 'Student ID is required'
    })
  }).required(),
  device: Joi.object({
    macAddress: Joi.string().trim().optional(),
    ipAddress: Joi.string().trim().ip().optional(),
    userAgent: Joi.string().trim().optional()
  }).optional(),
  session: Joi.object({
    requestId: Joi.string().trim().optional(),
    timestamp: Joi.date().iso().optional()
  }).optional()
});