# PART 12 TEST ARCHITECTURE AUDIT

**Date:** August 31, 2026  
**Purpose:** Full project test audit before making modifications to fix remaining test suites

---

## Executive Summary

This audit documents the current test architecture, identifies root causes of test failures, and proposes minimal fixes without weakening production security or removing import.meta from production code.

---

## Current Architecture

### Project Configuration

**package.json:**
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

**jest.config.cjs:**
```javascript
moduleNameMapper: {
  '^.*/config/logger\\.js$': '<rootDir>/src/config/logger.test.js',
  '^.*/config/logger$': '<rootDir>/src/config/logger.test.js',
  '^.*/config/index\\.js$': '<rootDir>/src/config/index.test.js',
  '^.*/config/index$': '<rootDir>/src/config/index.test.js',
  '^.*/config$': '<rootDir>/src/config/index.test.js',
}
```
- Maps production config/logger imports to test-compatible versions
- Avoids import.meta issues in tests

### Production Code Using import.meta

**src/config/logger.js:**
```javascript
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```
- Uses import.meta.url to get __dirname in ESM
- Incompatible with Jest's CommonJS environment

**src/config/index.js:**
```javascript
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```
- Same import.meta usage as logger.js

### Test-Compatible Abstractions

**src/config/logger.test.js:**
```javascript
const logger = {
  level: 'info',
  silent: true,
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  levels: { error: 0, warn: 1, info: 2, http: 3, debug: 4, verbose: 5, silly: 6 }
};
export default logger;
```
- Simple mock logger to avoid winston initialization
- Jest-compatible with no external dependencies

**src/config/index.test.js:**
```javascript
// Safety guard: Prevent tests from connecting to production database
const nodeEnv = process.env.NODE_ENV || 'test';
const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/durga-library-test';

const productionPatterns = [
  /mongodb\+srv:\/\/.*\.mongodb\.net/,
  /production/i,
  /prod/i,
  /durga-library$/i,
];

if (nodeEnv === 'test') {
  const isProductionUri = productionPatterns.some(pattern => pattern.test(mongoUri));
  if (isProductionUri) {
    throw new Error('SAFETY GUARD: Tests are attempting to connect to a production database...');
  }
}
```
- Test-compatible config without import.meta
- Production database safety guard
- Uses MONGODB_TEST_URI if available

### Database Connection

**src/config/database.js:**
```javascript
async connect() {
  const uri = process.env.MONGODB_URI;  // Only checks MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }
  this.connection = await mongoose.connect(uri, {...});
}
```
- Uses MONGODB_URI environment variable
- No dedicated TEST_MONGODB_URI check
- No NODE_ENV=test awareness

### Model Structure

**src/models/index.js:**
```javascript
import User from './User.js';
import Student from './Student.js';
// ... other models
import WiFiSession from './WiFiSession.js';
import CaptivePortalSession from './CaptivePortalSession.js';

export { User, Student, ..., WiFiSession, CaptivePortalSession };
```
- Central model export file
- All models import mongoose and define schemas
- Models use mongoose.Schema with complex indexes

---

## Dependency Graph

### auth.integration.test.js Dependency Chain

```
auth.integration.test.js
  ├─> supertest (HTTP client)
  ├─> setup.js
  │    └─> config/index.js (mapped to index.test.js)
  ├─> app.js
  │    ├─> config/index.js (mapped to index.test.js) ✓
  │    ├─> logger.js (mapped to logger.test.js) ✓
  │    ├─> database.js
  │    │    └─> mongoose (loads directly)
  │    ├─> routes/* (multiple route files)
  │    │    └─> services/* (multiple service files)
  │    │        └─> models/* (mongoose models)
  │    │            └─> mongoose.Schema (fails in CommonJS)
  │    └─> middlewares/*
  └─> User.js (mongoose model)
      └─> mongoose.Schema (fails in CommonJS)
```

**Blocker:** app.js loads the entire application including all routes, services, and models. Even though config and logger are mapped to test versions, the deep dependency chain through routes → services → models triggers mongoose schema initialization which fails in Jest's CommonJS environment.

### wifiSessionService.test.js Dependency Chain

```
wifiSessionService.test.js
  ├─> wifiSessionService.js
  │    ├─> WiFiSession.js (mongoose model) ✗
  │    │    └─> mongoose.Schema (fails in CommonJS)
  │    ├─> RegisteredDevice.js (mongoose model) ✗
  │    ├─> Student.js (mongoose model) ✗
  │    ├─> CaptivePortalSession.js (mongoose model) ✗
  │    ├─> membershipService.js
  │    ├─> deviceService.js
  │    ├─> wifiAttendanceService.js
  │    ├─> gatewayService.js
  │    ├─> AuditLog.js (mongoose model) ✗
  │    ├─> logger.js (mapped to logger.test.js) ✓
  │    ├─> config/index.js (mapped to index.test.js) ✓
  │    ├─> uuid
  │    ├─> crypto
  │    ├─> jsonwebtoken
  │    └─> actorId.js
  └─> jest.mock() for all above
```

**Blocker:** Even with jest.mock() for models, the import of wifiSessionService.js triggers the model imports before mocks can be applied. The models use mongoose.Schema which fails in CommonJS.

### captivePortalService.test.js Dependency Chain

```
captivePortalService.test.js
  ├─> captivePortalService.js
  │    ├─> CaptivePortalSession.js (mongoose model) ✗
  │    │    └─> mongoose.Schema (fails in CommonJS)
  │    ├─> WiFiSession.js (mongoose model) ✗
  │    ├─> RegisteredDevice.js (mongoose model) ✗
  │    ├─> Student.js (mongoose model) ✗
  │    ├─> membershipService.js
  │    ├─> deviceService.js
  │    ├─> logger.js (mapped to logger.test.js) ✓
  │    ├─> config/index.js (mapped to index.test.js) ✓
  │    └─> uuid
  └─> jest.mock() for all above
```

**Blocker:** Same issue as wifiSessionService.test.js - model imports trigger mongoose schema initialization before mocks apply.

---

## Root Cause Analysis

### 1. auth.integration.test.js - Winston Initialization Error

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'levels')
at Object.<anonymous>.module.exports [as createLogger]
```

**Root Cause:**
- app.js imports the full application stack
- Routes import services, services import models
- Models use mongoose.Schema which requires mongoose to be properly initialized
- In Jest's CommonJS environment, mongoose initialization fails
- This causes a cascade of initialization failures
- Winston may be loaded as a transitive dependency through some service

**Why moduleNameMapper Doesn't Help:**
- moduleNameMapper only maps direct imports
- Deep dependency chains (app.js → routes → services → models) bypass the mapper
- Models are imported directly by services, not through the mapper

### 2. wifiSessionService.test.js & captivePortalService.test.js - Mongoose Schema Error

**Error:**
```
TypeError: The "original" argument must be of type function. Received undefined
at Object.<anonymous> (../node_modules/mongodb/src/utils.ts:1324:37)
```

**Root Cause:**
- Services directly import mongoose models
- Models use `new mongoose.Schema()` at module load time
- Mongoose expects to be in a proper ESM environment
- Jest's CommonJS environment doesn't provide the expected module context
- The error occurs inside mongoose/mongodb internals when trying to access module metadata

**Why jest.mock() Doesn't Help:**
- jest.mock() replaces the module export after it's loaded
- But the model file is loaded first to determine what to mock
- During that initial load, mongoose.Schema is executed
- This happens before the mock can be applied

### 3. Database Connection - No Test Database Isolation

**Current State:**
- database.js only checks MONGODB_URI
- No dedicated TEST_MONGODB_URI
- Safety guard exists in index.test.js but database.js doesn't use it
- Tests could accidentally connect to production if MONGODB_URI points to production

**Risk:**
- If MONGODB_URI is set to production in environment, tests use it
- No fail-fast if TEST_MONGODB_URI is missing
- Safety guard only in config, not in database connection code

---

## Proposed Minimal Fixes

### Fix 1: Enforce Test Database Isolation

**File:** `src/config/database.js`

**Change:** Add NODE_ENV=test check and TEST_MONGODB_URI support

```javascript
async connect() {
  let uri;
  
  if (process.env.NODE_ENV === 'test') {
    // In test mode, require TEST_MONGODB_URI
    uri = process.env.TEST_MONGODB_URI;
    if (!uri) {
      throw new Error(
        'TEST_MONGODB_URI is required in test environment. ' +
        'Set TEST_MONGODB_URI to a test database URI before running tests.'
      );
    }
    
    // Additional safety guard
    const productionPatterns = [
      /mongodb\+srv:\/\/.*\.mongodb\.net/,
      /production/i,
      /prod/i,
      /durga-library$/i,
    ];
    const isProductionUri = productionPatterns.some(pattern => pattern.test(uri));
    if (isProductionUri) {
      throw new Error(
        'SAFETY GUARD: TEST_MONGODB_URI appears to be a production database URI. ' +
        'Use a dedicated test database.'
      );
    }
  } else {
    // Production/development mode
    uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not set in environment variables');
    }
  }
  
  this.connection = await mongoose.connect(uri, {...});
}
```

**Impact:**
- Tests MUST set TEST_MONGODB_URI
- Production database cannot be used in test mode
- Fail-fast if test database not configured
- No production code changes for non-test environments

### Fix 2: Fix auth.integration.test.js - Avoid Full App Load

**Option A: Create Minimal Test App**

Create a minimal Express app for integration tests that doesn't load all routes:

```javascript
// tests/integration/testApp.js
import express from 'express';
import authRoutes from '../../src/routes/authRoutes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use(errorHandler);

export default app;
```

**Option B: Mock Routes in app.js**

Add a test mode flag to app.js to skip route loading:

```javascript
// src/app.js
const app = express();

// ... middleware setup ...

if (process.env.NODE_ENV !== 'test') {
  // Only load routes in non-test mode
  app.use('/api/v1/auth', authRoutes);
  // ... other routes
}
```

**Recommended:** Option A - Create minimal test app to avoid modifying production app.js

### Fix 3: Fix wifiSessionService.test.js & captivePortalService.test.js

**Option A: Mock Model Files Before Import**

Create mock model files that don't use mongoose:

```javascript
// tests/mocks/models/WiFiSession.mock.js
export default {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn()
};
```

Then in jest.config.cjs:
```javascript
moduleNameMapper: {
  // ... existing mappings
  '^../src/models/WiFiSession.js$': '<rootDir>/tests/mocks/models/WiFiSession.mock.js',
  '^../src/models/CaptivePortalSession.js$': '<rootDir>/tests/mocks/models/CaptivePortalSession.mock.js',
  // ... other models
}
```

**Option B: Use Test Database with Real Mongoose**

Set up a real test database connection and use real mongoose models:

```javascript
// tests/setup.js
import mongoose from 'mongoose';

beforeAll(async () => {
  await mongoose.connect(process.env.TEST_MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});
```

**Recommended:** Option A - Mock model files to avoid database dependency in unit tests

### Fix 4: Remove Unnecessary Dynamic Imports

Several tests use dynamic imports to work around mock initialization issues:

```javascript
// Current pattern
const { getActive } = await import('../src/services/membershipService.js');
getActive.mockResolvedValue(mockMembership);
```

**Proposed Fix:** Use static imports with proper mock setup:

```javascript
// Proposed pattern
import { getActive } from '../src/services/membershipService.js';

jest.mock('../src/services/membershipService.js', () => ({
  getActive: jest.fn()
}));

// In test
getActive.mockResolvedValue(mockMembership);
```

**Files to Update:**
- tests/deviceService.test.js
- tests/wifiAttendanceService.test.js
- tests/wifiSessionService.test.js (when fixed)
- tests/captivePortalService.test.js (when fixed)

---

## Production Code Changes Required

### Required Changes

1. **src/config/database.js** - Add test database isolation (Fix 1)
   - This is a safety improvement, not a weakening of production code
   - Only affects test environment behavior
   - Production behavior unchanged

### Optional Changes

2. **src/app.js** - Add test mode flag to skip route loading (Fix 2, Option B)
   - Not required if using Option A (minimal test app)
   - Would be a conditional that doesn't affect production

### No Changes Required

- **src/config/logger.js** - Keep import.meta (production requirement)
- **src/config/index.js** - Keep import.meta (production requirement)
- **All model files** - Keep mongoose schemas unchanged
- **All service files** - Keep business logic unchanged

---

## Initialization Order Issues

### Current Mock Initialization Order

**Problem:** Tests sometimes use dynamic imports because mocks aren't initialized before module load.

**Correct Order:**
```javascript
// 1. Mock declarations (must be before imports)
jest.mock('../src/models/Student.js');
jest.mock('../src/services/membershipService.js');

// 2. Static imports
import { myFunction } from '../src/services/myService.js';

// 3. Test setup
describe('My Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should work', () => {
    // Test code
  });
});
```

### Circular Dependencies

**Potential Issue:** Some services may have circular imports through models.

**Detection:** Check if any service imports another service that imports the first service back.

**Mitigation:** If found, refactor to use a shared utility or move common logic to a separate module.

---

## Next Steps

1. **Implement Fix 1** - Test database isolation in database.js
2. **Implement Fix 2** - Create minimal test app for auth.integration.test.js
3. **Implement Fix 3** - Create mock model files for wifiSessionService and captivePortalService tests
4. **Implement Fix 4** - Remove dynamic imports where possible
5. **Run individual test suites** to verify fixes
6. **Run full test suite** to assess overall state
7. **Document results** in PART_12_IMPLEMENTATION_REPORT.md

---

## Safety Verification

### Before Making Changes

- [ ] Confirm no production security will be weakened
- [ ] Confirm import.meta will not be removed from production code
- [ ] Confirm production database cannot be used by tests
- [ ] Confirm no production data will be modified
- [ ] Confirm no physical Airtel router changes will be made

### After Making Changes

- [ ] Verify existing 57 passing tests still pass
- [ ] Verify auth.integration.test.js executes
- [ ] Verify wifiSessionService.test.js executes
- [ ] Verify captivePortalService.test.js executes
- [ ] Verify NODE_ENV=test is enforced
- [ ] Verify TEST_MONGODB_URI is required in test mode

---

**Audit Completed:** August 31, 2026  
**Next Phase:** PHASE 2 - Test Database Isolation
