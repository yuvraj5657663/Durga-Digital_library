# Repository Pattern Documentation

## Overview

This document describes the Repository Pattern implementation in the Durga Digital Library system. The Repository Pattern abstracts data access logic, providing a clean separation between business logic (services) and data persistence (models).

## Architecture

### Layer Structure

```
Controllers → Services → Repositories → Models → Database
```

- **Controllers**: Handle HTTP requests/responses, call services
- **Services**: Contain business logic, validation, authorization, audit logging
- **Repositories**: Encapsulate data access operations
- **Models**: Define data schemas and Mongoose models
- **Database**: MongoDB

### Benefits

1. **Testability**: Services can be unit tested by mocking repositories
2. **Maintainability**: Data access logic is centralized
3. **Separation of Concerns**: Business logic is isolated from data access
4. **Flexibility**: Database operations can be changed without affecting services
5. **Transaction Safety**: Services manage transactions, repositories handle data access

## Base Repository

All repositories extend `BaseRepository` which provides common CRUD operations.

### Location
`src/repositories/BaseRepository.js`

### Common Methods

```javascript
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findOne(query, options = {}) { /* ... */ }
  async find(query, options = {}) { /* ... */ }
  async findById(id, options = {}) { /* ... */ }
  async create(data, options = {}) { /* ... */ }
  async createMany(dataArray, options = {}) { /* ... */ }
  async updateOne(query, update, options = {}) { /* ... */ }
  async updateMany(query, update, options = {}) { /* ... */ }
  async deleteOne(query, options = {}) { /* ... */ }
  async deleteMany(query, options = {}) { /* ... */ }
  async countDocuments(query, options = {}) { /* ... */ }
}
```

### Transaction Support

Repository methods accept an optional `session` parameter for Mongoose transactions:

```javascript
await repository.create(data, { session });
await repository.updateOne(query, update, { session });
```

## Creating a New Repository

### Step 1: Create the Repository File

```javascript
// src/repositories/YourRepository.js
import BaseRepository from './BaseRepository.js';
import YourModel from '../models/YourModel.js';

class YourRepository extends BaseRepository {
  constructor() {
    super(YourModel);
  }

  // Custom methods specific to this repository
  async findByCustomField(value) {
    return this.findOne({ customField: value });
  }

  async updateCustomField(id, value) {
    return this.updateOne({ _id: id }, { customField: value });
  }
}

export default new YourRepository();
```

### Step 2: Export from Index

```javascript
// src/repositories/index.js
export { default as yourRepository } from './YourRepository.js';
```

### Step 3: Use in Service

```javascript
// src/services/yourService.js
import yourRepository from '../repositories/YourRepository.js';

export async function doSomething(id) {
  const item = await yourRepository.findById(id);
  // Business logic here
  return item;
}
```

## Existing Repositories

### WiFiSessionRepository

**Location**: `src/repositories/WiFiSessionRepository.js`

**Purpose**: Manages WiFi session data

**Key Methods**:
- `findBySessionId(sessionId)` - Find session by session ID
- `findByTokenHash(tokenHash)` - Find session by token hash
- `findActiveByDevice(deviceId)` - Find active sessions for a device
- `findActiveByStudent(studentId)` - Find active sessions for a student
- `createSession(sessionData)` - Create a new WiFi session
- `updateStatus(sessionId, status)` - Update session status
- `expireOldSessions(beforeDate)` - Expire sessions before a date
- `revokeBySessionId(sessionId, reason)` - Revoke a specific session
- `revokeAllByStudent(studentId, reason)` - Revoke all sessions for a student

### CaptivePortalSessionRepository

**Location**: `src/repositories/CaptivePortalSessionRepository.js`

**Purpose**: Manages captive portal session data

**Key Methods**:
- `findByPortalSessionId(portalSessionId)` - Find session by portal session ID
- `createPortalSession(sessionData)` - Create a new portal session
- `markAuthorized(portalSessionId, studentId, deviceId, wifiSessionId)` - Mark session as authorized
- `markExpired(portalSessionId)` - Mark session as expired
- `markFailed(portalSessionId, reason)` - Mark session as failed
- `findWithPopulations(portalSessionId)` - Find session with populated fields

### PaymentRepository

**Location**: `src/repositories/PaymentRepository.js`

**Purpose**: Manages payment data

**Key Methods**:
- `createPayment(paymentData)` - Create a new payment
- `findByPaymentId(paymentId)` - Find payment by payment ID
- `findByMembershipId(membershipId)` - Find payments for a membership
- `findByStudentId(studentId, options)` - Find payments for a student
- `findByReceiptNo(receiptNo)` - Find payment by receipt number
- `updateStatus(paymentId, status)` - Update payment status

### NotificationRepository

**Location**: `src/repositories/NotificationRepository.js`

**Purpose**: Manages notification data

**Key Methods**:
- `createNotification(notificationData)` - Create a new notification
- `findByStudentId(studentId, options)` - Find notifications for a student
- `findUnreadByStudentId(studentId, options)` - Find unread notifications
- `markAsRead(notificationId)` - Mark notification as read
- `markAllAsRead(studentId)` - Mark all notifications as read
- `broadcast(notificationData, studentIds)` - Broadcast notification to multiple students
- `deleteByStudentId(studentId)` - Delete notifications for a student

### RegisteredDeviceRepository

**Location**: `src/repositories/RegisteredDeviceRepository.js`

**Purpose**: Manages registered device data

**Key Methods**:
- `findByDeviceId(deviceId)` - Find device by device ID
- `findByFingerprint(fingerprint)` - Find device by fingerprint
- `findByMacAddress(macAddress)` - Find device by MAC address
- `createDevice(deviceData)` - Register a new device
- `updateLastSeen(deviceId)` - Update last seen timestamp
- `countActiveByStudentId(studentId)` - Count active devices for a student

### AttendanceRepository

**Location**: `src/repositories/AttendanceRepository.js`

**Purpose**: Manages attendance data

**Key Methods**:
- `findByStudentAndDate(studentId, date)` - Find attendance by student and date
- `createAttendance(attendanceData)` - Create a new attendance record
- `findOneAndUpdateAttendance(query, update)` - Find and update attendance
- `findByDateRange(startDate, endDate)` - Find attendance in date range
- `updateCheckOut(attendanceId)` - Update check-out time
- `findTodayAttendance()` - Find all attendance records for today

### AuditLogRepository

**Location**: `src/repositories/AuditLogRepository.js`

**Purpose**: Manages audit log data

**Key Methods**:
- `createLog(logData)` - Create a new audit log
- `findByActor(actorId)` - Find logs by actor
- `findByAction(action)` - Find logs by action
- `findByTargetType(targetType)` - Find logs by target type
- `findByDateRange(startDate, endDate)` - Find logs in date range
- `deleteOldLogs(beforeDate)` - Delete logs before a date

## Service Layer Guidelines

### When to Use Repositories

**DO use repositories** for:
- All data access operations (CRUD)
- Complex queries specific to a model
- Data validation that's purely about data integrity

**DO NOT use repositories** for:
- Business logic validation (e.g., checking if user has permission)
- Authorization checks
- Audit logging (this is business logic)
- Calling other services

### Transaction Handling

Services should manage transactions:

```javascript
import mongoose from 'mongoose';

export async function complexOperation() {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Use repositories with session
    await repository1.create(data1, { session });
    await repository2.updateOne(query, update, { session });

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

### Example Service

```javascript
import membershipRepository from '../repositories/MembershipRepository.js';
import paymentRepository from '../repositories/PaymentRepository.js';
import studentRepository from '../repositories/StudentRepository.js';
import auditLogRepository from '../repositories/AuditLogRepository.js';

export async function renewMembership({ studentId, duration, fee, adminUser }) {
  // Business logic: Check if student exists
  const student = await studentRepository.findById(studentId);
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Business logic: Check student status
  if (student.status !== 'Active') {
    throw new ValidationError('Student is not active');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Data access: Create membership
    const [membership] = await membershipRepository.create(
      [{ student: studentId, duration, fee }],
      { session }
    );

    // Data access: Create payment
    await paymentRepository.createPayment({
      membershipRef: membership._id,
      student: studentId,
      amount: fee,
      status: 'paid'
    }, { session });

    // Business logic: Audit logging
    await auditLogRepository.createLog({
      actor: toActorId(adminUser),
      action: 'MEMBERSHIP_RENEWED',
      targetType: 'Membership',
      targetId: membership._id,
      details: { studentId, duration, fee }
    });

    await session.commitTransaction();
    return membership;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

## Testing

### Mocking Repositories in Tests

Create mock files in `tests/mocks/repositories/`:

```javascript
// tests/mocks/repositories/YourRepository.mock.js
export default {
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  // ... other methods
};
```

Configure Jest to use mocks in `jest.setup.js`:

```javascript
jest.mock('./src/repositories/YourRepository.js', () => ({
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    // ... other methods
  }
}));
```

### Example Test

```javascript
import { renewMembership } from '../src/services/membershipService.js';
import membershipRepository from '../src/repositories/MembershipRepository.js';

jest.mock('../src/repositories/MembershipRepository.js');

describe('Membership Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should renew membership for active student', async () => {
    membershipRepository.create.mockResolvedValue([{ _id: 'membership123' }]);

    const result = await renewMembership({
      studentId: 'student123',
      duration: 30,
      fee: 1000,
      adminUser: { _id: 'admin123' }
    });

    expect(membershipRepository.create).toHaveBeenCalledWith(
      [{ student: 'student123', duration: 30, fee: 1000 }],
      expect.any(Object)
    );
    expect(result._id).toBe('membership123');
  });
});
```

## Best Practices

1. **Keep Repositories Focused**: Each repository should handle operations for a single model
2. **Use Descriptive Method Names**: Method names should clearly indicate what they do
3. **Handle Options Consistently**: All methods should accept an options object for query options
4. **Return Promises**: All repository methods should be async and return promises
5. **Don't Duplicate Logic**: Use base repository methods when possible
6. **Document Complex Queries**: Add comments for complex query logic
7. **Test Repository Methods**: Write unit tests for custom repository methods

## Migration Guide

### Migrating from Direct Model Access

**Before**:
```javascript
import Membership from '../models/Membership.js';

export async function getActive(studentId) {
  return Membership.findOne({ student: studentId, status: 'active' });
}
```

**After**:
```javascript
import membershipRepository from '../repositories/MembershipRepository.js';

export async function getActive(studentId) {
  return membershipRepository.findOne({ student: studentId, status: 'active' });
}
```

### Handling Populate Operations

If you need populate operations, you can either:

1. Add a custom method to the repository that uses `this.model.findOne().populate()`
2. Fetch the related data separately in the service

**Option 1 - Repository Method**:
```javascript
async findWithPopulations(id) {
  return this.model.findById(id)
    .populate('student', 'name studentId')
    .populate('payment', 'amount status');
}
```

**Option 2 - Service Layer**:
```javascript
const membership = await membershipRepository.findById(id);
const student = await studentRepository.findById(membership.student);
const payment = await paymentRepository.findById(membership.paymentRef);
```

## Troubleshooting

### Common Issues

1. **Module Not Found Error**: Ensure repository is exported from `src/repositories/index.js`
2. **Method Not Found**: Check that the method exists in the repository
3. **Session Not Passed**: Ensure session is passed in options object: `{ session }`
4. **Transaction Not Working**: Verify session is started and committed/aborted correctly

### Debug Tips

1. Add console.log statements in repository methods to trace execution
2. Check that repository is properly mocked in tests
3. Verify that model imports are correct in repository files
4. Ensure base repository methods are called correctly

## References

- [Repository Pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/repository.html)
- [Mongoose Transactions](https://mongoosejs.com/docs/transactions.html)
- [Jest Mocking](https://jestjs.io/docs/mock-functions)
