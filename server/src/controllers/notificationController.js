import Notification from '../models/Notification.js';
import Student from '../models/Student.js';
import { retry, send } from '../services/notificationService.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError } from '../utils/errors.js';

export const getNotificationsController = asyncHandler(async (req, res) => {
  const { limit = 10, unreadOnly = false } = req.query;

  const filter = {};
  if (req.query.status) filter.$or = [
    { 'delivery.email.status': req.query.status.toUpperCase() },
    { 'delivery.whatsapp.status': req.query.status.toUpperCase() }
  ];

  if (req.query.studentId) filter.recipient = req.query.studentId;
  else if (!req.query.includeStudent) filter.recipient = null;
  if (unreadOnly === 'true') {
    filter.isRead = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10)),
    Notification.countDocuments({ recipient: null, isRead: false })
  ]);

  return successResponse(res, {
    notifications,
    unreadCount,
    total: notifications.length
  }, 'Notifications retrieved');
});

export const retryNotificationController = asyncHandler(async (req, res) => {
  const channels = Array.isArray(req.body.channels) && req.body.channels.length
    ? req.body.channels
    : ['email', 'whatsapp'];
  const result = await retry(req.params.id, channels);
  return successResponse(res, result, 'Notification retry completed');
});

function reminderContent(type, student, customMessage = '') {
  const templates = {
    payment_due: {
      title: 'Payment / Renewal Due',
      body: `Namaste ${student.name}, your library payment or renewal is due. Current expiry: ${student.expiryDate || 'not available'}. Please contact the library.`
    },
    expiring_soon: {
      title: 'Membership Expiring Soon',
      body: `Namaste ${student.name}, your membership expires on ${student.expiryDate || 'an upcoming date'}. Please renew to keep your seat active.`
    },
    expired: {
      title: 'Membership Expired',
      body: `Namaste ${student.name}, your membership expired on ${student.expiryDate || 'an earlier date'}. Please renew before visiting the library.`
    },
    custom: { title: 'Message from Durga Digital Library', body: customMessage }
  };
  return templates[type] || templates.custom;
}

export const sendReminderController = asyncHandler(async (req, res) => {
  const { studentIds = [], type = 'custom', customMessage = '', channel = 'all' } = req.body;
  if (!Array.isArray(studentIds) || !studentIds.length) throw new Error('At least one student is required');
  if (type === 'custom' && !customMessage.trim()) throw new Error('Custom message is required');

  const students = await Student.find({ _id: { $in: studentIds } });
  const results = await Promise.all(students.map(async (student) => {
    const content = reminderContent(type, student, customMessage);
    return send({
      recipient: student._id,
      type: type === 'expiring_soon' ? 'membership_expiring' : type === 'expired' ? 'membership_expired_reminder' : 'payment_reminder',
      title: content.title,
      body: content.body,
      channel,
      email: student.email,
      mobile: student.mobile,
      metadata: { reminderType: type, sentBy: req.user.id }
    });
  }));

  return successResponse(res, { count: results.length, results }, 'Reminder notifications queued');
});

export const markAllAsReadController = asyncHandler(async (req, res) => {
  console.log('Marking all notifications as read');
  const result = await Notification.updateMany(
    { recipient: null, isRead: false },
    { isRead: true }
  );

  console.log('Marked as read result:', result.modifiedCount);

  return successResponse(res, {
    modifiedCount: result.modifiedCount
  }, 'All notifications marked as read');
});

export const markAsReadController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  console.log('Marking notification as read:', id);

  const notification = await Notification.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true }
  );

  if (!notification) throw new NotFoundError('Notification not found');

  return successResponse(res, notification, 'Notification marked as read');
});

export const createTestNotificationController = asyncHandler(async (req, res) => {
  const { title, body, type } = req.body;

  const notification = await Notification.create({
    recipient: null, // Admin notification
    title: title || 'Test Notification',
    body: body || 'This is a test notification for the admin panel.',
    type: type || 'custom',
    isRead: false,
    channel: 'in_app'
  });

  console.log('Test notification created:', notification);

  return successResponse(res, notification, 'Test notification created');
});
