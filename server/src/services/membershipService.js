import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import AuditLog from '../models/AuditLog.js';
import * as notifService from './notificationService.js';
import studentRepository from '../repositories/StudentRepository.js';
import membershipRepository from '../repositories/MembershipRepository.js';
import logger from '../config/logger.js';
import { toActorId } from '../utils/actorId.js';

function generateReceiptNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rnd = uuidv4().replace(/-/g, '').toUpperCase().slice(0, 6);
  return `DDL-${ymd}-${rnd}`;
}

function addMonths(dateStr, n) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function parseDurationMonths(durationStr) {
  if (!durationStr) return 1;
  const match = String(durationStr).match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

export async function renew(opts) {
  const {
    studentId, duration, fee,
    paymentMode = 'cash',
    joiningDate,
    adminUser,
    transactionId = '',
    session: callerSession = null
  } = opts;

  const ownSession = callerSession === null;
  const session = callerSession || (await mongoose.startSession());
  if (ownSession) session.startTransaction();

  try {
    const student = await Student.findById(studentId).session(session);
    if (!student) throw new Error('Student not found.');

    const months = parseDurationMonths(duration);
    const startDate = joiningDate || new Date().toISOString().slice(0, 10);
    const expiryDate = addMonths(startDate, months);
    const receiptNo = generateReceiptNo();

    await Membership.updateMany(
      { student: student._id, status: 'Active' },
      { status: 'Inactive' },
      { session }
    );

    const [membership] = await Membership.create([{
      student: student._id,
      type: 'Standard',
      status: 'Active',
      startDate,
      expiryDate,
      fee: parseFloat(fee),
      duration: duration || `${months} Month(s)`,
      activatedBy: toActorId(adminUser?._id || adminUser?.id)   // ← safe cast
    }], { session });

    const [payment] = await Payment.create([{
      student: student._id,
      membership: membership._id,
      receiptNo,
      type: 'renewal',
      amount: parseFloat(fee),
      mode: paymentMode,
      status: 'completed',
      transactionId,
      paidOn: startDate,
      collectedBy: toActorId(adminUser?._id || adminUser?.id),  // ← safe cast
      branch: student.branch || ''
    }], { session });

    await Student.findByIdAndUpdate(
      student._id,
      {
        expiryDate,
        status: 'Active',
        membershipRef: membership._id
      },
      { session }
    );

    await AuditLog.create([{
      action: 'membership_renewed',
      actorId: toActorId(adminUser?._id || adminUser?.id),      // ← safe cast
      actorRole: adminUser?.role || 'admin',
      actorName: adminUser?.name || '',
      targetType: 'Student',
      targetId: student._id.toString(),
      targetName: student.name,
      details: { membershipId: membership._id.toString(), receiptNo, expiryDate, fee, paymentMode }
    }], { session });

    if (ownSession) {
      await session.commitTransaction();
      session.endSession();
    }

    notifService.sendMembershipActivated({ student, membership }).catch(err =>
      logger.error('[membershipService] renewal notif error:', err.message)
    );

    return { membership, payment, student, receiptNo, expiryDate };
  } catch (err) {
    if (ownSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
}

export async function expireStale() {
  const today = new Date().toISOString().slice(0, 10);

  const staleMemberships = await Membership.find({
    status: 'Active',
    expiryDate: { $lt: today }
  }).lean();

  if (!staleMemberships.length) return 0;

  const studentIds = staleMemberships.map(m => m.student);

  await Promise.all([
    Membership.updateMany(
      { _id: { $in: staleMemberships.map(m => m._id) } },
      { status: 'Expired' }
    ),
    Student.updateMany(
      { _id: { $in: studentIds } },
      { status: 'Expired' }
    )
  ]);

  logger.info(`[membershipService] expired ${staleMemberships.length} memberships`);
  return staleMemberships.length;
}

export async function findExpiringSoon(withinDays = 5) {
  return studentRepository.findExpiringSoon(withinDays);
}

export async function getHistory(studentId, { page = 1, limit = 10 } = {}) {
  return membershipRepository.getHistory(studentId, { page, limit });
}

export async function getActive(studentId) {
  return membershipRepository.findActiveByStudent(studentId);
}
