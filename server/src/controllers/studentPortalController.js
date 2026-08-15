import Student from '../models/Student.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import Announcement from '../models/Announcement.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors.js';
import { getForStudent, markRead } from '../services/notificationService.js';
import { getActive } from '../services/membershipService.js';
import { generateStudentIdCard } from '../services/pdfService.js';
import { toDataURL } from '../services/qrService.js';

export const getDashboardController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  
  const [student, membership, todayAttendance] = await Promise.all([
    Student.findById(studentId),
    getActive(studentId),
    Attendance.findOne({ 
      student: studentId, 
      date: new Date().toISOString().slice(0, 10) 
    })
  ]);

  const notifications = await getForStudent(studentId, { limit: 5, unreadOnly: true });

  const dashboard = {
    student,
    membership,
    todayAttendance,
    unreadNotifications: notifications.unreadCount
  };

  return successResponse(res, dashboard, 'Dashboard data retrieved');
});

export const getProfileController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  const student = await Student.findById(studentId);

  if (!student) {
    throw new NotFoundError('Student profile not found');
  }

  return successResponse(res, student, 'Profile retrieved');
});

export const updateProfileController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  const updates = req.body;

  const student = await Student.findByIdAndUpdate(studentId, updates, { new: true });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  return successResponse(res, student, 'Profile updated successfully');
});

export const getIdCardController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  const format = req.query.format || 'json';

  const student = await Student.findById(studentId);
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  if (format === 'pdf') {
    const qrDataUrl = await toDataURL(student.studentId || student._id.toString());
    const pdfBuffer = await generateStudentIdCard(student, qrDataUrl);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="id-card-${student.studentId || student._id}.pdf"`);
    return res.send(pdfBuffer);
  }

  return successResponse(res, student, 'ID card data retrieved');
});

export const getMembershipController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  const membership = await getActive(studentId);

  if (!membership) {
    throw new NotFoundError('No active membership found');
  }

  return successResponse(res, membership, 'Membership retrieved');
});

export const getAttendanceController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  const { page = 1, limit = 30, month } = req.query;

  const filter = { student: studentId };

  // Support ?month=YYYY-MM filtering
  if (month) {
    filter.date = { $regex: `^${month}` };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [attendance, total] = await Promise.all([
    Attendance.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Attendance.countDocuments(filter)
  ]);

  return paginatedResponse(res, attendance, {
    page: parseInt(page, 10), limit: parseInt(limit, 10), total
  }, 'Attendance retrieved');
});

// ─── POST /student/attendance/check-in ──────────────────────────────────────
// Student self check-in - NO time restrictions, pure timestamp logging
export const selfCheckInController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  if (!studentId) throw new NotFoundError('Student account not linked.');

  const student = await Student.findById(studentId);
  if (!student) throw new NotFoundError('Student profile not found.');

  const today = new Date().toISOString().slice(0, 10);
  const nowTimestamp = new Date();
  // Format time in HH:MM format using local time (not UTC)
  const nowTime = nowTimestamp.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Kolkata' // Explicitly use Indian timezone
  });

  // NO shift-based validation - allow check-in at any time
  // Check for existing record today
  const existing = await Attendance.findOne({ student: studentId, date: today });
  if (existing?.checkIn) {
    // Already checked in — return the existing record (idempotent)
    return successResponse(res, existing, `Already checked in today at ${existing.checkIn}`);
  }

  const record = await Attendance.findOneAndUpdate(
    { student: studentId, date: today },
    {
      $setOnInsert: { student: studentId, date: today },
      $set: {
        checkIn: nowTime,
        checkInTimestamp: nowTimestamp,
        checkOut: '',
        checkOutTimestamp: null,
        durationMins: 0,
        method: 'self',
        shift: student.shift || '',
        shiftType: student.shift,
        seatCode: student.seatCode || '',
        markedBy: null,
        branch: student.branch || '',
        isValidated: true,
        validationMessage: '',
        status: 'CHECKED_IN'
      }
    },
    { upsert: true, new: true }
  );

  return successResponse(res, record, 'Attendance marked successfully!', 201);
});

// ─── POST /student/attendance/check-out ──────────────────────────────────────
// Student self check-out - NO time restrictions, pure timestamp logging
export const selfCheckOutController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  if (!studentId) throw new NotFoundError('Student account not linked.');

  const student = await Student.findById(studentId);
  if (!student) throw new NotFoundError('Student profile not found.');

  const today = new Date().toISOString().slice(0, 10);
  const nowTimestamp = new Date();
  // Format time in HH:MM format using local time (not UTC)
  const nowTime = nowTimestamp.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Kolkata' // Explicitly use Indian timezone
  });

  // NO shift-based validation - allow check-out at any time
  // Check for existing record today
  const existing = await Attendance.findOne({ student: studentId, date: today });
  if (!existing?.checkIn) {
    throw new ValidationError('You must check in before checking out');
  }
  if (existing?.checkOut) {
    // Already checked out — return the existing record (idempotent)
    return successResponse(res, existing, `Already checked out today at ${existing.checkOut}`);
  }

  // Calculate duration
  const [ih, im] = existing.checkIn.split(':').map(Number);
  const [oh, om] = nowTime.split(':').map(Number);
  const durationMins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));

  const record = await Attendance.findByIdAndUpdate(
    existing._id,
    {
      checkOut: nowTime,
      checkOutTimestamp: nowTimestamp,
      durationMins,
      isValidated: true,
      validationMessage: '',
      status: 'CHECKED_OUT'
    },
    { new: true }
  );

  return successResponse(res, record, 'Check-out marked successfully!');
});

export const getPaymentsController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    Payment.find({ student: studentId })
      .populate('membership')
      .sort({ paidOn: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Payment.countDocuments({ student: studentId })
  ]);

  return paginatedResponse(res, payments, { page: parseInt(page), limit: parseInt(limit), total }, 'Payments retrieved');
});

export const downloadReceiptController = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const studentId = req.user.studentRef;

  const payment = await Payment.findOne({ _id: paymentId, student: studentId });
  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  return successResponse(res, payment, 'Receipt retrieved');
});

export const getNotificationsController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  const { page = 1, limit = 20, unreadOnly } = req.query;

  const result = await getForStudent(studentId, {
    page: parseInt(page),
    limit: parseInt(limit),
    unreadOnly: unreadOnly === 'true'
  });

  return paginatedResponse(res, result.notifications, { 
    page: result.page, 
    limit: result.limit, 
    total: result.total 
  }, 'Notifications retrieved');
});

export const markNotificationsReadController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  const { notificationIds } = req.body;

  const count = await markRead(studentId, notificationIds || []);

  return successResponse(res, { markedCount: count }, 'Notifications marked as read');
});

export const getAnnouncementsController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  const student = await Student.findById(studentId);

  const filter = { 
    publishAt: { $lte: new Date() },
    $or: [
      { targetBranch: '' },
      { targetBranch: student?.branch || '' }
    ]
  };

  const announcements = await Announcement.find(filter)
    .sort({ pinned: -1, publishAt: -1 })
    .limit(10);

  return successResponse(res, announcements, 'Announcements retrieved');
});
