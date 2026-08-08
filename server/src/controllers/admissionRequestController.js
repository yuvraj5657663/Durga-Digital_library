import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import AdmissionRequest from '../models/AdmissionRequest.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import AuditLog from '../models/AuditLog.js';
import Membership from '../models/Membership.js';
import Seat from '../models/Seat.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { sendMembershipActivated } from '../services/notificationService.js';
import { generateRenewalReceipt } from '../services/pdfService.js';
import logger from '../config/logger.js';

const PASSWORD_SALT_ROUNDS = parseInt(process.env.PASSWORD_SALT_ROUNDS || '10', 10);

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

export const createAdmissionRequestController = asyncHandler(async (req, res) => {
  const payload = { ...normalizeGoogleFormPayload(req.body), ...req.body };
  const name = normalizeField(payload.name || payload.fullName || payload['Full Name']);
  const mobile = normalizeField(payload.mobile || payload.phone || payload['Mobile Number']);
  const email = normalizeField(payload.email || payload.Email || payload['Email Address']);
  const preparation = normalizeField(payload.preparation || payload.course || payload['Preparation']);
  const preferred_shift = normalizeField(payload.preferred_shift || payload.shift || payload['Preferred Shift']);

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

  const newRequest = await AdmissionRequest.create({
    name,
    mobile,
    normalizedMobile: normalizeMobile(mobile),
    email,
    preparation,
    preferred_shift,
    father_name: normalizeField(payload.father_name || payload['Father Name']),
    address: normalizeField(payload.address || payload.Address || payload.address_line),
    source: 'online_form'
  });

  await AuditLog.create({
    action: 'admission_request_created',
    actorId: null,
    actorRole: 'public',
    actorName: 'Public Form',
    targetType: 'AdmissionRequest',
    targetId: newRequest._id.toString(),
    targetName: newRequest.name,
    details: { source: 'online_form' },
    ip: req.ip,
    userAgent: req.headers['user-agent'] || ''
  });

  return successResponse(res, newRequest, 'Admission request received', 201);
});

export const getAdmissionRequestsController = asyncHandler(async (req, res) => {
  const status = req.query.status || 'Pending';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(10, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.admission_status = status;
  if (req.query.search) {
    const search = req.query.search.trim();
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { mobile: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
  }

  const [requests, total] = await Promise.all([
    AdmissionRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AdmissionRequest.countDocuments(filter)
  ]);

  return paginatedResponse(res, requests, { page, limit, total }, 'Admission requests retrieved');
});

export const approveAdmissionRequestController = asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const approvalDetails = req.body;
  const adminUser = req.user;

  const admissionRequest = await AdmissionRequest.findById(requestId);
  if (!admissionRequest) {
    throw new NotFoundError('Admission request not found');
  }
  if (admissionRequest.admission_status !== 'Pending') {
    throw new ValidationError(`Admission request already ${admissionRequest.admission_status}`);
  }

  const { seatCode, shift, shiftHours, fee, duration, joiningDate, expiryDate } = approvalDetails;
  if (!seatCode || !shift || !fee || !joiningDate || !expiryDate) {
    throw new ValidationError('seatCode, shift, fee, joiningDate and expiryDate are required for approval');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const studentData = {
      seatCode,
      name: admissionRequest.name,
      email: admissionRequest.email || '',
      mobile: admissionRequest.mobile,
      normalizedMobile: normalizeMobile(admissionRequest.mobile),
      preparation: admissionRequest.preparation || 'General',
      duration: duration || '1 Month(s)',
      joiningDate,
      expiryDate,
      fee: parseFloat(fee),
      shift,
      shiftHours: shiftHours || ''
    };

    const student = await Student.create([studentData], { session });
    const createdStudent = student[0];

    await Seat.findOneAndUpdate(
      { seat_key: `${seatCode}_shift_${shift}` },
      {
        seat_key: `${seatCode}_shift_${shift}`,
        seat_number: parseInt(seatCode.replace(/\D/g, '')),
        shift: parseInt(shift),
        is_booked: 1,
        student_name: studentData.name,
        mobile: studentData.mobile,
        preparation: studentData.preparation,
        expiry_date: expiryDate
      },
      { upsert: true, session }
    );

    const password = crypto.randomBytes(5).toString('hex');
    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

    const user = await User.create([{
      name: admissionRequest.name,
      email: admissionRequest.email || '',
      passwordHash,
      role: 'student',
      mobile: admissionRequest.mobile,
      normalizedMobile: normalizeMobile(admissionRequest.mobile),
      studentRef: createdStudent._id
    }], { session });

    const membership = await Membership.create([{
      student: createdStudent._id,
      type: 'Standard',
      status: 'Active',
      startDate: joiningDate,
      expiryDate,
      fee: parseFloat(fee),
      duration: duration || '1 Month(s)',
      activatedBy: adminUser.id
    }], { session });

    await AdmissionRequest.findByIdAndUpdate(
      admissionRequest._id,
      {
        admission_status: 'Accepted',
        payment_status: 'Paid',
        reviewer: adminUser.id,
        reviewerName: adminUser.username,
        reviewNotes: approvalDetails.reviewNotes || '',
        studentRef: createdStudent._id
      },
      { session }
    );

    await AuditLog.create([{
      action: 'admission_request_approved',
      actorId: adminUser.id,
      actorRole: adminUser.role,
      actorName: adminUser.username,
      targetType: 'AdmissionRequest',
      targetId: admissionRequest._id.toString(),
      targetName: admissionRequest.name,
      details: {
        studentId: createdStudent._id.toString(),
        userId: user[0]._id.toString(),
        membershipId: membership[0]._id.toString(),
        seatCode,
        shift,
        generatedPassword: 'generated'
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    }], { session });

    await session.commitTransaction();
    session.endSession();

    sendMembershipActivated({ student: createdStudent, membership: membership[0] }).catch(err =>
      logger.error('[admission] notification error:', err.message)
    );

    return successResponse(res, {
      student: createdStudent,
      user: { ...user[0].toObject(), password },
      membership: membership[0]
    }, 'Admission approved successfully');
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

export const rejectAdmissionRequestController = asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const { reviewNotes } = req.body;
  const adminUser = req.user;

  const admissionRequest = await AdmissionRequest.findByIdAndUpdate(
    requestId,
    {
      admission_status: 'Rejected',
      reviewer: adminUser.id,
      reviewerName: adminUser.username,
      reviewNotes: reviewNotes || ''
    },
    { new: true }
  );

  if (!admissionRequest) {
    throw new NotFoundError('Admission request not found');
  }

  await AuditLog.create({
    action: 'admission_request_rejected',
    actorId: adminUser.id,
    actorRole: adminUser.role,
    actorName: adminUser.username,
    targetType: 'AdmissionRequest',
    targetId: requestId,
    targetName: admissionRequest.name,
    details: { reviewNotes },
    ip: req.ip,
    userAgent: req.headers['user-agent'] || ''
  });

  return successResponse(res, admissionRequest, 'Admission request rejected');
});
