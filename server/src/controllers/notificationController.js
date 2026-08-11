import Notification from '../models/Notification.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError } from '../utils/errors.js';

export const getNotificationsController = asyncHandler(async (req, res) => {
  const { limit = 10, unreadOnly = false } = req.query;

  console.log('Fetching notifications with params:', { limit, unreadOnly });

  const filter = { recipient: null }; // Admin notifications (broadcast/general)
  if (unreadOnly === 'true') {
    filter.isRead = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10)),
    Notification.countDocuments({ recipient: null, isRead: false })
  ]);

  console.log('Notifications fetched:', { count: notifications.length, unreadCount });

  return successResponse(res, {
    notifications,
    unreadCount,
    total: notifications.length
  }, 'Notifications retrieved');
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
