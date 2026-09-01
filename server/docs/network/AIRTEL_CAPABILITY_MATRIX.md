# Airtel Router Capability Matrix

**Date:** August 31, 2026  
**Router Vendor:** Airtel  
**Router Model:** AAP321NK (Nokia Wi-Fi 6 / Beacon 3.2 family)  
**Discovery Method:** Safe read-only network scanning + physical inspection

---

## Capability Matrix

| Capability | Status | Evidence | Integration Impact |
|------------|--------|----------|-------------------|
| **Captive Portal** | LIKELY_NOT_SUPPORTED | No captive portal ports detected; no redirect behavior observed; AAP321NK is residential-grade device | Cannot implement captive portal integration; requires external gateway |
| **Hotspot** | LIKELY_NOT_SUPPORTED | No hotspot-specific ports detected; AAP321NK is residential-grade device | Cannot implement hotspot integration; requires external gateway |
| **REST API** | LIKELY_NOT_SUPPORTED | No API ports detected; HTTP 403 response to root path; AAP321NK is residential-grade device | Cannot implement REST API integration; requires external gateway |
| **RADIUS** | LIKELY_NOT_SUPPORTED | RADIUS ports not tested; AAP321NK is residential-grade device; not typical for residential gateways | Cannot implement RADIUS integration; requires external gateway |
| **Webhooks** | LIKELY_NOT_SUPPORTED | No webhook ports detected; AAP321NK is residential-grade device | Cannot implement webhook integration; requires external gateway |
| **Client IP Visibility** | SUPPORTED | Gateway reachable; client IP known (192.168.1.24) from DHCP | Client IP available from request headers; no API access to router client list |
| **Client MAC Visibility** | SUPPORTED | Client MAC known from local network interface; ARP table shows gateway MAC | Client MAC available from request headers; no API access to router client list |
| **Connected Client List** | UNKNOWN | No API access; ARP table shows limited devices | Cannot retrieve connected client list without router API access |
| **Session Management** | LIKELY_NOT_SUPPORTED | No session management ports detected; AAP321NK is residential-grade device | Cannot implement session management; requires external gateway |
| **External Authentication** | LIKELY_NOT_SUPPORTED | No external authentication ports detected; AAP321NK is residential-grade device | Cannot implement external authentication; requires external gateway |
| **Guest Network** | UNKNOWN | No guest network ports detected; may be supported but not confirmed | Cannot implement guest network integration without router configuration access |
| **VLAN** | LIKELY_NOT_SUPPORTED | No VLAN-specific ports detected; AAP321NK is residential-grade device | Cannot implement VLAN integration; requires external gateway |
| **Client Isolation** | UNKNOWN | No evidence; requires router configuration access | Cannot determine client isolation without router configuration access |
| **Firewall Rules** | UNKNOWN | No evidence; requires router configuration access | Cannot implement firewall rule integration without router configuration access |
| **MAC Authorization** | LIKELY_NOT_SUPPORTED | No MAC authorization ports detected; AAP321NK is residential-grade device | Cannot implement MAC authorization; requires external gateway |
| **DNS Interception** | UNKNOWN | No evidence; requires router configuration access | Cannot implement DNS interception without router configuration access |
| **HTTP Interception** | UNKNOWN | No evidence; requires router configuration access | Cannot implement HTTP interception without router configuration access |
| **HTTPS Interception** | UNKNOWN | No evidence; requires router configuration access | Cannot implement HTTPS interception without router configuration access |
| **Web Administration Interface** | LIKELY | HTTPS port 443 open; returns HTML content with 403 Forbidden | Web interface exists but requires authentication; no API access without credentials |
| **HTTPS Access** | SUPPORTED | TCP port 443 open; HTTPS responds with 403 Forbidden | Router has HTTPS enabled; authentication required |
| **HTTP Access** | NOT_SUPPORTED | TCP port 80 closed | No unencrypted HTTP access to router |
| **SSH Access** | NOT_SUPPORTED | TCP port 22 closed | No SSH access to router |
| **Telnet Access** | NOT_SUPPORTED | TCP port 23 closed | No Telnet access to router |
| **SNMP Access** | NOT_SUPPORTED | TCP port 161 closed | No SNMP access to router |
| **MikroTik API** | NOT_SUPPORTED | TCP ports 8728, 8729 closed | Router is not MikroTik (Nokia device) |
| **DHCP Server** | SUPPORTED | Client has DHCP lease (192.168.1.24/255.255.255.0); DHCP server is 192.168.1.1 | DHCP server is functional; no API access to DHCP information |
| **DNS Server** | SUPPORTED | DNS server is 192.168.1.1 (gateway acts as DNS resolver) | DNS server is functional; no API access to DNS information |

---

## Status Definitions

- **SUPPORTED:** Capability is confirmed to exist based on evidence
- **NOT_SUPPORTED:** Capability is confirmed to NOT exist based on evidence
- **LIKELY:** Capability likely exists based on indirect evidence
- **LIKELY_NOT_SUPPORTED:** Capability likely does NOT exist based on evidence (residential-grade device)
- **UNKNOWN:** Capability cannot be determined from available evidence

---

## Evidence Sources

### Positive Evidence (Capabilities May Exist)
- HTTPS web interface exists (port 443 open, returns HTML)
- DHCP server functional (client has DHCP lease from 192.168.1.1)
- DNS server functional (192.168.1.1 acts as DNS resolver)
- Gateway reachable (ping successful, RTT: 1-3ms)
- Router model confirmed as AAP321NK (Nokia Wi-Fi 6 / Beacon 3.2 family)

### Negative Evidence (Capabilities Likely Absent)
- No HTTP access (port 80 closed)
- No SSH access (port 22 closed)
- No Telnet access (port 23 closed)
- No SNMP access (port 161 closed)
- No MikroTik API ports (8728, 8729 closed)
- No alternative HTTP ports (8080, 8443 closed)
- Router is residential-grade device (AAP321NK)
- No enterprise networking features detected

### Inconclusive Evidence
- Router firmware version unknown (no access to router administration interface)
- No access to router administration interface (authentication required)
- No router documentation available
- Guest network support unknown (may be supported but not confirmed)
- Client isolation unknown (requires router configuration access)
- Firewall rules unknown (requires router configuration access)

---

## Integration Impact Analysis

### Capabilities That Block Integration
The following capabilities are LIKELY_NOT_SUPPORTED and block direct router integration:

1. **Captive Portal** - LIKELY_NOT_SUPPORTED (residential-grade device, no evidence)
2. **RADIUS** - LIKELY_NOT_SUPPORTED (residential-grade device, not typical)
3. **REST API** - LIKELY_NOT_SUPPORTED (residential-grade device, no evidence)
4. **Session Management** - LIKELY_NOT_SUPPORTED (residential-grade device, no evidence)
5. **Client Authorization** - LIKELY_NOT_SUPPORTED (residential-grade device, no evidence)
6. **VLAN** - LIKELY_NOT_SUPPORTED (residential-grade device, no evidence)
7. **External Authentication** - LIKELY_NOT_SUPPORTED (residential-grade device, no evidence)
8. **Webhooks** - LIKELY_NOT_SUPPORTED (residential-grade device, no evidence)

### Capabilities That Require Investigation
The following capabilities are UNKNOWN and require router configuration access:

1. **Guest Network** - May be supported but not confirmed
2. **Client Isolation** - Unknown without router configuration access
3. **Firewall Rules** - Unknown without router configuration access
4. **Connected Client List** - Unknown without router API access

### Capabilities That Are Not Required
The following capabilities are not required for the current architecture:

1. **HTTP Access** - HTTPS is sufficient
2. **SSH/Telnet Access** - Not required for captive portal
3. **SNMP Access** - Not required for captive portal
4. **MikroTik API** - Router is not MikroTik (Nokia device)
5. **DNS/HTTP/HTTPS Interception** - Not required for captive portal

---

## Conclusion

Based on safe read-only network discovery and physical router inspection:

- **Total Capabilities Evaluated:** 26
- **SUPPORTED:** 4 (HTTPS Access, Client IP Visibility, Client MAC Visibility, DHCP Server, DNS Server)
- **NOT_SUPPORTED:** 7 (HTTP Access, SSH Access, Telnet Access, SNMP Access, MikroTik API, RADIUS ports)
- **LIKELY:** 1 (Web Administration Interface)
- **LIKELY_NOT_SUPPORTED:** 8 (Captive Portal, Hotspot, REST API, RADIUS, Webhooks, Session Management, External Authentication, VLAN, MAC Authorization)
- **UNKNOWN:** 3 (Guest Network, Client Isolation, Firewall Rules, Connected Client List, DNS/HTTP/HTTPS Interception)

**The Airtel AAP321NK is a residential-grade Wi-Fi 6 gateway that likely does not support advanced networking features required for captive portal integration.**

**Integration Assessment:**
- The AAP321NK is a basic residential gateway designed for home/SOHO use
- No evidence of captive portal, RADIUS, REST API, or webhook support
- Only HTTPS web management interface is accessible (requires authentication)
- No open API ports detected
- No enterprise networking features detected
- DHCP and DNS servers are functional but no API access

**Recommended Integration Approach:**
Given the residential-grade nature of the AAP321NK, the recommended integration approach is:

**OPTION D: External Gateway/Firewall**
- Add an external gateway/firewall device (e.g., MikroTik, pfSense, Ubiquiti)
- Configure the external gateway for captive portal and client authorization
- Place the AAP321NK in bridge mode or use it as a modem only
- Alternatively, replace the AAP321NK with an enterprise-grade gateway

**Required Next Steps:**
1. Physical access to router administration interface to confirm capabilities
2. Review official AAP321NK documentation from Airtel/Nokia
3. Evaluate external gateway options (MikroTik, pfSense, Ubiquiti)
4. Plan network topology changes for external gateway deployment
