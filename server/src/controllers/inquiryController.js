import Inquiry from '../models/Inquiry.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';
import { ValidationError } from '../utils/errors.js';

function normalizeField(value) {
  return value == null ? '' : String(value).trim();
}

function getFirstValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return String(value[0] || '').trim();
  if (typeof value === 'object') return String(value.value || value[0] || '').trim();
  return String(value).trim();
}

function normalizeGoogleFormPayload(body = {}) {
  const payload = {};
  if (body.namedValues && typeof body.namedValues === 'object') {
    for (const [rawKey, value] of Object.entries(body.namedValues)) {
      const key = rawKey.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      payload[key] = getFirstValue(value);
    }
  }
  if (body.values && Array.isArray(body.values)) {
    body.values.forEach((value, index) => {
      payload[`value_${index}`] = getFirstValue(value);
    });
  }
  return payload;
}

function normalizeMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function isValidMobile(mobile) {
  const digits = normalizeMobile(mobile);
  return digits.length >= 10 && digits.length <= 15;
}

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export const createInquiryController = asyncHandler(async (req, res) => {
  const payload = { ...normalizeGoogleFormPayload(req.body), ...req.body };
  const name = normalizeField(payload.name || payload.fullName || payload['Full Name']);
  const mobile = normalizeField(payload.mobile || payload.phone || payload['Mobile Number']);
  const email = normalizeField(payload.email || payload.Email || payload['Email Address']);
  const preparation = normalizeField(payload.preparation || payload.course || payload['Preparation']);
  const preferred_shift = normalizeField(payload.preferred_shift || payload.shift || payload['Preferred Shift']);
  const father_name = normalizeField(payload.father_name || payload['Father Name'] || payload.fatherName);

  if (!name) {
    throw new ValidationError('Name is required');
  }
  if (!mobile) {
    throw new ValidationError('Mobile is required');
  }
  if (!isValidMobile(mobile)) {
    throw new ValidationError('Mobile number is invalid');
  }
  if (email && !isValidEmail(email)) {
    throw new ValidationError('Email address is invalid');
  }

  const inquiry = await Inquiry.create({
    name,
    mobile,
    normalizedMobile: normalizeMobile(mobile),
    email,
    preparation,
    preferred_shift,
    father_name,
    payment_status: 'Pending',
    admission_status: 'Pending'
  });

  return successResponse(res, inquiry, 'Inquiry saved successfully', 201);
});

export const listInquiriesController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status } = req.query;
  
  const filter = {};
  if (status) filter.admission_status = status;

  const skip = (page - 1) * limit;
  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Inquiry.countDocuments(filter)
  ]);

  return paginatedResponse(res, inquiries, { page: parseInt(page), limit: parseInt(limit), total }, 'Inquiries retrieved');
});
