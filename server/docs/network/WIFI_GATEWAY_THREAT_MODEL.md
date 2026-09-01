# Wi-Fi Gateway Threat Model

**Date:** August 31, 2026  
**PART:** 10 - External Gateway Selection, Lab Setup & Physical Integration Contract

---

## Overview

This document analyzes security threats to the Wi-Fi gateway integration and defines mitigation strategies. Each threat is assessed for risk, mitigation, and residual risk.

**Status:** THREAT MODEL DEFINED

---

## Threat Analysis

### 1. Rogue Gateway

**Threat:** Attacker deploys a rogue gateway with same SSID to intercept traffic.

**Risk:** HIGH

**Attack Vector:**
- Attacker sets up rogue access point with same SSID as library Wi-Fi
- Attacker configures gateway to capture credentials
- Students connect to rogue gateway instead of legitimate gateway
- Attacker captures student credentials and session tokens

**Mitigation:**
- Implement WPA3-Enterprise (802.1X) with certificate validation
- Use gateway certificate pinning
- Implement rogue AP detection
- Educate students to verify legitimate SSID
- Use captive portal with HTTPS (TLS)
- Implement certificate transparency monitoring

**Residual Risk:** LOW

---

### 2. Rogue Client

**Threat:** Attacker connects to network and performs malicious activities.

**Risk:** MEDIUM

**Attack Vector:**
- Attacker connects to student network
- Attacker performs network scanning
- Attacker attempts to access other devices
- Attacker attempts to access backend infrastructure

**Mitigation:**
- Implement client isolation (AP isolation)
- Implement VLAN segmentation
- Implement firewall rules to block inter-client communication
- Implement firewall rules to block student-to-infrastructure access
- Implement network monitoring and intrusion detection
- Implement rate limiting per client
- Implement MAC address filtering (optional, not primary defense)

**Residual Risk:** LOW

---

### 3. Credential Brute Force

**Threat:** Attacker attempts to brute force student credentials.

**Risk:** MEDIUM

**Attack Vector:**
- Attacker automates credential guessing
- Attacker uses common student IDs
- Attacker uses common mobile numbers
- Attacker attempts to bypass rate limiting

**Mitigation:**
- Implement rate limiting per IP address
- Implement rate limiting per student ID
- Implement account lockout after failed attempts
- Implement CAPTCHA for repeated failures
- Implement IP allowlisting for gateway
- Monitor for brute force patterns
- Alert administrators on suspicious activity

**Residual Risk:** LOW

---

### 4. Session Replay

**Threat:** Attacker replays valid session token to gain unauthorized access.

**Risk:** MEDIUM

**Attack Vector:**
- Attacker captures valid session token
- Attacker replays token to authenticate
- Attacker gains access using replayed token

**Mitigation:**
- Use short-lived JWT tokens (12 hours)
- Implement token expiration
- Implement token revocation on logout
- Implement token binding to client IP (optional)
- Implement token binding to device fingerprint (optional)
- Implement nonce/timestamp validation for gateway requests
- Implement replay detection (cache used nonces)

**Residual Risk:** LOW

---

### 5. Token Theft

**Threat:** Attacker steals valid session token.

**Risk:** MEDIUM

**Attack Vector:**
- Attacker intercepts token via network sniffing
- Attacker steals token via XSS
- Attacker steals token via physical access
- Attacker steals token via log exposure

**Mitigation:**
- Use HTTPS for all communications (TLS 1.2+)
- Implement HTTP Strict Transport Security (HSTS)
- Implement secure cookie flags (HttpOnly, Secure, SameSite)
- Implement Content Security Policy (CSP)
- Implement XSS protection
- Never log tokens
- Never expose tokens in API responses
- Implement token expiration

**Residual Risk:** LOW

---

### 6. MAC Spoofing

**Threat:** Attacker spoofs MAC address of authorized device.

**Risk:** LOW

**Attack Vector:**
- Attacker changes device MAC address to match authorized device
- Attacker attempts to authenticate using spoofed MAC

**Mitigation:**
- Do NOT use MAC address as primary identity
- Use student credentials as primary identity
- Use device registration as secondary validation
- Implement device fingerprinting (user-agent, etc.)
- Implement session validation beyond MAC address
- Monitor for MAC address conflicts

**Residual Risk:** LOW

**Note:** MAC spoofing is not a significant threat because MAC address is used only as a fingerprint, not as identity. Student credentials are the authoritative identity.

---

### 7. IP Spoofing

**Threat:** Attacker spoofs IP address to bypass restrictions.

**Risk:** LOW

**Attack Vector:**
- Attacker spoofs IP address of authorized device
- Attacker attempts to bypass IP-based restrictions

**Mitigation:**
- Do NOT rely solely on IP address for authorization
- Use session tokens for authorization
- Implement gateway-level client identification (MAC address)
- Implement network-level anti-spoofing (if supported by gateway)
- Monitor for IP address conflicts

**Residual Risk:** LOW

**Note:** IP spoofing is not a significant threat because authorization is based on session tokens, not IP addresses.

---

### 8. Gateway Impersonation

**Threat:** Attacker impersonates legitimate gateway to backend.

**Risk:** MEDIUM

**Attack Vector:**
- Attacker spoofs gateway IP address
- Attacker attempts to call backend API
- Attacker attempts to authorize unauthorized clients

**Mitigation:**
- Implement gateway authentication (API key + HMAC signature, mTLS, or JWT)
- Implement IP allowlisting for gateway
- Implement timestamp validation
- Implement replay detection
- Implement TLS certificate validation
- Never rely solely on X-Gateway-ID header

**Residual Risk:** LOW

---

### 9. Backend Impersonation

**Threat:** Attacker impersonates legitimate backend to gateway.

**Risk:** MEDIUM

**Attack Vector:**
- Attacker spoofs backend IP address
- Attacker attempts to call gateway API
- Attacker attempts to deauthorize legitimate clients

**Mitigation:**
- Implement backend authentication to gateway (mutual TLS or API key)
- Implement IP allowlisting for backend
- Implement TLS certificate validation
- Gateway should validate backend certificate
- Gateway should validate backend IP address

**Residual Risk:** LOW

---

### 10. Captive Portal Phishing

**Threat:** Attacker creates phishing captive portal to steal credentials.

**Risk:** MEDIUM

**Attack Vector:**
- Attacker creates fake captive portal
- Attacker uses similar domain or design
- Students enter credentials into phishing portal
- Attacker captures credentials

**Mitigation:**
- Use HTTPS for captive portal (TLS)
- Implement HSTS
- Implement certificate transparency monitoring
- Educate students to verify legitimate portal URL
- Implement certificate pinning (optional)
- Monitor for phishing domains

**Residual Risk:** LOW

---

### 11. Open Redirect

**Threat:** Attacker uses open redirect to phishing site.

**Risk:** LOW

**Attack Vector:**
- Attacker manipulates redirect URL parameter
- Attacker redirects student to phishing site
- Student enters credentials into phishing site

**Mitigation:**
- Validate redirect URLs (allowlist)
- Use relative URLs where possible
- Implement redirect URL validation
- Never trust user-provided redirect URLs

**Residual Risk:** LOW

---

### 12. Session Fixation

**Threat:** Attacker fixes session ID to hijack session.

**Risk:** LOW

**Attack Vector:**
- Attacker obtains session ID
- Attacker tricks victim into using fixed session ID
- Attacker hijacks victim's session

**Mitigation:**
- Generate new session ID on authentication
- Regenerate session ID on privilege escalation
- Implement secure session ID generation (cryptographically random)
- Invalidate old session ID after regeneration

**Residual Risk:** LOW

---

### 13. Expired Session Reuse

**Threat:** Attacker reuses expired session token.

**Risk:** LOW

**Attack Vector:**
- Attacker obtains expired session token
- Attacker attempts to reuse expired token
- Attacker gains access if validation is broken

**Mitigation:**
- Implement strict token expiration validation
- Implement token revocation on logout
- Implement token revocation on session expiration
- Cache revoked tokens for expiration period

**Residual Risk:** LOW

---

### 14. Revoked Device Reuse

**Threat:** Attacker reuses credentials from revoked device.

**Risk:** LOW

**Attack Vector:**
- Device is revoked
- Attacker obtains device credentials
- Attacker attempts to authenticate using revoked device

**Mitigation:**
- Validate device status on authentication
- Reject authentication from revoked devices
- Invalidate all sessions for revoked device
- Alert administrators on revoked device authentication attempts

**Residual Risk:** LOW

---

### 15. Membership Expiry Bypass

**Threat:** Attacker bypasses membership expiry check.

**Risk:** LOW

**Attack Vector:**
- Attacker attempts to authenticate with expired membership
- Attacker attempts to manipulate membership expiry date
- Attacker attempts to bypass membership validation

**Mitigation:**
- Validate membership status on every authentication
- Validate membership expiry date on every authentication
- Use server-side membership validation (never client-side)
- Invalidate sessions when membership expires
- Log membership expiry bypass attempts

**Residual Risk:** LOW

---

### 16. Gateway API Compromise

**Threat:** Attacker compromises gateway API credentials.

**Risk:** MEDIUM

**Attack Vector:**
- Attacker obtains gateway API credentials
- Attacker uses credentials to call backend API
- Attacker authorizes unauthorized clients

**Mitigation:**
- Store credentials in environment variables or secret manager
- Implement credential rotation
- Use short-lived credentials (if supported)
- Monitor for unusual API activity
- Implement rate limiting per gateway
- Alert administrators on credential compromise
- Revoke compromised credentials immediately

**Residual Risk:** LOW

---

## Security Controls Summary

### Authentication

- Student credentials (student ID + mobile)
- Gateway authentication (API key + HMAC, mTLS, or JWT)
- Backend authentication to gateway
- Session tokens (JWT)

### Authorization

- Session-based authorization
- Device registration validation
- Membership validation
- Gateway authorization enforcement

### Network Security

- VLAN segmentation
- Client isolation
- Firewall rules
- IP allowlisting
- TLS encryption

### Application Security

- Rate limiting
- Input validation
- Output encoding
- CSRF protection
- XSS protection
- HSTS
- CSP

### Monitoring

- Audit logging
- Gateway health monitoring
- Failed authentication monitoring
- Unusual activity detection
- Alerting

---

## Residual Risk Assessment

### High Risk Threats

**None after mitigation.**

### Medium Risk Threats

**None after mitigation.**

### Low Risk Threats

All threats reduced to LOW risk through implemented mitigations.

---

## Security Recommendations

### Immediate (Before Deployment)

1. Implement gateway authentication (API key + HMAC signature recommended)
2. Implement IP allowlisting for gateway
3. Implement TLS for all communications
4. Implement rate limiting
5. Implement audit logging
6. Implement client isolation
7. Implement VLAN segmentation

### Short Term (After Deployment)

1. Implement rogue AP detection
2. Implement network monitoring
3. Implement intrusion detection
4. Implement certificate transparency monitoring
5. Implement security incident response plan

### Long Term (Ongoing)

1. Regular security audits
2. Regular penetration testing
3. Regular security training for staff
4. Regular credential rotation
5. Regular firmware updates
6. Regular security reviews

---

## Conclusion

This threat model identifies 16 potential security threats to the Wi-Fi gateway integration. All threats have been mitigated to LOW residual risk through implemented security controls. The system is designed with defense-in-depth principles, with multiple layers of security controls.

**Status:** THREAT MODEL COMPLETE  
**Residual Risk:** LOW

**IMPORTANT:** Security is an ongoing process. Regular security reviews, updates, and monitoring are required to maintain security posture.
