# Backend Load Considerations

**Date:** August 31, 2026  
**PART:** 10 - External Gateway Selection, Lab Setup & Physical Integration Contract

---

## Overview

This document reviews the existing backend architecture for Wi-Fi traffic and identifies load considerations for gateway integration. The goal is to ensure the backend can handle the expected load from Wi-Fi authentication and session management.

**Status:** BACKEND LOAD REVIEW COMPLETE

---

## Current Backend Architecture

### Technology Stack

- **Backend:** Node.js with Express
- **Database:** MongoDB
- **Authentication:** JWT tokens
- **Session Management:** In-memory + Database
- **Cron Jobs:** For session expiration

### Existing Services

- Student service
- Membership service
- Device service
- Wi-Fi session service
- Captive portal service
- Gateway service
- Attendance service
- Audit log service

---

## Load Analysis

### 1. Authentication Rate Limiting

**Current Status:** IMPLEMENTED

**Implementation:**
- Rate limiting middleware configured in `config/index.js`
- Window: 15 minutes (configurable via `RATE_LIMIT_WINDOW_MS`)
- Max requests: 100 (configurable via `RATE_LIMIT_MAX_REQUESTS`)

**Considerations:**
- Current rate limiting is global, not per-gateway
- May need per-gateway rate limiting for production
- May need per-IP rate limiting for captive portal

**Recommendation:**
- Implement per-gateway rate limiting
- Implement per-IP rate limiting for captive portal
- Adjust rate limits based on measured load

---

### 2. Session Validation Rate

**Current Status:** IMPLEMENTED

**Implementation:**
- Session validation in `wifiSessionService.validateWiFiSession()`
- JWT token validation
- Session status check
- Device status check
- Membership status check

**Considerations:**
- Session validation is called on each API request
- Gateway may call session validation frequently
- Database queries for each validation

**Recommendation:**
- Implement session caching (Redis) to reduce database load
- Cache session validation results for short duration (e.g., 1 minute)
- Monitor session validation rate

---

### 3. Database Indexes

**Current Status:** REVIEWED

**Existing Indexes:**
- Student: `studentId`, `status`, `normalizedMobile`
- Membership: `student`, `status`, `startDate`, `endDate`
- RegisteredDevice: `deviceId`, `student`, `status`
- WiFiSession: `sessionId`, `student`, `device`, `status`, `expiresAt`
- CaptivePortalSession: `portalSessionId`, `student`, `status`, `expiresAt`
- Attendance: `student`, `date`, `method`

**Considerations:**
- Existing indexes are appropriate for current load
- May need additional indexes for gateway-related queries
- May need compound indexes for common query patterns

**Recommendation:**
- Add compound index on WiFiSession: `{ status: 1, expiresAt: 1 }` for expiration queries
- Add compound index on WiFiSession: `{ student: 1, status: 1 }` for student session queries
- Monitor query performance after gateway deployment
- Add indexes as needed based on query patterns

---

### 4. MongoDB Connection Pool

**Current Status:** CONFIGURED

**Implementation:**
- MongoDB connection via Mongoose
- Default connection pool size (Mongoose default: 10)
- Connection string configured in `MONGODB_URI`

**Considerations:**
- Default pool size may be insufficient for high concurrency
- Gateway integration may increase concurrent connections
- Need to monitor connection pool usage

**Recommendation:**
- Configure connection pool size based on expected load
- Monitor connection pool metrics
- Increase pool size if connection wait time is high
- Typical pool size: 50-100 for moderate load

---

### 5. Redis Usage

**Current Status:** NOT IMPLEMENTED

**Considerations:**
- No Redis currently used
- Session caching would benefit from Redis
- Rate limiting could use Redis for distributed scenarios
- Gateway session state could be cached in Redis

**Recommendation:**
- Consider implementing Redis for session caching
- Consider implementing Redis for rate limiting
- Consider implementing Redis for gateway session state
- Evaluate Redis deployment (single instance vs cluster)

---

### 6. Logging Volume

**Current Status:** REVIEWED

**Implementation:**
- Winston logger configured in `logger.js`
- Log levels: error, warn, info, debug
- Audit logs stored in MongoDB (AuditLog collection)

**Considerations:**
- Gateway integration will increase log volume
- Audit logs for every gateway operation
- May need log rotation
- May need log aggregation

**Recommendation:**
- Implement log rotation
- Consider log aggregation (ELK stack, Graylog)
- Monitor log storage growth
- Archive old audit logs

---

### 7. Cron Jobs

**Current Status:** IMPLEMENTED

**Existing Cron Jobs:**
- Membership expiration check
- Membership renewal reminder
- Shift notification
- Wi-Fi session expiration (expireOldSessions)

**Considerations:**
- Wi-Fi session expiration cron job queries all expired sessions
- May be slow with many sessions
- May need optimization for large datasets

**Recommendation:**
- Optimize session expiration query with indexes
- Consider batching for large datasets
- Monitor cron job execution time
- Consider moving to background job queue (Bull, Agenda)

---

### 8. API Latency

**Current Status:** UNKNOWN / TO BE MEASURED

**Considerations:**
- Current API latency unknown
- Gateway integration may increase latency
- Need baseline measurements
- Need to monitor after gateway deployment

**Recommendation:**
- Implement API latency monitoring
- Measure baseline latency before gateway deployment
- Monitor latency after gateway deployment
- Set alert thresholds (e.g., > 2 seconds)

---

### 9. Concurrent Authentication

**Current Status:** HANDLED

**Implementation:**
- Authentication is stateless (JWT)
- No session locks
- Database handles concurrent writes

**Considerations:**
- Concurrent authentication may cause race conditions
- Device limit check may have race condition
- Duplicate attendance protection needed

**Recommendation:**
- Implement database transactions for critical operations
- Implement optimistic locking for device limit check
- Implement idempotency for attendance creation
- Monitor for race conditions

---

### 10. Duplicate Attendance Protection

**Current Status:** IMPLEMENTED

**Implementation:**
- Attendance creation checks for existing attendance
- Check based on student ID, date, and method
- Prevents duplicate attendance for same day

**Considerations:**
- Wi-Fi attendance may have rapid successive attempts
- Need to ensure idempotency

**Recommendation:**
- Verify duplicate attendance protection for Wi-Fi
- Implement idempotency key for attendance creation
- Monitor for duplicate attendance attempts

---

## Gateway-Specific Load Considerations

### Gateway-to-Backend API Calls

**Expected Load:**
- Authentication requests (when student authenticates)
- Session validation requests (periodic or on-demand)
- Authorization requests (when backend authorizes client)
- Deauthorization requests (when session expires/revoked)

**Load Estimation:**
- Authentication: 1 per student per session (low frequency)
- Session validation: 1 per session per hour (medium frequency)
- Authorization: 1 per session (low frequency)
- Deauthorization: 1 per session expiration (low frequency)

**Recommendation:**
- Monitor gateway API call rate
- Implement rate limiting for gateway API calls
- Cache session validation results
- Batch deauthorization requests if possible

---

### Backend-to-Gateway API Calls

**Expected Load:**
- Authorization requests (when student authenticates)
- Deauthorization requests (when session expires/revoked)
- Status queries (periodic health checks)

**Load Estimation:**
- Authorization: 1 per session (low frequency)
- Deauthorization: 1 per session expiration (low frequency)
- Status queries: 1 per minute (low frequency)

**Recommendation:**
- Implement retry logic for gateway API calls
- Implement timeout for gateway API calls
- Monitor gateway API call latency
- Implement circuit breaker for gateway API failures

---

## Polling Considerations

### Current Polling

**Status:** NO UNNECESSARY POLLING

**Analysis:**
- Backend does not poll gateway continuously
- Gateway does not poll backend continuously
- Communication is event-driven (authentication, authorization, deauthorization)

**Recommendation:**
- Do not introduce polling
- Keep communication event-driven
- Use webhooks if gateway supports (future enhancement)

---

## Scaling Recommendations

### Vertical Scaling

**Backend Server:**
- Increase CPU cores if CPU utilization > 70%
- Increase RAM if memory utilization > 80%
- Increase storage if database growth requires

**Database:**
- Consider MongoDB Atlas for managed scaling
- Consider read replicas for read-heavy workloads
- Consider sharding for very large datasets

### Horizontal Scaling

**Backend:**
- Add additional backend servers if load exceeds capacity
- Use load balancer to distribute requests
- Implement session sharing (Redis or database)

**Gateway:**
- Gateway is single point of failure (acceptable for small library)
- Consider gateway clustering for large deployments (future)

---

## Monitoring Recommendations

### Metrics to Monitor

- API response time
- API error rate
- Database query time
- Database connection pool usage
- Gateway API call rate
- Gateway API call latency
- Gateway API call error rate
- Concurrent sessions
- Authentication rate
- Session validation rate

### Alert Thresholds

**Critical Alerts:**
- API response time > 5 seconds
- API error rate > 5%
- Database query time > 2 seconds
- Database connection pool > 90%
- Gateway API call error rate > 10%

**Warning Alerts:**
- API response time > 2 seconds
- API error rate > 1%
- Database query time > 1 second
- Database connection pool > 70%
- Gateway API call error rate > 5%

---

## Load Testing Recommendations

### Test Scenarios

- 10 concurrent authentications
- 50 concurrent authentications
- 100 concurrent authentications
- 1000 active sessions
- Session expiration with 1000 sessions
- Gateway API call latency under load

### Test Metrics

- API response time
- API error rate
- Database query time
- Database connection pool usage
- CPU utilization
- RAM utilization

### Test Schedule

- Perform load testing before gateway deployment
- Perform load testing after gateway deployment
- Perform load testing periodically (quarterly)

---

## Conclusion

The existing backend architecture is generally well-designed for Wi-Fi traffic. The main areas for improvement are:

1. **Redis Caching:** Implement Redis for session caching and rate limiting
2. **Database Indexes:** Add compound indexes for gateway-related queries
3. **Connection Pool:** Configure appropriate connection pool size
4. **Monitoring:** Implement comprehensive monitoring and alerting
5. **Load Testing:** Perform load testing before and after gateway deployment

**Status:** BACKEND LOAD REVIEW COMPLETE  
**Next Step:** Implement recommendations before gateway deployment.

**IMPORTANT:** Do not introduce unnecessary polling. The gateway should enforce network access locally. Backend should manage identity/session authorization.
