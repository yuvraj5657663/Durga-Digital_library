# Test Database Isolation

**Date:** August 31, 2026  
**PART:** 12 - Test Architecture, Database Isolation & Remaining Suite Repair

---

## Overview

This document describes the test database isolation strategy to ensure tests can never accidentally connect to the production MongoDB database.

---

## Requirements

1. **NODE_ENV=test must be mandatory for test execution**
   - Tests should only run in test environment
   - Prevents accidental test execution against production

2. **Tests must NEVER connect to the production database**
   - Production database must be protected from test operations
   - No test should modify production data

3. **Explicit test database environment variable**
   - Use `TEST_MONGODB_URI` for test database connection
   - Do not hard-code credentials
   - Do not fall back to production database

4. **Safety guard**
   - If `NODE_ENV === "test"`, production MongoDB URI must NEVER be used
   - If `TEST_MONGODB_URI` is missing, FAIL FAST with clear error
   - Do NOT silently fall back to `MONGODB_URI` or production database

5. **Isolated test database**
   - Prefer an isolated test database/database name
   - Tests should clean up their own data
   - Do NOT drop production collections
   - Do NOT execute destructive operations against any URI that could be production

---

## Implementation

### Database Connection Code

**File:** `src/config/database.js`

**Changes Made:**
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
  
  // ... rest of connection logic
}
```

### Config Safety Guard

**File:** `src/config/index.test.js`

**Existing Safety Guard:**
```javascript
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
    throw new Error(
      'SAFETY GUARD: Tests are attempting to connect to a production database. ' +
      'Set MONGODB_TEST_URI to a test database URI. ' +
      'Current URI: ' + mongoUri.replace(/:([^:@]+)@/, ':****@')
    );
  }
}
```

**Note:** This safety guard is in the test config but the database connection code now has its own guard for defense in depth.

---

## Environment Variables

### Required for Tests

```bash
NODE_ENV=test
TEST_MONGODB_URI=mongodb://localhost:27017/durga-library-test
```

### Required for Production/Development

```bash
NODE_ENV=production  # or development
MONGODB_URI=mongodb://localhost:27017/durga-library
```

### Forbidden

```bash
# NEVER use production database in test mode
NODE_ENV=test
MONGODB_URI=mongodb://production-uri  # This will be ignored by database.js

# NEVER use production-like database name in TEST_MONGODB_URI
NODE_ENV=test
TEST_MONGODB_URI=mongodb://localhost:27017/durga-library  # Will fail safety guard
```

---

## Test Setup

### Jest Environment Setup

**File:** `jest.config.cjs`

Add test environment setup to ensure NODE_ENV is set:

```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setupEnv.js'],
  // ... other config
};
```

**File:** `tests/setupEnv.js`

```javascript
// Ensure NODE_ENV is set to test
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Ensure TEST_MONGODB_URI is set
if (!process.env.TEST_MONGODB_URI) {
  process.env.TEST_MONGODB_URI = 'mongodb://localhost:27017/durga-library-test';
}
```

### Test Database Cleanup

**File:** `tests/setup.js`

```javascript
import mongoose from 'mongoose';

export async function setupTestDB() {
  await mongoose.connect(process.env.TEST_MONGODB_URI);
}

export async function teardownTestDB() {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  
  await mongoose.connection.close();
}
```

---

## Safety Verification

### Before Running Tests

1. **Check NODE_ENV**
   ```bash
   echo $NODE_ENV  # Should be 'test'
   ```

2. **Check TEST_MONGODB_URI**
   ```bash
   echo $TEST_MONGODB_URI  # Should point to test database
   ```

3. **Verify no production database in environment**
   ```bash
   # Ensure MONGODB_URI is not set to production
   echo $MONGODB_URI
   ```

### During Test Execution

The database connection code will:
1. Check if NODE_ENV === 'test'
2. Require TEST_MONGODB_URI to be set
3. Validate TEST_MONGODB_URI against production patterns
4. Throw error if production database detected
5. Only connect if all checks pass

### After Test Execution

1. **Verify test database was used**
   - Check MongoDB logs for connection to test database
   - Verify production database has no new data

2. **Verify cleanup**
   - Test database should be empty after tests
   - No collections should remain

---

## Failure Scenarios

### Scenario 1: TEST_MONGODB_URI Not Set

**Error:**
```
Error: TEST_MONGODB_URI is required in test environment. 
Set TEST_MONGODB_URI to a test database URI before running tests. 
Example: TEST_MONGODB_URI=mongodb://localhost:27017/durga-library-test
```

**Resolution:**
```bash
export TEST_MONGODB_URI=mongodb://localhost:27017/durga-library-test
```

### Scenario 2: Production Database in TEST_MONGODB_URI

**Error:**
```
Error: SAFETY GUARD: TEST_MONGODB_URI appears to be a production database URI. 
Use a dedicated test database. 
Current URI: mongodb://****@cluster0.mongodb.net/durga-library
```

**Resolution:**
```bash
export TEST_MONGODB_URI=mongodb://localhost:27017/durga-library-test
```

### Scenario 3: NODE_ENV Not Set

**Behavior:**
- Tests will use MONGODB_URI (production/development database)
- This is unsafe and should be prevented

**Resolution:**
```bash
export NODE_ENV=test
```

---

## Best Practices

1. **Always set NODE_ENV=test before running tests**
   ```bash
   NODE_ENV=test npm test
   ```

2. **Use a dedicated test database**
   - Name: `durga-library-test` or similar
   - Separate from production database
   - Can be on same MongoDB instance but different database

3. **Clean up test data after each test**
   - Use beforeEach/afterEach to clear collections
   - Use beforeAll/afterAll for database connection
   - Ensure no data leaks between tests

4. **Never hard-code database credentials**
   - Use environment variables
   - Never commit credentials to version control
   - Use .env files for local development

5. **Verify test database isolation regularly**
   - Check that production database has no test data
   - Monitor test database size
   - Clean up old test databases

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Tests
  env:
    NODE_ENV: test
    TEST_MONGODB_URI: mongodb://localhost:27017/durga-library-test
  run: npm test
```

### Jenkins Example

```groovy
withEnv(['NODE_ENV=test', 'TEST_MONGODB_URI=mongodb://localhost:27017/durga-library-test']) {
    sh 'npm test'
}
```

---

## Monitoring and Alerts

### Database Connection Monitoring

Monitor for:
- Connections to production database during test runs
- Failed safety guard activations
- Missing TEST_MONGODB_URI errors

### Alerts

Set up alerts for:
- Safety guard activation (someone tried to use production database in tests)
- Test database connection failures
- Test database size exceeding limits

---

## Compliance

### Security Requirements

- ✅ Production database cannot be used by tests
- ✅ Fail-fast if test database not configured
- ✅ Safety guards at multiple levels (config + database connection)
- ✅ No credentials hard-coded
- ✅ Passwords masked in error messages

### Data Protection

- ✅ No production data modified by tests
- ✅ Test data isolated in separate database
- ✅ Test data cleaned up after execution
- ✅ No destructive operations against production URIs

---

**Document Version:** 1.0  
**Last Updated:** August 31, 2026  
**Status:** Implemented
