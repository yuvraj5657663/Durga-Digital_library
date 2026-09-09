import {
  initiatePortalSession,
  authenticatePortalSession,
  logoutPortalSession,
  getPortalSessionStatus,
  expirePortalSession
} from '../src/services/captivePortalService.js';

// ─── Mock all external dependencies ──────────────────────────────────────────
jest.mock('../src/services/gatewayService.js', () => ({
  default: {
    validateGateway:    jest.fn(),
    authorizeClient:    jest.fn(),
    deauthorizeClient:  jest.fn(),
  }
}));
jest.mock('../src/services/wifiAttendanceService.js', () => ({
  checkWiFiEligibility: jest.fn()
}));
jest.mock('../src/services/deviceService.js', () => ({
  registerOrUpdateDevice: jest.fn()
}));
jest.mock('../src/services/wifiSessionService.js', () => ({
  createWiFiSession: jest.fn(),
  revokeWiFiSession:  jest.fn()
}));
jest.mock('../src/models/AuditLog.js', () => ({ create: jest.fn() }));
jest.mock('../src/config/logger.js');
jest.mock('../src/config/index.js', () => ({
  network: {
    portalSessionDurationMinutes: 10,
    gateway: { mode: 'development', defaultGatewayId: null }
  },
  wifi:  { sessionDurationMinutes: 720, maxDevicesPerStudent: 2 },
  email: { host: 'smtp.example.com', port: 587, user: 'test@example.com', pass: 'p', from: 'Test <t@e.com>' },
  jwt:   { secret: 'test-secret-key' }
}));

// ─── Repository mocks ─────────────────────────────────────────────────────────
jest.mock('../src/repositories/captivePortalSessionRepository.js', () => ({
  default: {
    findByPortalSessionId: jest.fn(),
    createPortalSession:   jest.fn(),
    updateStatus:          jest.fn(),
    updateFailureReason:   jest.fn(),
    markAuthorized:        jest.fn(),
    markExpired:           jest.fn(),
    markFailed:            jest.fn(),
    findPendingSessions:   jest.fn(),
    findExpiredSessions:   jest.fn(),
    findWithPopulations:   jest.fn()
  }
}));
jest.mock('../src/repositories/studentRepository.js', () => ({
  default: { findById: jest.fn() }
}));
jest.mock('../src/repositories/userRepository.js', () => ({
  default: { findByLoginId: jest.fn() }
}));
jest.mock('../src/repositories/wifiSessionRepository.js', () => ({
  default: { findBySessionId: jest.fn() }
}));
jest.mock('../src/repositories/index.js', () => ({
  captivePortalSessionRepository: {
    findByPortalSessionId: jest.fn(),
    createPortalSession:   jest.fn(),
    markAuthorized:        jest.fn(),
    markExpired:           jest.fn(),
    markFailed:            jest.fn(),
    findWithPopulations:   jest.fn()
  },
  studentRepository:  { findById: jest.fn() },
  userRepository:     { findByLoginId: jest.fn() },
  wifiSessionRepository: { findBySessionId: jest.fn() }
}));

// ─── Shared fixtures ──────────────────────────────────────────────────────────
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

// ─── Helper to get the repositories the service actually uses ────────────────
async function repos() {
  const { captivePortalSessionRepository, studentRepository, userRepository } =
    await import('../src/repositories/index.js');
  const gatewayService = (await import('../src/services/gatewayService.js')).default;
  return { captivePortalSessionRepository, studentRepository, userRepository, gatewayService };
}

describe('Captive Portal Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── initiatePortalSession ──────────────────────────────────────────────────
  describe('initiatePortalSession', () => {
    it('should create portal session for valid gateway', async () => {
      const { captivePortalSessionRepository, gatewayService } = await repos();
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
      const { gatewayService } = await repos();
      gatewayService.validateGateway.mockResolvedValue({ valid: false });

      const result = await initiatePortalSession({
        gatewayId: 'INVALID-GATEWAY',
        clientIp: '192.168.1.100'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('GATEWAY_NOT_AUTHORIZED');
    });

    it('should block malicious redirect URLs', async () => {
      const { gatewayService } = await repos();
      gatewayService.validateGateway.mockResolvedValue({ valid: true });

      const result = await initiatePortalSession({
        gatewayId: 'GATEWAY-001',
        clientIp: '192.168.1.100',
        originalUrl: 'https://attacker.com'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_REDIRECT_URL');
    });
  });

  // ── authenticatePortalSession ─────────────────────────────────────────────
  describe('authenticatePortalSession', () => {
    it('should deny for non-existent portal session', async () => {
      const { captivePortalSessionRepository } = await repos();
      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(null);

      const result = await authenticatePortalSession({
        portalSessionId: 'INVALID-ID',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('PORTAL_SESSION_NOT_FOUND');
    });

    it('should deny for expired portal session', async () => {
      const { captivePortalSessionRepository } = await repos();
      const expiredSession = { ...mockPortalSession, expiresAt: new Date(Date.now() - 1000) };
      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(expiredSession);
      captivePortalSessionRepository.markExpired.mockResolvedValue({});

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('PORTAL_SESSION_EXPIRED');
    });

    it('should deny for invalid student credentials', async () => {
      const { captivePortalSessionRepository, gatewayService, userRepository } = await repos();
      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(mockPortalSession);
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      userRepository.findByLoginId.mockResolvedValue(null);
      captivePortalSessionRepository.markFailed.mockResolvedValue({});

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_STUDENT_CREDENTIALS');
    });

    it('should deny for inactive student', async () => {
      const { captivePortalSessionRepository, gatewayService, userRepository, studentRepository } = await repos();
      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(mockPortalSession);
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      userRepository.findByLoginId.mockResolvedValue(mockUser);
      studentRepository.findById.mockResolvedValue({ ...mockStudent, status: 'Inactive', studentId: 'DDL001' });
      captivePortalSessionRepository.markFailed.mockResolvedValue({});

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_STUDENT_CREDENTIALS');
    });

    it('should deny for no active membership', async () => {
      const { captivePortalSessionRepository, gatewayService, userRepository, studentRepository } = await repos();
      const { checkWiFiEligibility } = await import('../src/services/wifiAttendanceService.js');

      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(mockPortalSession);
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      userRepository.findByLoginId.mockResolvedValue(mockUser);
      studentRepository.findById.mockResolvedValue({ ...mockStudent, studentId: 'DDL001' });
      checkWiFiEligibility.mockResolvedValue({ eligible: false, reason: 'NO_ACTIVE_MEMBERSHIP' });
      captivePortalSessionRepository.markFailed.mockResolvedValue({});

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('NO_ACTIVE_MEMBERSHIP');
    });

    it('should deny for revoked device', async () => {
      const { captivePortalSessionRepository, gatewayService, userRepository, studentRepository } = await repos();
      const { checkWiFiEligibility } = await import('../src/services/wifiAttendanceService.js');
      const { registerOrUpdateDevice } = await import('../src/services/deviceService.js');

      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(mockPortalSession);
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      userRepository.findByLoginId.mockResolvedValue(mockUser);
      studentRepository.findById.mockResolvedValue({ ...mockStudent, studentId: 'DDL001' });
      checkWiFiEligibility.mockResolvedValue({ eligible: true });
      registerOrUpdateDevice.mockResolvedValue({ success: false, code: 'DEVICE_REVOKED' });
      captivePortalSessionRepository.markFailed.mockResolvedValue({});

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('DEVICE_REVOKED');
    });

    it('should deny for gateway authorization failure', async () => {
      const { captivePortalSessionRepository, gatewayService, userRepository, studentRepository } = await repos();
      const { checkWiFiEligibility } = await import('../src/services/wifiAttendanceService.js');
      const { registerOrUpdateDevice } = await import('../src/services/deviceService.js');
      const { createWiFiSession, revokeWiFiSession } = await import('../src/services/wifiSessionService.js');

      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(mockPortalSession);
      gatewayService.validateGateway.mockResolvedValue({ valid: true });
      userRepository.findByLoginId.mockResolvedValue(mockUser);
      studentRepository.findById.mockResolvedValue({ ...mockStudent, studentId: 'DDL001' });
      checkWiFiEligibility.mockResolvedValue({ eligible: true });
      registerOrUpdateDevice.mockResolvedValue({
        success: true,
        device: { _id: 'device123', deviceId: 'DEV-001', status: 'active' }
      });
      createWiFiSession.mockResolvedValue({
        success: true,
        session: { ...mockPortalSession, sessionId: 'WFS-001' },
        token: 'mock-token'
      });
      gatewayService.authorizeClient.mockResolvedValue({ success: false, authorized: false });
      revokeWiFiSession.mockResolvedValue({ success: true });
      captivePortalSessionRepository.markFailed.mockResolvedValue({});

      const result = await authenticatePortalSession({
        portalSessionId: 'CPS-ABC123',
        studentId: 'DDL001',
        mobile: '9876543210'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('GATEWAY_AUTHORIZATION_FAILED');
    });
  });

  // ── logoutPortalSession ───────────────────────────────────────────────────
  describe('logoutPortalSession', () => {
    it('should logout successfully', async () => {
      const { captivePortalSessionRepository } = await repos();
      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(mockPortalSession);
      captivePortalSessionRepository.markExpired.mockResolvedValue({});

      const result = await logoutPortalSession('CPS-ABC123');

      expect(result.success).toBe(true);
    });

    it('should return error for non-existent session', async () => {
      const { captivePortalSessionRepository } = await repos();
      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(null);

      const result = await logoutPortalSession('INVALID-ID');

      expect(result.success).toBe(false);
      expect(result.code).toBe('PORTAL_SESSION_NOT_FOUND');
    });
  });

  // ── getPortalSessionStatus ────────────────────────────────────────────────
  describe('getPortalSessionStatus', () => {
    it('should return portal session status', async () => {
      const { captivePortalSessionRepository } = await repos();
      captivePortalSessionRepository.findWithPopulations.mockResolvedValue(mockPortalSession);

      const result = await getPortalSessionStatus('CPS-ABC123');

      expect(result.success).toBe(true);
      expect(result.portalSession).toEqual(mockPortalSession);
    });

    it('should return error for non-existent session', async () => {
      const { captivePortalSessionRepository } = await repos();
      captivePortalSessionRepository.findWithPopulations.mockResolvedValue(null);

      const result = await getPortalSessionStatus('INVALID-ID');

      expect(result.success).toBe(false);
      expect(result.code).toBe('PORTAL_SESSION_NOT_FOUND');
    });
  });

  // ── expirePortalSession ───────────────────────────────────────────────────
  describe('expirePortalSession', () => {
    it('should expire portal session', async () => {
      const { captivePortalSessionRepository } = await repos();
      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(mockPortalSession);
      captivePortalSessionRepository.markExpired.mockResolvedValue({});

      const result = await expirePortalSession('CPS-ABC123');

      expect(result.success).toBe(true);
    });

    it('should return error for non-existent session', async () => {
      const { captivePortalSessionRepository } = await repos();
      captivePortalSessionRepository.findByPortalSessionId.mockResolvedValue(null);

      const result = await expirePortalSession('INVALID-ID');

      expect(result.success).toBe(false);
      expect(result.code).toBe('PORTAL_SESSION_NOT_FOUND');
    });
  });

  // ── Backward Compatibility ────────────────────────────────────────────────
  describe('Backward Compatibility', () => {
    it('should not affect existing attendance methods', async () => {
      const { default: Attendance } = await import('../src/models/Attendance.js');
      const methodEnum = Attendance.schema.path('method').enumValues;

      expect(methodEnum).toContain('qr_scan');
      expect(methodEnum).toContain('manual');
      expect(methodEnum).toContain('self');
      expect(methodEnum).toContain('wifi_network');
    });
  });
});
