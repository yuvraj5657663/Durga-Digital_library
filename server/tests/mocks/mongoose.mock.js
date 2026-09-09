// Mock mongoose to avoid import errors in tests
const mongooseMock = {
  startSession: jest.fn(() => ({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn()
  })),
  Schema: jest.fn(function(schemaDefinition, options) {
    this.definition = schemaDefinition;
    this.options = options;
    this.Types = {
      ObjectId: jest.fn().mockImplementation(() => ({
        toString: jest.fn(() => 'mock-id')
      }))
    };
  }),
  model: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  connection: {
    close: jest.fn()
  }
};

mongooseMock.Schema.Types = {
  ObjectId: jest.fn().mockImplementation(() => ({
    toString: jest.fn(() => 'mock-id')
  }))
};

export default mongooseMock;
