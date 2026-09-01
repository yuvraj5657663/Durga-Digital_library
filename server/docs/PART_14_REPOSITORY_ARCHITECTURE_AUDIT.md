# PART 14 REPOSITORY ARCHITECTURE AUDIT

**Date:** September 1, 2026  
**Purpose:** Audit current service-to-model dependencies to plan repository pattern migration

---

## Executive Summary

The current architecture has services directly importing Mongoose models, which causes schema initialization issues in Jest's CommonJS environment. This audit identifies all direct model dependencies and proposes a repository pattern migration to unblock testing.

**Key Finding:** 8 services directly import Mongoose models, with wifiSessionService, captivePortalService, membershipService, and notificationService being the primary blockers for unit testing.

---

## Current Architecture

### Service → Model Dependencies

| Service | Direct Model Imports | Model Operations Used | Test Status |
|---------|---------------------|----------------------|-------------|
| wifiSessionService | WiFiSession, RegisteredDevice, Student, CaptivePortalSession, AuditLog | findById, findOne, create, save, find, updateMany, populate | BLOCKED |
| captivePortalService | CaptivePortalSession, Student, User, WiFiSession, AuditLog | findOne, findById, create, save, populate | BLOCKED |
| membershipService | Membership, Payment, Student, AuditLog | findById, create, save, findOne, updateOne, find, countDocuments, aggregate | BLOCKED |
| notificationService | Notification | create, find, findOneAndUpdate | BLOCKED |
| authService | User, AuditLog | create (AuditLog only) | PASSING (uses userRepository) |
| deviceService | RegisteredDevice, Student, AuditLog | findById, findOne, countDocuments, create, save, find | PASSING |
| wifiAttendanceService | Attendance, Student, AuditLog | findById, findOne, findOneAndUpdate, create | PASSING |

---

## Detailed Service Analysis

### 1. wifiSessionService.js

**Direct Model Imports:**
```javascript
import WiFiSession from '../models/WiFiSession.js';
import RegisteredDevice from '../models/RegisteredDevice.js';
import Student from '../models/Student.js';
import CaptivePortalSession from '../models/CaptivePortalSession.js';
import AuditLog from '../models/AuditLog.js';
```

**Model Operations Used:**
- `Student.findById()` - Student lookup (lines 59, 465, 606, 682, 747)
- `RegisteredDevice.findById()` - Device lookup (lines 432)
- `WiFiSession.findOne()` - Session lookup (lines 165, 353, 571, 722)
- `WiFiSession.create()` - Session creation (line 218)
- `WiFiSession.save()` - Session update (lines 174, 188, 245, 259, 408, 440, 472, 504, 529, 589, 735, 800)
- `WiFiSession.find()` - Bulk session lookup (lines 647, 845)
- `WiFiSession.updateMany()` - Bulk session update (lines 653, 851)
- `WiFiSession.populate()` - Session population (line 848)
- `AuditLog.create()` - Audit logging (lines 73, 100, 127, 263, 357, 382, 442, 474, 506, 532, 608, 684, 880)

**Business Logic:**
- Student status validation
- Membership validation (via membershipService)
- Device validation (via deviceService)
- Gateway validation
- Session lifecycle (create, validate, revoke, restore, expire)
- Token generation and validation
- Attendance integration
- Gateway authorization/deauthorization
- Audit logging

**Migration Scope:**
- Create `wifiSessionRepository.js` for WiFiSession operations
- Use existing `studentRepository.js` for Student operations
- Use existing `registeredDeviceRepository.js` for RegisteredDevice operations
- Keep AuditLog.create() in service (audit logging is business logic)

**Proposed Repository Methods:**
- `findBySessionId(sessionId)`
- `findByTokenHash(tokenHash)`
- `findActiveByDevice(deviceId)`
- `findActiveByStudent(studentId)`
- `create(sessionData)`
- `updateStatus(sessionId, status)`
- `updateLastActivity(sessionId)`
- `updateTokenHash(sessionId, tokenHash)`
- `expireOldSessions(beforeDate)`
- `revokeBySessionId(sessionId, reason)`
- `revokeAllByStudent(studentId, reason)`
- `findActiveSessions()`
- `findSessionsToExpire(beforeDate)`

---

### 2. captivePortalService.js

**Direct Model Imports:**
```javascript
import CaptivePortalSession from '../models/CaptivePortalSession.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import WiFiSession from '../models/WiFiSession.js';
import AuditLog from '../models/AuditLog.js';
```

**Model Operations Used:**
- `CaptivePortalSession.findOne()` - Portal session lookup (lines 147, 423, 478, 516)
- `CaptivePortalSession.create()` - Portal session creation (line 92)
- `CaptivePortalSession.save()` - Portal session update (lines 161, 188, 210, 238, 252, 293, 344, 375, 441, 493, 525)
- `CaptivePortalSession.populate()` - Portal session population (lines 479-481)
- `User.findOne()` - User lookup (line 202)
- `Student.findById()` - Student lookup (line 234)
- `WiFiSession.findById()` - Wi-Fi session lookup (line 433)
- `AuditLog.create()` - Audit logging (lines 107, 163, 190, 212, 240, 254, 346, 378, 444, 527)

**Business Logic:**
- Gateway validation
- Portal session lifecycle (initiate, authenticate, logout, expire)
- URL redirect protection
- Student authentication
- Wi-Fi eligibility check
- Device registration
- Wi-Fi session creation
- Gateway authorization/deauthorization (via wifiSessionService)
- Audit logging

**Migration Scope:**
- Create `captivePortalSessionRepository.js` for CaptivePortalSession operations
- Use existing `userRepository.js` for User operations
- Use existing `studentRepository.js` for Student operations
- Use `wifiSessionRepository.js` for WiFiSession operations
- Keep AuditLog.create() in service

**Proposed Repository Methods:**
- `findByPortalSessionId(portalSessionId)`
- `create(portalSessionData)`
- `updateStatus(portalSessionId, status)`
- `updateFailureReason(portalSessionId, reason)`
- `markAuthorized(portalSessionId, studentId, deviceId, wifiSessionId)`
- `markExpired(portalSessionId)`
- `markFailed(portalSessionId, reason)`
- `findPendingSessions()`
- `findExpiredSessions()`

---

### 3. membershipService.js

**Direct Model Imports:**
```javascript
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import AuditLog from '../models/AuditLog.js';
```

**Model Operations Used:**
- `Student.findById()` - Student lookup
- `Membership.create()` - Membership creation
- `Membership.save()` - Membership update
- `Membership.findOne()` - Membership lookup
- `Membership.updateOne()` - Membership update
- `Membership.find()` - Membership lookup
- `Membership.countDocuments()` - Membership count
- `Membership.aggregate()` - Membership aggregation
- `Payment.create()` - Payment creation
- `AuditLog.create()` - Audit logging

**Business Logic:**
- Membership renewal with transaction
- Membership expiration
- Membership history
- Active membership lookup
- Payment processing
- Audit logging

**Migration Scope:**
- Create `membershipRepository.js` for Membership operations
- Create `paymentRepository.js` for Payment operations
- Use existing `studentRepository.js` for Student operations
- Keep AuditLog.create() in service
- Keep transaction logic in service (business logic)

**Proposed Repository Methods:**
- `createMembership(membershipData)`
- `findById(membershipId)`
- `findByStudentId(studentId)`
- `findActiveByStudentId(studentId)`
- `updateStatus(membershipId, status)`
- `updateExpiryDate(membershipId, expiryDate)`
- `findExpiringSoon(beforeDate)`
- `countActiveByStudentId(studentId)`
- `getHistory(studentId, options)`
- `createPayment(paymentData)`
- `findPaymentById(paymentId)`
- `findPaymentsByMembershipId(membershipId)`

---

### 4. notificationService.js

**Direct Model Imports:**
```javascript
import Notification from '../models/Notification.js';
```

**Model Operations Used:**
- `Notification.create()` - Notification creation
- `Notification.find()` - Notification lookup
- `Notification.findOneAndUpdate()` - Notification update

**Business Logic:**
- Email sending (via nodemailer)
- WhatsApp sending (via global whatsappClient)
- In-app notification creation
- Notification marking as read
- Notification broadcasting
- Shift end notifications
- PDF generation (via pdfService)

**Migration Scope:**
- Create `notificationRepository.js` for Notification operations
- Create `emailTransport.js` abstraction for nodemailer
- Keep business logic in service
- Keep AuditLog.create() in service

**Proposed Repository Methods:**
- `create(notificationData)`
- `findByStudentId(studentId, options)`
- `markAsRead(notificationId)`
- `markAllAsRead(studentId)`
- `findUnreadByStudentId(studentId)`
- `broadcast(notificationData, studentIds)`

**Proposed Transport Abstraction:**
- `sendEmail(to, subject, html, text)`
- `sendWhatsApp(to, message)`

---

### 5. authService.js

**Direct Model Imports:**
```javascript
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
```

**Model Operations Used:**
- `AuditLog.create()` - Audit logging

**Current State:**
- Already uses `userRepository.js` for User operations
- Only direct model usage is AuditLog.create()

**Migration Scope:**
- No migration required for User operations
- Consider creating `auditLogRepository.js` for AuditLog operations
- Keep AuditLog.create() in service (audit logging is business logic)

**Status:** PARTIALLY MIGRATED

---

### 6. deviceService.js

**Direct Model Imports:**
```javascript
import RegisteredDevice from '../models/RegisteredDevice.js';
import Student from '../models/Student.js';
import AuditLog from '../models/AuditLog.js';
```

**Model Operations Used:**
- `Student.findById()` - Student lookup (lines 73, 227, 373, 446, 502)
- `RegisteredDevice.findOne()` - Device lookup (lines 47, 56, 247, 346, 435, 484)
- `RegisteredDevice.countDocuments()` - Device count (line 24)
- `RegisteredDevice.create()` - Device creation (line 157)
- `RegisteredDevice.save()` - Device update (lines 108, 370, 444, 500)
- `RegisteredDevice.find()` - Device lookup (line 412)
- `AuditLog.create()` - Audit logging (lines 132, 185, 261, 288, 375, 448, 504)

**Business Logic:**
- Device registration
- Device validation
- Device revocation
- Device suspension/restoration
- Device limit checking
- Student status validation
- Membership validation (via membershipService)
- Audit logging

**Migration Scope:**
- Create `registeredDeviceRepository.js` for RegisteredDevice operations
- Use existing `studentRepository.js` for Student operations
- Keep AuditLog.create() in service

**Proposed Repository Methods:**
- `findByDeviceId(deviceId)`
- `findByFingerprint(studentId, fingerprint)`
- `findByMacAddress(studentId, macAddress)`
- `findByUserAgent(studentId, userAgent)`
- `create(deviceData)`
- `updateLastSeen(deviceId)`
- `updateSecurityCheck(deviceId)`
- `updateStatus(deviceId, status)`
- `countActiveByStudentId(studentId)`
- `findByStudentId(studentId, options)`

**Status:** NOT MIGRATED (but tests pass)

---

### 7. wifiAttendanceService.js

**Direct Model Imports:**
```javascript
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import AuditLog from '../models/AuditLog.js';
```

**Model Operations Used:**
- `Student.findById()` - Student lookup (line 13)
- `Attendance.findOne()` - Attendance lookup (lines 85, 103)
- `Attendance.findOneAndUpdate()` - Attendance upsert (line 103)
- `AuditLog.create()` - Audit logging (line 137)

**Business Logic:**
- Wi-Fi eligibility check
- Attendance creation (idempotent)
- Student status validation
- Membership validation (via membershipService)
- Audit logging

**Migration Scope:**
- Create `attendanceRepository.js` for Attendance operations
- Use existing `studentRepository.js` for Student operations
- Keep AuditLog.create() in service

**Proposed Repository Methods:**
- `findByStudentAndDate(studentId, date)`
- `create(attendanceData)`
- `findOneAndUpdate(filter, update, options)`
- `findById(attendanceId)`
- `findByStudentId(studentId, options)`

**Status:** NOT MIGRATED (but tests pass)

---

## Proposed Architecture

### Service → Repository → Model

```
wifiSessionService
    ↓
wifiSessionRepository, studentRepository, registeredDeviceRepository
    ↓
WiFiSession, Student, RegisteredDevice
    ↓
MongoDB
```

```
captivePortalService
    ↓
captivePortalSessionRepository, studentRepository, userRepository, wifiSessionRepository
    ↓
CaptivePortalSession, Student, User, WiFiSession
    ↓
MongoDB
```

```
membershipService
    ↓
membershipRepository, paymentRepository, studentRepository
    ↓
Membership, Payment, Student
    ↓
MongoDB
```

```
notificationService
    ↓
notificationRepository, emailTransport
    ↓
Notification, SMTP/WhatsApp
    ↓
MongoDB, External Services
```

---

## Migration Scope

### Priority 1: Unblock Test Suites

**Repositories to Create:**
1. `wifiSessionRepository.js` - Unblocks wifiSessionService.test.js
2. `captivePortalSessionRepository.js` - Unblocks captivePortalService.test.js
3. `membershipRepository.js` - Unblocks membershipService.test.js
4. `paymentRepository.js` - Supports membershipService
5. `notificationRepository.js` - Unblocks notificationService.test.js

**Services to Refactor:**
1. wifiSessionService.js
2. captivePortalService.js
3. membershipService.js
4. notificationService.js

**Estimated Impact:**
- Unblocks 4 test suites
- ~60-70 tests
- +10-15% statements coverage

### Priority 2: Consistency

**Repositories to Create:**
1. `registeredDeviceRepository.js` - Consistency with deviceService
2. `attendanceRepository.js` - Consistency with wifiAttendanceService
3. `auditLogRepository.js` - Consistency across all services

**Services to Refactor:**
1. deviceService.js (already passes tests, but for consistency)
2. wifiAttendanceService.js (already passes tests, but for consistency)
3. All services (for AuditLog)

**Estimated Impact:**
- Better architecture consistency
- Minimal coverage impact (already tested)

---

## Risks

### 1. Business Logic Leakage

**Risk:** Moving business logic into repositories

**Mitigation:**
- Repositories only handle database operations
- Services retain all business logic (validation, authorization, rules)
- Clear separation of concerns in code review

### 2. Transaction Complexity

**Risk:** membershipService uses Mongoose transactions

**Mitigation:**
- Keep transaction logic in service
- Repository methods return Mongoose documents
- Service manages transaction lifecycle

### 3. Test Complexity

**Risk:** Repository mocking may be complex

**Mitigation:**
- Repository methods return predictable data structures
- Use simple mock implementations
- Test repositories separately

### 4. Performance Impact

**Risk:** Additional abstraction layer may impact performance

**Mitigation:**
- Repository methods are thin wrappers
- No additional database queries
- Profile before/after migration

### 5. Breaking Changes

**Risk:** API contracts may break during migration

**Mitigation:**
- Preserve all existing API contracts
- Run existing tests after each migration
- Incremental migration with rollback capability

---

## Compatibility Strategy

### 1. Incremental Migration

**Approach:**
- Migrate one service at a time
- Run tests after each migration
- Rollback if tests fail

**Order:**
1. wifiSessionRepository + wifiSessionService
2. captivePortalSessionRepository + captivePortalService
3. membershipRepository + paymentRepository + membershipService
4. notificationRepository + notificationService

### 2. Backward Compatibility

**Approach:**
- Keep existing function signatures
- Keep existing return structures
- Keep existing error codes

**Verification:**
- Run existing test suite
- Run integration tests
- Manual testing of critical paths

### 3. Test Compatibility

**Approach:**
- Refactor tests to mock repositories
- Keep test logic unchanged
- Add repository tests

**Verification:**
- All existing tests pass
- New repository tests pass
- Coverage increases

---

## Existing Repositories

The project already has some repositories:

**Existing:**
- `BaseRepository.js` - Base repository class
- `MembershipRepository.js` - Membership repository
- `StudentRepository.js` - Student repository
- `UserRepository.js` - User repository

**Analysis:**
- authService already uses UserRepository ✓
- membershipService already uses MembershipRepository ✓
- But membershipService still directly imports Membership model ✗
- StudentRepository exists but services still directly import Student model ✗

**Conclusion:**
- Repository pattern is partially implemented
- Need to complete migration
- Need to ensure services use repositories consistently

---

## Migration Plan

### Phase 1: Create Missing Repositories

1. `wifiSessionRepository.js`
2. `captivePortalSessionRepository.js`
3. `paymentRepository.js`
4. `notificationRepository.js`
5. `registeredDeviceRepository.js`
6. `attendanceRepository.js`
7. `auditLogRepository.js`

### Phase 2: Refactor Services

1. wifiSessionService.js → use wifiSessionRepository
2. captivePortalService.js → use captivePortalSessionRepository
3. membershipService.js → use membershipRepository + paymentRepository
4. notificationService.js → use notificationRepository
5. deviceService.js → use registeredDeviceRepository
6. wifiAttendanceService.js → use attendanceRepository

### Phase 3: Refactor Tests

1. wifiSessionService.test.js → mock repositories
2. captivePortalService.test.js → mock repositories
3. membershipService.test.js → mock repositories
4. notificationService.test.js → mock repositories

### Phase 4: Verification

1. Run full test suite
2. Run coverage report
3. Verify database safety
4. Verify security
5. Verify backward compatibility

---

## Conclusion

The repository pattern migration is feasible and necessary to unblock the Mongoose-dependent test suites. The project already has partial repository implementation, so this is a completion of existing architecture rather than a wholesale rewrite.

**Key Points:**
- 8 services directly import Mongoose models
- 4 services are blocked for testing (wifiSessionService, captivePortalService, membershipService, notificationService)
- 7 new repositories need to be created
- 6 services need to be refactored
- Estimated impact: +10-15% statements coverage, ~60-70 tests unblocked

**Next Step:** Begin Phase 1 - Create missing repositories

---

**Audit Completed:** September 1, 2026  
**Next Phase:** Create repositories directory and repository files
