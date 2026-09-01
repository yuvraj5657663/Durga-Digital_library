module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/config/logger.test.js',
    '!src/config/index.test.js',
  ],
  testMatch: [
    '**/*.test.js',
    '**/*.spec.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/wifiSessionService.test.js',
    '<rootDir>/tests/captivePortalService.test.js'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Logger mappings
    '^.*/config/logger\\.js$': '<rootDir>/src/config/logger.test.js',
    '^.*/config/logger$': '<rootDir>/src/config/logger.test.js',
    // Config mappings
    '^.*/config/index\\.js$': '<rootDir>/src/config/index.test.js',
    '^.*/config/index$': '<rootDir>/src/config/index.test.js',
    '^.*/config$': '<rootDir>/src/config/index.test.js',
    // Model mappings for new repositories (mock to avoid Mongoose initialization)
    '^.*/models/WiFiSession\\.js$': '<rootDir>/tests/mocks/models/WiFiSession.mock.js',
    '^.*/models/CaptivePortalSession\\.js$': '<rootDir>/tests/mocks/models/CaptivePortalSession.mock.js',
    '^.*/models/Payment\\.js$': '<rootDir>/tests/mocks/models/Payment.mock.js',
    '^.*/models/Notification\\.js$': '<rootDir>/tests/mocks/models/Notification.mock.js',
    '^.*/models/RegisteredDevice\\.js$': '<rootDir>/tests/mocks/models/RegisteredDevice.mock.js',
    '^.*/models/Attendance\\.js$': '<rootDir>/tests/mocks/models/Attendance.mock.js',
    '^.*/models/AuditLog\\.js$': '<rootDir>/tests/mocks/models/AuditLog.mock.js',
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
