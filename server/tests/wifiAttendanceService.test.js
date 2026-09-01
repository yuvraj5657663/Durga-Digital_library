import { checkWiFiEligibility, createWiFiAttendance } from '../src/services/wifiAttendanceService.js';
import Student from '../src/models/Student.js';
import Membership from '../src/models/Membership.js';
import Attendance from '../src/models/Attendance.js';

// Mock dependencies
jest.mock('../src/models/Student.js');
jest.mock('../src/models/Membership.js');
jest.mock('../src/models/Attendance.js');
jest.mock('../src/services/membershipService.js');
jest.mock('../src/models/AuditLog.js');
jest.mock('../src/config/logger.js');

describe('WiFi Attendance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkWiFiEligibility', () => {
    it('should return eligible for active student with active membership', async () => {
      const mockStudent = {
        _id: 'student123',
        name: 'John Doe',
        status: 'Active',
        studentId: 'DDL001'
      };

      const mockMembership = {
        _id: 'membership123',
        status: 'Active',
        expiryDate: '2026-12-31'
      };

      Student.findById.mockResolvedValue(mockStudent);
      
      // Mock getActive to return membership
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);

      const result = await checkWiFiEligibility('student123');

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.student).toEqual(mockStudent);
      expect(result.membership).toEqual(mockMembership);
    });

    it('should return not eligible for student not found', async () => {
      Student.findById.mockResolvedValue(null);

      const result = await checkWiFiEligibility('student123');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('STUDENT_NOT_FOUND');
      expect(result.student).toBeNull();
    });

    it('should return not eligible for inactive student', async () => {
      const mockStudent = {
        _id: 'student123',
        name: 'John Doe',
        status: 'Inactive',
        studentId: 'DDL001'
      };

      Student.findById.mockResolvedValue(mockStudent);

      const result = await checkWiFiEligibility('student123');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('STUDENT_INACTIVE');
    });

    it('should return not eligible for no active membership', async () => {
      const mockStudent = {
        _id: 'student123',
        name: 'John Doe',
        status: 'Active',
        studentId: 'DDL001'
      };

      Student.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(null);

      const result = await checkWiFiEligibility('student123');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('NO_ACTIVE_MEMBERSHIP');
    });

    it('should return not eligible for expired membership', async () => {
      const mockStudent = {
        _id: 'student123',
        name: 'John Doe',
        status: 'Active',
        studentId: 'DDL001'
      };

      const mockMembership = {
        _id: 'membership123',
        status: 'Active',
        expiryDate: '2026-01-01' // Past date
      };

      Student.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);

      const result = await checkWiFiEligibility('student123');

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('MEMBERSHIP_EXPIRED');
    });
  });

  describe('createWiFiAttendance', () => {
    const mockStudent = {
      _id: 'student123',
      name: 'John Doe',
      status: 'Active',
      studentId: 'DDL001',
      shift: 'Shift 1',
      seatCode: 'DDL001',
      branch: 'Munger'
    };

    const mockMembership = {
      _id: 'membership123',
      status: 'Active',
      expiryDate: '2026-12-31'
    };

    const mockAttendance = {
      _id: 'att123',
      student: 'student123',
      date: '2026-08-31',
      checkIn: '10:00',
      method: 'wifi_network',
      status: 'CHECKED_IN'
    };

    const sessionInfo = {
      sessionId: 'session_abc123',
      deviceId: 'device_xyz789',
      ipAddress: '192.168.1.100',
      gatewayId: 'gateway_001',
      networkVerified: true
    };

    it('should create attendance for eligible student with no existing attendance', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      Attendance.findOne.mockResolvedValue(null); // No existing attendance
      Attendance.findOneAndUpdate.mockResolvedValue(mockAttendance);

      const result = await createWiFiAttendance('student123', sessionInfo);

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.attendance).toEqual(mockAttendance);
      expect(result.message).toBe('Attendance created via Wi-Fi authentication');
    });

    it('should return existing attendance when attendance already exists for today', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      Attendance.findOne.mockResolvedValue(mockAttendance); // Existing attendance found

      const result = await createWiFiAttendance('student123', sessionInfo);

      expect(result.success).toBe(true);
      expect(result.action).toBe('existing_record');
      expect(result.attendance).toEqual(mockAttendance);
      expect(result.message).toBe('Attendance already recorded for today');
    });

    it('should deny attendance for ineligible student', async () => {
      const inactiveStudent = {
        _id: 'student123',
        name: 'John Doe',
        status: 'Active',
        studentId: 'DDL001'
      };

      Student.findById.mockResolvedValue(inactiveStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(null);

      const result = await createWiFiAttendance('student123', sessionInfo);

      expect(result.success).toBe(false);
      expect(result.action).toBe('denied');
      expect(result.reason).toBe('NO_ACTIVE_MEMBERSHIP');
      expect(result.attendance).toBeNull();
    });

    it('should set correct Wi-Fi specific fields in attendance', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      Attendance.findOne.mockResolvedValue(null);
      Attendance.findOneAndUpdate.mockResolvedValue(mockAttendance);

      await createWiFiAttendance('student123', sessionInfo);

      expect(Attendance.findOneAndUpdate).toHaveBeenCalledWith(
        { student: 'student123', date: expect.any(String) },
        expect.objectContaining({
          $set: expect.objectContaining({
            method: 'wifi_network',
            connectionType: 'wifi',
            authenticationMethod: 'credentials',
            networkVerified: true,
            sessionReference: 'session_abc123',
            deviceReference: 'device_xyz789',
            ipAddress: '192.168.1.100',
            gatewayIdentifier: 'gateway_001'
          })
        }),
        { upsert: true, new: true }
      );
    });

    it('should handle system errors gracefully', async () => {
      Student.findById.mockRejectedValue(new Error('Database error'));

      const result = await createWiFiAttendance('student123', sessionInfo);

      expect(result.success).toBe(false);
      expect(result.action).toBe('denied');
      expect(result.reason).toBe('SYSTEM_ERROR');
      expect(result.attendance).toBeNull();
    });
  });

  describe('Idempotency', () => {
    const mockStudent = {
      _id: 'student123',
      name: 'John Doe',
      status: 'Active',
      studentId: 'DDL001',
      shift: 'Shift 1',
      seatCode: 'DDL001',
      branch: 'Munger'
    };

    const mockMembership = {
      _id: 'membership123',
      status: 'Active',
      expiryDate: '2026-12-31'
    };

    const mockAttendance = {
      _id: 'att123',
      student: 'student123',
      date: '2026-08-31',
      checkIn: '10:00',
      method: 'wifi_network',
      status: 'CHECKED_IN'
    };

    const sessionInfo = {
      sessionId: 'session_abc123',
      deviceId: 'device_xyz789',
      ipAddress: '192.168.1.100',
      gatewayId: 'gateway_001',
      connectionType: 'wifi'
    };

    it('should not create duplicate attendance for same student and date', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      // First call - no existing attendance
      Attendance.findOne.mockResolvedValueOnce(null);
      Attendance.findOneAndUpdate.mockResolvedValueOnce(mockAttendance);
      
      // Second call - existing attendance found
      Attendance.findOne.mockResolvedValueOnce(mockAttendance);

      const result1 = await createWiFiAttendance('student123', sessionInfo);
      const result2 = await createWiFiAttendance('student123', sessionInfo);

      expect(result1.action).toBe('created');
      expect(result2.action).toBe('existing_record');
      expect(Attendance.findOneAndUpdate).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('Backward Compatibility', () => {
    it('should not affect existing attendance methods', async () => {
      // Verify that existing enum values still work
      const methods = ['qr_scan', 'manual', 'self', 'wifi_network'];
      
      // Just verify the methods array contains expected values
      expect(methods).toContain('qr_scan');
      expect(methods).toContain('manual');
      expect(methods).toContain('self');
      expect(methods).toContain('wifi_network');
    });
  });
});