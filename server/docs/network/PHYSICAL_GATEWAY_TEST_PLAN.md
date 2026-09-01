# Physical Gateway Test Plan

**Date:** August 31, 2026  
**PART:** 10 - External Gateway Selection, Lab Setup & Physical Integration Contract

---

## Overview

This document defines the test plan for physical gateway deployment. All tests must be performed in an isolated lab environment before connecting to the production library network. No production deployment until these tests pass.

**Status:** TEST PLAN DEFINED - Awaiting physical gateway deployment

---

## Test Environment

### Isolated Test Network

**Topology:**
```
Internet
   ↓
Test Modem / Router (isolated)
   ↓
Test Gateway (MikroTik / pfSense / OPNsense / Ubiquiti)
   ↓
Test Access Point
   ↓
Test Laptop / Mobile
```

**Requirements:**
- Test network must be physically isolated from production library network
- Test network must not be able to disrupt production network
- Test network must have independent Internet connection
- Test network must have test devices (laptop, mobile)

**Safety:**
- Do not connect test gateway in a way that can accidentally disrupt existing library network
- Do not change Airtel router during testing
- Use separate SSID for testing
- Use separate IP ranges for testing

---

## Test Cases

### 1. Gateway Boots

**Objective:** Verify gateway boots successfully

**Steps:**
1. Connect power to gateway
2. Wait for boot sequence to complete
3. Check power LED status
4. Check status LEDs

**Expected Result:**
- Gateway boots successfully
- All status LEDs show normal operation
- Gateway is accessible via web interface

**Failure Criteria:**
- Gateway does not boot
- Gateway hangs during boot
- Gateway shows error LEDs

---

### 2. WAN Connectivity

**Objective:** Verify gateway can connect to Internet

**Steps:**
1. Connect gateway WAN port to test modem
2. Configure gateway WAN settings
3. Test Internet connectivity from gateway
4. Ping external server (e.g., 8.8.8.8)
5. Test DNS resolution

**Expected Result:**
- Gateway obtains IP address via DHCP or static configuration
- Gateway can ping external servers
- Gateway can resolve DNS queries
- Gateway has Internet access

**Failure Criteria:**
- Gateway cannot obtain IP address
- Gateway cannot ping external servers
- Gateway cannot resolve DNS
- No Internet access

---

### 3. LAN Connectivity

**Objective:** Verify gateway LAN ports work correctly

**Steps:**
1. Connect test access point to gateway LAN port
2. Configure gateway LAN settings
3. Connect test device to access point
4. Verify test device obtains IP address
5. Ping gateway from test device
6. Ping test device from gateway

**Expected Result:**
- Test device obtains IP address via DHCP
- Test device can ping gateway
- Gateway can ping test device
- LAN connectivity works

**Failure Criteria:**
- Test device cannot obtain IP address
- Test device cannot ping gateway
- Gateway cannot ping test device
- LAN connectivity fails

---

### 4. DHCP

**Objective:** Verify DHCP server works correctly

**Steps:**
1. Configure gateway DHCP server
2. Set DHCP scope (e.g., 192.168.100.100 - 192.168.100.200)
3. Set DHCP lease time
4. Set gateway and DNS options
5. Connect test device
6. Verify test device obtains correct IP address
7. Verify test device obtains correct gateway
8. Verify test device obtains correct DNS
9. Verify DHCP lease time
10. Test DHCP renewal

**Expected Result:**
- DHCP server assigns IP addresses correctly
- DHCP options (gateway, DNS) are correct
- DHCP lease time is correct
- DHCP renewal works

**Failure Criteria:**
- DHCP server does not assign IP addresses
- DHCP options are incorrect
- DHCP lease time is incorrect
- DHCP renewal fails

---

### 5. DNS

**Objective:** Verify DNS server works correctly

**Steps:**
1. Configure gateway DNS server
2. Set DNS forwarder (e.g., 8.8.8.8)
3. From test device, resolve domain names
4. Test internal DNS resolution (if configured)
5. Test external DNS resolution
6. Test DNS cache

**Expected Result:**
- DNS server resolves domain names correctly
- Internal DNS resolution works (if configured)
- External DNS resolution works
- DNS cache improves performance

**Failure Criteria:**
- DNS server does not resolve domain names
- DNS resolution fails
- DNS cache not working

---

### 6. Firewall

**Objective:** Verify firewall rules work correctly

**Steps:**
1. Configure default firewall policy (deny inbound, allow outbound)
2. Create test firewall rules
3. Test inbound blocking
4. Test outbound allowing
5. Test specific rule (allow specific port)
6. Test rule logging

**Expected Result:**
- Default policy blocks inbound traffic
- Default policy allows outbound traffic
- Specific rules work correctly
- Firewall logs rule matches

**Failure Criteria:**
- Default policy does not block inbound
- Default policy does not allow outbound
- Specific rules do not work
- Firewall logging fails

---

### 7. Captive Portal

**Objective:** Verify captive portal works correctly

**Steps:**
1. Configure captive portal on gateway
2. Set captive portal zone (e.g., student VLAN)
3. Set captive portal redirect URL
4. Connect test device to captive portal zone
5. Attempt to access Internet
6. Verify redirect to captive portal
7. Verify captive portal page loads
8. Test captive portal authentication
9. Test captive portal logout

**Expected Result:**
- Unauthenticated client is redirected to captive portal
- Captive portal page loads correctly
- Captive portal authentication works
- Captive portal logout works

**Failure Criteria:**
- Unauthenticated client not redirected
- Captive portal page does not load
- Captive portal authentication fails
- Captive portal logout fails

---

### 8. Student Authentication

**Objective:** Verify student authentication through captive portal

**Steps:**
1. Connect test device to captive portal zone
2. Access captive portal
3. Enter test student credentials (student ID + mobile)
4. Submit authentication request
5. Verify backend receives authentication request
6. Verify backend validates credentials
7. Verify backend creates Wi-Fi session
8. Verify backend authorizes gateway client
9. Verify gateway grants Internet access
10. Verify test device can access Internet

**Expected Result:**
- Student authentication succeeds
- Wi-Fi session created
- Gateway client authorized
- Internet access granted

**Failure Criteria:**
- Student authentication fails
- Wi-Fi session not created
- Gateway client not authorized
- Internet access not granted

---

### 9. Backend Communication

**Objective:** Verify gateway can communicate with backend

**Steps:**
1. Configure gateway backend API URL
2. Configure gateway authentication credentials
3. Test gateway API call to backend
4. Test backend API call to gateway
5. Verify TLS/SSL connection
6. Verify authentication works
7. Verify signature validation (if using HMAC)
8. Test request/response format

**Expected Result:**
- Gateway can call backend API
- Backend can call gateway API
- TLS/SSL connection works
- Authentication works
- Signature validation works
- Request/response format matches contract

**Failure Criteria:**
- Gateway cannot call backend API
- Backend cannot call gateway API
- TLS/SSL connection fails
- Authentication fails
- Signature validation fails
- Request/response format mismatch

---

### 10. Client Authorization

**Objective:** Verify client authorization via gateway API

**Steps:**
1. Authenticate student through captive portal
2. Verify backend calls gateway authorization API
3. Verify gateway receives authorization request
4. Verify gateway authorizes client
5. Verify gateway returns success response
6. Verify test device can access Internet
7. Verify gateway session created

**Expected Result:**
- Gateway authorization API works
- Gateway authorizes client
- Gateway returns success
- Internet access granted
- Gateway session created

**Failure Criteria:**
- Gateway authorization API fails
- Gateway does not authorize client
- Gateway returns error
- Internet access not granted
- Gateway session not created

---

### 11. Internet Access

**Objective:** Verify authorized client can access Internet

**Steps:**
1. Authenticate student through captive portal
2. Verify client is authorized
3. Test HTTP access (e.g., http://example.com)
4. Test HTTPS access (e.g., https://example.com)
5. Test DNS resolution
6. Test bandwidth (optional)
7. Test multiple concurrent connections

**Expected Result:**
- Authorized client can access HTTP
- Authorized client can access HTTPS
- DNS resolution works
- Bandwidth is acceptable
- Multiple connections work

**Failure Criteria:**
- HTTP access fails
- HTTPS access fails
- DNS resolution fails
- Bandwidth is unacceptable
- Multiple connections fail

---

### 12. Session Expiration

**Objective:** Verify session expiration works correctly

**Steps:**
1. Authenticate student through captive portal
2. Set short session timeout (e.g., 1 minute)
3. Wait for session to expire
4. Verify backend marks session as expired
5. Verify backend calls gateway deauthorization API
6. Verify gateway deauthorizes client
7. Verify test device loses Internet access
8. Verify test device is redirected to captive portal

**Expected Result:**
- Session expires correctly
- Backend marks session as expired
- Gateway deauthorizes client
- Internet access revoked
- Client redirected to captive portal

**Failure Criteria:**
- Session does not expire
- Backend does not mark session as expired
- Gateway does not deauthorize client
- Internet access not revoked
- Client not redirected to captive portal

---

### 13. Client Deauthorization

**Objective:** Verify client deauthorization via gateway API

**Steps:**
1. Authenticate student through captive portal
2. Manually trigger deauthorization (e.g., admin revokes session)
3. Verify backend calls gateway deauthorization API
4. Verify gateway receives deauthorization request
5. Verify gateway deauthorizes client
6. Verify gateway returns success response
7. Verify test device loses Internet access
8. Verify gateway session removed

**Expected Result:**
- Gateway deauthorization API works
- Gateway deauthorizes client
- Gateway returns success
- Internet access revoked
- Gateway session removed

**Failure Criteria:**
- Gateway deauthorization API fails
- Gateway does not deauthorize client
- Gateway returns error
- Internet access not revoked
- Gateway session not removed

---

### 14. Device Revocation

**Objective:** Verify device revocation works correctly

**Steps:**
1. Authenticate student through captive portal
2. Revoke device through admin panel
3. Verify backend marks device as revoked
4. Verify backend revokes all sessions for device
5. Verify backend calls gateway deauthorization API
6. Verify gateway deauthorizes client
7. Verify test device loses Internet access
8. Verify device cannot re-authenticate

**Expected Result:**
- Device marked as revoked
- All sessions revoked
- Gateway deauthorizes client
- Internet access revoked
- Device cannot re-authenticate

**Failure Criteria:**
- Device not marked as revoked
- Sessions not revoked
- Gateway does not deauthorize client
- Internet access not revoked
- Device can re-authenticate

---

### 15. Membership Expiration

**Objective:** Verify membership expiration works correctly

**Steps:**
1. Authenticate student through captive portal
2. Expire student membership (manual or wait)
3. Verify backend detects membership expiration
4. Verify backend revokes all sessions for student
5. Verify backend calls gateway deauthorization API
6. Verify gateway deauthorizes client
7. Verify test device loses Internet access
8. Verify student cannot re-authenticate

**Expected Result:**
- Membership expiration detected
- All sessions revoked
- Gateway deauthorizes client
- Internet access revoked
- Student cannot re-authenticate

**Failure Criteria:**
- Membership expiration not detected
- Sessions not revoked
- Gateway does not deauthorize client
- Internet access not revoked
- Student can re-authenticate

---

### 16. Gateway Reboot

**Objective:** Verify gateway reboot does not break functionality

**Steps:**
1. Authenticate student through captive portal
2. Reboot gateway
3. Wait for gateway to boot
4. Verify gateway is accessible
5. Verify test device can still access Internet (if gateway supports session persistence)
6. Verify test device is redirected to captive portal (if gateway does not support session persistence)
7. Re-authenticate if needed

**Expected Result:**
- Gateway boots successfully after reboot
- Gateway functionality restored
- Session persistence works (if supported)
- Re-authentication works (if session persistence not supported)

**Failure Criteria:**
- Gateway does not boot after reboot
- Gateway functionality not restored
- Session persistence fails
- Re-authentication fails

---

### 17. Backend Restart

**Objective:** Verify backend restart does not break functionality

**Steps:**
1. Authenticate student through captive portal
2. Restart backend server
3. Wait for backend to start
4. Verify backend is accessible
5. Verify test device can still access Internet (if gateway supports session persistence)
6. Verify test device is redirected to captive portal (if gateway does not support session persistence)
7. Re-authenticate if needed

**Expected Result:**
- Backend boots successfully after restart
- Backend functionality restored
- Session persistence works (if supported)
- Re-authentication works (if session persistence not supported)

**Failure Criteria:**
- Backend does not start after restart
- Backend functionality not restored
- Session persistence fails
- Re-authentication fails

---

### 18. Gateway API Failure

**Objective:** Verify system handles gateway API failure gracefully

**Steps:**
1. Simulate gateway API failure (disconnect network, stop gateway API service)
2. Attempt student authentication
3. Verify backend returns gateway unavailable error
4. Verify gateway fails closed (no access granted)
5. Restore gateway API
6. Verify system recovers

**Expected Result:**
- Backend returns gateway unavailable error
- Gateway fails closed
- No access granted without gateway authorization
- System recovers when gateway API restored

**Failure Criteria:**
- Backend does not detect gateway failure
- Gateway does not fail closed
- Access granted without gateway authorization
- System does not recover

---

### 19. Multiple Simultaneous Students

**Objective:** Verify system handles multiple simultaneous students

**Steps:**
1. Connect multiple test devices (e.g., 5 devices)
2. Authenticate all devices through captive portal
3. Verify all devices can access Internet
4. Verify all sessions are active
5. Verify gateway handles multiple sessions
6. Verify backend handles multiple sessions
7. Test session expiration for all devices
8. Test deauthorization for all devices

**Expected Result:**
- All devices authenticate successfully
- All devices can access Internet
- All sessions are active
- Gateway handles multiple sessions
- Backend handles multiple sessions
- Session expiration works for all
- Deauthorization works for all

**Failure Criteria:**
- Some devices cannot authenticate
- Some devices cannot access Internet
- Sessions not all active
- Gateway cannot handle multiple sessions
- Backend cannot handle multiple sessions
- Session expiration fails for some
- Deauthorization fails for some

---

### 20. Duplicate Authentication

**Objective:** Verify system handles duplicate authentication attempts

**Steps:**
1. Authenticate student through captive portal
2. Attempt to authenticate same student again (same device)
3. Verify backend detects duplicate authentication
4. Verify backend returns existing session (if supported)
5. Verify backend creates new session (if not supported)
6. Verify gateway handles duplicate authorization

**Expected Result:**
- Duplicate authentication detected
- Existing session returned (if supported)
- New session created (if not supported)
- Gateway handles duplicate authorization

**Failure Criteria:**
- Duplicate authentication not detected
- Duplicate session created (should reuse)
- Gateway authorization fails on duplicate

---

## Test Results

### Test Execution Checklist

- [ ] 1. Gateway Boots
- [ ] 2. WAN Connectivity
- [ ] 3. LAN Connectivity
- [ ] 4. DHCP
- [ ] 5. DNS
- [ ] 6. Firewall
- [ ] 7. Captive Portal
- [ ] 8. Student Authentication
- [ ] 9. Backend Communication
- [ ] 10. Client Authorization
- [ ] 11. Internet Access
- [ ] 12. Session Expiration
- [ ] 13. Client Deauthorization
- [ ] 14. Device Revocation
- [ ] 15. Membership Expiration
- [ ] 16. Gateway Reboot
- [ ] 17. Backend Restart
- [ ] 18. Gateway API Failure
- [ ] 19. Multiple Simultaneous Students
- [ ] 20. Duplicate Authentication

### Pass/Fail Criteria

**All 20 tests must pass before production deployment.**

If any test fails:
1. Document failure
2. Investigate root cause
3. Fix issue
4. Retest
5. Do not proceed to production until all tests pass

---

## Test Environment Cleanup

### After Testing

1. Disconnect test gateway from test network
2. Reset gateway to factory defaults (if returning or reusing)
3. Document test results
4. Archive test logs
5. Clean up test devices

### Before Production Deployment

1. Select production gateway based on test results
2. Purchase production gateway hardware
3. Configure production gateway with production settings
4. Perform final smoke test in lab environment
5. Plan production deployment
6. Schedule maintenance window
7. Prepare rollback plan

---

## Conclusion

This test plan ensures that the physical gateway is thoroughly tested before production deployment. All tests must be performed in an isolated lab environment to avoid disrupting the production library network.

**Status:** TEST PLAN DEFINED  
**Next Step:** Perform tests in isolated lab environment after gateway selection.

**IMPORTANT:** No production deployment until all 20 tests pass.
