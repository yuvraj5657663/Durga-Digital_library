# Gateway Failure Scenarios

**Date:** August 31, 2026  
**PART:** 10 - External Gateway Selection, Lab Setup & Physical Integration Contract

---

## Overview

This document defines the behavior for various failure scenarios in the gateway integration. It ensures that the system fails safely and maintains security even when components are unavailable or malfunctioning.

---

## Failure Scenarios

### 1. Gateway Unavailable

**Scenario:** Physical gateway is unreachable (network outage, power failure, hardware failure)

**Detection:**
- Gateway API calls timeout
- Gateway connectivity check fails
- Gateway status returns offline

**Behavior:**
- New authentication attempts fail with `GATEWAY_UNAVAILABLE`
- Existing sessions follow gateway's local session policy
- Backend logs gateway unavailability
- Admin alert triggered (if configured)

**Response:**
```json
{
  "success": false,
  "authorized": false,
  "code": "GATEWAY_UNAVAILABLE",
  "message": "Gateway is unreachable"
}
```

**Do NOT:**
- Grant network access without gateway authorization
- Assume gateway is working
- Bypass gateway authorization

**Do:**
- Fail closed for new authentication
- Preserve existing session history
- Log the failure
- Alert administrators

---

### 2. Backend Unavailable

**Scenario:** Backend is unreachable (server outage, network failure, database failure)

**Detection:**
- Gateway cannot reach backend API
- Backend API calls timeout
- Backend returns 5xx errors

**Gateway Behavior:**
- Fail closed for new authentication
- Existing sessions follow gateway's local session policy
- Gateway logs backend unavailability
- Gateway may have local fallback policy (if configured)

**Backend Behavior:**
- Return `GATEWAY_UNAVAILABLE` or `SYSTEM_ERROR`
- Log the failure
- Alert administrators

**Response:**
```json
{
  "success": false,
  "code": "SYSTEM_ERROR",
  "message": "Backend is unavailable"
}
```

**Do NOT:**
- Gateway should not grant access without backend authorization
- Gateway should not fall back to open access

**Do:**
- Gateway should fail closed
- Preserve existing sessions according to gateway policy
- Log the failure

---

### 3. Membership Expires

**Scenario:** Student's membership expires while session is active

**Detection:**
- Membership expiration cron job
- Session validation detects expired membership
- Manual membership expiration by admin

**Behavior:**
```
1. Membership expiration detected
2. Backend marks membership as expired
3. Backend revokes all active Wi-Fi sessions for student
4. Backend calls gatewayService.deauthorizeClient() for each session
5. Gateway removes network authorization
6. Client loses Internet access
7. Audit log created
```

**Response:**
```json
{
  "success": true,
  "revokedCount": 2,
  "reason": "membership_expired"
}
```

**Do NOT:**
- Allow expired membership to continue accessing network
- Ignore membership expiration

**Do:**
- Revoke all sessions immediately
- Deauthorize gateway clients
- Log the revocation

---

### 4. Device Revoked

**Scenario:** Device is revoked by admin

**Detection:**
- Admin revokes device through admin panel
- Device status changed to revoked

**Behavior:**
```
1. Device revoked by admin
2. Backend marks device as revoked
3. Backend revokes all active Wi-Fi sessions for device
4. Backend calls gatewayService.deauthorizeClient() for each session
5. Gateway removes network authorization
6. Client loses Internet access
7. Audit log created
```

**Response:**
```json
{
  "success": true,
  "revokedCount": 1,
  "reason": "device_revoked"
}
```

**Do NOT:**
- Allow revoked device to continue accessing network
- Ignore device revocation

**Do:**
- Revoke all sessions immediately
- Deauthorize gateway clients
- Log the revocation

---

### 5. Gateway Authorization Fails

**Scenario:** Gateway returns authorization failure

**Detection:**
- Gateway API returns authorization failure
- Gateway returns error code
- Gateway API call times out

**Behavior:**
```
1. Backend calls gatewayService.authorizeClient()
2. Gateway returns failure
3. Backend revokes Wi-Fi session
4. Portal session marked as failed
5. Network access NOT granted
6. Error logged with gateway code
7. Client sees access denied
```

**Response:**
```json
{
  "success": false,
  "authorized": false,
  "code": "GATEWAY_AUTHORIZATION_FAILED",
  "message": "Gateway authorization failed"
}
```

**Do NOT:**
- Report `authorized = true` when gateway authorization failed
- Grant network access without gateway authorization
- Hide gateway authorization failure from user

**Do:**
- Revoke Wi-Fi session
- Mark portal session as failed
- Log the failure with gateway code
- Show access denied to user

---

### 6. Gateway Deauthorization Fails

**Scenario:** Gateway returns deauthorization failure

**Detection:**
- Gateway API returns deauthorization failure
- Gateway returns error code
- Gateway API call times out

**Behavior:**
```
1. Backend calls gatewayService.deauthorizeClient()
2. Gateway returns failure
3. Backend logs the failure
4. Backend continues with session revocation in database
5. Session history preserved
6. Audit log created with failure reason
7. Retry according to safe retry policy
```

**Response:**
```json
{
  "success": false,
  "deauthorized": false,
  "code": "CLIENT_DEAUTHORIZATION_FAILED",
  "message": "Gateway deauthorization failed"
}
```

**Do NOT:**
- Delete session history
- Panic or crash
- Block session revocation in database

**Do:**
- Log the failure
- Preserve session history
- Continue with database revocation
- Implement safe retry policy
- Alert administrators if repeated failures

**Safe Retry Policy:**
- Retry up to 3 times with exponential backoff
- Do not retry indefinitely
- Alert after final retry failure

---

### 7. Session Expired

**Scenario:** Wi-Fi session expires (timeout reached)

**Detection:**
- Cron job checks for expired sessions
- Session validation detects expired session

**Behavior:**
```
1. Cron job detects expired session
2. Backend marks session as expired in database
3. Backend calls gatewayService.deauthorizeClient()
4. Gateway removes network authorization
5. Client loses Internet access
6. Audit log created
```

**Response:**
```json
{
  "success": true,
  "expiredCount": 5,
  "timestamp": "2026-08-31T18:00:00Z"
}
```

**Do NOT:**
- Allow expired session to continue accessing network
- Ignore session expiration

**Do:**
- Revoke session immediately
- Deauthorize gateway client
- Log the expiration

---

### 8. Gateway Authentication Failed

**Scenario:** Gateway fails to authenticate to backend (invalid credentials, signature mismatch)

**Detection:**
- Gateway API returns authentication failure
- Signature validation fails
- Timestamp validation fails
- API key validation fails

**Behavior:**
```
1. Gateway makes request to backend
2. Backend validates gateway authentication
3. Authentication validation fails
4. Backend returns authentication failure
5. Gateway logs authentication failure
6. Gateway may retry with fresh credentials
7. Admin alert triggered (if configured)
```

**Response:**
```json
{
  "success": false,
  "code": "GATEWAY_AUTHENTICATION_FAILED",
  "message": "Gateway authentication failed"
}
```

**Do NOT:**
- Process request from unauthenticated gateway
- Bypass gateway authentication

**Do:**
- Reject request
- Log the failure
- Alert administrators
- Support credential rotation

---

### 9. Replay Attack Detected

**Scenario:** Duplicate request with same timestamp and signature detected

**Detection:**
- Backend detects duplicate nonce/timestamp
- Backend detects duplicate request ID

**Behavior:**
```
1. Gateway makes request to backend
2. Backend detects replay attack
3. Backend rejects request
4. Backend logs replay attack
5. Admin alert triggered (if configured)
6. Gateway logs rejection
```

**Response:**
```json
{
  "success": false,
  "code": "REPLAY_DETECTED",
  "message": "Replay attack detected"
}
```

**Do NOT:**
- Process replayed request
- Ignore replay detection

**Do:**
- Reject request
- Log the attack
- Alert administrators
- Investigate potential compromise

---

### 10. Rate Limit Exceeded

**Scenario:** Gateway exceeds rate limit

**Detection:**
- Backend detects too many requests from gateway
- Per-gateway rate limit exceeded

**Behavior:**
```
1. Gateway makes request to backend
2. Backend detects rate limit exceeded
3. Backend returns rate limit error
4. Gateway logs rate limit error
5. Gateway implements backoff
```

**Response:**
```json
{
  "success": false,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded",
  "retryAfter": 60
}
```

**Do NOT:**
- Process request when rate limit exceeded
- Ignore rate limiting

**Do:**
- Reject request
- Return retry-after header
- Gateway implements backoff
- Log the rate limit event

---

### 11. Database Failure

**Scenario:** Database is unavailable during gateway operation

**Detection:**
- Database connection fails
- Database query times out
- Database returns error

**Behavior:**
```
1. Gateway makes request to backend
2. Backend attempts database operation
3. Database operation fails
4. Backend returns system error
5. Gateway logs error
6. Backend logs error
7. Admin alert triggered (if configured)
```

**Response:**
```json
{
  "success": false,
  "code": "SYSTEM_ERROR",
  "message": "Database operation failed"
}
```

**Do NOT:**
- Assume database operation succeeded
- Grant access without database validation

**Do:**
- Return system error
- Log the failure
- Alert administrators
- Implement database retry logic

---

### 12. Network Partition

**Scenario:** Network partition between gateway and backend

**Detection:**
- Gateway cannot reach backend
- Backend cannot reach gateway
- Network connectivity lost

**Behavior:**
```
Gateway Side:
1. Gateway detects backend unavailable
2. Gateway fails closed for new authentication
3. Existing sessions follow gateway's local policy
4. Gateway logs network partition

Backend Side:
1. Backend detects gateway unavailable
2. Backend marks gateway as offline
3. Backend logs network partition
4. Admin alert triggered
```

**Response:**
```json
{
  "success": false,
  "code": "GATEWAY_UNAVAILABLE",
  "message": "Network partition detected"
}
```

**Do NOT:**
- Grant access without backend validation
- Assume network is working

**Do:**
- Fail closed
- Log the partition
- Alert administrators
- Restore when network recovers

---

### 13. Gateway Configuration Error

**Scenario:** Gateway has invalid configuration

**Detection:**
- Gateway API returns configuration error
- Gateway validation fails
- Configuration mismatch detected

**Behavior:**
```
1. Gateway operation detected
2. Backend validates gateway configuration
3. Configuration validation fails
4. Backend returns configuration error
5. Gateway logs configuration error
6. Admin alert triggered
```

**Response:**
```json
{
  "success": false,
  "code": "GATEWAY_CONFIGURATION_ERROR",
  "message": "Gateway configuration error"
}
```

**Do NOT:**
- Proceed with invalid configuration
- Ignore configuration errors

**Do:**
- Reject operation
- Log the error
- Alert administrators
- Require configuration fix

---

### 14. Concurrent Session Limit Exceeded

**Scenario:** Student exceeds maximum concurrent session limit

**Detection:**
- Session creation detects limit exceeded
- Device limit check fails

**Behavior:**
```
1. Student attempts authentication
2. Backend checks device limit
3. Limit exceeded detected
4. Backend returns limit exceeded error
5. Gateway denies access
6. Student sees error message
```

**Response:**
```json
{
  "success": false,
  "code": "DEVICE_LIMIT_EXCEEDED",
  "message": "Maximum device limit exceeded"
}
```

**Do NOT:**
- Allow limit to be exceeded
- Grant access beyond limit

**Do:**
- Reject authentication
- Log the limit event
- Show error to student
- Allow device management (remove old device)

---

### 15. Student Account Inactive

**Scenario:** Student account is inactive

**Detection:**
- Authentication detects inactive student
- Student status check fails

**Behavior:**
```
1. Student attempts authentication
2. Backend checks student status
3. Student inactive detected
4. Backend returns inactive error
5. Gateway denies access
6. Student sees error message
```

**Response:**
```json
{
  "success": false,
  "code": "STUDENT_INACTIVE",
  "message": "Student account is inactive"
}
```

**Do NOT:**
- Allow inactive student to authenticate
- Ignore student status

**Do:**
- Reject authentication
- Log the event
- Show error to student
- Contact library staff

---

## Failure Recovery

### Automatic Recovery

**Scenarios with automatic recovery:**
- Network partition (when network recovers)
- Temporary database failure (when database recovers)
- Temporary backend failure (when backend recovers)
- Rate limit exceeded (after retry-after period)

**Recovery Behavior:**
- System automatically resumes normal operation
- No manual intervention required
- Recovery logged

### Manual Recovery

**Scenarios requiring manual recovery:**
- Gateway hardware failure
- Gateway configuration error
- Gateway authentication failure (credential issue)
- Replay attack (security incident)
- Membership expiration (requires renewal)
- Device revocation (requires admin action)

**Recovery Behavior:**
- Manual intervention required
- Admin alerted
- Recovery logged

---

## Monitoring and Alerting

### Metrics to Monitor

- Gateway availability (uptime)
- Gateway API latency
- Gateway authorization success rate
- Gateway deauthorization success rate
- Backend availability
- Database availability
- Network connectivity
- Authentication failure rate
- Rate limit events
- Replay attack attempts

### Alert Thresholds

**Critical Alerts:**
- Gateway down for > 5 minutes
- Backend down for > 5 minutes
- Database down for > 5 minutes
- Replay attack detected
- Gateway authentication failure
- Authorization failure rate > 10%

**Warning Alerts:**
- Gateway API latency > 1 second
- Rate limit events increasing
- Deauthorization failure rate > 5%

---

## Conclusion

This failure scenario document ensures that the system fails safely and maintains security even when components are unavailable or malfunctioning. All failure scenarios are designed to fail closed, preserve security, and provide clear error reporting.

**Status:** FAILURE SCENARIOS DEFINED  
**Next Step:** Implement monitoring and alerting for production deployment.
