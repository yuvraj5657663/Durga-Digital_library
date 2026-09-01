// Mock WiFiSessionRepository for Jest tests
const mockWiFiSessionRepository = {
  findBySessionId: jest.fn(),
  findByTokenHash: jest.fn(),
  findActiveByDevice: jest.fn(),
  findActiveByStudent: jest.fn(),
  createSession: jest.fn(),
  updateStatus: jest.fn(),
  updateLastActivity: jest.fn(),
  updateTokenHash: jest.fn(),
  updateAttendance: jest.fn(),
  expireOldSessions: jest.fn(),
  revokeBySessionId: jest.fn(),
  revokeAllByStudent: jest.fn(),
  findActiveSessions: jest.fn(),
  findSessionsToExpire: jest.fn(),
  restoreSession: jest.fn()
};

export default mockWiFiSessionRepository;
