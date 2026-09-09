// Mock all dependencies before imports
jest.mock('../src/models/AuditLog.js', () => ({ create: jest.fn() }));
jest.mock('../src/config/logger.js');
jest.mock('../src/services/notificationService.js', () => ({
  sendMembershipActivated: jest.fn().mockResolvedValue({})
}));
jest.mock('../src/utils/actorId.js', () => ({
  toActorId: jest.fn((id) => id)
}));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'aaaa-bbbb-cccc-dddd') }));
jest.mock('../src/repositories/index.js', () => ({
  studentRepository: {
    findById:      jest.fn(),
    updateById:    jest.fn(),
    updateMany:    jest.fn(),
    findExpiringSoon: jest.fn()
  },
  membershipRepository: {
    updateMany:            jest.fn(),
    create:                jest.fn(),
    find:                  jest.fn(),
    findActiveByStudent:   jest.fn(),
    getHistory:            jest.fn()
  },
  paymentRepository: {
    create:   jest.fn(),
    updateById: jest.fn()
  }
}));

// Mock mongoose session
jest.mock('mongoose', () => {
  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction:  jest.fn(),
    endSession:        jest.fn()
  };
  return {
    startSession: jest.fn().mockResolvedValue(session),
    Types: { ObjectId: { isValid: jest.fn(() => true) } }
  };
});

import { renew, expireStale, findExpiringSoon, getHistory, getActive } from '../src/services/membershipService.js';

describe('Membership Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockStudent = {
    _id: 'student123',
    name: 'John Doe',
    studentId: 'DDL001',
    branch: 'Main',
    expiryDate: '2025-12-31'
  };

  const mockMembership = {
    _id: 'membership123',
    student: 'student123',
    status: 'Active',
    startDate: '2025-01-01',
    expiryDate: '2025-12-31',
    fee: 500,
    duration: '12 Month(s)'
  };

  describe('renew', () => {
    beforeEach(async () => {
      const { studentRepository, membershipRepository, paymentRepository } =
        await import('../src/repositories/index.js');
      const mongoose = await import('mongoose');
      const AuditLog = (await import('../src/models/AuditLog.js')).default;

      studentRepository.findById.mockResolvedValue(mockStudent);
      studentRepository.updateById.mockResolvedValue(mockStudent);
      membershipRepository.updateMany.mockResolvedValue({ modifiedCount: 0 });
      membershipRepository.create.mockResolvedValue([mockMembership]);
      paymentRepository.create.mockResolvedValue([{ _id: 'payment123', receiptNo: 'DDL-20250101-AAAAAA' }]);
      AuditLog.create.mockResolvedValue([{}]);
    });

    it('should renew membership for active student', async () => {
      const result = await renew({
        studentId: 'student123',
        duration: '1 Month(s)',
        fee: 500,
        paymentMode: 'cash',
        joiningDate: '2025-01-01',
        adminUser: { _id: 'admin1', id: 'admin1', role: 'admin', name: 'Admin' }
      });

      expect(result).toHaveProperty('membership');
      expect(result).toHaveProperty('receiptNo');
      expect(result).toHaveProperty('expiryDate');
    });

    it('should throw error if student not found', async () => {
      const { studentRepository } = await import('../src/repositories/index.js');
      studentRepository.findById.mockResolvedValue(null);

      await expect(renew({
        studentId: 'nonexistent',
        duration: '1 Month(s)',
        fee: 500
      })).rejects.toThrow('Student not found');
    });

    it('should parse duration correctly', async () => {
      const result = await renew({
        studentId: 'student123',
        duration: '3 Month(s)',
        fee: 1500
      });

      // 3 months added to today
      const now = new Date();
      now.setMonth(now.getMonth() + 3);
      const expectedYear = now.getFullYear();

      expect(result.expiryDate).toContain(String(expectedYear));
    });

    it('should generate receipt number', async () => {
      const result = await renew({
        studentId: 'student123',
        duration: '1 Month(s)',
        fee: 500
      });

      expect(result.receiptNo).toMatch(/^DDL-\d{8}-/);
    });
  });

  describe('expireStale', () => {
    it('should return 0 when no stale memberships', async () => {
      const { membershipRepository } = await import('../src/repositories/index.js');
      membershipRepository.find.mockResolvedValue([]);

      const count = await expireStale();
      expect(count).toBe(0);
    });

    it('should expire stale memberships and update students', async () => {
      const { membershipRepository, studentRepository } = await import('../src/repositories/index.js');
      const staleMemberships = [
        { _id: 'm1', student: 's1' },
        { _id: 'm2', student: 's2' }
      ];
      membershipRepository.find.mockResolvedValue(staleMemberships);
      membershipRepository.updateMany.mockResolvedValue({ modifiedCount: 2 });
      studentRepository.updateMany.mockResolvedValue({ modifiedCount: 2 });

      const count = await expireStale();
      expect(count).toBe(2);
    });
  });

  describe('findExpiringSoon', () => {
    it('should return students expiring within default 5 days', async () => {
      const { studentRepository } = await import('../src/repositories/index.js');
      const expiringSoon = [mockStudent, { ...mockStudent, _id: 'student456' }];
      studentRepository.findExpiringSoon.mockResolvedValue(expiringSoon);

      const result = await findExpiringSoon(5);
      expect(result).toHaveLength(2);
      expect(studentRepository.findExpiringSoon).toHaveBeenCalledWith(5);
    });
  });

  describe('getHistory', () => {
    it('should return membership history for a student', async () => {
      const { membershipRepository } = await import('../src/repositories/index.js');
      const historyResult = {
        memberships: [mockMembership],
        pagination: { page: 1, limit: 10, total: 1 }
      };
      membershipRepository.getHistory.mockResolvedValue(historyResult);

      const result = await getHistory('student123', { page: 1, limit: 10 });
      expect(result.memberships).toHaveLength(1);
      expect(membershipRepository.getHistory).toHaveBeenCalledWith('student123', { page: 1, limit: 10 });
    });
  });

  describe('getActive', () => {
    it('should return active membership', async () => {
      const { membershipRepository } = await import('../src/repositories/index.js');
      membershipRepository.findActiveByStudent.mockResolvedValue(mockMembership);

      const result = await getActive('student123');
      expect(result).toEqual(mockMembership);
      expect(membershipRepository.findActiveByStudent).toHaveBeenCalledWith('student123');
    });

    it('should return null when no active membership', async () => {
      const { membershipRepository } = await import('../src/repositories/index.js');
      membershipRepository.findActiveByStudent.mockResolvedValue(null);

      const result = await getActive('student123');
      expect(result).toBeNull();
    });
  });
});
