import Notification from '../models/Notification.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError } from '../utils/errors.js';

export const getNotificationsController = asyncHandler(async (req, res) => {
  const { limit = 10, unreadOnly = false } = req.query;
  
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

  return successResponse(res, {
    notifications,
    unreadCount,
    total: notifications.length
  }, 'Notifications retrieved');
});

export const markAllAsReadController = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: null, isRead: false },
    { isRead: true }
  );

  return successResponse(res, { 
    modifiedCount: result.modifiedCount 
  }, 'All notifications marked as read');
});

export const markAsReadController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const notification = await Notification.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true }
  );

  if (!notification) throw new NotFoundError('Notification not found');

  return successResponse(res, notification, 'Notification marked as read');
});
