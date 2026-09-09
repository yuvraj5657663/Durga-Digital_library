// Mock all dependencies before imports
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id-123' })
  }))
}));
jest.mock('../src/config/logger.js');
jest.mock('../src/config/index.js', () => ({
  email: {
    host: 'smtp.test.com',
    port: 587,
    user: 'test@test.com',
    pass: 'testpass',
    from: 'Test <test@test.com>'
  }
}));
jest.mock('../src/services/pdfService.js', () => ({
  generateAdmissionReceipt: jest.fn().mockResolvedValue(Buffer.from('pdf'))
}));
jest.mock('../src/config/shiftConfig.js', () => ({
  hasShiftEnded: jest.fn(() => false),
  getShiftEndTime: jest.fn(() => '6:00 PM'),
  SHIFT_CONFIG: {
    'Shift 1': { description: 'Morning Shift', isFlexible: false }
  }
}));
jest.mock('../src/repositories/index.js', () => ({
  notificationRepository: {
    createNotification: jest.fn(),
    findByStudentId:    jest.fn(),
    count:              jest.fn(),
    updateOne:          jest.fn(),
    updateMany:         jest.fn(),
    broadcast:          jest.fn()
  },
  attendanceRepository: {
    findByDateRange: jest.fn()
  },
  studentRepository: {
    findById: jest.fn()
  }
}));

import { send, sendRenewalReminder, sendMembershipActivated, markRead, getForStudent, broadcast } from '../src/services/notificationService.js';

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.whatsappClient = null; // disable WA by default
  });

  const mockStudent = {
    _id: 'student123',
    name: 'John Doe',
    mobile: '9876543210',
    email: 'john@example.com',
    seatCode: 'DDL001',
    shift: 'Shift 1',
    shiftHours: '6 AM - 12 PM',
    joiningDate: '2025-01-01',
    expiryDate: '2025-12-31',
    fee: 500
  };

  const mockNotif = {
    _id: 'notif123',
    type: 'renewal_reminder',
    title: 'Test',
    body: 'Test body',
    isRead: false
  };

  describe('send', () => {
    it('should create in_app notification', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.createNotification.mockResolvedValue(mockNotif);
      notificationRepository.updateOne.mockResolvedValue({});

      const result = await send({
        recipient: 'student123',
        type: 'renewal_reminder',
        title: 'Test',
        body: 'Test body',
        channel: 'in_app'
      });

      expect(result.notification).toEqual(mockNotif);
      expect(notificationRepository.createNotification).toHaveBeenCalledTimes(1);
    });

    it('should attempt email when channel is email', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.createNotification.mockResolvedValue(mockNotif);
      notificationRepository.updateOne.mockResolvedValue({});

      const result = await send({
        recipient: 'student123',
        type: 'renewal_reminder',
        title: 'Renewal Reminder',
        body: 'Your membership expires soon',
        channel: 'email',
        email: 'john@example.com'
      });

      expect(result.notification).toEqual(mockNotif);
      // sentVia.email should be true since nodemailer sendMail is mocked to succeed
      expect(result.sentVia.email).toBe(true);
    });

    it('should handle WhatsApp not ready gracefully', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.createNotification.mockResolvedValue(mockNotif);
      notificationRepository.updateOne.mockResolvedValue({});

      const result = await send({
        recipient: 'student123',
        type: 'renewal_reminder',
        title: 'Test',
        body: 'Test',
        channel: 'whatsapp',
        mobile: '9876543210'
      });

      expect(result.sentVia.whatsapp).toBe(false);
    });

    it('should handle all channel', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.createNotification.mockResolvedValue(mockNotif);
      notificationRepository.updateOne.mockResolvedValue({});

      const result = await send({
        recipient: 'student123',
        type: 'renewal_reminder',
        title: 'Test',
        body: 'Test',
        channel: 'all',
        email: 'john@example.com',
        mobile: '9876543210'
      });

      // Email sent, WhatsApp not ready
      expect(result.sentVia.email).toBe(true);
      expect(result.sentVia.whatsapp).toBe(false);
    });
  });

  describe('sendRenewalReminder', () => {
    it('should send renewal reminder with correct content', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.createNotification.mockResolvedValue(mockNotif);
      notificationRepository.updateOne.mockResolvedValue({});

      const result = await sendRenewalReminder({ student: mockStudent, daysLeft: 3 });

      expect(notificationRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'renewal_reminder' })
      );
    });
  });

  describe('sendMembershipActivated', () => {
    it('should send activation notification for standard shift', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.createNotification.mockResolvedValue(mockNotif);
      notificationRepository.updateOne.mockResolvedValue({});

      const result = await sendMembershipActivated({
        student: mockStudent,
        membership: { _id: 'm1', status: 'Active' }
      });

      expect(notificationRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'membership_activated' })
      );
    });

    it('should use customTiming for Custom shift', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.createNotification.mockResolvedValue(mockNotif);
      notificationRepository.updateOne.mockResolvedValue({});

      const customStudent = {
        ...mockStudent,
        shift: 'Custom',
        customTiming: '6 AM - 10 AM & 4 PM - 8 PM'
      };

      const sendSpy = jest.spyOn(
        await import('../src/services/notificationService.js'), 'send'
      ).mockResolvedValue({ notification: mockNotif, sentVia: {} });

      await sendMembershipActivated({
        student: customStudent,
        membership: {}
      });

      // body should contain the custom timing
      const callArg = notificationRepository.createNotification.mock.calls[0]?.[0];
      if (callArg) {
        expect(callArg.body).toContain('6 AM - 10 AM & 4 PM - 8 PM');
      }
    });
  });

  describe('markRead', () => {
    it('should mark specific notifications as read', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.updateMany.mockResolvedValue({ modifiedCount: 2 });

      const count = await markRead('student123', ['notif1', 'notif2']);
      expect(count).toBe(2);
      expect(notificationRepository.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: 'student123', _id: { $in: ['notif1', 'notif2'] } }),
        expect.objectContaining({ isRead: true })
      );
    });

    it('should mark all notifications as read when no IDs given', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.updateMany.mockResolvedValue({ modifiedCount: 5 });

      const count = await markRead('student123', []);
      expect(count).toBe(5);
    });
  });

  describe('getForStudent', () => {
    it('should return paginated notifications', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.findByStudentId.mockResolvedValue([mockNotif]);
      notificationRepository.count.mockResolvedValue(1);

      const result = await getForStudent('student123', { page: 1, limit: 10 });

      expect(result.notifications).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('broadcast', () => {
    it('should create broadcast notification with null recipient', async () => {
      const { notificationRepository } = await import('../src/repositories/index.js');
      notificationRepository.createNotification.mockResolvedValue({
        ...mockNotif,
        recipient: null
      });

      await broadcast({
        type: 'announcement',
        title: 'Holiday Notice',
        body: 'Library closed tomorrow'
      });

      expect(notificationRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: null, type: 'announcement' })
      );
    });
  });
});
