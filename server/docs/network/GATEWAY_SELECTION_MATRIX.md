# Gateway Selection Matrix

**Date:** August 31, 2026  
**PART:** 10 - External Gateway Selection, Lab Setup & Physical Integration Contract

---

## Overview

This document compares possible gateway platforms for external gateway integration with the Durga Digital Library Wi-Fi attendance system. The goal is to select a gateway that provides captive portal, client authorization, and network enforcement capabilities.

**Status:** NO WINNER DECLARED - Requires hardware testing

---

## Evaluation Criteria

### Core Requirements

- Captive portal support
- External authentication
- RADIUS support
- REST/API availability
- Firewall capabilities
- VLAN support
- DHCP
- DNS
- Client identification
- Session management
- Client authorization
- Client deauthorization
- API automation
- Webhook/event support

### Operational Requirements

- Hardware availability
- Cost
- Reliability
- Documentation
- Community support
- Ease of integration with Node.js backend
- Ease of deployment in a small library
- Security
- Maintenance complexity

---

## Platform Comparison

### 1. MikroTik

#### Core Capabilities

| Capability | Status | Notes |
|-----------|--------|-------|
| Captive portal support | CONFIRMED | Built-in captive portal with Hotspot feature |
| External authentication | CONFIRMED | Supports HTTP/HTTPS external authentication |
| RADIUS support | CONFIRMED | Full RADIUS client and server support |
| REST/API availability | CONFIRMED | RouterOS API (port 8728) and REST API (port 8729) |
| Firewall capabilities | CONFIRMED | Stateful firewall with advanced filtering |
| VLAN support | CONFIRMED | Full 802.1Q VLAN support |
| DHCP | CONFIRMED | Built-in DHCP server with relay support |
| DNS | CONFIRMED | Built-in DNS server with cache |
| Client identification | CONFIRMED | MAC address, IP, DHCP lease tracking |
| Session management | CONFIRMED | Hotspot session management with timeouts |
| Client authorization | CONFIRMED | Hotspot user management and authorization |
| Client deauthorization | CONFIRMED | Hotspot user removal and session termination |
| API automation | CONFIRMED | API supports all operations programmatically |
| Webhook/event support | LIKELY | Scripting capabilities, webhook support requires verification |

#### Operational Factors

| Factor | Status | Notes |
|--------|--------|-------|
| Hardware availability | CONFIRMED | Widely available globally |
| Cost | CONFIRMED | Low to medium cost depending on model |
| Reliability | CONFIRMED | Industrial-grade, high reliability |
| Documentation | CONFIRMED | Extensive official documentation |
| Community support | CONFIRMED | Large global community |
| Ease of integration with Node.js | LIKELY | API is well-documented, Node.js libraries available |
| Ease of deployment in small library | CONFIRMED | Compact hardware, web-based management |
| Security | CONFIRMED | Proven security track record |
| Maintenance complexity | CONFIRMED | Moderate - requires networking knowledge |

#### Pros

- Mature, battle-tested platform
- Extensive API support
- Low hardware cost
- Compact form factor
- Large community
- Extensive documentation
- Proven in captive portal deployments

#### Cons

- Steeper learning curve for RouterOS
- Web UI can be complex for beginners
- Requires networking knowledge
- Scripting may be required for advanced features

#### Overall Assessment

**Status:** STRONG CANDIDATE  
**Recommendation:** Requires hardware testing to verify API integration complexity and captive portal workflow.

---

### 2. pfSense

#### Core Capabilities

| Capability | Status | Notes |
|-----------|--------|-------|
| Captive portal support | CONFIRMED | Built-in captive portal with multiple authentication methods |
| External authentication | CONFIRMED | Supports RADIUS, HTTP, and local authentication |
| RADIUS support | CONFIRMED | Full RADIUS client support |
| REST/API availability | CONFIRMED | REST API available (pfSense REST API) |
| Firewall capabilities | CONFIRMED | Stateful firewall with pfSense rules |
| VLAN support | CONFIRMED | Full 802.1Q VLAN support |
| DHCP | CONFIRMED | Built-in DHCP server with advanced options |
| DNS | CONFIRMED | Built-in DNS resolver and forwarder |
| Client identification | CONFIRMED | ARP table, DHCP lease tracking |
| Session management | CONFIRMED | Captive portal session management |
| Client authorization | CONFIRMED | Captive portal user authorization |
| Client deauthorization | CONFIRMED | Session termination and user removal |
| API automation | CONFIRMED | REST API supports most operations |
| Webhook/event support | LIKELY | XML-RPC API, webhook support requires verification |

#### Operational Factors

| Factor | Status | Notes |
|--------|--------|-------|
| Hardware availability | CONFIRMED | Can run on various hardware or virtual machines |
| Cost | CONFIRMED | Low to medium (software is free, hardware cost varies) |
| Reliability | CONFIRMED | Based on FreeBSD, proven reliability |
| Documentation | CONFIRMED | Extensive official documentation |
| Community support | CONFIRMED | Large community, active forums |
| Ease of integration with Node.js | LIKELY | REST API is standard HTTP/JSON |
| Ease of deployment in small library | LIKELY | Can run on small hardware (Netgate, mini-PC) |
| Security | CONFIRMED | Security-focused distribution |
| Maintenance complexity | CONFIRMED | Moderate - requires firewall knowledge |

#### Pros

- Open source (no licensing cost)
- Flexible hardware options
- Security-focused
- Large community
- Extensive documentation
- REST API is standard HTTP/JSON
- Proven in enterprise deployments

#### Cons

- Requires dedicated hardware or virtual machine
- Higher hardware cost than MikroTik for equivalent performance
- More complex initial setup
- May require more maintenance than dedicated appliance

#### Overall Assessment

**Status:** STRONG CANDIDATE  
**Recommendation:** Requires hardware testing to verify REST API capabilities and captive portal integration.

---

### 3. OPNsense

#### Core Capabilities

| Capability | Status | Notes |
|-----------|--------|-------|
| Captive portal support | CONFIRMED | Built-in captive portal with authentication methods |
| External authentication | CONFIRMED | Supports RADIUS, HTTP, and local authentication |
| RADIUS support | CONFIRMED | Full RADIUS client support |
| REST/API availability | CONFIRMED | REST API available (OPNsense API) |
| Firewall capabilities | CONFIRMED | Stateful firewall with pfSense rules |
| VLAN support | CONFIRMED | Full 802.1Q VLAN support |
| DHCP | CONFIRMED | Built-in DHCP server with advanced options |
| DNS | CONFIRMED | Built-in DNS resolver and forwarder |
| Client identification | CONFIRMED | ARP table, DHCP lease tracking |
| Session management | CONFIRMED | Captive portal session management |
| Client authorization | CONFIRMED | Captive portal user authorization |
| Client deauthorization | CONFIRMED | Session termination and user removal |
| API automation | CONFIRMED | REST API supports most operations |
| Webhook/event support | LIKELY | Plugin system, webhook support requires verification |

#### Operational Factors

| Factor | Status | Notes |
|--------|--------|-------|
| Hardware availability | CONFIRMED | Can run on various hardware or virtual machines |
| Cost | CONFIRMED | Low to medium (software is free, hardware cost varies) |
| Reliability | CONFIRMED | Based on FreeBSD, proven reliability |
| Documentation | CONFIRMED | Good official documentation |
| Community support | LIKELY | Smaller community than pfSense but active |
| Ease of integration with Node.js | LIKELY | REST API is standard HTTP/JSON |
| Ease of deployment in small library | LIKELY | Can run on small hardware (mini-PC) |
| Security | CONFIRMED | Security-focused distribution |
| Maintenance complexity | CONFIRMED | Moderate - requires firewall knowledge |

#### Pros

- Open source (no licensing cost)
- Flexible hardware options
- Security-focused
- REST API is standard HTTP/JSON
- More modern UI than pfSense
- Active development

#### Cons

- Smaller community than pfSense
- Less documentation than pfSense
- Requires dedicated hardware or virtual machine
- Higher hardware cost than MikroTik for equivalent performance
- Newer platform, less battle-tested than pfSense

#### Overall Assessment

**Status:** CANDIDATE  
**Recommendation:** Requires hardware testing to verify REST API capabilities and compare with pfSense.

---

### 4. Ubiquiti

#### Core Capabilities

| Capability | Status | Notes |
|-----------|--------|-------|
| Captive portal support | CONFIRMED | UniFi captive portal with guest portal |
| External authentication | CONFIRMED | Supports RADIUS and external portal |
| RADIUS support | CONFIRMED | Full RADIUS client support |
| REST/API availability | CONFIRMED | UniFi Controller API |
| Firewall capabilities | CONFIRMED | Stateful firewall with UniFi rules |
| VLAN support | CONFIRMED | Full 802.1Q VLAN support |
| DHCP | CONFIRMED | Built-in DHCP server |
| DNS | CONFIRMED | Built-in DNS server |
| Client identification | CONFIRMED | MAC address, device fingerprinting |
| Session management | CONFIRMED | Guest portal session management |
| Client authorization | CONFIRMED | Guest portal authorization |
| Client deauthorization | CONFIRMED | Session termination |
| API automation | LIKELY | UniFi Controller API available, requires verification |
| Webhook/event support | UNKNOWN | Event system exists, webhook support requires verification |

#### Operational Factors

| Factor | Status | Notes |
|--------|--------|-------|
| Hardware availability | CONFIRMED | Widely available globally |
| Cost | CONFIRMED | Medium to high cost depending on model |
| Reliability | CONFIRMED | Proven reliability in enterprise deployments |
| Documentation | CONFIRMED | Good official documentation |
| Community support | CONFIRMED | Large community |
| Ease of integration with Node.js | LIKELY | UniFi Controller API is HTTP/JSON based |
| Ease of deployment in small library | CONFIRMED | User-friendly web UI, centralized management |
| Security | CONFIRMED | Proven security track record |
| Maintenance complexity | CONFIRMED | Low to moderate - user-friendly UI |

#### Pros

- User-friendly web UI
- Centralized management (UniFi Controller)
- Large ecosystem of products
- Good documentation
- Large community
- Easy to deploy and manage
- Good for small to medium deployments

#### Cons

- Higher hardware cost than MikroTik
- Requires UniFi Controller (can be hosted on-site or cloud)
- API integration may be more complex than direct gateway API
- Less granular control than MikroTik/pfSense
- Vendor lock-in to Ubiquiti ecosystem

#### Overall Assessment

**Status:** CANDIDATE  
**Recommendation:** Requires hardware testing to verify UniFi Controller API capabilities and captive portal workflow.

---

## Comparison Summary

### Core Capabilities Matrix

| Capability | MikroTik | pfSense | OPNsense | Ubiquiti |
|------------|----------|--------|---------|----------|
| Captive portal | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| External authentication | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| RADIUS support | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| REST/API | CONFIRMED | CONFIRMED | CONFIRMED | LIKELY |
| Firewall | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| VLAN | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| DHCP | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| DNS | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| Client identification | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| Session management | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| Client authorization | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| Client deauthorization | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| API automation | CONFIRMED | CONFIRMED | CONFIRMED | LIKELY |
| Webhook/event | LIKELY | LIKELY | LIKELY | UNKNOWN |

### Operational Factors Matrix

| Factor | MikroTik | pfSense | OPNsense | Ubiquiti |
|--------|----------|--------|---------|----------|
| Hardware availability | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| Cost | Low | Low-Medium | Low-Medium | Medium-High |
| Reliability | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| Documentation | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| Community support | CONFIRMED | CONFIRMED | LIKELY | CONFIRMED |
| Node.js integration | LIKELY | LIKELY | LIKELY | LIKELY |
| Small library deployment | CONFIRMED | LIKELY | LIKELY | CONFIRMED |
| Security | CONFIRMED | CONFIRMED | CONFIRMED | CONFIRMED |
| Maintenance complexity | Moderate | Moderate | Moderate | Low-Moderate |

---

## Recommendations

### For Small Library Deployment

**Top Recommendation:** MikroTik

**Reasons:**
- Lowest hardware cost
- Compact form factor
- Proven captive portal capabilities
- Direct API access (no separate controller required)
- Extensive documentation
- Large community
- Proven in similar deployments

**Second Recommendation:** Ubiquiti

**Reasons:**
- User-friendly web UI
- Easy to deploy and manage
- Good for small deployments
- Centralized management
- Good documentation

### For Enterprise Deployment

**Top Recommendation:** pfSense

**Reasons:**
- Open source (no licensing cost)
- Flexible hardware options
- Security-focused
- Extensive firewall capabilities
- Large community
- Proven in enterprise deployments

**Second Recommendation:** MikroTik

**Reasons:**
- Proven reliability
- Extensive API support
- Lower hardware cost
- Proven in enterprise deployments

---

## Hardware Testing Requirements

Before final selection, the following hardware testing is required:

### MikroTik Testing

- [ ] RouterOS API connectivity
- [ ] Captive portal configuration
- [ ] External authentication setup
- [ ] Client authorization via API
- [ ] Client deauthorization via API
- [ ] Session management via API
- [ ] VLAN configuration
- [ ] Firewall rule management via API
- [ ] DHCP management via API

### pfSense Testing

- [ ] REST API connectivity
- [ ] Captive portal configuration
- [ ] External authentication setup
- [ ] Client authorization via API
- [ ] Client deauthorization via API
- [ ] Session management via API
- [ ] VLAN configuration
- [ ] Firewall rule management via API
- [ ] DHCP management via API

### OPNsense Testing

- [ ] REST API connectivity
- [ ] Captive portal configuration
- [ ] External authentication setup
- [ ] Client authorization via API
- [ ] Client deauthorization via API
- [ ] Session management via API
- [ ] VLAN configuration
- [ ] Firewall rule management via API
- [ ] DHCP management via API

### Ubiquiti Testing

- [ ] UniFi Controller API connectivity
- [ ] Captive portal configuration
- [ ] External authentication setup
- [ ] Client authorization via API
- [ ] Client deauthorization via API
- [ ] Session management via API
- [ ] VLAN configuration
- [ ] Firewall rule management via API
- [ ] DHCP management via API

---

## Conclusion

**Status:** NO WINNER DECLARED

All four platforms (MikroTik, pfSense, OPNsense, Ubiquiti) are strong candidates with confirmed core capabilities. The final selection requires:

1. **Hardware Testing:** Verify API integration complexity and captive portal workflow
2. **Cost Analysis:** Compare total cost of ownership including hardware, licensing, and maintenance
3. **Skill Assessment:** Evaluate available networking expertise for deployment and maintenance
4. **Deployment Planning:** Consider physical space, power requirements, and network topology

**Next Step:** Select one platform for hardware testing in an isolated lab environment before production deployment.

**Recommendation for Initial Testing:** MikroTik (lowest cost, compact form factor, proven capabilities)
