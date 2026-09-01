import BaseRepository from './BaseRepository.js';
import Notification from '../models/Notification.js';

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  async createNotification(notificationData) {
    return this.create(notificationData);
  }

  async findByStudentId(studentId, options = {}) {
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
    return this.find(
      { student: studentId },
      { limit, skip, sort }
    );
  }

  async findUnreadByStudentId(studentId, options = {}) {
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
    return this.find(
      { student: studentId, read: false },
      { limit, skip, sort }
    );
  }

  async markAsRead(notificationId) {
    return this.updateOne({ _id: notificationId }, { read: true, readAt: new Date() });
  }

  async markAllAsRead(studentId) {
    return this.updateMany(
      { student: studentId, read: false },
      { read: true, readAt: new Date() }
    );
  }

  async broadcast(notificationData, studentIds) {
    const notifications = studentIds.map(studentId => ({
      ...notificationData,
      student: studentId
    }));
    return this.createMany(notifications);
  }

  async deleteByStudentId(studentId) {
    return this.deleteMany({ student: studentId });
  }

  async deleteOldNotifications(beforeDate) {
    return this.deleteMany({ createdAt: { $lt: beforeDate } });
  }
}

export default new NotificationRepository();
