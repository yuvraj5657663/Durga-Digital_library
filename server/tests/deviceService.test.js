import {
  registerOrUpdateDevice,
  validateRegisteredDevice,
  revokeDevice,
  getStudentDevices,
  suspendDevice,
  restoreDevice,
  checkDeviceLimit
} from '../src/services/deviceService.js';
import RegisteredDevice from '../src/models/RegisteredDevice.js';
import Student from '../src/models/Student.js';
import Membership from '../src/models/Membership.js';

// Mock dependencies
jest.mock('../src/models/Student.js');
jest.mock('../src/models/Membership.js');
jest.mock('../src/models/RegisteredDevice.js');
jest.mock('../src/services/membershipService.js', () => ({
  getActive: jest.fn().mockResolvedValue(null)
}));
jest.mock('../src/models/AuditLog.js');
jest.mock('../src/config/logger.js');
jest.mock('../src/config/index.js', () => ({
  wifi: {
    maxDevicesPerStudent: 2
  },
  email: {
    host: 'smtp.example.com',
    port: 587,
    user: 'test@example.com',
    pass: 'test-pass',
    from: 'Test <test@example.com>'
  }
}));

describe('Device Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  const mockDevice = {
    _id: 'device123',
    deviceId: 'DEV-ABC123',
    student: 'student123',
    status: 'active',
    deviceInfo: {
      name: 'iPhone',
      type: 'mobile',
      platform: 'iOS',
      firstSeen: new Date(),
      lastSeen: new Date()
    },
    deviceFingerprint: {
      macAddress: '00:11:22:33:44:55',
      userAgent: 'Mozilla/5.0'
    }
  };

  describe('registerOrUpdateDevice', () => {
    it('should create device for eligible student with no existing device', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      RegisteredDevice.findOne.mockResolvedValue(null); // No existing device
      RegisteredDevice.countDocuments.mockResolvedValue(0); // No active devices
      RegisteredDevice.create.mockResolvedValue(mockDevice);

      const result = await registerOrUpdateDevice(
        'student123',
        { name: 'iPhone', type: 'mobile', platform: 'iOS' },
        { macAddress: '00:11:22:33:44:55', userAgent: 'Mozilla/5.0' },
        null
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.device).toEqual(mockDevice);
    });

    it('should update existing device when found', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      
      const membershipService = require('../src/services/membershipService.js');
      membershipService.getActive.mockResolvedValue(mockMembership);
      
      const existingDeviceWithStatus = {
        ...mockDevice,
        status: 'active',
        deviceInfo: {
          ...mockDevice.deviceInfo,
          lastSeen: new Date()
        },
        security: {
          lastSecurityCheck: new Date()
        }
      };
      
      const saveMock = jest.fn().mockResolvedValue(existingDeviceWithStatus);
      RegisteredDevice.findOne.mockResolvedValue({ ...existingDeviceWithStatus, save: saveMock });
      RegisteredDevice.countDocuments.mockResolvedValue(1);

      const result = await registerOrUpdateDevice(
        'student123',
        { name: 'iPhone', type: 'mobile', platform: 'iOS' },
        { macAddress: '00:11:22:33:44:55', userAgent: 'Mozilla/5.0' },
        null
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
    });

    it('should deny device registration for inactive student', async () => {
      const inactiveStudent = { ...mockStudent, status: 'Inactive' };
      Student.findById.mockResolvedValue(inactiveStudent);

      const result = await registerOrUpdateDevice(
        'student123',
        { name: 'iPhone', type: 'mobile' },
        { macAddress: '00:11:22:33:44:55' },
        null
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('STUDENT_INACTIVE');
    });

    it('should deny device registration when device limit reached', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      RegisteredDevice.findOne.mockResolvedValue(null);
      RegisteredDevice.countDocuments.mockResolvedValue(2); // Already at limit

      const result = await registerOrUpdateDevice(
        'student123',
        { name: 'iPhone', type: 'mobile' },
        { macAddress: '00:11:22:33:44:55' },
        null
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('DEVICE_LIMIT_REACHED');
    });

    it('should deny access for revoked device', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      const revokedDevice = { ...mockDevice, status: 'revoked' };
      RegisteredDevice.findOne.mockResolvedValue(revokedDevice);

      const result = await registerOrUpdateDevice(
        'student123',
        { name: 'iPhone', type: 'mobile' },
        { macAddress: '00:11:22:33:44:55' },
        null
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('DEVICE_REVOKED');
    });
  });

  describe('validateRegisteredDevice', () => {
    it('should validate active device for student', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      RegisteredDevice.findOne.mockResolvedValue(mockDevice);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);

      const result = await validateRegisteredDevice('student123', 'DEV-ABC123');

      expect(result.success).toBe(true);
      expect(result.authorized).toBe(true);
      expect(result.device).toEqual(mockDevice);
    });

    it('should deny access for revoked device', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      const revokedDevice = { ...mockDevice, status: 'revoked' };
      RegisteredDevice.findOne.mockResolvedValue(revokedDevice);

      const result = await validateRegisteredDevice('student123', 'DEV-ABC123');

      expect(result.success).toBe(false);
      expect(result.authorized).toBe(false);
      expect(result.code).toBe('DEVICE_REVOKED');
    });

    it('should deny access for suspended device', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      const suspendedDevice = { ...mockDevice, status: 'suspended' };
      RegisteredDevice.findOne.mockResolvedValue(suspendedDevice);

      const result = await validateRegisteredDevice('student123', 'DEV-ABC123');

      expect(result.success).toBe(false);
      expect(result.authorized).toBe(false);
      expect(result.code).toBe('DEVICE_SUSPENDED');
    });

    it('should deny access for device not owned by student', async () => {
      Student.findById.mockResolvedValue(mockStudent);
      const otherDevice = { ...mockDevice, student: 'otherStudent456' };
      RegisteredDevice.findOne.mockResolvedValue(otherDevice);

      const result = await validateRegisteredDevice('student123', 'DEV-ABC123');

      expect(result.success).toBe(false);
      expect(result.authorized).toBe(false);
      expect(result.code).toBe('DEVICE_NOT_OWNED');
    });

    it('should deny access for inactive student', async () => {
      const inactiveStudent = { ...mockStudent, status: 'Inactive' };
      Student.findById.mockResolvedValue(inactiveStudent);

      const result = await validateRegisteredDevice('student123', 'DEV-ABC123');

      expect(result.success).toBe(false);
      expect(result.authorized).toBe(false);
      expect(result.code).toBe('STUDENT_INACTIVE');
    });
  });

  describe('revokeDevice', () => {
    it('should revoke device successfully', async () => {
      RegisteredDevice.findOne.mockResolvedValue(mockDevice);
      Student.findById.mockResolvedValue(mockStudent);
      
      const saveMock = jest.fn().mockResolvedValue({ ...mockDevice, status: 'revoked' });
      RegisteredDevice.findOne.mockResolvedValue({ ...mockDevice, save: saveMock });

      const result = await revokeDevice('student123', 'DEV-ABC123', { id: 'user123', role: 'student', name: 'John Doe' });

      expect(result.success).toBe(true);
    });

    it('should deny revocation for non-owner student', async () => {
      RegisteredDevice.findOne.mockResolvedValue(mockDevice);

      const result = await revokeDevice('otherStudent456', 'DEV-ABC123', { id: 'user123', role: 'student', name: 'Jane Doe' });

      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHORIZED');
    });

    it('should allow admin to revoke any device', async () => {
      RegisteredDevice.findOne.mockResolvedValue(mockDevice);
      Student.findById.mockResolvedValue(mockStudent);
      
      const saveMock = jest.fn().mockResolvedValue({ ...mockDevice, status: 'revoked' });
      RegisteredDevice.findOne.mockResolvedValue({ ...mockDevice, save: saveMock });

      const result = await revokeDevice('student123', 'DEV-ABC123', { id: 'admin123', role: 'admin', name: 'Admin' });

      expect(result.success).toBe(true);
    });
  });

  describe('getStudentDevices', () => {
    it('should return all devices for student', async () => {
      RegisteredDevice.find.mockResolvedValue([mockDevice]);

      const result = await getStudentDevices('student123');

      expect(result).toBeDefined();
      expect(Array.isArray(result.devices)).toBe(true);
    });
  });

  describe('suspendDevice', () => {
    it('should suspend device successfully', async () => {
      RegisteredDevice.findOne.mockResolvedValue(mockDevice);
      Student.findById.mockResolvedValue(mockStudent);
      
      const saveMock = jest.fn().mockResolvedValue({ ...mockDevice, status: 'suspended' });
      RegisteredDevice.findOne.mockResolvedValue({ ...mockDevice, save: saveMock });

      const result = await suspendDevice('DEV-ABC123', { id: 'admin123', role: 'admin', name: 'Admin' });

      expect(result.success).toBe(true);
    });
  });

  describe('restoreDevice', () => {
    it('should restore suspended device successfully', async () => {
      const suspendedDevice = { ...mockDevice, status: 'suspended' };
      RegisteredDevice.findOne.mockResolvedValue(suspendedDevice);
      Student.findById.mockResolvedValue(mockStudent);
      
      const saveMock = jest.fn().mockResolvedValue({ ...suspendedDevice, status: 'active' });
      RegisteredDevice.findOne.mockResolvedValue({ ...suspendedDevice, save: saveMock });

      const result = await restoreDevice('DEV-ABC123', { id: 'admin123', role: 'admin', name: 'Admin' });

      expect(result.success).toBe(true);
    });

    it('should fail to restore non-suspended device', async () => {
      RegisteredDevice.findOne.mockResolvedValue(mockDevice);

      const result = await restoreDevice('DEV-ABC123', { id: 'admin123', role: 'admin', name: 'Admin' });

      expect(result.success).toBe(false);
      expect(result.code).toBe('DEVICE_NOT_SUSPENDED');
    });
  });

  describe('checkDeviceLimit', () => {
    it('should allow device when under limit', async () => {
      RegisteredDevice.countDocuments.mockResolvedValue(1);

      const result = await checkDeviceLimit('student123');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.maxDevices).toBe(2);
      expect(result.remainingSlots).toBe(1);
    });

    it('should deny device when at limit', async () => {
      RegisteredDevice.countDocuments.mockResolvedValue(2);

      const result = await checkDeviceLimit('student123');

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(2);
      expect(result.maxDevices).toBe(2);
      expect(result.remainingSlots).toBe(0);
    });
  });
});
