// Mock PaymentRepository for Jest tests
const mockPaymentRepository = {
  createPayment: jest.fn(),
  findByPaymentId: jest.fn(),
  findByMembershipId: jest.fn(),
  findByStudentId: jest.fn(),
  findByReceiptNo: jest.fn(),
  findByDateRange: jest.fn(),
  updateStatus: jest.fn()
};

export default mockPaymentRepository;
