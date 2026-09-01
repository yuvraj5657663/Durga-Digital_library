// Mock RegisteredDeviceRepository for Jest tests
const mockRegisteredDeviceRepository = {
  findByDeviceId: jest.fn(),
  findByFingerprint: jest.fn(),
  findByMacAddress: jest.fn(),
  findByUserAgent: jest.fn(),
  createDevice: jest.fn(),
  updateLastSeen: jest.fn(),
  updateSecurityCheck: jest.fn(),
  updateStatus: jest.fn(),
  countActiveByStudentId: jest.fn(),
  findByStudentId: jest.fn(),
  findActiveByStudentId: jest.fn()
};

export default mockRegisteredDeviceRepository;
