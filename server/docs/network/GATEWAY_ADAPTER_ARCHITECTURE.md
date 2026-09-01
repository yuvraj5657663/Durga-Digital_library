# Gateway Adapter Architecture

**Date:** August 31, 2026  
**PART:** 9 - External Gateway Integration & Production Gateway Abstraction

---

## Overview

The gateway adapter architecture provides a vendor-independent abstraction for network gateway operations. This allows the application to integrate with different gateway vendors (MikroTik, PfSense, Ubiquiti) without modifying core application logic.

---

## Architecture Diagram

```
Application Layer
    ↓
GatewayService (Singleton)
    ↓
GatewayAdapter Interface
    ↓
┌─────────────────────────────────────────┐
│ Provider Selection (Configuration)       │
├─────────────────────────────────────────┤
│ development → DevelopmentGatewayAdapter  │
│ mikrotik    → MikroTikGatewayAdapter    │
│ pfsense     → PfSenseGatewayAdapter     │
│ ubiquiti    → UbiquitiGatewayAdapter    │
└─────────────────────────────────────────┘
    ↓
Physical Gateway (MikroTik/PfSense/Ubiquiti)
```

---

## Why Airtel AAP321NK is Not Used as Enforcement Gateway

Based on PART 8 discovery, the Airtel AAP321NK is a residential-grade Wi-Fi 6 gateway that:

- **Does NOT support captive portal** (no evidence, residential-grade device)
- **Does NOT support RADIUS** (not typical for residential gateways)
- **Does NOT support REST API** (no API ports detected, residential-grade device)
- **Does NOT support webhooks** (not typical for residential gateways)
- **Does NOT support VLAN** (not typical for residential gateways)
- **Does NOT support client authorization API** (no API access)
- **Does NOT support session management API** (no API access)

The AAP321NK is designed for home/SOHO use and lacks enterprise networking features required for captive portal integration.

---

## External Gateway Architecture

### Target Network Topology

```
Internet
   ↓
External Gateway / Firewall (MikroTik / PfSense / Ubiquiti)
   ↓
Airtel AAP321NK / Wi-Fi Access Point (Bridge Mode or Modem Only)
   ↓
Students
```

### Integration Approach

1. **External Gateway** provides:
   - Captive portal functionality
   - Client authorization/deauthorization
   - Session management
   - VLAN isolation (optional)
   - RADIUS authentication (optional)

2. **Airtel AAP321NK** provides:
   - Wi-Fi access point functionality
   - Bridged mode (if supported) or modem-only mode
   - No network enforcement

3. **Application** provides:
   - Student authentication
   - Membership validation
   - Device registration
   - Wi-Fi session management
   - Attendance creation
   - Gateway adapter abstraction

---

## Adapter Pattern

### GatewayAdapter Interface

All adapters must implement the following methods:

```javascript
class GatewayAdapter {
  constructor(config)
  async authorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac, expiresAt })
  async deauthorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac })
  async validateGateway(gatewayId)
  async getGatewayStatus(gatewayId)
  async getClientStatus({ gatewayId, clientIp, clientMac })
  async disconnectClient({ gatewayId, clientIp, clientMac })
  getCapabilities()
  isConfigured()
}
```

### Consistent Response Structure

All adapter methods return a consistent structure:

```javascript
{
  success: true,
  authorized: true,        // for authorizeClient
  deauthorized: true,      // for deauthorizeClient
  valid: true,             // for validateGateway
  gatewayId: "...",
  clientId: "...",
  adapter: "...",
  mode: "...",
  timestamp: "..."
}
```

### Error Codes

Structured error codes for gateway operations:

- `GATEWAY_NOT_CONFIGURED` - Gateway is not configured
- `GATEWAY_UNAVAILABLE` - Gateway is unreachable
- `GATEWAY_AUTHENTICATION_FAILED` - Gateway authentication failed
- `GATEWAY_AUTHORIZATION_FAILED` - Gateway authorization failed
- `CLIENT_NOT_FOUND` - Client not found on gateway
- `CLIENT_DEAUTHORIZATION_FAILED` - Client deauthorization failed
- `ADAPTER_NOT_SUPPORTED` - Adapter not supported for provider
- `GATEWAY_CONFIGURATION_ERROR` - Gateway configuration error
- `GATEWAY_CONNECTIVITY_ERROR` - Gateway connectivity error

---

## Supported Providers

### Development Mode

**Provider:** `development`  
**Adapter:** `DevelopmentGatewayAdapter`

**Purpose:** Mock adapter for development and testing  
**Behavior:** 
- Logs all operations without making actual network changes
- Always returns success
- No physical gateway required
- Safe for development environment

**Configuration:**
```bash
NETWORK_GATEWAY_PROVIDER=development
NETWORK_GATEWAY_MODE=development
```

**Capabilities:**
- Captive Portal: Yes (simulated)
- Client Authorization: Yes (simulated)
- Client Deauthorization: Yes (simulated)
- Client Status: Yes (simulated)
- Session Management: Yes (simulated)
- VLAN: No
- RADIUS: No
- API: Yes (simulated)

---

### MikroTik

**Provider:** `mikrotik`  
**Adapter:** `MikroTikGatewayAdapter`

**Purpose:** Production adapter for MikroTik routers  
**Current Status:** NOT_CONFIGURED (requires physical gateway deployment)

**Configuration:**
```bash
NETWORK_GATEWAY_PROVIDER=mikrotik
NETWORK_GATEWAY_MODE=production
NETWORK_GATEWAY_ID=GATEWAY-001
NETWORK_GATEWAY_HOST=192.168.1.1
NETWORK_GATEWAY_PORT=8728
NETWORK_GATEWAY_USERNAME=admin
NETWORK_GATEWAY_PASSWORD=********
```

**Capabilities:**
- Captive Portal: Yes
- Client Authorization: Yes
- Client Deauthorization: Yes
- Client Status: Yes
- Session Management: Yes
- VLAN: Yes
- RADIUS: Yes
- API: Yes (MikroTik API)

**Implementation Status:**
- Adapter structure: COMPLETE
- API integration: PENDING (requires physical gateway)
- Configuration validation: COMPLETE
- Error handling: COMPLETE

---

### PfSense

**Provider:** `pfsense`  
**Adapter:** `PfSenseGatewayAdapter`

**Purpose:** Production adapter for PfSense firewalls  
**Current Status:** NOT_CONFIGURED (requires physical gateway deployment)

**Configuration:**
```bash
NETWORK_GATEWAY_PROVIDER=pfsense
NETWORK_GATEWAY_MODE=production
NETWORK_GATEWAY_ID=GATEWAY-001
NETWORK_GATEWAY_API_URL=https://192.168.1.1/api
NETWORK_GATEWAY_API_USERNAME=admin
NETWORK_GATEWAY_API_PASSWORD=********
```

**Capabilities:**
- Captive Portal: Yes
- Client Authorization: Yes
- Client Deauthorization: Yes
- Client Status: Yes
- Session Management: Yes
- VLAN: Yes
- RADIUS: Yes
- API: Yes (PfSense REST API)

**Implementation Status:**
- Adapter structure: COMPLETE
- API integration: PENDING (requires physical gateway)
- Configuration validation: COMPLETE
- Error handling: COMPLETE

---

### Ubiquiti

**Provider:** `ubiquiti`  
**Adapter:** `UbiquitiGatewayAdapter`

**Purpose:** Production adapter for Ubiquiti gateways  
**Current Status:** NOT_CONFIGURED (requires physical gateway deployment)

**Configuration:**
```bash
NETWORK_GATEWAY_PROVIDER=ubiquiti
NETWORK_GATEWAY_MODE=production
NETWORK_GATEWAY_ID=GATEWAY-001
NETWORK_GATEWAY_API_URL=https://192.168.1.1/api
NETWORK_GATEWAY_API_USERNAME=admin
NETWORK_GATEWAY_API_PASSWORD=********
```

**Capabilities:**
- Captive Portal: Yes
- Client Authorization: Yes
- Client Deauthorization: Yes
- Client Status: Yes
- Session Management: Yes
- VLAN: Yes
- RADIUS: Yes
- API: Yes (Ubiquiti Controller API)

**Implementation Status:**
- Adapter structure: COMPLETE
- API integration: PENDING (requires physical gateway)
- Configuration validation: COMPLETE
- Error handling: COMPLETE

---

## Development Mode

### Purpose

Development mode allows the application to function without a physical gateway. This is essential for:

- Development and testing
- CI/CD pipelines
- Feature development
- Bug fixing

### Behavior

- Uses `DevelopmentGatewayAdapter`
- Simulates all gateway operations
- Logs all operations for debugging
- No actual network changes
- Always returns success

### Safety

Development mode is safe because:
- No physical gateway is required
- No credentials are needed
- No network changes are made
- All operations are simulated
- Audit logs are still created

### Production Safety

**CRITICAL:** Development mode must NOT be used in production.

The application validates:
- `NODE_ENV=production` requires `NETWORK_GATEWAY_PROVIDER != development`
- Production mode requires gateway configuration
- Production mode requires gateway connectivity

---

## Production Mode

### Purpose

Production mode uses a physical gateway for actual network enforcement.

### Behavior

- Uses vendor-specific adapter (MikroTik/PfSense/Ubiquiti)
- Makes actual API calls to gateway
- Enforces network access control
- Requires gateway configuration
- Requires gateway connectivity

### Requirements

Production mode requires:
1. Gateway provider configured
2. Gateway ID configured
3. Gateway credentials configured
4. Gateway endpoint configured
5. Gateway connectivity verified
6. Required capabilities available

### Safety

Production mode is safe because:
- Gateway authorization is required for network access
- Gateway authorization failure prevents access
- Gateway deauthorization is idempotent
- Audit logs track all gateway operations
- Secrets are never exposed

---

## Gateway Capability Model

### Capability Structure

```javascript
{
  captivePortal: boolean,
  clientAuthorization: boolean,
  clientDeauthorization: boolean,
  clientStatus: boolean,
  sessionManagement: boolean,
  vlan: boolean,
  radius: boolean,
  api: boolean
}
```

### Required Capabilities

For captive portal integration, the following capabilities are required:
- `clientAuthorization` - Authorize client on gateway
- `clientDeauthorization` - Deauthorize client on gateway

### Optional Capabilities

The following capabilities are optional:
- `captivePortal` - Native captive portal support
- `clientStatus` - Query client status on gateway
- `sessionManagement` - Gateway-level session management
- `vlan` - VLAN isolation support
- `radius` - RADIUS authentication support
- `api` - REST API support

---

## Configuration

### Environment Variables

```bash
# Gateway Mode
NETWORK_GATEWAY_MODE=development|production

# Gateway Provider
NETWORK_GATEWAY_PROVIDER=development|mikrotik|pfsense|ubiquiti

# Gateway Identification
NETWORK_GATEWAY_ID=GATEWAY-001

# MikroTik Configuration
NETWORK_GATEWAY_HOST=192.168.1.1
NETWORK_GATEWAY_PORT=8728
NETWORK_GATEWAY_USERNAME=admin
NETWORK_GATEWAY_PASSWORD=********

# PfSense/Ubiquiti Configuration
NETWORK_GATEWAY_API_URL=https://192.168.1.1/api
NETWORK_GATEWAY_API_USERNAME=admin
NETWORK_GATEWAY_API_PASSWORD=********
```

### Configuration Validation

The application validates:
- Provider is supported
- Gateway ID is configured
- Credentials are configured (for production providers)
- Endpoint is configured (for production providers)
- Security configuration is valid

---

## Security Model

### Gateway Identity Validation

- Gateway ID is validated server-side
- Gateway ID is stored in configuration
- Gateway ID is not exposed to clients
- Gateway ID is used for audit logging

### Client Identity

- MAC address is used as fingerprint only, NOT as identity
- Student credentials are authoritative identity
- Device registration is required for authorization
- Device status is validated before authorization

### Session Security

- Short-lived Wi-Fi session tokens (JWT)
- Automatic session expiration
- Gateway deauthorization on session expiration
- Gateway deauthorization on session revocation
- Gateway deauthorization on portal logout

### Secrets Management

- No secrets in source code
- No secrets in logs
- No secrets in API responses
- No raw JWT tokens in database
- Gateway credentials in environment variables only
- Gateway credentials redacted from diagnostics

### Authorization

- Admin endpoints require admin role
- Gateway diagnostics endpoint is admin-only
- Gateway readiness endpoint is admin-only
- Students cannot authorize other students
- Gateway configuration cannot be changed by students

### Audit Logging

All gateway operations are logged:
- Gateway adapter selection
- Gateway readiness check
- Gateway connectivity check
- Gateway authorization requested
- Gateway authorization success
- Gateway authorization failed
- Gateway deauthorization requested
- Gateway deauthorization success
- Gateway deauthorization failed
- Gateway configuration error

Never logged:
- Passwords
- API secrets
- Raw JWT tokens
- Wi-Fi passwords
- Authentication credentials

---

## Authorization Flow

### Captive Portal Authorization

```
1. Client connects to Wi-Fi
2. Gateway redirects to captive portal
3. Client enters credentials (student ID, mobile)
4. Application validates student credentials
5. Application checks Wi-Fi eligibility
6. Application registers/updates device
7. Application creates Wi-Fi session
8. Application authorizes gateway client
9. Gateway authorizes client (network access granted)
10. Application marks portal session as authorized
```

### Authorization Safety

**CRITICAL:** If gateway authorization fails:
- Wi-Fi session is revoked
- Portal session is marked as failed
- Network access is NOT granted
- Error is logged

This prevents the application from reporting network access as granted when the physical gateway did nothing.

---

## Deauthorization Flow

### Session Expiration

```
1. Cron job checks for expired sessions
2. For each expired session:
   a. Mark session as expired in database
   b. Deauthorize gateway client
   c. Log deauthorization
```

### Session Revocation

```
1. Admin revokes session (manual)
2. Application marks session as revoked in database
3. Application deauthorizes gateway client
4. Application logs deauthorization
```

### Portal Logout

```
1. Client logs out from portal
2. Application revokes Wi-Fi session
3. Gateway deauthorization is called (idempotent)
4. Application marks portal session as expired
5. Application logs logout
```

### Deauthorization Idempotency

Gateway deauthorization is idempotent:
- Safe to call multiple times
- Safe if client is already deauthorized
- Safe if gateway is unreachable
- Session history is preserved

---

## API Endpoints

### Gateway Status

**Endpoint:** `GET /api/v1/admin/network/gateway/status`  
**Authentication:** Admin required  
**Response:**

```javascript
{
  vendor: "...",
  model: "...",
  firmware: "...",
  mode: "development|production",
  provider: "development|mikrotik|pfsense|ubiquiti",
  connectivity: "reachable|unreachable",
  configured: true|false,
  adapterStatus: "ready|not_configured",
  capabilities: {
    captivePortal: "SUPPORTED|NOT_SUPPORTED",
    clientAuthorization: "SUPPORTED|NOT_SUPPORTED",
    clientDeauthorization: "SUPPORTED|NOT_SUPPORTED",
    clientStatus: "SUPPORTED|NOT_SUPPORTED",
    sessionManagement: "SUPPORTED|NOT_SUPPORTED",
    vlan: "SUPPORTED|NOT_SUPPORTED",
    radius: "SUPPORTED|NOT_SUPPORTED",
    api: "SUPPORTED|NOT_SUPPORTED"
  },
  timestamp: "..."
}
```

**Security:** No secrets or credentials are exposed.

---

### Gateway Readiness

**Endpoint:** `GET /api/v1/admin/network/gateway/readiness`  
**Authentication:** Admin required  
**Response:**

```javascript
{
  ready: true|false,
  provider: "...",
  mode: "...",
  environment: "development|production",
  checks: {
    providerConfigured: true|false,
    gatewayIdConfigured: true|false,
    credentialsConfigured: true|false,
    endpointConfigured: true|false,
    adapterAvailable: true|false,
    connectivity: true|false,
    requiredCapabilities: true|false,
    securityConfiguration: true|false
  },
  blockers: ["..."],
  recommendations: ["..."],
  capabilities: {...},
  timestamp: "..."
}
```

**Security:** No secrets or credentials are exposed.

---

## Physical Gateway Integration

### Current Status

**Application Gateway Integration Layer:** READY  
**Physical Gateway Integration:** PENDING

The application is ready for physical gateway integration, but no physical gateway has been deployed yet.

### Next Steps

1. **Select Gateway Provider:**
   - Evaluate MikroTik, PfSense, Ubiquiti options
   - Consider features, pricing, support
   - Select appropriate gateway for requirements

2. **Deploy Physical Gateway:**
   - Purchase selected gateway
   - Install gateway in network
   - Configure gateway for captive portal
   - Configure gateway for API access

3. **Configure Application:**
   - Set environment variables for gateway
   - Test gateway connectivity
   - Test gateway authorization
   - Test gateway deauthorization

4. **Deploy to Production:**
   - Switch from development to production mode
   - Verify gateway readiness
   - Monitor gateway operations
   - Plan rollback strategy

---

## Backward Compatibility

### Existing Features Preserved

All existing Parts 3-7 functionality remains intact:
- Student authentication
- Student portal
- Admin portal
- Membership system
- QR attendance
- Manual attendance
- Self attendance
- Wi-Fi attendance
- Registered devices
- Wi-Fi sessions
- Captive portal
- Audit logs
- Existing reports
- Existing dashboards

### Attendance Methods

All attendance methods remain compatible:
- `qr_scan` - QR code scanning
- `manual` - Manual entry
- `self` - Self-service
- `wifi_network` - Wi-Fi network authentication

### Database Schema

No database schema changes were made in PART 9.
All existing collections remain unchanged.

---

## Conclusion

The gateway adapter architecture provides a production-ready abstraction for external gateway integration. The application is ready for physical gateway deployment, but no physical gateway has been deployed yet.

**Status:**
- Application Gateway Integration Layer: READY
- Physical Gateway Integration: PENDING

**Next Step:** Select and deploy a physical gateway (MikroTik, PfSense, or Ubiquiti).
