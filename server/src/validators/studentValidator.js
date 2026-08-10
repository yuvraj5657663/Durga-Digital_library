import Joi from 'joi';

export const createStudentSchema = Joi.object({
  name: Joi.string().required().trim().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().allow('').trim().messages({
    'string.email': 'Invalid email format'
  }),
  mobile: Joi.string().required().trim().pattern(/^[0-9]{10}$/).messages({
    'string.empty': 'Mobile number is required',
    'string.pattern.base': 'Mobile number must be 10 digits',
    'any.required': 'Mobile number is required'
  }),
  preparation: Joi.string().allow('').trim(),
  duration: Joi.string().allow('').trim(),
  joiningDate: Joi.string().allow('').trim(),
  expiryDate: Joi.string().allow('').trim(),
  fee: Joi.number().min(0).default(0),
  paymentMode: Joi.string().allow('').trim(),
  shift: Joi.string().allow('').trim(),
  shiftHours: Joi.string().allow('').trim(),
  customTiming: Joi.string().allow('').trim(),
  branch: Joi.string().allow('').trim(),
  seatCode: Joi.string().allow('').trim()
}).custom((value, helpers) => {
  // Custom validation: require customTiming when shift is 'Custom'
  if (value.shift === 'Custom' && !value.customTiming) {
    return helpers.error('any.custom', { message: 'Custom timing is required when shift is Custom' });
  }
  // Custom validation: require shiftHours when shift is 'Night Shift'
  if (value.shift === 'Night Shift' && !value.shiftHours) {
    return helpers.error('any.custom', { message: 'Shift hours are required when shift is Night Shift' });
  }
  return value;
});

export const updateStudentSchema = Joi.object({
  name: Joi.string().trim(),
  email: Joi.string().email().allow('').trim().messages({
    'string.email': 'Invalid email format'
  }),
  mobile: Joi.string().trim().pattern(/^[0-9]{10}$/).messages({
    'string.pattern.base': 'Mobile number must be 10 digits'
  }),
  preparation: Joi.string().allow('').trim(),
  duration: Joi.string().allow('').trim(),
  joiningDate: Joi.string().allow('').trim(),
  expiryDate: Joi.string().allow('').trim(),
  fee: Joi.number().min(0),
  paymentMode: Joi.string().allow('').trim(),
  shift: Joi.string().allow('').trim(),
  shiftHours: Joi.string().allow('').trim(),
  customTiming: Joi.string().allow('').trim(),
  branch: Joi.string().allow('').trim(),
  seatCode: Joi.string().allow('').trim(),
  status: Joi.string().valid('Active', 'Inactive', 'Expired')
}).min(1).custom((value, helpers) => {
  // Custom validation: require customTiming when shift is 'Custom'
  if (value.shift === 'Custom' && !value.customTiming) {
    return helpers.error('any.custom', { message: 'Custom timing is required when shift is Custom' });
  }
  // Custom validation: require shiftHours when shift is 'Night Shift'
  if (value.shift === 'Night Shift' && !value.shiftHours) {
    return helpers.error('any.custom', { message: 'Shift hours are required when shift is Night Shift' });
  }
  return value;
});

export const studentIdSchema = Joi.object({
  id: Joi.string().required().messages({
    'string.empty': 'Student ID is required',
    'any.required': 'Student ID is required'
  })
});
