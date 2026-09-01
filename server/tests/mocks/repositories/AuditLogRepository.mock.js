// Mock AuditLogRepository for Jest tests
const mockAuditLogRepository = {
  createLog: jest.fn(),
  findByActor: jest.fn(),
  findByAction: jest.fn(),
  findByTargetType: jest.fn(),
  findByDateRange: jest.fn(),
  findRecentLogs: jest.fn(),
  deleteOldLogs: jest.fn()
};

export default mockAuditLogRepository;
