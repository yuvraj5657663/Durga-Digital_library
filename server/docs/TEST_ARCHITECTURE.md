# Test Architecture

**Date:** August 31, 2026  
**PART:** 12 - Test Architecture, Database Isolation & Remaining Suite Repair

---

## Overview

This document describes the test architecture for the Durga Digital Library backend, including the approach used to resolve ES module compatibility issues with Jest, database isolation strategy, and known limitations.

---

## Project Configuration

### Package.json

```json
{
  "type": "module",
  "scripts": {
    "test": "jest --coverage"
  }
}
```
- Project uses ES modules (`"type": "module"`)
- Jest runs tests via babel-jest

### Babel Configuration

**babel.config.cjs:**
```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: { node: '18' },
      modules: 'commonjs'  // Required for Jest
    }]
  ]
};
```
- Babel transpiles ES modules to CommonJS for Jest
- This creates a boundary between ESM production code and CommonJS test environment

### Jest Configuration

**jest.config.cjs:**
```javascript
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
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    // Logger mappings
    '^.*/config/logger\\.js$': '<rootDir>/src/config/logger.test.js',
    '^.*/config/logger$': '<rootDir>/src/config/logger.test.js',
    // Config mappings
    '^.*/config/index\\.js$': '<rootDir>/src/config/index.test.js',
    '^.*/config/index$': '<rootDir>/src/config/index.test.js',
    '^.*/config$': '<rootDir>/src/config/index.test.js',
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
```

---

## ES Module Compatibility

### Root Cause

The project uses `"type": "module"` in `package.json`, which means it's an ES module project. The `logger.js` and `config/index.js` files use `import.meta.url` to determine `__filename` and `__dirname`. This is a native ES module feature that causes issues with Jest's default CommonJS environment.

### Error

```
SyntaxError: Cannot use 'import.meta' outside a module
```

### Solution

Created test-compatible versions of the problematic files:

1. **`src/config/logger.test.js`** - Test-compatible logger that avoids `import.meta`
2. **`src/config/index.test.js`** - Test-compatible config that avoids `import.meta`

### Jest moduleNameMapper

Jest configuration maps production imports to test versions:

```javascript
moduleNameMapper: {
  '^.*/config/logger\\.js$': '<rootDir>/src/config/logger.test.js',
  '^.*/config/logger$': '<rootDir>/src/config/logger.test.js',
  '^.*/config/index\\.js$': '<rootDir>/src/config/index.test.js',
  '^.*/config/index$': '<rootDir>/src/config/index.test.js',
  '^.*/config$': '<rootDir>/src/config/index.test.js',
}
```

### Why This Approach

**Pros:**
- Minimal changes to production code
- Production behavior unchanged
- Tests can run in Jest's CommonJS environment
- No need to switch entire project to CommonJS
- No need to use experimental Jest ESM support

**Cons:**
- Requires maintaining test versions of config and logger
- Test versions must be kept in sync with production versions

**Alternative Considered:**
- Jest native ESM support - Still experimental and requires Node.js ESM support
- Switch project to CommonJS - Would break ES module features throughout codebase

---

## Database Isolation

### Test Database Strategy

**File:** `src/config/database.js`

**Implementation:**
```javascript
async connect() {
  let uri;
  
  if (process.env.NODE_ENV === 'test') {
    // In test mode, require TEST_MONGODB_URI
    uri = process.env.TEST_MONGODB_URI;
    if (!uri) {
      throw new Error(
        'TEST_MONGODB_URI is required in test environment. ' +
        'Set TEST_MONGODB_URI to a test database URI before running tests. ' +
        'Example: TEST_MONGODB_URI=mongodb://localhost:27017/durga-library-test'
      );
    }
    
    // Additional safety guard to prevent production database usage in tests
    const productionPatterns = [
      /mongodb\+srv:\/\/.*\.mongodb\.net/, // MongoDB Atlas
      /production/i,
      /prod/i,
      /durga-library$/i, // Production database name
    ];
    const isProductionUri = productionPatterns.some(pattern => pattern.test(uri));
    if (isProductionUri) {
      throw new Error(
        'SAFETY GUARD: TEST_MONGODB_URI appears to be a production database URI. ' +
        'Use a dedicated test database. ' +
        'Current URI: ' + uri.replace(/:([^:@]+)@/, ':****@') // Mask password
      );
    }
  } else {
    // Production/development mode
    uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not set in environment variables');
    }
  }
  
  // ... connection logic
}
```

### Environment Variables

**Required for Tests:**
```bash
NODE_ENV=test
TEST_MONGODB_URI=mongodb://localhost:27017/durga-library-test
```

**Required for Production/Development:**
```bash
NODE_ENV=production  # or development
MONGODB_URI=mongodb://localhost:27017/durga-library
```

### Safety Guards

1. **Database Connection Level:** `src/config/database.js` checks NODE_ENV and TEST_MONGODB_URI
2. **Config Level:** `src/config/index.test.js` validates against production patterns
3. **Fail-Fast:** Tests abort immediately if production database detected

---

## Test Structure

### Unit Tests

Located in `tests/` directory:
- `authService.test.js` - Authentication service (4 tests)
- `deviceService.test.js` - Device service (20 tests)
- `wifiAttendanceService.test.js` - Wi-Fi attendance service (12 tests)
- `wifiSessionService.test.js` - Wi-Fi session service (BLOCKED)
- `captivePortalService.test.js` - Captive portal service (BLOCKED)
- `gatewayDiscovery.test.js` - Gateway discovery (21 tests)

### Integration Tests

Located in `tests/integration/` directory:
- `auth.integration.test.js` - Authentication integration (SKIPPED - MongoDB not available)

### Test Utilities

- `tests/setup.js` - Database setup/teardown utilities
- `tests/integration/testApp.js` - Minimal Express app for integration tests

### Mock Files

Located in `tests/mocks/models/` directory:
- `WiFiSession.mock.js` - Mock WiFiSession model
- `CaptivePortalSession.mock.js` - Mock CaptivePortalSession model
- `Student.mock.js` - Mock Student model
- `RegisteredDevice.mock.js` - Mock RegisteredDevice model

---

## Known Limitations

### 1. Mongoose Schema Initialization in Jest

**Issue:** Mongoose schemas fail to initialize in Jest's CommonJS environment when models are imported directly.

**Error:**
```
TypeError: The "original" argument must be of type function. Received undefined
```

**Affected Tests:**
- `wifiSessionService.test.js` - BLOCKED
- `captivePortalService.test.js` - BLOCKED

**Root Cause:**
- Services directly import mongoose models
- Models use `new mongoose.Schema()` at module load time
- Mongoose expects to be in a proper ESM environment
- Jest's CommonJS environment doesn't provide the expected module context

**Attempted Solutions:**
- Mock model files via moduleNameMapper - Broke existing tests due to broad patterns
- jest.mock() for models - Models load before mocks can be applied

**Status:** Requires architectural change (repository pattern or Jest ESM migration)

### 2. Integration Tests Require MongoDB

**Issue:** Integration tests require a running MongoDB instance.

**Affected Tests:**
- `auth.integration.test.js` - SKIPPED when MongoDB not available

**Solution:** Tests check MongoDB availability and skip gracefully when not available.

### 3. Test Config Sync

**Issue:** Test versions of config and logger must be kept in sync with production versions.

**Mitigation:** Documented in TEST_DATABASE_ISOLATION.md and TEST_INFRASTRUCTURE.md

---

## Test Commands

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Specific Test File

```bash
npx jest tests/deviceService.test.js
```

### Run Tests Without Coverage

```bash
npx jest --no-coverage
```

### Run Tests with Environment Variables

```bash
NODE_ENV=test TEST_MONGODB_URI=mongodb://localhost:27017/durga-library-test npm test
```

---

## Current Test Status

As of PART 12:

**Passing Test Suites (4):**
- authService.test.js: 4/4 tests passing
- deviceService.test.js: 20/20 tests passing
- wifiAttendanceService.test.js: 12/12 tests passing
- gatewayDiscovery.test.js: 21/21 tests passing

**Total Passing:** 57 tests

**Blocked Test Suites (3):**
- wifiSessionService.test.js: BLOCKED (mongoose schema initialization)
- captivePortalService.test.js: BLOCKED (mongoose schema initialization)
- auth.integration.test.js: SKIPPED (MongoDB not available)

**Total Blocked:** 31 tests

---

## Mocking Strategy

### Service Mocks

Services are mocked using jest.mock() before imports:

```javascript
jest.mock('../src/services/membershipService.js', () => ({
  getActive: jest.fn()
}));
```

### Model Mocks

Models are mocked using jest.mock() before imports:

```javascript
jest.mock('../src/models/Student.js', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
}));
```

### External Library Mocks

External libraries are mocked using jest.mock():

```javascript
jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-1234-1234-1234-123456789012')
}));
jest.mock('jsonwebtoken');
jest.mock('crypto');
```

---

## Best Practices

1. **Mock External Dependencies** - Mock database models, external services, and logger
2. **Clear Mocks** - Clear mocks in beforeEach to avoid test pollution
3. **Test Both Success and Failure** - Test both happy path and error cases
4. **Use Descriptive Test Names** - Make test names clear and specific
5. **Test Edge Cases** - Test boundary conditions and edge cases
6. **Keep Tests Independent** - Each test should be independent of others
7. **Use Test Database** - Never use production database for tests
8. **Mock Before Import** - Always declare jest.mock() before importing the module

---

## Coverage Goals

Target coverage: 70% for all metrics (statements, branches, functions, lines)

Current coverage: 28.18% statements

To improve coverage:
- Fix blocked test suites (wifiSessionService, captivePortalService)
- Add tests for untested services (membershipService, notificationService, pdfService, qrService)
- Add integration tests for critical flows

---

## Next Steps

1. Fix mongoose schema initialization issues (requires architectural change)
2. Add tests for untested services
3. Improve test coverage to 70%
4. Set up continuous integration
5. Add performance tests
6. Add security regression tests

---

**Document Version:** 1.0  
**Last Updated:** August 31, 2026  
**Status:** Active
