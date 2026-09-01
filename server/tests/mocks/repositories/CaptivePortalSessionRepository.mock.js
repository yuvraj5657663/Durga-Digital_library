// Mock CaptivePortalSessionRepository for Jest tests
const mockCaptivePortalSessionRepository = {
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
};

export default mockCaptivePortalSessionRepository;
