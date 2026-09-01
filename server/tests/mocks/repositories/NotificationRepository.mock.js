// Mock NotificationRepository for Jest tests
const mockNotificationRepository = {
  createNotification: jest.fn(),
  findByStudentId: jest.fn(),
  findUnreadByStudentId: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  broadcast: jest.fn(),
  deleteByStudentId: jest.fn(),
  deleteOldNotifications: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  count: jest.fn()
};

export default mockNotificationRepository;
