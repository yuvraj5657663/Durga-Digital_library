// Mock RegisteredDeviceRepository for Jest tests
const mockRegisteredDeviceRepository = {
  findById: jest.fn(),
  findByDeviceId: jest.fn(),
  findByStudent: jest.fn(),
  findActiveByStudent: jest.fn(),
  createDevice: jest.fn(),
  updateStatus: jest.fn(),
  updateLastSeen: jest.fn(),
  revokeDevice: jest.fn(),
  suspendDevice: jest.fn(),
  reactivateDevice: jest.fn(),
  countActiveByStudent: jest.fn(),
  findByMacAddress: jest.fn(),
  deleteByStudent: jest.fn()
};

export default mockRegisteredDeviceRepository;
