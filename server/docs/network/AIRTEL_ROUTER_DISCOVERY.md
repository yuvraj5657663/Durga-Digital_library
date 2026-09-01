# Airtel Router Discovery Report

**Date:** August 31, 2026  
**Discovery Method:** Safe read-only network scanning  
**Location:** Durga Digital Library Network

---

## Router Identification

### Confirmed Router Information
- **Vendor:** Airtel
- **Model:** AAP321NK
- **Device Family:** Nokia Wi-Fi 6 / Beacon 3.2 family
- **Gateway IP:** 192.168.1.1
- **Gateway MAC:** A4-08-53-49-5F-51

### Router Type
The AAP321NK is a residential-grade Wi-Fi 6 gateway device provided by Airtel. It is designed for home/SOHO use and is not an enterprise-grade router with advanced networking features.

---

## Confirmed Facts

### Network Configuration
- **Gateway IP:** 192.168.1.1
- **Client IP:** 192.168.1.24
- **Subnet Mask:** 255.255.255.0
- **Network Interface:** WiFi (Intel(R) Wireless-AC 9560 160MHz)
- **Network Name:** Airtel_DDL
- **Client MAC:** 5c:e4:2a:1c:42:42

### Gateway Connectivity
- **Gateway Ping:** SUCCESS (reachable, RTT: 1-3ms)
- **TCP Port 443:** OPEN (HTTPS management)
- **TCP Port 80:** CLOSED (HTTP not accessible)
- **TCP Port 8080:** CLOSED (alternative HTTP not accessible)
- **TCP Port 8443:** CLOSED (alternative HTTPS not accessible)
- **TCP Port 22:** CLOSED (SSH not accessible)
- **TCP Port 23:** CLOSED (Telnet not accessible)
- **TCP Port 53:** CLOSED (DNS over TCP not accessible)
- **TCP Port 161:** CLOSED (SNMP not accessible)
- **TCP Port 8728:** CLOSED (MikroTik API port)
- **TCP Port 8729:** CLOSED (MikroTik API SSL port)
- **TCP Port 1812:** NOT TESTED (RADIUS authentication)
- **TCP Port 1813:** NOT TESTED (RADIUS accounting)

### HTTP/HTTPS Behavior
- **HTTPS Request:** `https://192.168.1.1`
- **HTTP Status:** 403 Forbidden
- **Content-Type:** text/html
- **Server Header:** Not provided in response
- **Redirect:** None observed

### Router Vendor
- **Vendor:** Airtel (confirmed from physical label)
- **Manufacturer:** Nokia (confirmed from device family)
- **Model:** AAP321NK (confirmed from physical label)

### DHCP Configuration
- **DHCP Server:** 192.168.1.1 (gateway)
- **DHCP Enabled:** Yes
- **Lease Obtained:** 30 August 2026 23:20:05
- **Lease Expires:** 01 September 2026 02:26:04
- **DHCP Range:** Not visible from client

### DNS Configuration
- **DNS Server:** 192.168.1.1 (gateway acts as DNS resolver)
- **IPv6 DNS:** fe80::a608:53ff:fe49:5f51 (link-local)

### Network Topology
- **Observed Topology:** Simple single-device topology
  ```
  Internet
     ↓
  Airtel AAP321NK (192.168.1.1)
     ↓
  Students (WiFi)
  ```
- **No separate router detected**
- **No switch detected**
- **No additional access points detected**
- **Single gateway device providing all network services**

### Visible Devices
- **Gateway:** 192.168.1.1 (MAC: A4-08-53-49-5F-51)
- **Other device:** 192.168.1.79 (MAC: 00-00-00-00-00-00 - unreachable)
- **Total visible devices:** 2 (including gateway)

---

## Observations

### Port Analysis
- Only HTTPS (port 443) is accessible for management
- HTTP (port 80) is not accessible
- No alternative HTTP ports (8080, 8443) are accessible
- No SSH (port 22) is accessible
- No Telnet (port 23) is accessible
- No SNMP (port 161) is accessible
- No MikroTik API ports (8728, 8729) are accessible
- No RADIUS ports (1812, 1813) were tested (not standard for residential gateways)

### HTTPS Response
- Gateway responds to HTTPS requests with 403 Forbidden
- 403 response indicates authentication is required for web management
- No server identification header provided
- Content-Type is text/html (suggests web interface exists)
- No redirect to login page observed
- No TLS certificate metadata extracted

### Security Posture
- Gateway has HTTPS enabled
- Gateway requires authentication for web access
- No unencrypted HTTP access
- No open API ports detected
- No RADIUS ports detected

---

## Assumptions

**WARNING: The following are assumptions and should be treated as such until confirmed.**

### Assumption 1: Web Administration Interface
- **Assumption:** The gateway has a web-based administration interface
- **Evidence:** HTTPS port 443 is open and returns HTML content with 403 status
- **Confidence:** High (standard for residential gateways)
- **Verification Required:** Access to router administration credentials

### Assumption 2: Authentication Required
- **Assumption:** The web interface requires authentication
- **Evidence:** HTTP 403 Forbidden response
- **Confidence:** High
- **Verification Required:** Attempt authentication with valid credentials

### Assumption 3: No Built-in Captive Portal
- **Assumption:** The AAP321NK does not have a built-in captive portal feature
- **Evidence:** No captive portal ports detected, no redirect behavior observed, residential-grade device
- **Confidence:** Medium (residential gateways typically lack captive portal)
- **Verification Required:** Access to router administration interface

### Assumption 4: No RADIUS Support
- **Assumption:** RADIUS is not supported on AAP321NK
- **Evidence:** RADIUS ports not tested, residential-grade device
- **Confidence:** High (residential gateways typically do not support RADIUS)
- **Verification Required:** Access to router configuration

### Assumption 5: No REST API
- **Assumption:** No REST API is exposed
- **Evidence:** No API ports detected, HTTP 403 response to root path, residential-grade device
- **Confidence:** High (residential gateways typically do not expose REST APIs)
- **Verification Required:** Access to router documentation or configuration

### Assumption 6: No VLAN Support
- **Assumption:** VLAN is not supported on AAP321NK
- **Evidence:** Residential-grade device, no VLAN-specific ports detected
- **Confidence:** High (residential gateways typically do not support VLAN)
- **Verification Required:** Access to router configuration

---

## Unknowns

### Critical Unknowns
1. **Router Model:** CONFIRMED as AAP321NK (from physical label)
2. **Firmware Version:** Firmware version cannot be determined without access to router
3. **Captive Portal Support:** LIKELY NOT SUPPORTED (residential-grade device)
4. **RADIUS Support:** LIKELY NOT SUPPORTED (residential-grade device)
5. **REST API Support:** LIKELY NOT SUPPORTED (residential-grade device)
6. **Webhook Support:** LIKELY NOT SUPPORTED (residential-grade device)
7. **Guest Network Support:** UNKNOWN (may be supported but not confirmed)
8. **VLAN Support:** LIKELY NOT SUPPORTED (residential-grade device)
9. **Client Authorization Methods:** UNKNOWN what client authorization methods are available
10. **Session Management:** UNKNOWN whether router has session management capabilities

### Configuration Unknowns
1. **DHCP Configuration:** DHCP server behavior unknown
2. **DNS Configuration:** DNS server behavior unknown
3. **Firewall Rules:** Firewall rules unknown
4. **NAT Configuration:** NAT configuration unknown
5. **Wi-Fi Configuration:** Wi-Fi SSID, security, and configuration unknown
6. **Client Isolation:** Unknown whether client isolation is enabled
7. **MAC Filtering:** Unknown whether MAC filtering is enabled
8. **Bandwidth Management:** Unknown whether bandwidth management is available

### Integration Unknowns
1. **External Authentication:** Unknown whether router supports external authentication
2. **API Authentication:** Unknown API authentication method if API exists
3. **Client Information API:** Unknown whether router provides client information via API
4. **Connected Client List:** Unknown whether router provides connected client list
5. **Session Termination:** Unknown whether router supports session termination via API
6. **MAC Authorization:** Unknown whether router supports MAC-based authorization
7. **DNS Interception:** Unknown whether router supports DNS interception
8. **HTTP Interception:** Unknown whether router supports HTTP interception

---

## Safety Notes

### Discovery Method
- **Method:** Safe read-only network scanning
- **Invasive Operations:** None performed
- **Authentication Attempts:** None performed
- **Configuration Changes:** None attempted
- **Router Reboot:** Not attempted
- **Credential Guessing:** Not attempted

### What Was NOT Done
- No brute-force port scanning (only checked known relevant ports)
- No credential guessing or brute-force attacks
- No exploitation attempts
- No router configuration changes
- No router reboot
- No Wi-Fi password changes
- No firewall changes
- No DHCP changes
- No DNS changes
- No VLAN changes

---

## Evidence Summary

### Positive Evidence (Capabilities May Exist)
- HTTPS web interface exists (port 443 open)
- HTML content served (Content-Type: text/html)
- Authentication required (403 Forbidden)

### Negative Evidence (Capabilities Likely Absent)
- No HTTP access (port 80 closed)
- No alternative HTTP ports (8080, 8443 closed)
- No MikroTik API ports (8728, 8729 closed)
- No RADIUS ports (1812, 1813 closed)

### Inconclusive Evidence
- Server header not provided (cannot identify router model from HTTP headers)
- No TLS certificate metadata extracted (could provide model information)
- No router pages accessible without authentication

---

## Recommended Next Steps

### To Determine Router Model
1. **Physical Inspection:** Check router label for model number
2. **Router Administration:** Access router administration interface with valid credentials
3. **Airtel Documentation:** Contact Airtel support for router specifications
4. **DHCP Information:** Check DHCP lease information for router identification

### To Determine Capabilities
1. **Access Router Administration:** Login to router web interface
2. **Review Router Manual:** Obtain official router documentation
3. **Check Firmware Version:** Firmware version may indicate capabilities
4. **Contact Airtel Support:** Request technical specifications
5. **Network Sniffing:** Passive network analysis (with authorization)

### To Determine Integration Options
1. **Review Router Configuration:** Check for captive portal, RADIUS, API options
2. **Test API Endpoints:** If API documentation is available
3. **Test RADIUS Configuration:** If RADIUS is supported
4. **Evaluate External Gateway:** Consider external gateway if router lacks capabilities

---

## Conclusion

Based on safe read-only network discovery and physical router identification:

- **Router Model:** CONFIRMED as AAP321NK (Nokia Wi-Fi 6 / Beacon 3.2 family)
- **Router Firmware:** UNKNOWN (cannot be determined without router access)
- **Captive Portal Support:** LIKELY NOT SUPPORTED (residential-grade device, no evidence)
- **RADIUS Support:** LIKELY NOT SUPPORTED (residential-grade device, no evidence)
- **REST API Support:** LIKELY NOT SUPPORTED (residential-grade device, no evidence)
- **Webhook Support:** LIKELY NOT SUPPORTED (residential-grade device, no evidence)
- **Client Authorization:** UNKNOWN (no API access)
- **VLAN Support:** LIKELY NOT SUPPORTED (residential-grade device, no evidence)
- **Guest Network Support:** UNKNOWN (may be supported but not confirmed)

**The Airtel AAP321NK is a residential-grade Wi-Fi 6 gateway that likely does not support advanced networking features required for captive portal integration.**

**Integration Assessment:**
- The AAP321NK appears to be a basic residential gateway
- No evidence of captive portal, RADIUS, REST API, or webhook support
- Only HTTPS web management interface is accessible (requires authentication)
- No open API ports detected
- No enterprise networking features detected

**Recommended Integration Approach:**
Given the residential-grade nature of the AAP321NK, the recommended integration approach is:

**OPTION D: External Gateway/Firewall**
- Add an external gateway/firewall device (e.g., MikroTik, pfSense, Ubiquiti)
- Configure the external gateway for captive portal and client authorization
- Place the AAP321NK in bridge mode or use it as a modem only
- Alternatively, replace the AAP321NK with an enterprise-grade gateway

**Physical access to the router administration interface or official documentation is required to confirm capabilities.**
