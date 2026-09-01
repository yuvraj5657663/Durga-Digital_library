// Mock AuditLog model for Jest tests
module.exports = {
  create: jest.fn().mockResolvedValue({}),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  deleteOne: jest.fn(),
  deleteMany: jest.fn(),
  countDocuments: jest.fn()
};
