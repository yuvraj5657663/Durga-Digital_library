import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import studentRepository from '../repositories/StudentRepository.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';
import Seat from '../models/Seat.js';
import logger from '../config/logger.js';
import { sendMembershipActivated, send as sendNotif } from '../services/notificationService.js';
import { toDataURL } from '../services/qrService.js';
import config from '../config/index.js';
import { toActorId } from '../utils/actorId.js';

const SALT_ROUNDS = parseInt(process.env.PASSWORD_SALT_ROUNDS || '10', 10);

function generateStudentId() {
  const year = new Date().getFullYear();
  const rnd  = uuidv4().replace(/-/g, '').toUpperCase().slice(0, 6);
  return `DDL-${year}-${rnd}`;
}

function generateReceiptNo() {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rnd = uuidv4().replace(/-/g, '').toUpperCase().slice(0, 6);
  return `DDL-${ymd}-${rnd}`;
}

// ─── POST /admin/students ────────────────────────────────────────────────────
export const createStudentController = asyncHandler(async (req, res) => {
  const body = req.body;

  if (!body.name || !body.mobile) {
    throw new ValidationError('name and mobile are required');
  }

  // Check duplicate: same seatCode + shift combo only (not same mobile)
  // A student CAN register with the same mobile for a different shift/seat
  if (body.seatCode && body.shift) {
    const seatConflict = await Student.findOne({
      seatCode: body.seatCode,
      shift:    body.shift,
      status:   'Active'
    });
    if (seatConflict) {
      throw new ConflictError(`Seat ${body.seatCode} is already booked for ${body.shift}`);
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Generate unique student ID
    let studentId = generateStudentId();
    while (await Student.findOne({ studentId }).lean()) {
      studentId = generateStudentId();
    }

    // 2. Generate QR code
    const qrPayload  = `${config.app.url || 'http://localhost:3000'}/portal?student=${studentId}`;
    const qrDataUrl  = await toDataURL(qrPayload, { width: 300 });

    // 3. Create Student
    const [student] = await Student.create([{
      ...body,
      studentId,
      qrCodeUrl:       qrDataUrl,
      status:          'Active',
      customTiming:    body.customTiming || '',
      normalizedMobile: body.mobile.replace(/\D/g, '').length === 10
        ? `91${body.mobile.replace(/\D/g, '')}`
        : body.mobile.replace(/\D/g, '')
    }], { session });

    // 4. Upsert Seat
    if (body.seatCode && body.shift) {
      // Map shift names to shift keys for the seat matrix
      const shiftMapping = {
        'Shift 1': 'Shift 1',
        'Shift 2': 'Shift 2', 
        'Shift 3': 'Shift 3',
        'Shift 4': 'Shift 4',
        'Night Shift': 'Night Shift',
        'Custom': 'Custom'
      };
      
      const shiftValue = shiftMapping[body.shift] || body.shift;
      const seatKey = `s_${parseInt(body.seatCode.replace(/\D/g, ''), 10)}_${shiftValue}`;
      
      await Seat.findOneAndUpdate(
        { seat_key: seatKey },
        {
          seat_key:    seatKey,
          seat_number: parseInt(body.seatCode.replace(/\D/g, ''), 10),
          shift:       shiftValue,
          shift_name:  body.shift,
          is_booked:   1,
          student_name: body.name,
          mobile:      body.mobile,
          preparation: body.preparation || '',
          expiry_date: body.expiryDate || '',
          custom_timing: body.customTiming || ''
        },
        { upsert: true, session }
      );
    }

    // 5. Auto-generate secure password & create User
    const password     = crypto.randomBytes(6).toString('hex'); // 12-char hex
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const emailForUser = body.email || `${studentId.toLowerCase()}@ddl.local`;

    const [user] = await User.create([{
      name:             body.name,
      email:            emailForUser,
      username:         studentId.toLowerCase(),
      passwordHash,
      role:             'student',
      mobile:           body.mobile,
      normalizedMobile: body.mobile.replace(/\D/g, '').length === 10
        ? `91${body.mobile.replace(/\D/g, '')}`
        : body.mobile.replace(/\D/g, ''),
      studentRef:       student._id
    }], { session });

    // Back-link student → user
    await Student.findByIdAndUpdate(student._id, { userRef: user._id }, { session });

    // 6. Create Membership
    const receiptNo  = generateReceiptNo();
    const startDate  = body.joiningDate || new Date().toISOString().slice(0, 10);
    const expiryDate = body.expiryDate  || startDate;

    const [membership] = await Membership.create([{
      student:     student._id,
      type:        'Standard',
      status:      'Active',
      startDate,
      expiryDate,
      fee:         parseFloat(body.fee) || 0,
      duration:    body.duration || '1 Month(s)',
      activatedBy: toActorId(req.user.id)
    }], { session });

    // 7. Create Payment record
    await Payment.create([{
      student:    student._id,
      membership: membership._id,
      receiptNo,
      type:       'admission',
      amount:     parseFloat(body.fee) || 0,
      mode:       (body.paymentMode || 'cash').toLowerCase(),
      status:     'completed',
      paidOn:     startDate,
      collectedBy:toActorId(req.user.id)
    }], { session });

    // 8. Audit log
    await AuditLog.create([{
      action:    'student_created',
      actorId:   toActorId(req.user.id),
      actorRole: req.user.role,
      actorName: req.user.username,
      targetType:'Student',
      targetId:  student._id.toString(),
      targetName:student.name,
      details:   { studentId, receiptNo, seatCode: body.seatCode, shift: body.shift },
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // 9. Post-commit: notifications (non-blocking)
    const notifPayload = { student, membership };
    sendMembershipActivated(notifPayload).catch(e =>
      logger.error('[createStudent] membership notif failed:', e.message)
    );

    // 10. WhatsApp + Email welcome with credentials
    const timingDisplay = (body.shift === 'Custom' || body.shift === 'Double Shift' || body.shift === 'Night Shift')
      ? (body.customTiming || body.shiftHours || body.shift)
      : body.shift;

    const admissionMsg =
      `DURGA DIGITAL LIBRARY, MUNGER 📚
📍 Location: Kalarampur, Near Shiv Mandir, NH-80, Munger - 811211
📞 Contact Person: Saurav Kumar (7542893960)

Namaste ${body.name},
Aapka admission successfully confirm ho gaya hai!

📌 Seat Code: ${body.seatCode}
⏰ Shift / Timing: ${timingDisplay}
📅 Joining Date: ${startDate}
⏳ Expiry Date: ${expiryDate}
💰 Fee Paid: ₹${body.fee}

----------------------------------------
🌟 Facilities Available:
✔️     24/7 Open Library
✔️ 🎥 24x7 CCTV Camera Surveillance
✔️ 🧼 Clean & Separate Washrooms
✔️ 💧 RO Mineral Water
✔️ 🌐 High-Speed Free Wi-Fi
✔️ ❄️ Fully Air-Conditioned (AC)
✔️ ⚡ Uninterrupted Power Backup

🤝 Share & Admission Inquiry Link:
👉 https://forms.gle/HgSDtMLqnCZgreBe8

*Student Portal Login Credentials:*
🆔 Student ID / Username: ${studentId}
🔑 Password: ${password}

Portal: ${config.app.url || 'http://localhost:5173'}/student

Aapki Fee Receipt PDF neeche attached hai. Thank you!`;

    sendNotif({
      recipient: student._id,
      type:      'membership_activated',
      title:     '✅ Admission Confirmed',
      body:      admissionMsg,
      channel:   'all',
      email:     body.email,
      mobile:    body.mobile,
      metadata:  { studentId, password, receiptNo },
      studentData: { ...student, joiningDate: startDate, expiryDate }
    }).catch(e => logger.error('[createStudent] cred notif failed:', e.message));

    return successResponse(res, {
      student,
      user:      { id: user._id, username: user.username, email: user.email, role: user.role },
      membership,
      receiptNo,
      credentials: { studentId, password, username: studentId.toLowerCase() }
    }, 'Student created successfully — credentials dispatched', 201);

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// ─── GET /admin/students ─────────────────────────────────────────────────────
export const listStudentsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, branch, shift, search } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (branch) filter.branch = new RegExp(branch, 'i');
  if (shift)  filter.shift  = new RegExp(shift, 'i');
  if (search) {
    const re = new RegExp(search.trim(), 'i');
    filter.$or = [
      { name: re }, { mobile: re }, { email: re },
      { seatCode: re }, { studentId: re }
    ];
  }

  const result = await studentRepository.paginate(filter, {
    page:  parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort:  { createdAt: -1 }
  });

  return paginatedResponse(res, result.data, result.pagination, 'Students retrieved');
});

// ─── GET /admin/students/:id ─────────────────────────────────────────────────
export const getStudentController = asyncHandler(async (req, res) => {
  const student = await studentRepository.findById(req.params.id);
  if (!student) throw new NotFoundError('Student not found');
  return successResponse(res, student, 'Student retrieved');
});

// ─── PUT /admin/students/:id ─────────────────────────────────────────────────
export const updateStudentController = asyncHandler(async (req, res) => {
  const { id }     = req.params;
  const updates    = req.body;
  const student    = await studentRepository.updateById(id, updates);
  if (!student) throw new NotFoundError('Student not found');

  await AuditLog.create({
    action: 'student_updated', actorId: toActorId(req.user.id), actorRole: req.user.role,
    actorName: req.user.username, targetType: 'Student', targetId: id,
    targetName: student.name, details: Object.keys(updates)
  });

  return successResponse(res, student, 'Student updated successfully');
});

// ─── DELETE /admin/students/:id — HARD CASCADE DELETE ──────────────────────
export const deactivateStudentController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid student id.');
  }

  const student = await Student.findById(id);
  if (!student) throw new NotFoundError('Student not found');

  // Run all cascade deletes in a single transaction so they're atomic
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Free seat in Seat matrix
    if (student.seatCode && student.shift) {
      // Map shift names to shift keys for the seat matrix
      const shiftMapping = {
        'Shift 1': 'Shift 1',
        'Shift 2': 'Shift 2', 
        'Shift 3': 'Shift 3',
        'Shift 4': 'Shift 4',
        'Night Shift': 'Night Shift',
        'Custom': 'Custom'
      };
      
      const shiftValue = shiftMapping[student.shift] || student.shift;
      const seatKey = `s_${parseInt(student.seatCode.replace(/\D/g, ''), 10)}_${shiftValue}`;
      await Seat.deleteOne({ seat_key: seatKey }, { session });
    }

    // 2. Delete all payments for this student
    await Payment.deleteMany({ student: student._id }, { session });

    // 3. Delete all memberships for this student
    await Membership.deleteMany({ student: student._id }, { session });

    // 4. Delete all attendance records for this student
    await Attendance.deleteMany({ student: student._id }, { session });

    // 5. Unlink admission request (mark as deleted, keep record for audit)
    //    We update rather than delete to preserve the inquiry audit trail
    await mongoose.model('AdmissionRequest').updateMany(
      { studentRef: student._id },
      { $unset: { studentRef: '' }, $set: { admission_status: 'Accepted' } },
      { session }
    );

    // 6. Delete linked User account
    if (student.userRef) {
      await User.deleteOne({ _id: student.userRef }, { session });
    }

    // 7. Hard delete the Student document itself
    await Student.deleteOne({ _id: student._id }, { session });

    // 8. Audit log
    await AuditLog.create([{
      action:    'student_hard_deleted',
      actorId:   toActorId(req.user.id),
      actorRole: req.user.role,
      actorName: req.user.username,
      targetType:'Student',
      targetId:  id,
      targetName:student.name,
      details: {
        seatCode:  student.seatCode,
        shift:     student.shift,
        studentId: student.studentId,
        mobile:    student.mobile,
        cascade:   ['seat', 'payments', 'memberships', 'attendance', 'user']
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, {
      deletedId: id,
      name: student.name,
      seatCode: student.seatCode
    }, `Student "${student.name}" and all linked records permanently deleted.`);

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// ─── GET /admin/stats ────────────────────────────────────────────────────────
export const getDashboardStatsController = asyncHandler(async (req, res) => {
  const { branch } = req.query;
  const branchFilter = branch ? { branch } : {};
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const in5 = new Date(); in5.setDate(in5.getDate() + 5);
  const in5Str = in5.toISOString().slice(0, 10);

  const [
    total, active, inactive, expired, expiringSoon,
    todayAttendance,
    monthRevAgg,
    seatsOccupied,
    pendingAdmissions
  ] = await Promise.all([
    Student.countDocuments(branchFilter),
    Student.countDocuments({ status: 'Active',   ...branchFilter }),
    Student.countDocuments({ status: 'Inactive', ...branchFilter }),
    Student.countDocuments({ status: 'Expired',  ...branchFilter }),
    Student.countDocuments({ status: 'Active', expiryDate: { $lte: in5Str, $gte: today }, ...branchFilter }),
    Attendance.countDocuments({ date: today }),
    Payment.aggregate([
      { $match: { paidOn: { $regex: `^${thisMonth}` }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Seat.countDocuments({ is_booked: 1 }),
    mongoose.model('AdmissionRequest').countDocuments({ admission_status: 'Pending' })
  ]);

  // Shift-wise occupancy
  const shiftOccupancy = await Student.aggregate([
    { $match: { status: 'Active', ...branchFilter } },
    { $group: { _id: '$shift', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  // Last 7 days attendance trend
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const attendanceTrend = await Attendance.aggregate([
    { $match: { date: { $in: last7 } } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  // Monthly revenue last 6 months
  const revenueByMonth = await Payment.aggregate([
    { $match: { status: 'completed' } },
    { $group: {
      _id: { $substr: ['$paidOn', 0, 7] },
      total: { $sum: '$amount' }
    }},
    { $sort: { _id: 1 } },
    { $limit: 6 }
  ]);

  return successResponse(res, {
    total, active, inactive, expired, expiringSoon,
    todayAttendance,
    monthRevenue:    monthRevAgg[0]?.total || 0,
    seatsOccupied,
    pendingAdmissions,
    shiftOccupancy:  shiftOccupancy.map(s => ({ shift: s._id || 'Unknown', count: s.count })),
    attendanceTrend: last7.map(date => ({
      date,
      count: attendanceTrend.find(a => a._id === date)?.count || 0
    })),
    revenueByMonth: revenueByMonth.map(r => ({ month: r._id, revenue: r.total }))
  }, 'Dashboard stats retrieved');
});

// ─── GET /admin/audit-logs ────────────────────────────────────────────────────
export const getAuditLogsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, targetType } = req.query;
  const filter = {};
  if (action)     filter.action     = new RegExp(action, 'i');
  if (targetType) filter.targetType = targetType;

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    AuditLog.countDocuments(filter)
  ]);

  return paginatedResponse(res, logs, { page: parseInt(page, 10), limit: parseInt(limit, 10), total }, 'Audit logs retrieved');
});
