/**
 * Mock Student model for unit tests
 * 
 * This mock avoids mongoose schema initialization issues in Jest's CommonJS environment.
 */

const Student = {
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn(),
  deleteMany: jest.fn(),
  countDocuments: jest.fn(),
};

export default Student;
