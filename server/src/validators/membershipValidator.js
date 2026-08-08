import Joi from 'joi';

export const renewMembershipSchema = Joi.object({
  studentId: Joi.string().required().messages({
    'string.empty': 'Student ID is required',
    'any.required': 'Student ID is required'
  }),
  duration: Joi.string().required().trim().messages({
    'string.empty': 'Duration is required',
    'any.required': 'Duration is required'
  }),
  fee: Joi.number().required().min(0).messages({
    'number.min': 'Fee must be a positive number',
    'number.base': 'Fee must be a number',
    'any.required': 'Fee is required'
  }),
  paymentMode: Joi.string().valid('cash', 'upi', 'bank_transfer', 'cheque', 'other').default('cash'),
  joiningDate: Joi.string().allow('').trim(),
  transactionId: Joi.string().allow('').trim()
});

export const membershipHistorySchema = Joi.object({
  studentId: Joi.string().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});
