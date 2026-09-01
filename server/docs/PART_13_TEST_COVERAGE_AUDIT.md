# PART 13 TEST COVERAGE AUDIT

**Date:** August 31, 2026  
**Purpose:** Audit services for testability without requiring Mongoose model initialization

---

## Executive Summary

After inspecting the actual repository code, the priority services have different testability profiles. Two services (membershipService, notificationService) directly import Mongoose models and are blocked by the same architectural issue affecting wifiSessionService and captivePortalService. Two services (pdfService, qrService) do not import models and are fully testable. Several utility modules are also testable.

---

## Service Analysis

### 1. membershipService.js

**Current Coverage:** 0% statements

**Dependencies:**
```javascript
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Membership from '../models/Membership.js';  // MONGOOSE MODEL
import Payment from '../models/Payment.js';       // MONGOOSE MODEL
import Student from '../models/Student.js';       // MONGOOSE MODEL
import AuditLog from '../models/AuditLog.js';     // MONGOOSE MODEL
import * as notifService from './notificationService.js';
import studentRepository from '../repositories/StudentRepository.js';
import membershipRepository from '../repositories/MembershipRepository.js';
import logger from '../config/logger.js';
import { toActorId } from '../utils/actorId.js';
```

**Functions:**
- `renew()` - Creates membership with transaction
- `expireStale()` - Expires outdated memberships
- `findExpiringSoon()` - Delegates to repository
- `getHistory()` - Delegates to repository
- `getActive()` - Delegates to repository

**Testability:** ❌ NOT TESTABLE

**Blocker:** Direct Mongoose model imports (Membership, Payment, Student, AuditLog) trigger schema initialization in Jest's CommonJS environment.

**Mocking Strategy:** Would require mocking all 4 Mongoose models + repositories + notificationService + logger + actorId + uuid + mongoose sessions. Even with comprehensive mocking, the models load before mocks can be applied.

**Planned Tests:** DEFERRED - Requires architectural change (repository pattern or Jest ESM migration)

**Risks:** Same as wifiSessionService.test.js and captivePortalService.test.js

---

### 2. notificationService.js

**Current Coverage:** 1.04% statements

**Dependencies:**
```javascript
import nodemailer from 'nodemailer';
import Notification from '../models/Notification.js';  // MONGOOSE MODEL
import config from '../config/index.js';
import logger from '../config/logger.js';
import { generateAdmissionReceipt } from './pdfService.js';
import { hasShiftEnded, getShiftEndTime, SHIFT_CONFIG } from '../config/shiftConfig.js';
```

**Functions:**
- `sendEmail()` - Sends email via nodemailer
- `sendWhatsApp()` - Sends WhatsApp via global client
- `send()` - Main notification function
- `sendRenewalReminder()` - Membership expiry reminder
- `sendMembershipActivated()` - Admission confirmation
- `markRead()` - Mark notifications as read
- `getForStudent()` - Get student notifications
- `broadcast()` - Broadcast to all
- `sendShiftEndNotification()` - Shift end reminder
- `checkAndSendShiftEndNotifications()` - Batch shift end notifications

**Testability:** ❌ NOT TESTABLE

**Blocker:** 
1. Direct Mongoose model import (Notification)
2. nodemailer transporter created at module load time
3. Global whatsappClient dependency

**Mocking Strategy:** Would require mocking Notification model + nodemailer + pdfService + config + logger + shiftConfig + global whatsappClient.

**Planned Tests:** DEFERRED - Requires architectural change

**Risks:** 
- Mongoose schema initialization issue
- Module-level side effects (nodemailer transporter creation)
- Global state (whatsappClient)

---

### 3. pdfService.js

**Current Coverage:** 0% statements

**Dependencies:**
```javascript
import PDFDocument from 'pdfkit';
import { toBuffer as qrToBuffer } from './qrService.js';
```

**Functions:**
- `generateAdmissionReceipt()` - Generates admission receipt PDF
- `generateRenewalReceipt()` - Generates renewal receipt PDF
- `generateStudentIdCard()` - Generates student ID card PDF

**Testability:** ✅ FULLY TESTABLE

**Why Testable:**
- No Mongoose model imports
- No database dependencies
- No external API calls
- Pure PDF generation logic
- Only dependency is qrService (also testable)

**Mocking Strategy:**
- Mock qrService.toBuffer for QR code generation
- Test PDF generation with real PDFKit (safe, no side effects)
- Verify PDF buffer output

**Planned Tests:**
1. PDF generation succeeds with valid data
2. Required fields handled correctly
3. Missing optional fields
4. Invalid input
5. Student receipt generation
6. Amount/fee formatting
7. Date formatting
8. Filename generation
9. PDF buffer/file result is valid
10. Error handling
11. Empty/null data handling
12. Special characters in student names
13. Long student names
14. Large/edge-case amounts
15. No sensitive data accidentally logged

**Risks:** Low - Pure PDF generation, no side effects

---

### 4. qrService.js

**Current Coverage:** 0% statements

**Dependencies:**
```javascript
import QRCode from 'qrcode';
import config from '../config/index.js';
```

**Functions:**
- `toDataURL()` - Generate QR code as data URL
- `toBuffer()` - Generate QR code as buffer
- `buildStudentQrPayload()` - Build student QR payload
- `buildAttendanceQrPayload()` - Build attendance QR payload

**Testability:** ✅ FULLY TESTABLE

**Why Testable:**
- No Mongoose model imports
- No database dependencies
- No external API calls
- Pure QR code generation logic
- Only dependency is config (already mapped to test version)

**Mocking Strategy:**
- Mock QRCode library or use real QRCode (safe, no side effects)
- Test with real QRCode for actual QR generation verification

**Planned Tests:**
1. QR generation with valid input
2. Empty input
3. Invalid input
4. Student identifier encoding
5. QR payload structure
6. Token generation if applicable
7. Expiration if applicable
8. Signature validation if applicable
9. Invalid/tampered payload
10. QR parsing/decoding if implemented
11. Error handling
12. Generated output type/format
13. No sensitive information unnecessarily embedded
14. Replay/expiration handling if implemented

**Risks:** Low - Pure QR generation, no side effects

---

## Additional Pure Services

### 5. errors.js

**Current Coverage:** 46.66% statements

**Dependencies:** None (pure utility)

**Exports:**
- `AppError` class
- `ValidationError` class
- `AuthenticationError` class
- `AuthorizationError` class
- `NotFoundError` class
- `ConflictError` class
- `RateLimitError` class
- `asyncHandler` function

**Testability:** ✅ FULLY TESTABLE

**Why Testable:** Pure utility with no external dependencies

**Planned Tests:**
1. Error class instantiation
2. Error properties (statusCode, code, isOperational)
3. Error message handling
4. asyncHandler wraps and catches errors
5. Error stack trace preservation

**Risks:** None

---

### 6. response.js

**Current Coverage:** 0% statements

**Dependencies:** None (pure utility)

**Exports:**
- `successResponse()` function
- `errorResponse()` function
- `paginatedResponse()` function

**Testability:** ✅ FULLY TESTABLE

**Why Testable:** Pure utility with no external dependencies

**Planned Tests:**
1. successResponse returns correct structure
2. errorResponse returns correct structure
3. paginatedResponse returns correct structure
4. Default values for optional parameters
5. Pagination calculation

**Risks:** None

---

## Summary Table

| Service | Coverage | Testability | Blocker | Priority |
|---------|----------|-------------|---------|----------|
| membershipService | 0% | ❌ NOT TESTABLE | Mongoose models | HIGH (deferred) |
| notificationService | 1.04% | ❌ NOT TESTABLE | Mongoose models + nodemailer | HIGH (deferred) |
| pdfService | 0% | ✅ TESTABLE | None | HIGH |
| qrService | 0% | ✅ TESTABLE | None | HIGH |
| errors.js | 46.66% | ✅ TESTABLE | None | MEDIUM |
| response.js | 0% | ✅ TESTABLE | None | MEDIUM |

---

## Recommendations

### Immediate (PART 13)

1. **Create tests for pdfService** - Fully testable, high value
2. **Create tests for qrService** - Fully testable, high value
3. **Create tests for errors.js** - Pure utility, easy win
4. **Create tests for response.js** - Pure utility, easy win

### Deferred (Requires Architectural Change)

1. **membershipService** - Blocked by Mongoose model imports
2. **notificationService** - Blocked by Mongoose model imports + module-level side effects

### Architectural Change Required

To test membershipService and notificationService, one of the following is needed:

1. **Repository Pattern** - Refactor services to use repositories exclusively, mock repositories instead of models
2. **Jest ESM Migration** - Update Jest to run in ESM mode to support Mongoose schema initialization
3. **Separate Integration Framework** - Use Mocha with native ESM for integration tests requiring real database

---

## Coverage Impact

**If we test pdfService, qrService, errors.js, response.js:**
- Estimated new tests: ~40-50 tests
- Estimated coverage increase: +5-8% statements
- These services are pure logic with no database dependencies

**If we could test membershipService and notificationService:**
- Estimated new tests: ~30-40 tests
- Estimated coverage increase: +10-15% statements
- These services have significant business logic

---

## Conclusion

PART 13 should focus on the testable services (pdfService, qrService, errors.js, response.js) to achieve meaningful coverage improvements without attempting complex architectural changes. The blocked services (membershipService, notificationService) should remain documented as requiring the same architectural fix as wifiSessionService and captivePortalService.

---

**Audit Completed:** August 31, 2026  
**Next Phase:** Create tests for pdfService and qrService
