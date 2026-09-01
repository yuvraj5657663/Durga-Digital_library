# Gateway Integration Plan

**Date:** August 31, 2026  
**Router Vendor:** Airtel  
**Router Model:** UNKNOWN  
**Status:** BLOCKED - Insufficient Information

---

## Current Architecture

### Existing Components
- **PART 3:** Wi-Fi Authentication (network authentication endpoint)
- **PART 4:** Automatic Wi-Fi Attendance (attendance creation on Wi-Fi login)
- **PART 5:** Registered Device Management (device registration and limits)
- **PART 6:** Secure Wi-Fi Session Management (JWT-based sessions)
- **PART 7:** Captive Portal & Vendor-Neutral Gateway Integration Layer

### Gateway Service Architecture
```
GatewayService (main service)
    ↓
GatewayAdapter (interface)
    ↓
├── DevelopmentGatewayAdapter (current implementation)
├── AirtelGatewayAdapter (NOT IMPLEMENTED - capabilities unknown)
├── MikroTikGatewayAdapter (future)
├── UbiquitiGatewayAdapter (future)
└── OtherGatewayAdapter (future)
```

### Current Authentication Flow
```
Client
 ↓
Airtel Gateway (currently passthrough)
 ↓
Captive Portal (application-layer only)
 ↓
Durga Library Backend
 ↓
Authentication
 ↓
Gateway Authorization (mock in development)
 ↓
Internet
```

---

## Confirmed Airtel Capabilities

Based on safe read-only network discovery:

### Supported
- **HTTPS Web Interface:** Port 443 open, returns HTML with 403 Forbidden
- **DHCP Server:** Client has DHCP lease (192.168.1.24/255.255.255.0)
- **Gateway Reachability:** Ping successful

### Not Supported
- **HTTP Access:** Port 80 closed
- **MikroTik API:** Ports 8728, 8729 closed
- **RADIUS Ports:** Ports 1812, 1813 closed (may be firewalled)

### Unknown
- **Router Model:** Cannot be determined from network discovery
- **Captive Portal:** Unknown
- **RADIUS:** Unknown (ports may be firewalled)
- **REST API:** Unknown
- **Webhooks:** Unknown
- **Client Authorization:** Unknown
- **Session Management:** Unknown
- **Guest Network:** Unknown
- **VLAN:** Unknown

---

## Unsupported Capabilities

The following capabilities are confirmed as NOT supported based on evidence:

1. **HTTP Access** - Port 80 is closed
2. **MikroTik API** - Ports 8728, 8729 are closed (router is not MikroTik)

---

## Unknown Capabilities

The following capabilities are UNKNOWN and require investigation:

1. **Captive Portal** - Cannot be determined without router configuration access
2. **RADIUS** - Cannot be determined without router configuration access
3. **REST API** - Cannot be determined without router documentation
4. **Webhooks** - Cannot be determined without router documentation
5. **Client Authorization** - Cannot be determined without router API access
6. **Session Management** - Cannot be determined without router API access
7. **Guest Network** - Cannot be determined without router configuration access
8. **VLAN** - Cannot be determined without router configuration access

---

## Integration Architecture Determination

### Current Status: BLOCKED

Based on available evidence, **no integration architecture can be determined** because:

1. Router model is unknown
2. Router capabilities are unknown
3. Router documentation is unavailable
4. Router configuration access is unavailable

### Possible Architectures (Not Yet Determined)

#### OPTION A - Native Captive Portal
**Status:** UNKNOWN  
**Requirement:** Router must support captive portal  
**Evidence:** None  
**Conclusion:** Cannot be evaluated without router model and capabilities

#### OPTION B - RADIUS
**Status:** UNKNOWN  
**Requirement:** Router must support RADIUS  
**Evidence:** RADIUS ports closed (may be firewalled)  
**Conclusion:** Cannot be evaluated without router configuration access

#### OPTION C - Router API
**Status:** UNKNOWN  
**Requirement:** Router must have REST API  
**Evidence:** No API ports detected  
**Conclusion:** Cannot be evaluated without router documentation

#### OPTION D - External Gateway
**Status:** RECOMMENDED IF ROUTER LACKS CAPABILITIES  
**Requirement:** Additional network hardware  
**Evidence:** Router capabilities unknown  
**Conclusion:** Recommended fallback option if Airtel router lacks required capabilities

#### OPTION E - Not Possible With Current Router
**Status:** LIKELY  
**Requirement:** Router must have captive portal, RADIUS, or API  
**Evidence:** Router capabilities unknown  
**Conclusion:** Likely outcome if Airtel router is a basic residential gateway

---

## Required Hardware

### If External Gateway is Required
- **Dedicated Gateway/Firewall:** MikroTik, Ubiquiti, or pfSense
- **VLAN-capable Switch:** For network isolation
- **Access Points:** For Wi-Fi coverage
- **Cabling:** CAT6 for network connections

### If Airtel Router Supports Integration
- **None** (use existing Airtel router)

---

## Required Software

### Application Layer (Already Complete)
- ✅ Captive portal backend service
- ✅ Gateway adapter abstraction
- ✅ Wi-Fi session management
- ✅ Device management
- ✅ Attendance integration

### Gateway Adapter (Not Implemented)
- ❌ AirtelGatewayAdapter (cannot implement without capabilities)
- ✅ DevelopmentGatewayAdapter (for testing)

### External Gateway (If Required)
- ❌ MikroTikGatewayAdapter (not implemented)
- ❌ UbiquitiGatewayAdapter (not implemented)
- ❌ pfSenseGatewayAdapter (not implemented)

---

## Required Configuration

### Application Configuration
```env
NETWORK_GATEWAY_MODE=development
NETWORK_GATEWAY_ID=

NETWORK_ROUTER_VENDOR=Airtel
NETWORK_ROUTER_MODEL=
NETWORK_ROUTER_FIRMWARE=

NETWORK_GATEWAY_API_URL=
NETWORK_GATEWAY_API_USERNAME=
NETWORK_GATEWAY_API_PASSWORD=

NETWORK_GATEWAY_RADIUS_HOST=
NETWORK_GATEWAY_RADIUS_PORT=
NETWORK_GATEWAY_RADIUS_SECRET=
```

### Router Configuration (Unknown)
- Unknown without router model and capabilities

### External Gateway Configuration (If Required)
- Depends on gateway vendor

---

## Security Requirements

### Gateway Identity Validation
- **Development Mode:** Accept any gateway ID (current implementation)
- **Production Mode:** Must validate gateway identity via:
  - API authentication
  - RADIUS secret
  - Certificate validation
  - IP whitelist

### Client Identity
- **MAC Address:** Used as fingerprint only, NOT as identity
- **Student Credentials:** Authoritative identity (student ID + mobile)
- **Device Registration:** Required for authorization

### Session Security
- **JWT Tokens:** Short-lived Wi-Fi session tokens
- **Session Expiration:** Automatic expiration after configured duration
- **Gateway Deauthorization:** Automatic on session expiration

### Secrets Management
- **No secrets in source code**
- **No secrets in logs**
- **No secrets in frontend**
- **No secrets in API responses**
- **Environment variables only**

---

## Implementation Sequence

### Phase 1: Router Investigation (BLOCKED)
1. **Determine Router Model**
   - Physical inspection of router
   - Check router label
   - Contact Airtel support

2. **Access Router Administration**
   - Obtain router credentials
   - Login to web interface
   - Review configuration options

3. **Review Router Documentation**
   - Obtain official router manual
   - Review firmware documentation
   - Check for API documentation

4. **Determine Capabilities**
   - Check for captive portal support
   - Check for RADIUS support
   - Check for API support
   - Check for guest network support
   - Check for VLAN support

### Phase 2: Integration Architecture (BLOCKED)
1. **Select Architecture**
   - Based on router capabilities
   - Evaluate external gateway if needed

2. **Implement Gateway Adapter**
   - Create vendor-specific adapter
   - Implement required methods
   - Test in development

3. **Configure Router**
   - Configure captive portal (if supported)
   - Configure RADIUS (if supported)
   - Configure API (if supported)
   - Configure external gateway (if required)

### Phase 3: Testing (BLOCKED)
1. **Development Testing**
   - Test with development adapter
   - Verify authentication flow
   - Verify session management

2. **Production Testing**
   - Test with real gateway
   - Verify authorization
   - Verify deauthorization
   - Verify session expiration

3. **Network Testing**
   - Test in library network
   - Verify client connectivity
   - Verify captive portal redirect

---

## Rollback Strategy

### Application Rollback
- **Configuration:** Revert gateway mode to `development`
- **Adapter:** Use DevelopmentGatewayAdapter
- **No Database Changes:** No destructive changes made

### Network Rollback
- **Router Configuration:** Revert router to original settings
- **External Gateway:** Remove external gateway if added
- **Network Topology:** Restore original network topology

---

## Production Testing Plan

### Pre-Production Checklist
- [ ] Router model determined
- [ ] Router capabilities confirmed
- [ ] Gateway adapter implemented
- [ ] Router configuration completed
- [ ] Development testing completed
- [ ] Security review completed
- [ ] Backup of router configuration
- [ ] Rollback plan documented

### Production Testing Steps
1. **Test in Maintenance Window**
   - Schedule during low-usage period
   - Notify library staff
   - Have rollback plan ready

2. **Test Authentication Flow**
   - Verify captive portal redirect
   - Verify student authentication
   - Verify gateway authorization
   - Verify internet access

3. **Test Session Management**
   - Verify session creation
   - Verify session expiration
   - Verify session deauthorization
   - Verify session restoration

4. **Test Edge Cases**
   - Test with invalid credentials
   - Test with expired membership
   - Test with revoked device
   - Test with device limit reached

5. **Monitor and Verify**
   - Monitor gateway logs
   - Monitor application logs
   - Verify audit logs
   - Verify attendance records

---

## Conclusion

**Current Status:** BLOCKED

The Airtel router cannot be integrated with the captive portal system without additional information about its capabilities.

**Required Next Steps:**
1. Determine exact router model (physical inspection or Airtel support)
2. Access router administration interface with valid credentials
3. Review router documentation for capabilities
4. Contact Airtel support for technical specifications
5. Evaluate external gateway option if router lacks required capabilities

**Recommended Next Step:**
Physical inspection of the Airtel router to determine model number, followed by access to the router administration interface to review capabilities.
