import Student from '../models/Student.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import Announcement from '../models/Announcement.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';
import { NotFoundError } from '../utils/errors.js';
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
  const { page = 1, limit = 30 } = req.query;

  const skip = (page - 1) * limit;
  const [attendance, total] = await Promise.all([
    Attendance.find({ student: studentId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Attendance.countDocuments({ student: studentId })
  ]);

  return paginatedResponse(res, attendance, { page: parseInt(page), limit: parseInt(limit), total }, 'Attendance retrieved');
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
