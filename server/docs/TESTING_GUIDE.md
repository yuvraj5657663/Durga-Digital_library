# Testing Guide

**Date:** August 31, 2026  
**PART:** 11 - Test Infrastructure Repair & Full Wi-Fi System Verification

---

## Overview

This guide provides instructions for running tests in the Durga Digital Library backend project.

---

## Prerequisites

- Node.js >= 18.0.0
- MongoDB (for integration tests)
- Environment variables configured (see `.env.example`)

---

## Setup

### Install Dependencies

```bash
cd server
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables for tests:
- `MONGODB_TEST_URI` - Test database URI (optional, defaults to local MongoDB)
- `JWT_SECRET` - JWT secret for tests (optional, defaults to test key)

---

## Running Tests

### Run All Tests

```bash
npm test
```

This runs all tests with coverage reporting.

### Run Tests in Watch Mode

```bash
npm run test:watch
```

This runs tests in watch mode for development.

### Run Specific Test File

```bash
npx jest tests/deviceService.test.js
```

### Run Tests Without Coverage

```bash
npx jest --no-coverage
```

---

## Test Database

### Configuration

Tests use a separate test database to avoid modifying production data.

**Environment Variable:**
```bash
MONGODB_TEST_URI=mongodb://localhost:27017/durga-library-test
```

**Fallback:**
If `MONGODB_TEST_URI` is not set, tests will use `MONGODB_URI` or fall back to `mongodb://localhost:27017/durga-library-test`.

### Important

**NEVER connect tests to the production database.**

Verify that `MONGODB_TEST_URI` points to a test database before running tests.

---

## Test Structure

### Unit Tests

Located in `tests/` directory:
- `authService.test.js` - Authentication service
- `deviceService.test.js` - Device service
- `wifiAttendanceService.test.js` - Wi-Fi attendance service
- `wifiSessionService.test.js` - Wi-Fi session service
- `captivePortalService.test.js` - Captive portal service
- `gatewayDiscovery.test.js` - Gateway discovery

### Integration Tests

Located in `tests/integration/` directory:
- `auth.integration.test.js` - Authentication integration

---

## Test Infrastructure

### ES Module Compatibility

The project uses ES modules (`"type": "module"` in `package.json`). Jest runs in a CommonJS environment by default.

**Solution:**
Test-compatible versions of problematic files are created:
- `src/config/logger.test.js` - Test-compatible logger
- `src/config/index.test.js` - Test-compatible config

Jest configuration maps production imports to test versions via `moduleNameMapper`.

### Why This Approach

- Minimal changes to production code
- Production behavior unchanged
- Tests can run in Jest's CommonJS environment
- No need to switch entire project to CommonJS

---

## Current Test Status

As of PART 11 Phase 4:

**Test Suites:** 6 failed, 1 passed, 7 total  
**Tests:** 10 failed, 47 passed, 57 total  
**Coverage:** 26.94% statements (threshold: 70%)

### Known Test Failures

1. **wifiAttendanceService.test.js** - Schema access issues with mocked models
2. **deviceService.test.js** - Mock setup issues with dynamic imports
3. **captivePortalService.test.js** - Mock setup issues
4. **authService.test.js** - Mock setup issues
5. **integration/auth.integration.test.js** - Module resolution issues

These failures are due to:
- Dynamic imports in test files
- Mock setup complexity with ES modules
- Schema access on mocked models

---

## Troubleshooting

### Jest Cannot Find Module

If you see "Cannot find module" errors:
- Check that the test file imports are correct
- Verify that the file exists in the expected location
- Check Jest moduleNameMapper configuration

### Import.meta Outside Module

If you see "Cannot use 'import.meta' outside a module":
- Verify that logger.test.js and index.test.js are created
- Check Jest moduleNameMapper configuration
- Ensure test files import from the correct paths

### Mock Not Working

If mocks are not being applied:
- Check that jest.mock() is called before imports
- Verify mock paths are correct
- Use dynamic imports for complex mocking scenarios

### Database Connection Failed

If tests fail to connect to database:
- Verify MongoDB is running
- Check MONGODB_TEST_URI environment variable
- Ensure test database exists or can be created

---

## Writing New Tests

### Unit Test Example

```javascript
import { myFunction } from '../src/services/myService.js';
import MyModel from '../src/models/MyModel.js';

jest.mock('../src/models/MyModel.js');
jest.mock('../src/config/logger.js');

describe('My Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    MyModel.findOne.mockResolvedValue(mockData);
    
    const result = await myFunction('param');
    
    expect(result.success).toBe(true);
  });
});
```

### Integration Test Example

```javascript
import mongoose from 'mongoose';
import config from '../src/config/index.js';

describe('Integration Test', () => {
  beforeAll(async () => {
    await mongoose.connect(config.database.uri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should test real database operation', async () => {
    // Test with real database
  });
});
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

---

## Coverage Goals

Target coverage: 70% for all metrics (statements, branches, functions, lines)

Current coverage: 26.94% statements

To improve coverage:
- Add tests for untested code paths
- Add tests for error handling
- Add tests for edge cases
- Add integration tests for critical flows

---

## Next Steps

1. Fix existing test failures
2. Improve test coverage to 70%
3. Add end-to-end tests for Parts 3-7
4. Add security regression tests
5. Add performance tests
6. Set up continuous integration
