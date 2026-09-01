# Test Infrastructure

**Date:** August 31, 2026  
**PART:** 11 - Test Infrastructure Repair & Full Wi-Fi System Verification

---

## Overview

This document describes the test infrastructure for the Durga Digital Library backend, including the approach used to resolve ES module compatibility issues with Jest.

---

## ES Module Compatibility Issue

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

### Jest Configuration

Updated `jest.config.cjs` to map production imports to test versions:

```javascript
moduleNameMapper: {
  '^../config/logger\\.js$': '<rootDir>/src/config/logger.test.js',
  '^../config/logger$': '<rootDir>/src/config/logger.test.js',
  '^@/config/logger$': '<rootDir>/src/config/logger.test.js',
  '^../config/index\\.js$': '<rootDir>/src/config/index.test.js',
  '^../config/index$': '<rootDir>/src/config/index.test.js',
  '^@/config/index$': '<rootDir>/src/config/index.test.js',
  '^@/config$': '<rootDir>/src/config/index.test.js',
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

## Test Commands

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm test
```

Coverage is enabled by default in the test script.

---

## Test Database

### Configuration

Test database is configured via environment variable:

```bash
MONGODB_TEST_URI=mongodb://localhost:27017/durga-library-test
```

If `MONGODB_TEST_URI` is not set, tests will use `MONGODB_URI` or fall back to `mongodb://localhost:27017/durga-library-test`.

### Important

**Tests should NEVER connect to the production database.**

The test config defaults to a test database, but this should be verified before running tests.

---

## Test Files

### Unit Tests

- `tests/authService.test.js` - Authentication service tests
- `tests/deviceService.test.js` - Device service tests
- `tests/wifiAttendanceService.test.js` - Wi-Fi attendance service tests
- `tests/wifiSessionService.test.js` - Wi-Fi session service tests
- `tests/captivePortalService.test.js` - Captive portal service tests
- `tests/gatewayDiscovery.test.js` - Gateway discovery tests

### Integration Tests

- `tests/integration/auth.integration.test.js` - Authentication integration tests

---

## Test Environment

### Node.js Version

Required: Node.js >= 18.0.0

### Dependencies

- Jest 29.7.0
- Babel 7.23.5
- @babel/preset-env 7.23.5

### Babel Configuration

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: '18'
      },
      modules: 'commonjs'
    }]
  ]
};
```

The `modules: 'commonjs'` setting is required for Jest compatibility.

---

## Known Limitations

1. **Test Config Sync** - Test versions of config and logger must be kept in sync with production versions
2. **Dynamic Imports** - Some tests use dynamic imports which may have issues with mocking
3. **Schema Access** - Direct schema access in tests may not work with mocked models

---

## Current Test Status

As of PART 11 Phase 4:

**Test Suites:** 6 failed, 1 passed, 7 total  
** tests:** 10 failed, 47 passed, 57 total  
**Coverage:** 26.94% statements (threshold: 70%)

---

## Next Steps

1. Fix failing tests
2. Improve test coverage
3. Add database isolation safeguards
4. Add end-to-end tests for Parts 3-7
5. Add security regression tests
