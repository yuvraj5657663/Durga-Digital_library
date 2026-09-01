/**
 * Test-compatible logger
 * 
 * This logger is used by Jest tests to avoid import.meta issues.
 * The production logger uses import.meta which is not compatible with Jest's CommonJS environment.
 */

// Simple mock logger to avoid winston initialization issues
const logger = {
  level: 'info',
  silent: true,
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    verbose: 5,
    silly: 6
  }
};

export default logger;
