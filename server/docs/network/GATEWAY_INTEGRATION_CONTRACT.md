# Gateway Integration Contract

**Date:** August 31, 2026  
**PART:** 10 - External Gateway Selection, Lab Setup & Physical Integration Contract

---

## Overview

This document defines the integration contract between the physical gateway and the Durga Digital Library backend. It specifies the exact API endpoints, request/response structures, error codes, and security requirements for gateway-to-backend communication.

**Status:** CONTRACT DEFINITION - Awaiting physical gateway deployment

---

## Architecture

### Communication Flow

```
Physical Gateway
       ↓
   HTTPS (TLS)
       ↓
Backend API
       ↓
GatewayService
       ↓
GatewayAdapter
       ↓
Vendor-Specific API
```

### Direction of Communication

**Gateway → Backend:**
- External authentication requests
- Session validation requests
- Session restoration requests

**Backend → Gateway:**
- Client authorization requests
- Client deauthorization requests
- Gateway status queries

---

## Backend API Endpoints

### 1. Network Authentication

**Endpoint:** `POST /api/v1/network/authenticate`

**Purpose:** Authenticate student for Wi-Fi access (legacy endpoint, may be deprecated in favor of captive portal flow)

**Request Headers:**
```
Content-Type: application/json
X-Gateway-ID: GATEWAY-001
X-Gateway-Signature: <HMAC signature>
X-Request-Timestamp: <ISO 8601 timestamp>
```

**Request Body:**
```json
{
  "studentId": "STU001",
  "mobile": "+919876543210",
  "deviceId": "DEV001",
  "deviceInfo": {
    "name": "iPhone 13",
    "type": "mobile",
    "platform": "iOS"
  },
  "clientIp": "192.168.20.100",
  "clientMac": "A4:08:53:49:5F:51"
}
```

**Response (Success):**
```json
{
  "success": true,
  "authenticated": true,
  "student": {
    "studentId": "STU001",
    "name": "John Doe"
  },
  "session": {
    "sessionId": "WIFI-123456",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-08-31T18:00:00Z"
  },
  "device": {
    "deviceId": "DEV001",
    "name": "iPhone 13"
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "authenticated": false,
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid student ID or mobile number"
}
```

**Error Codes:**
- `INVALID_CREDENTIALS` - Invalid student ID or mobile
- `STUDENT_NOT_FOUND` - Student not found
- `STUDENT_INACTIVE` - Student account inactive
- `MEMBERSHIP_EXPIRED` - Membership expired
- `MEMBERSHIP_INACTIVE` - Membership inactive
- `DEVICE_LIMIT_EXCEEDED` - Device limit exceeded
- `DEVICE_REVOKED` - Device revoked
- `GATEWAY_UNAUTHORIZED` - Gateway authentication failed
- `SYSTEM_ERROR` - System error

---

### 2. Session Validation

**Endpoint:** `POST /api/v1/network/session/validate`

**Purpose:** Validate existing Wi-Fi session

**Request Headers:**
```
Content-Type: application/json
X-Gateway-ID: GATEWAY-001
X-Gateway-Signature: <HMAC signature>
X-Request-Timestamp: <ISO 8601 timestamp>
```

**Request Body:**
```json
{
  "sessionId": "WIFI-123456",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "clientIp": "192.168.20.100",
  "clientMac": "A4:08:53:49:5F:51"
}
```

**Response (Success):**
```json
{
  "success": true,
  "valid": true,
  "session": {
    "sessionId": "WIFI-123456",
    "studentId": "STU001",
    "deviceId": "DEV001",
    "expiresAt": "2026-08-31T18:00:00Z"
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "valid": false,
  "code": "SESSION_EXPIRED",
  "message": "Session has expired"
}
```

**Error Codes:**
- `SESSION_NOT_FOUND` - Session not found
- `SESSION_EXPIRED` - Session expired
- `SESSION_REVOKED` - Session revoked
- `DEVICE_REVOKED` - Device revoked
- `MEMBERSHIP_EXPIRED` - Membership expired
- `STUDENT_INACTIVE` - Student inactive
- `INVALID_TOKEN` - Invalid token
- `GATEWAY_UNAUTHORIZED` - Gateway authentication failed
- `SYSTEM_ERROR` - System error

---

### 3. Session Restoration

**Endpoint:** `POST /api/v1/network/session/restore/:sessionId`

**Purpose:** Restore Wi-Fi session for reconnection

**Request Headers:**
```
Content-Type: application/json
X-Gateway-ID: GATEWAY-001
X-Gateway-Signature: <HMAC signature>
X-Request-Timestamp: <ISO 8601 timestamp>
```

**Request Body:**
```json
{
  "clientIp": "192.168.20.100",
  "clientMac": "A4:08:53:49:5F:51"
}
```

**Response (Success):**
```json
{
  "success": true,
  "restored": true,
  "session": {
    "sessionId": "WIFI-123456",
    "studentId": "STU001",
    "deviceId": "DEV001",
    "expiresAt": "2026-08-31T18:00:00Z"
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "restored": false,
  "code": "SESSION_EXPIRED",
  "message": "Session cannot be restored"
}
```

**Error Codes:**
- `SESSION_NOT_FOUND` - Session not found
- `SESSION_EXPIRED` - Session expired
- `SESSION_REVOKED` - Session revoked
- `DEVICE_REVOKED` - Device revoked
- `MEMBERSHIP_EXPIRED` - Membership expired
- `STUDENT_INACTIVE` - Student inactive
- `GATEWAY_UNAUTHORIZED` - Gateway authentication failed
- `SYSTEM_ERROR` - System error

---

### 4. Captive Portal Entry

**Endpoint:** `GET /api/v1/network/portal`

**Purpose:** Initiate captive portal session

**Request Headers:**
```
X-Gateway-ID: GATEWAY-001
X-Client-IP: 192.168.20.100
X-Client-MAC: A4:08:53:49:5F:51
User-Agent: Mozilla/5.0...
```

**Query Parameters:**
```
gatewayId=GATEWAY-001
redirectUrl=https://example.com
```

**Response (Success):**
```json
{
  "success": true,
  "portalSessionId": "PORTAL-ABC123",
  "gatewayId": "GATEWAY-001",
  "client": {
    "ipAddress": "192.168.20.100",
    "macAddress": "A4:08:53:49:5F:51",
    "userAgent": "Mozilla/5.0..."
  },
  "expiresAt": "2026-08-31T14:10:00Z"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "code": "GATEWAY_NOT_CONFIGURED",
  "message": "Gateway is not configured"
}
```

---

### 5. Captive Portal Authentication

**Endpoint:** `POST /api/v1/network/portal/authenticate`

**Purpose:** Authenticate student through captive portal

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "portalSessionId": "PORTAL-ABC123",
  "studentId": "STU001",
  "mobile": "+919876543210",
  "deviceInfo": {
    "name": "iPhone 13",
    "type": "mobile",
    "platform": "iOS"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "authorized": true,
  "portalSession": {
    "portalSessionId": "PORTAL-ABC123",
    "status": "authorized",
    "authorizedAt": "2026-08-31T14:05:00Z"
  },
  "wifiSession": {
    "sessionId": "WIFI-123456",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-08-31T18:00:00Z"
  },
  "student": {
    "studentId": "STU001",
    "name": "John Doe"
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "authorized": false,
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid student ID or mobile number"
}
```

**Error Codes:**
- `INVALID_CREDENTIALS` - Invalid student ID or mobile
- `STUDENT_NOT_FOUND` - Student not found
- `STUDENT_INACTIVE` - Student account inactive
- `MEMBERSHIP_EXPIRED` - Membership expired
- `MEMBERSHIP_INACTIVE` - Membership inactive
- `DEVICE_LIMIT_EXCEEDED` - Device limit exceeded
- `DEVICE_REVOKED` - Device revoked
- `PORTAL_SESSION_EXPIRED` - Portal session expired
- `GATEWAY_AUTHORIZATION_FAILED` - Gateway authorization failed
- `SYSTEM_ERROR` - System error

---

### 6. Captive Portal Logout

**Endpoint:** `POST /api/v1/network/portal/logout`

**Purpose:** Logout from captive portal

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "portalSessionId": "PORTAL-ABC123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "loggedOut": true
}
```

**Response (Failure):**
```json
{
  "success": false,
  "code": "PORTAL_SESSION_NOT_FOUND",
  "message": "Portal session not found"
}
```

---

## Gateway Authentication

### Authentication Mechanism

The physical gateway must authenticate itself to the backend using one of the following methods (provider-specific):

#### Option 1: API Key + HMAC Signature (Recommended)

**Configuration:**
```bash
NETWORK_GATEWAY_API_KEY=your-api-key
NETWORK_GATEWAY_API_SECRET=your-api-secret
```

**Signature Calculation:**
```
signature = HMAC-SHA256(apiSecret, timestamp + method + path + body)
```

**Request Headers:**
```
X-Gateway-ID: GATEWAY-001
X-Gateway-API-Key: your-api-key
X-Gateway-Signature: <calculated signature>
X-Request-Timestamp: <ISO 8601 timestamp>
```

#### Option 2: mTLS (Mutual TLS)

**Configuration:**
```bash
NETWORK_GATEWAY_CLIENT_CERT=/path/to/client-cert.pem
NETWORK_GATEWAY_CLIENT_KEY=/path/to/client-key.pem
NETWORK_GATEWAY_CA_CERT=/path/to/ca-cert.pem
```

**TLS Configuration:**
- Gateway presents client certificate
- Backend validates client certificate
- Backend presents server certificate
- Gateway validates server certificate

#### Option 3: Bearer Token (JWT)

**Configuration:**
```bash
NETWORK_GATEWAY_JWT_SECRET=your-jwt-secret
```

**Token Generation:**
```
token = JWT.sign({ gatewayId: "GATEWAY-001" }, jwtSecret, { expiresIn: "1h" })
```

**Request Headers:**
```
Authorization: Bearer <jwt-token>
X-Gateway-ID: GATEWAY-001
```

### Timestamp Validation

**Requirement:** All requests must include `X-Request-Timestamp` header

**Validation Rules:**
- Timestamp must be within ±5 minutes of server time
- Timestamp must be in ISO 8601 format
- Timestamp must be in UTC

**Failure Response:**
```json
{
  "success": false,
  "code": "TIMESTAMP_INVALID",
  "message": "Request timestamp is invalid or expired"
}
```

### Replay Protection

**Requirement:** Backend must protect against replay attacks

**Implementation:**
- Cache used nonces/timestamps for 5 minutes
- Reject duplicate requests with same timestamp and signature
- Use request ID for idempotency

---

## Gateway IP Allowlisting

### Configuration

**Environment Variable:**
```bash
NETWORK_GATEWAY_ALLOWED_IPS=192.168.10.1,192.168.10.2
```

**Validation:**
- Backend validates that requests claiming to originate from gateway come from allowed IP addresses
- Validation is performed on the source IP of the TCP connection
- Allowlisting is optional but recommended for production

### Trusted Proxy Configuration

**Requirement:** If using reverse proxy, configure trusted proxy

**Configuration:**
```bash
TRUSTED_PROXY=true
TRUSTED_PROXY_COUNT=1
```

**Header Validation:**
- If behind trusted proxy, use `X-Forwarded-For` header
- If not behind trusted proxy, use direct connection IP
- Never trust client-provided headers from untrusted sources

---

## Captive Portal Redirect Contract

### Redirect Flow

**Student Device:**
```
1. Connect to Wi-Fi
2. Receive IP address via DHCP
3. Attempt Internet access (e.g., http://example.com)
4. Gateway detects unauthenticated client
5. Gateway redirects to: https://YOUR-DOMAIN/network/portal
6. Portal receives gateway/client metadata
7. Portal creates portalSessionId
8. Student enters credentials (student ID + mobile)
9. Portal authenticates with backend
10. Backend validates membership and device
11. Backend creates Wi-Fi session
12. Backend authorizes gateway client
13. Gateway grants Internet access
14. Portal shows access granted
```

### Redirect URL Configuration

**Environment Variable:**
```bash
NETWORK_PORTAL_BASE_URL=https://library.durgalibrary.com
```

**Gateway Configuration:**
- Gateway must redirect to configured portal URL
- Gateway must include gateway ID and client metadata in redirect
- Gateway must use HTTPS for redirect (if possible)

### Portal URL Structure

**Production:**
```
https://library.durgalibrary.com/network/portal
```

**Development:**
```
http://localhost:3000/network/portal
```

---

## Client Authorization Contract

### Authorization Request

**Backend → Gateway:**

```javascript
gatewayService.authorizeClient({
  gatewayId: "GATEWAY-001",
  studentId: "STU001",
  deviceId: "DEV001",
  sessionId: "WIFI-123456",
  clientIp: "192.168.20.100",
  clientMac: "A4:08:53:49:5F:51",
  expiresAt: "2026-08-31T18:00:00Z"
})
```

### Authorization Response

**Gateway → Backend:**

```javascript
{
  success: true,
  authorized: true,
  gatewayId: "GATEWAY-001",
  clientId: "192.168.20.100",
  adapter: "mikrotik",
  mode: "production",
  timestamp: "2026-08-31T14:05:00Z"
}
```

### Authorization Failure

```javascript
{
  success: false,
  authorized: false,
  code: "GATEWAY_AUTHORIZATION_FAILED",
  gatewayId: "GATEWAY-001",
  clientId: "192.168.20.100",
  adapter: "mikrotik",
  mode: "production",
  timestamp: "2026-08-31T14:05:00Z",
  message: "Gateway authorization failed"
}
```

### Adapter Translation

**Architecture:**
```
CaptivePortalService
       ↓
GatewayService
       ↓
GatewayAdapter
       ↓
Vendor-Specific API
```

**MikroTik Example:**
```javascript
// GatewayAdapter translates to MikroTik API
mikroTikApi.addHotspotUser({
  name: "WIFI-123456",
  profile: "student",
  limit-uptime: "12h"
});
```

**pfSense Example:**
```javascript
// GatewayAdapter translates to pfSense REST API
pfsenseApi.addCaptivePortalUser({
  username: "WIFI-123456",
  zone: "student"
});
```

---

## Client Deauthorization Contract

### Deauthorization Request

**Backend → Gateway:**

```javascript
gatewayService.deauthorizeClient({
  gatewayId: "GATEWAY-001",
  studentId: "STU001",
  deviceId: "DEV001",
  sessionId: "WIFI-123456",
  clientIp: "192.168.20.100",
  clientMac: "A4:08:53:49:5F:51"
})
```

### Deauthorization Response

**Gateway → Backend:**

```javascript
{
  success: true,
  deauthorized: true,
  gatewayId: "GATEWAY-001",
  clientId: "192.168.20.100",
  adapter: "mikrotik",
  mode: "production",
  timestamp: "2026-08-31T14:05:00Z"
}
```

### Deauthorization Failure

```javascript
{
  success: false,
  deauthorized: false,
  code: "CLIENT_DEAUTHORIZATION_FAILED",
  gatewayId: "GATEWAY-001",
  clientId: "192.168.20.100",
  adapter: "mikrotik",
  mode: "production",
  timestamp: "2026-08-31T14:05:00Z",
  message: "Client deauthorization failed"
}
```

### Deauthorization Reasons

- `logout` - User logged out from portal
- `session_expired` - Wi-Fi session expired
- `membership_expired` - Student membership expired
- `device_revoked` - Device was revoked
- `admin_revoked` - Admin revoked session
- `security_failure` - Security issue detected

### Idempotency

**Requirement:** Deauthorization must be idempotent

**Behavior:**
- Safe to call multiple times
- If client already deauthorized, return success
- Do not throw error for already-deauthorized client
- Preserve session history

---

## Session Enforcement

### Application Session

**WiFiSession:**
```javascript
{
  sessionId: "WIFI-123456",
  student: ObjectId("..."),
  device: ObjectId("..."),
  gatewayId: "GATEWAY-001",
  status: "active",
  expiresAt: "2026-08-31T18:00:00Z",
  network: {
    ipAddress: "192.168.20.100",
    connectionType: "wifi"
  }
}
```

### Gateway Session

**Gateway Rule/Session:**
```javascript
{
  clientId: "192.168.20.100",
  authorized: true,
  expiresAt: "2026-08-31T18:00:00Z",
  sessionId: "WIFI-123456"
}
```

### Enforcement Mapping

**Application → Gateway:**
- WiFiSession.sessionId maps to Gateway session identifier
- WiFiSession.expiresAt maps to Gateway session timeout
- WiFiSession.status maps to Gateway authorization status

### Expiration Enforcement

**When WiFiSession expires:**
```
1. Cron job detects expired session
2. Backend marks WiFiSession as expired
3. Backend calls gatewayService.deauthorizeClient()
4. Gateway removes network authorization
5. Client loses Internet access
```

**No expired application session should continue to receive unrestricted Internet access.**

---

## Error Codes

### Gateway Error Codes

- `GATEWAY_NOT_CONFIGURED` - Gateway is not configured
- `GATEWAY_UNAVAILABLE` - Gateway is unreachable
- `GATEWAY_AUTHENTICATION_FAILED` - Gateway authentication failed
- `GATEWAY_AUTHORIZATION_FAILED` - Gateway authorization failed
- `CLIENT_NOT_FOUND` - Client not found on gateway
- `CLIENT_DEAUTHORIZATION_FAILED` - Client deauthorization failed
- `ADAPTER_NOT_SUPPORTED` - Adapter not supported for provider
- `GATEWAY_CONFIGURATION_ERROR` - Gateway configuration error
- `GATEWAY_CONNECTIVITY_ERROR` - Gateway connectivity error

### Authentication Error Codes

- `INVALID_CREDENTIALS` - Invalid credentials
- `STUDENT_NOT_FOUND` - Student not found
- `STUDENT_INACTIVE` - Student inactive
- `MEMBERSHIP_EXPIRED` - Membership expired
- `MEMBERSHIP_INACTIVE` - Membership inactive
- `DEVICE_LIMIT_EXCEEDED` - Device limit exceeded
- `DEVICE_REVOKED` - Device revoked

### Session Error Codes

- `SESSION_NOT_FOUND` - Session not found
- `SESSION_EXPIRED` - Session expired
- `SESSION_REVOKED` - Session revoked
- `INVALID_TOKEN` - Invalid token
- `PORTAL_SESSION_EXPIRED` - Portal session expired
- `PORTAL_SESSION_NOT_FOUND` - Portal session not found

### System Error Codes

- `SYSTEM_ERROR` - System error
- `TIMESTAMP_INVALID` - Timestamp invalid or expired
- `REPLAY_DETECTED` - Replay attack detected
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded

---

## Security Requirements

### Credentials Management

**Requirements:**
- Credentials stored only in environment variables or secret manager
- Credentials never in source code
- Credentials never in logs
- Credentials never in API responses
- Credentials never in frontend code
- Credential rotation supported

### Rate Limiting

**Requirements:**
- Gateway API calls rate limited
- Authentication attempts rate limited
- Failed authorization attempts rate limited
- Per-gateway rate limiting

### Audit Logging

**Requirements:**
- All gateway operations logged
- Gateway authentication attempts logged
- Authorization requests logged
- Deauthorization requests logged
- Failures logged with error codes

**Never Log:**
- Passwords
- API secrets
- Raw JWT tokens
- Wi-Fi passwords
- Authentication credentials

### TLS Encryption

**Requirements:**
- All gateway-to-backend communication over HTTPS (TLS 1.2+)
- Certificate validation enabled
- Hostname verification enabled
- Certificate pinning (optional, recommended)

---

## Conclusion

This integration contract defines the complete API contract between the physical gateway and the Durga Digital Library backend. The contract is designed to be vendor-agnostic through the GatewayAdapter pattern, allowing integration with MikroTik, pfSense, OPNsense, or Ubiquiti gateways.

**Status:** CONTRACT DEFINITION  
**Next Step:** Select gateway platform and implement vendor-specific adapter.

**IMPORTANT:** Do not introduce duplicate authentication logic. The backend handles identity and session management. The gateway handles network enforcement.
