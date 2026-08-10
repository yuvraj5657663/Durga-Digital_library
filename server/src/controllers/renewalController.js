import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import Membership from '../models/Membership.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors.js';
import AuditLog from '../models/AuditLog.js';
import { toActorId } from '../utils/actorId.js';
import { v4 as uuidv4 } from 'uuid';
import { renew } from '../services/membershipService.js';
import { sendMembershipActivated } from '../services/notificationService.js';
import logger from '../config/logger.js';

function generateReceiptNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rnd = uuidv4().replace(/-/g, '').toUpperCase().slice(0, 6);
  return `DDL-${ymd}-${rnd}`;
}

// ─── POST /student/renewal/request ──────────────────────────────────────────────
// Student creates a renewal request with screenshot upload
export const createRenewalRequestController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  if (!studentId) throw new NotFoundError('Student account not linked.');

  const { duration, amount, paymentMode, screenshotUrl, notes } = req.body;

  const student = await Student.findById(studentId);
  if (!student) throw new NotFoundError('Student not found');

  // Validate required fields
  if (!duration) throw new ValidationError('Duration is required');
  if (!amount) throw new ValidationError('Amount is required');
  if (!screenshotUrl) throw new ValidationError('Payment screenshot is required');

  // Check for existing pending renewal requests
  const existingPending = await Payment.findOne({
    student: studentId,
    isRenewalRequest: true,
    status: { $in: ['pending', 'processing'] }
  });

  if (existingPending) {
    throw new ValidationError('You already have a pending renewal request. Please wait for verification.');
  }

  // Calculate expiration time (10 minutes from now)
  const requestedAt = new Date();
  const expiresAt = new Date(requestedAt.getTime() + 10 * 60 * 1000); // 10 minutes

  const receiptNo = generateReceiptNo();

  const renewalRequest = await Payment.create({
    student: studentId,
    receiptNo,
    type: 'renewal',
    amount: parseFloat(amount),
    mode: paymentMode || 'upi',
    status: 'pending',
    screenshotUrl,
    notes: notes || '',
    duration,
    requestedAt,
    expiresAt,
    isRenewalRequest: true,
    branch: student.branch || '',
    metadata: {
      studentName: student.name,
      studentMobile: student.mobile,
      studentEmail: student.email,
      currentExpiry: student.expiryDate
    }
  });

  // Audit log
  await AuditLog.create({
    action: 'renewal_request_created',
    actorId: toActorId(studentId),
    actorRole: 'student',
    actorName: student.name,
    targetType: 'Payment',
    targetId: renewalRequest._id.toString(),
    targetName: `Renewal Request - ${receiptNo}`,
    details: { duration, amount, paymentMode, expiresAt }
  });

  return successResponse(res, renewalRequest, 'Renewal request submitted successfully. Please wait for verification within 10 minutes.');
});

// ─── GET /student/renewal/status ────────────────────────────────────────────────
// Student checks the status of their renewal request
export const getRenewalStatusController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  if (!studentId) throw new NotFoundError('Student account not linked.');

  const renewalRequest = await Payment.findOne({
    student: studentId,
    isRenewalRequest: true,
    status: { $in: ['pending', 'processing'] }
  }).sort({ createdAt: -1 });

  if (!renewalRequest) {
    return successResponse(res, { hasPendingRequest: false }, 'No pending renewal request');
  }

  // Check if request has expired
  const now = new Date();
  const isExpired = renewalRequest.expiresAt && now > renewalRequest.expiresAt;

  if (isExpired && renewalRequest.status === 'pending') {
    // Auto-expire the request
    await Payment.findByIdAndUpdate(renewalRequest._id, {
      status: 'failed',
      rejectionReason: 'Request expired (10-minute timer)'
    });

    return successResponse(res, { 
      hasPendingRequest: false, 
      expired: true,
      message: 'Your renewal request has expired. Please submit a new request.'
    }, 'Renewal request expired');
  }

  const timeRemaining = renewalRequest.expiresAt 
    ? Math.max(0, Math.floor((renewalRequest.expiresAt - now) / 1000))
    : 0;

  return successResponse(res, {
    hasPendingRequest: true,
    request: renewalRequest,
    timeRemaining, // in seconds
    isExpired,
    expiresAt: renewalRequest.expiresAt
  }, 'Renewal status retrieved');
});

// ─── GET /admin/renewal/requests ──────────────────────────────────────────────────
// Admin gets list of pending renewal requests
export const getRenewalRequestsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status = 'pending' } = req.query;

  const filter = {
    isRenewalRequest: true,
    status: status
  };

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [requests, total] = await Promise.all([
    Payment.find(filter)
      .populate('student', 'name mobile email studentId seatCode shift expiryDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Payment.countDocuments(filter)
  ]);

  // Filter out expired requests
  const now = new Date();
  const validRequests = requests.filter(req => 
    !req.expiresAt || req.expiresAt > now || req.status !== 'pending'
  );

  return paginatedResponse(res, validRequests, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total: validRequests.length
  }, 'Renewal requests retrieved');
});

// ─── POST /admin/renewal/:requestId/approve ────────────────────────────────────────
// Admin approves and processes a renewal request
export const approveRenewalRequestController = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { adminNotes } = req.body;

  const renewalRequest = await Payment.findById(requestId).populate('student');
  if (!renewalRequest) throw new NotFoundError('Renewal request not found');

  if (renewalRequest.status !== 'pending' && renewalRequest.status !== 'processing') {
    throw new ValidationError('This request has already been processed');
  }

  // Check if request has expired
  const now = new Date();
  if (renewalRequest.expiresAt && now > renewalRequest.expiresAt) {
    throw new ValidationError('This renewal request has expired');
  }

  const student = renewalRequest.student;
  const adminUser = req.user;

  // Start transaction for membership renewal
  const mongoose = (await import('mongoose')).default;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update payment status to processing
    await Payment.findByIdAndUpdate(
      requestId,
      {
        status: 'processing',
        verifiedBy: toActorId(adminUser.id),
        verifiedAt: now
      },
      { session }
    );

    // Process membership renewal
    const renewalResult = await renew({
      studentId: student._id,
      duration: renewalRequest.duration,
      fee: renewalRequest.amount,
      paymentMode: renewalRequest.mode,
      adminUser,
      session
    });

    // Update payment with membership details
    await Payment.findByIdAndUpdate(
      requestId,
      {
        status: 'completed',
        membership: renewalResult.membership._id,
        transactionId: renewalResult.receiptNo,
        paidOn: new Date().toISOString().slice(0, 10),
        notes: `${renewalRequest.notes || ''} | ${adminNotes || ''}`
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Send notification to student
    sendMembershipActivated({ 
      student: { ...student, expiryDate: renewalResult.expiryDate }, 
      membership: renewalResult.membership 
    }).catch(err => logger.error('[renewalController] notification error:', err.message));

    // Audit log
    await AuditLog.create({
      action: 'renewal_request_approved',
      actorId: toActorId(adminUser.id),
      actorRole: adminUser.role,
      actorName: adminUser.username,
      targetType: 'Payment',
      targetId: requestId,
      targetName: `Renewal Request - ${renewalRequest.receiptNo}`,
      details: {
        studentId: student._id,
        studentName: student.name,
        duration: renewalRequest.duration,
        amount: renewalRequest.amount,
        newExpiryDate: renewalResult.expiryDate,
        receiptNo: renewalResult.receiptNo
      }
    });

    return successResponse(res, {
      payment: renewalRequest,
      membership: renewalResult.membership,
      student: renewalResult.student,
      receiptNo: renewalResult.receiptNo,
      expiryDate: renewalResult.expiryDate
    }, 'Renewal approved and processed successfully');

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    // Revert payment status on error
    await Payment.findByIdAndUpdate(requestId, { status: 'pending' });
    
    throw error;
  }
});

// ─── POST /admin/renewal/:requestId/reject ────────────────────────────────────────
// Admin rejects a renewal request
export const rejectRenewalRequestController = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { rejectionReason } = req.body;

  if (!rejectionReason) {
    throw new ValidationError('Rejection reason is required');
  }

  const renewalRequest = await Payment.findById(requestId).populate('student');
  if (!renewalRequest) throw new NotFoundError('Renewal request not found');

  if (renewalRequest.status !== 'pending' && renewalRequest.status !== 'processing') {
    throw new ValidationError('This request has already been processed');
  }

  const adminUser = req.user;

  await Payment.findByIdAndUpdate(
    requestId,
    {
      status: 'failed',
      rejectionReason,
      verifiedBy: toActorId(adminUser.id),
      verifiedAt: new Date()
    }
  );

  // Audit log
  await AuditLog.create({
    action: 'renewal_request_rejected',
    actorId: toActorId(adminUser.id),
    actorRole: adminUser.role,
    actorName: adminUser.username,
    targetType: 'Payment',
    targetId: requestId,
    targetName: `Renewal Request - ${renewalRequest.receiptNo}`,
    details: {
      studentId: renewalRequest.student._id,
      studentName: renewalRequest.student.name,
      rejectionReason
    }
  });

  return successResponse(res, null, 'Renewal request rejected');
});

// ─── DELETE /admin/renewal/:requestId ─────────────────────────────────────────────
// Admin deletes a renewal request (cleanup)
export const deleteRenewalRequestController = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  const renewalRequest = await Payment.findByIdAndDelete(requestId);
  if (!renewalRequest) throw new NotFoundError('Renewal request not found');

  // Audit log
  await AuditLog.create({
    action: 'renewal_request_deleted',
    actorId: toActorId(req.user.id),
    actorRole: req.user.role,
    actorName: req.user.username,
    targetType: 'Payment',
    targetId: requestId,
    details: { receiptNo: renewalRequest.receiptNo }
  });

  return successResponse(res, null, 'Renewal request deleted');
});