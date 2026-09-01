/**
 * Mock WiFiSession model for unit tests
 * 
 * This mock avoids mongoose schema initialization issues in Jest's CommonJS environment.
 */

const WiFiSession = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteMany: jest.fn(),
  countDocuments: jest.fn(),
};

export default WiFiSession;
