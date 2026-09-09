// Mock dependencies first (before imports)
jest.mock('../src/services/membershipService.js', () => ({
  getActive: jest.fn()
}));
jest.mock('../src/services/deviceService.js', () => ({
  validateRegisteredDevice: jest.fn()
}));
jest.mock('../src/services/wifiAttendanceService.js', () => ({
  createWiFiAttendance: jest.fn()
}));
jest.mock('../src/services/gatewayService.js');
jest.mock('../src/models/Membership.js');
jest.mock('../src/models/AuditLog.js', () => ({
  create: jest.fn()
}));
jest.mock('../src/config/logger.js');
jest.mock('../src/config/index.js', () => ({
  wifi: {
    maxDevicesPerStudent: 2,
    sessionDurationMinutes: 720
  },
  network: {
    gateway: {
      mode: 'development',
      provider: 'development',
      defaultGatewayId: null
    }
  },
  jwt: {
    secret: 'test-secret-key'
  }
}));
jest.mock('../src/utils/actorId.js', () => ({
  toActorId: jest.fn((id) => id)
}));
jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-1234-1234-1234-123456789012')
}));
jest.mock('jsonwebtoken');
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'hashed-token')
  }))
}));

import {
  createWiFiSession,
  validateWiFiSession,
  revokeWiFiSession,
  revokeAllStudentSessions,
  restoreWiFiSession,
  expireOldSessions
} from '../src/services/wifiSessionService.js';

describe('WiFi Session Service', () => {
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
      type: 'mobile'
    }
  };

  const mockSession = {
    _id: 'session123',
    sessionId: 'WFS-XYZ789',
    student: 'student123',
    device: 'device123',
    gatewayId: 'GATEWAY-001',
    status: 'active',
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + 720 * 60 * 1000),
    lastActivityAt: new Date(),
    network: {
      ipAddress: '192.168.1.100',
      connectionType: 'wifi'
    },
    attendance: {
      attendanceId: null,
      created: false
    }
  };

  describe('createWiFiSession', () => {
    it('should create session for active student with active membership and active device', async () => {
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      const { validateRegisteredDevice } = await import('../src/services/deviceService.js');
      validateRegisteredDevice.mockResolvedValue({
        success: true,
        authorized: true,
        device: mockDevice
      });
      
      const { default: registeredDeviceRepository } = await import('../src/repositories/RegisteredDeviceRepository.js');
      registeredDeviceRepository.findByDeviceId.mockResolvedValue(null);
      
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findActiveByDevice.mockResolvedValue(null);
      wifiSessionRepository.createSession.mockResolvedValue(mockSession);
      
      const { createWiFiAttendance } = await import('../src/services/wifiAttendanceService.js');
      createWiFiAttendance.mockResolvedValue({
        success: true,
        attendance: { _id: 'attendance123' }
      });

      const result = await createWiFiSession({
        studentId: 'student123',
        deviceId: 'DEV-ABC123',
        gatewayId: 'GATEWAY-001',
        ipAddress: '192.168.1.100'
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.session).toEqual(mockSession);
      expect(result.token).toBeDefined();
    });

    it('should deny session for inactive student', async () => {
      const inactiveStudent = { ...mockStudent, status: 'Inactive' };
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(inactiveStudent);

      const result = await createWiFiSession({
        studentId: 'student123',
        deviceId: 'DEV-ABC123',
        gatewayId: 'GATEWAY-001'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('STUDENT_INACTIVE');
    });

    it('should deny session for expired membership', async () => {
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(null);

      const result = await createWiFiSession({
        studentId: 'student123',
        deviceId: 'DEV-ABC123',
        gatewayId: 'GATEWAY-001'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('NO_ACTIVE_MEMBERSHIP');
    });

    it('should deny session for revoked device', async () => {
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      const { validateRegisteredDevice } = await import('../src/services/deviceService.js');
      validateRegisteredDevice.mockResolvedValue({
        success: false,
        authorized: false,
        code: 'DEVICE_REVOKED'
      });

      const result = await createWiFiSession({
        studentId: 'student123',
        deviceId: 'DEV-ABC123',
        gatewayId: 'GATEWAY-001'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('DEVICE_REVOKED');
    });

    it('should deny session for suspended device', async () => {
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      const { validateRegisteredDevice } = await import('../src/services/deviceService.js');
      validateRegisteredDevice.mockResolvedValue({
        success: false,
        authorized: false,
        code: 'DEVICE_SUSPENDED'
      });

      const result = await createWiFiSession({
        studentId: 'student123',
        deviceId: 'DEV-ABC123',
        gatewayId: 'GATEWAY-001'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('DEVICE_SUSPENDED');
    });

    it('should restore existing active session instead of creating new one', async () => {
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);
      
      const { validateRegisteredDevice } = await import('../src/services/deviceService.js');
      validateRegisteredDevice.mockResolvedValue({
        success: true,
        authorized: true,
        device: mockDevice
      });
      
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findActiveByDevice.mockResolvedValue(mockSession);
      wifiSessionRepository.restoreSession.mockResolvedValue(mockSession);

      const result = await createWiFiSession({
        studentId: 'student123',
        deviceId: 'DEV-ABC123',
        gatewayId: 'GATEWAY-001'
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('restored');
    });
  });

  describe('validateWiFiSession', () => {
    it('should validate active session with valid token', async () => {
      const jwt = require('jsonwebtoken');
      const decodedToken = {
        sub: 'student123',
        sessionId: 'WFS-XYZ789',
        deviceId: 'DEV-ABC123',
        gatewayId: 'GATEWAY-001',
        scope: 'wifi'
      };
      
      jwt.verify.mockReturnValue(decodedToken);
      
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findBySessionId.mockResolvedValue(mockSession);
      
      // Service uses findById (ObjectId lookup) for the device stored in session.device
      const { default: registeredDeviceRepository } = await import('../src/repositories/RegisteredDeviceRepository.js');
      registeredDeviceRepository.findById.mockResolvedValue(mockDevice);
      
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);

      const result = await validateWiFiSession('valid-token', 'WFS-XYZ789');

      expect(result.success).toBe(true);
      expect(result.authorized).toBe(true);
    });

    it('should deny expired token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = await validateWiFiSession('expired-token', 'WFS-XYZ789');

      expect(result.success).toBe(false);
      expect(result.code).toBe('TOKEN_EXPIRED');
    });

    it('should deny invalid scope', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        sub: 'student123',
        sessionId: 'WFS-XYZ789',
        scope: 'admin' // Invalid scope
      });

      const result = await validateWiFiSession('valid-token', 'WFS-XYZ789');

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_SCOPE');
    });

    it('should deny session ID mismatch', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        sub: 'student123',
        sessionId: 'WFS-DIFFERENT',
        scope: 'wifi'
      });

      const result = await validateWiFiSession('valid-token', 'WFS-XYZ789');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_MISMATCH');
    });

    it('should deny revoked session', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        sub: 'student123',
        sessionId: 'WFS-XYZ789',
        scope: 'wifi'
      });

      const revokedSession = { ...mockSession, status: 'revoked' };
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findBySessionId.mockResolvedValue(revokedSession);

      const result = await validateWiFiSession('valid-token', 'WFS-XYZ789');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_REVOKED');
    });

    it('should deny expired session', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        sub: 'student123',
        sessionId: 'WFS-XYZ789',
        scope: 'wifi'
      });

      const expiredSession = { ...mockSession, expiresAt: new Date(Date.now() - 1000) };
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findBySessionId.mockResolvedValue(expiredSession);
      wifiSessionRepository.updateStatus.mockResolvedValue({ modifiedCount: 1 });

      const result = await validateWiFiSession('valid-token', 'WFS-XYZ789');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_EXPIRED');
    });

    it('should deny when device becomes inactive', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        sub: 'student123',
        sessionId: 'WFS-XYZ789',
        scope: 'wifi'
      });

      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findBySessionId.mockResolvedValue(mockSession);
      
      // Service uses findById (ObjectId lookup)
      const { default: registeredDeviceRepository } = await import('../src/repositories/RegisteredDeviceRepository.js');
      registeredDeviceRepository.findById.mockResolvedValue({ ...mockDevice, status: 'revoked' });

      const result = await validateWiFiSession('valid-token', 'WFS-XYZ789');

      expect(result.success).toBe(false);
      expect(result.code).toBe('DEVICE_INACTIVE');
    });

    it('should deny when membership expires', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        sub: 'student123',
        sessionId: 'WFS-XYZ789',
        scope: 'wifi'
      });

      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findBySessionId.mockResolvedValue(mockSession);
      
      const { default: registeredDeviceRepository } = await import('../src/repositories/RegisteredDeviceRepository.js');
      registeredDeviceRepository.findByDeviceId.mockResolvedValue(mockDevice);
      
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(mockStudent);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(null);

      const result = await validateWiFiSession('valid-token', 'WFS-XYZ789');

      expect(result.success).toBe(false);
      expect(result.code).toBe('MEMBERSHIP_EXPIRED');
    });
  });

  describe('revokeWiFiSession', () => {
    it('should revoke active session', async () => {
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findBySessionId.mockResolvedValue(mockSession);
      wifiSessionRepository.revokeBySessionId.mockResolvedValue({ modifiedCount: 1 });
      
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(mockStudent);

      const result = await revokeWiFiSession('WFS-XYZ789', 'manual_logout');

      expect(result.success).toBe(true);
    });

    it('should return error for non-existent session', async () => {
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findBySessionId.mockResolvedValue(null);

      const result = await revokeWiFiSession('WFS-XYZ789', 'manual_logout');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('revokeAllStudentSessions', () => {
    it('should revoke all active sessions for a student', async () => {
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.revokeAllByStudent.mockResolvedValue({ modifiedCount: 3 });
      
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(mockStudent);

      const result = await revokeAllStudentSessions('student123', 'admin_action');

      expect(result.success).toBe(true);
      expect(result.revokedCount).toBe(3);
    });
  });

  describe('restoreWiFiSession', () => {
    it('should restore valid session', async () => {
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findBySessionId.mockResolvedValue(mockSession);
      wifiSessionRepository.restoreSession.mockResolvedValue(mockSession);
      
      const { default: studentRepository } = await import('../src/repositories/StudentRepository.js');
      studentRepository.findById.mockResolvedValue(mockStudent);
      
      const { default: registeredDeviceRepository } = await import('../src/repositories/RegisteredDeviceRepository.js');
      registeredDeviceRepository.findByDeviceId.mockResolvedValue(mockDevice);
      
      const { getActive } = await import('../src/services/membershipService.js');
      getActive.mockResolvedValue(mockMembership);

      const result = await restoreWiFiSession('WFS-XYZ789');

      expect(result.success).toBe(true);
      expect(result.action).toBe('restored');
    });

    it('should deny restoring revoked session', async () => {
      const revokedSession = { ...mockSession, status: 'revoked' };
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findBySessionId.mockResolvedValue(revokedSession);

      const result = await restoreWiFiSession('WFS-XYZ789');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_REVOKED');
    });

    it('should deny restoring expired session', async () => {
      const expiredSession = { ...mockSession, status: 'expired' };
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.findBySessionId.mockResolvedValue(expiredSession);

      const result = await restoreWiFiSession('WFS-XYZ789');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_EXPIRED');
    });
  });

  describe('expireOldSessions', () => {
    it('should expire sessions past their expiry time', async () => {
      const { default: wifiSessionRepository } = await import('../src/repositories/WiFiSessionRepository.js');
      wifiSessionRepository.expireOldSessions.mockResolvedValue({ modifiedCount: 5 });

      const result = await expireOldSessions();

      expect(result.success).toBe(true);
      expect(result.expiredCount).toBe(5);
    });
  });
});
