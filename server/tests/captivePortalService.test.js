import {
  initiatePortalSession,
  authenticatePortalSession,
  logoutPortalSession,
  getPortalSessionStatus,
  expirePortalSession
} from '../src/services/captivePortalService.js';

// Mock dependencies
jest.mock('../src/services/gatewayService.js');
jest.mock('../src/services/wifiAttendanceService.js');
jest.mock('../src/services/deviceService.js');
jest.mock('../src/services/wifiSessionService.js');
jest.mock('../src/models/AuditLog.js');
jest.mock('../src/config/logger.js');
jest.mock('../src/config/index.js', () => ({
  network: {
    portalSessionDurationMinutes: 10,
    gateway: {
      mode: 'development',
      defaultGatewayId: null
    }
  },
  wifi: {
    sessionDurationMinutes: 720,
    maxDevicesPerStudent: 2
  },
  email: {
    host: 'smtp.example.com',
    port: 587,
    user: 'test@example.com',
    pass: 'test-pass',
    from: 'Test <test@example.com>'
  },
  jwt: {
    secret: 'test-secret-key'
  }
}));

// Mock repositories
jest.mock('../src/repositories/captivePortalSessionRepository.js', () => ({
  default: {
    findByPortalSessionId: jest.fn(),
    createPortalSession: jest.fn(),
    updateStatus: jest.fn(),
    updateFailureReason: jest.fn(),
    markAuthorized: jest.fn(),
    markExpired: jest.fn(),
    markFailed: jest.fn(),
    findPendingSessions: jest.fn(),
    findExpiredSessions: jest.fn(),
    findWithPopulations: jest.fn()
  }
}));

jest.mock('../src/repositories/studentRepository.js', () => ({
  default: {
    findById: jest.fn()
  }
}));

jest.mock('../src/repositories/userRepository.js', () => ({
  default: {
    findByLoginId: jest.fn()
  }
}));

jest.mock('../src/repositories/wifiSessionRepository.js', () => ({
  default: {
    findBySessionId: jest.fn()
  }
}));

describe('Captive Portal Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockStudent = {
    _id: 'student123',
    name: 'John Doe',
    status: 'Active',
    studentId: 'DDL001'
  };

  const mockUser = {
    _id: 'user123',
    normalizedMobile: '919876543210',
    role: 'student',
    studentRef: 'student123'
  };

  const mockPortalSession = {
    _id: 'portal123',
    portalSessionId: 'CPS-ABC123',
    gatewayId: 'GATEWAY-001',
    client: {
      ipAddress: '192.168.1.100',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      userAgent: 'Mozilla/5.0'
    },
    originalUrl: 'https://example.com',
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  };

  describe('initiatePortalSession', () => {
    it('should create portal session for valid gateway', async () => {
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      const { default: captivePortalSessionRepository } = await import('../src/repositories/captivePortalSessionRepository.js');
      
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      captivePortalSessionRepository.createPortalSession.mockResolvedValue(mockPortalSession);

      const result = await initiatePortalSession({
        gatewayId: 'GATEWAY-001',
        clientIp: '192.168.1.100',
        clientMac: 'AA:BB:CC:DD:EE:FF',
        originalUrl: 'https://example.com',
        userAgent: 'Mozilla/5.0'
      });

      expect(result.success).toBe(true);
      expect(result.portalSession).toEqual(mockPortalSession);
    });

    it('should deny session for invalid gateway', async () => {
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      gatewayService.validateGateway.mockResolvedValue({ valid: false });

      const result = await initiatePortalSession({
        gatewayId: 'INVALID-GATEWAY',
        clientIp: '192.168.1.100'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('GATEWAY_NOT_AUTHORIZED');
    });

    it('should block malicious redirect URLs', async () => {
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      gatewayService.validateGateway.mockResolvedValue({ valid: true });

      const result = await initiatePortalSession({
        gatewayId: 'GATEWAY-001',
        clientIp: '192.168.1.100',
        originalUrl: 'https://attacker.com'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_REDIRECT_URL');
    });

    it('should expire portal session after duration', async () => {
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      
      const expiredSession = {
        ...mockPortalSession,
        expiresAt: new Date(Date.now() - 1000)
      };
      CaptivePortalSession.create.mockResolvedValue(expiredSession);

      const result = await initiatePortalSession({
        gatewayId: 'GATEWAY-001',
        clientIp: '192.168.1.100'
      });

      expect(result.success).toBe(true);
      expect(result.portalSession.expiresAt < new Date()).toBe(true);
    });
  });

  describe('authenticatePortalSession', () => {
    it('should authenticate valid student credentials', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(mockPortalSession);
      
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      gatewayService.authorizeClient.mockResolvedValue({ success: true });
      
      User.findOne.mockResolvedValue(mockUser);
      Student.findById.mockResolvedValue(mockStudent);
      
      const { checkWiFiEligibility } = await import('../src/services/wifiAttendanceService.js');
      checkWiFiEligibility.mockResolvedValue({ eligible: true });
      
      const { registerOrUpdateDevice } = await import('../src/services/deviceService.js');
      registerOrUpdateDevice.mockResolvedValue({
        success: true,
        device: { _id: 'device123', deviceId: 'DEV-001', status: 'active' }
      });
      
      const { createWiFiSession } = await import('../src/services/wifiSessionService.js');
      createWiFiSession.mockResolvedValue({
        success: true,
        session: mockPortalSession,
        token: 'mock-token'
      });

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(true);
      expect(result.authorized).toBe(true);
    });

    it('should deny for non-existent portal session', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(null);

      const result = await authenticatePortalSession({
        portalSessionId: 'INVALID-ID',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('PORTAL_SESSION_NOT_FOUND');
    });

    it('should deny for expired portal session', async () => {
      const expiredSession = { ...mockPortalSession, expiresAt: new Date(Date.now() - 1000) };
      CaptivePortalSession.findOne.mockResolvedValue(expiredSession);

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('PORTAL_SESSION_EXPIRED');
    });

    it('should deny for invalid student credentials', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(mockPortalSession);
      
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      
      User.findOne.mockResolvedValue(null);

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_STUDENT_CREDENTIALS');
    });

    it('should deny for inactive student', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(mockPortalSession);
      
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      
      User.findOne.mockResolvedValue(mockUser);
      Student.findById.mockResolvedValue({ ...mockStudent, status: 'Inactive' });

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('STUDENT_INACTIVE');
    });

    it('should deny for no active membership', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(mockPortalSession);
      
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      
      User.findOne.mockResolvedValue(mockUser);
      Student.findById.mockResolvedValue(mockStudent);
      
      const { checkWiFiEligibility } = await import('../src/services/wifiAttendanceService.js');
      checkWiFiEligibility.mockResolvedValue({
        eligible: false,
        reason: 'NO_ACTIVE_MEMBERSHIP'
      });

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('NO_ACTIVE_MEMBERSHIP');
    });

    it('should deny for revoked device', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(mockPortalSession);
      
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      
      User.findOne.mockResolvedValue(mockUser);
      Student.findById.mockResolvedValue(mockStudent);
      
      const { checkWiFiEligibility } = await import('../src/services/wifiAttendanceService.js');
      checkWiFiEligibility.mockResolvedValue({ eligible: true });
      
      const { registerOrUpdateDevice } = await import('../src/services/deviceService.js');
      registerOrUpdateDevice.mockResolvedValue({
        success: false,
        code: 'DEVICE_REVOKED'
      });

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('DEVICE_REVOKED');
    });

    it('should deny for gateway authorization failure', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(mockPortalSession);
      
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      gatewayService.authorizeClient.mockResolvedValue({ success: false });
      
      User.findOne.mockResolvedValue(mockUser);
      Student.findById.mockResolvedValue(mockStudent);
      
      const { checkWiFiEligibility } = await import('../src/services/wifiAttendanceService.js');
      checkWiFiEligibility.mockResolvedValue({ eligible: true });
      
      const { registerOrUpdateDevice } = await import('../src/services/deviceService.js');
      registerOrUpdateDevice.mockResolvedValue({
        success: true,
        device: { _id: 'device123', deviceId: 'DEV-001', status: 'active' }
      });
      
      const { createWiFiSession } = await import('../src/services/wifiSessionService.js');
      createWiFiSession.mockResolvedValue({
        success: true,
        session: mockPortalSession,
        token: 'mock-token'
      });

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('GATEWAY_AUTHORIZATION_FAILED');
    });
  });

  describe('logoutPortalSession', () => {
    it('should logout successfully and revoke Wi-Fi session', async () => {
      const sessionWithWifi = {
        ...mockPortalSession,
        wifiSession: 'wifi123',
        status: 'authorized'
      };
      CaptivePortalSession.findOne.mockResolvedValue(sessionWithWifi);
      
      const { revokeWiFiSession } = await import('../src/services/wifiSessionService.js');
      revokeWiFiSession.mockResolvedValue({ success: true });
      
      const { default: gatewayService } = await import('../src/services/gatewayService.js');
      gatewayService.deauthorizeClient.mockResolvedValue({ success: true });

      const result = await logoutPortalSession('CPS-ABC123');

      expect(result.success).toBe(true);
    });

    it('should handle logout for session without Wi-Fi session', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(mockPortalSession);

      const result = await logoutPortalSession('CPS-ABC123');

      expect(result.success).toBe(true);
    });
  });

  describe('getPortalSessionStatus', () => {
    it('should return portal session status', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(mockPortalSession);

      const result = await getPortalSessionStatus('CPS-ABC123');

      expect(result.success).toBe(true);
      expect(result.portalSession).toEqual(mockPortalSession);
    });

    it('should return error for non-existent session', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(null);

      const result = await getPortalSessionStatus('INVALID-ID');

      expect(result.success).toBe(false);
      expect(result.code).toBe('PORTAL_SESSION_NOT_FOUND');
    });
  });

  describe('expirePortalSession', () => {
    it('should expire portal session', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(mockPortalSession);

      const result = await expirePortalSession('CPS-ABC123');

      expect(result.success).toBe(true);
    });

    it('should return error for non-existent session', async () => {
      CaptivePortalSession.findOne.mockResolvedValue(null);

      const result = await expirePortalSession('INVALID-ID');

      expect(result.success).toBe(false);
      expect(result.code).toBe('PORTAL_SESSION_NOT_FOUND');
    });
  });

  describe('Backward Compatibility', () => {
    it('should not affect existing attendance methods', async () => {
      const Attendance = (await import('../src/models/Attendance.js')).default;
      const methodEnum = Attendance.schema.path('method').enumValues;
      
      expect(methodEnum).toContain('qr_scan');
      expect(methodEnum).toContain('manual');
      expect(methodEnum).toContain('self');
      expect(methodEnum).toContain('wifi_network');
    });
  });
});
