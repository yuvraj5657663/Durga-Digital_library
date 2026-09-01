# Network Architecture Plan

**Date:** August 31, 2026  
**PART:** 10 - External Gateway Selection, Lab Setup & Physical Integration Contract

---

## Overview

This document defines the proposed network architecture for the Durga Digital Library Wi-Fi attendance system with external gateway integration. The architecture is designed to provide secure network segmentation, captive portal enforcement, and proper isolation between student, staff, and infrastructure networks.

**Status:** DESIGN PROPOSAL - Requires physical gateway deployment

---

## Current Architecture

### Existing Network

```
Internet
   ↓
Airtel ONT / Modem
   ↓
Airtel AAP321NK (192.168.1.1)
   ↓
Students
   ↓
Staff
   ↓
Infrastructure
```

**Current Issues:**
- No network segmentation
- All devices on single network (192.168.1.0/24)
- No captive portal enforcement
- No isolation between user groups
- Airtel AAP321NK lacks enterprise features

---

## Target Architecture

### Proposed Network Topology

```
Internet
   ↓
Airtel ONT / Modem (Bridge Mode or Passthrough)
   ↓
External Gateway / Firewall (MikroTik / pfSense / OPNsense / Ubiquiti)
   ↓
┌─────────────────────────────────────────┐
│ VLAN 10: Staff / Admin (192.168.10.0/24) │
│ VLAN 20: Students (192.168.20.0/24)       │
│ VLAN 30: Infrastructure (192.168.30.0/24) │
│ VLAN 40: Guest / Testing (192.168.40.0/24) │
└─────────────────────────────────────────┘
   ↓
Airtel AAP321NK (Access Point Mode)
   ↓
Wi-Fi Clients (Staff, Students, Guests)
```

### Alternative Topology (If AAP321NK Cannot Be AP Mode)

```
Internet
   ↓
Airtel ONT / Modem
   ↓
Airtel AAP321NK (Router Mode - DHCP Disabled)
   ↓
External Gateway / Firewall
   ↓
┌─────────────────────────────────────────┐
│ VLAN 10: Staff / Admin (192.168.10.0/24) │
│ VLAN 20: Students (192.168.20.0/24)       │
│ VLAN 30: Infrastructure (192.168.30.0/24) │
│ VLAN 40: Guest / Testing (192.168.40.0/24) │
└─────────────────────────────────────────┘
   ↓
Additional Access Points (if needed)
   ↓
Wi-Fi Clients
```

**IMPORTANT:** The ability of the Airtel AAP321NK to operate in Access Point mode or with DHCP disabled must be confirmed physically during gateway deployment.

---

## VLAN Segmentation

### VLAN 10: Staff / Admin Network

**Purpose:** Staff and administrative devices

**Network Details:**
- VLAN ID: 10
- Subnet: 192.168.10.0/24
- Gateway: 192.168.10.1
- DNS: 192.168.10.1 (or upstream DNS)

**Allowed Access:**
- Full Internet access
- Access to backend infrastructure (VLAN 30)
- Access to student network (VLAN 20) for management purposes
- Access to guest network (VLAN 40) for management purposes

**Restricted Access:**
- No access from student network (VLAN 20)
- No access from guest network (VLAN 40)

**Captive Portal:** Disabled (staff devices are trusted)

**DHCP:** Provided by external gateway

**Use Cases:**
- Staff laptops
- Staff mobile devices
- Admin workstations
- Management consoles

---

### VLAN 20: Student Network

**Purpose:** Student devices for library Wi-Fi attendance

**Network Details:**
- VLAN ID: 20
- Subnet: 192.168.20.0/24
- Gateway: 192.168.20.1
- DNS: 192.168.20.1 (or upstream DNS)

**Allowed Access:**
- Internet access (after captive portal authentication)
- Access to backend authentication endpoints
- Access to captive portal

**Restricted Access:**
- No access to staff/admin network (VLAN 10)
- No access to infrastructure network (VLAN 30)
- No direct access to database servers
- No access to backend admin panels
- No access to other student devices (client isolation)

**Captive Portal:** Enabled (required for authentication)

**DHCP:** Provided by external gateway

**Use Cases:**
- Student laptops
- Student mobile devices
- Student tablets

**Security:**
- Client isolation enabled (students cannot access each other's devices)
- Captive portal enforcement for all Internet access
- Session timeout enforcement
- Automatic deauthorization on session expiration

---

### VLAN 30: Infrastructure Network

**Purpose:** Backend infrastructure and management

**Network Details:**
- VLAN ID: 30
- Subnet: 192.168.30.0/24
- Gateway: 192.168.30.1
- DNS: 192.168.30.1 (or upstream DNS)

**Allowed Access:**
- Full Internet access
- Access from staff/admin network (VLAN 10)
- Access from external gateway for API calls

**Restricted Access:**
- No access from student network (VLAN 20)
- No access from guest network (VLAN 40)
- No direct Internet access from untrusted networks

**Captive Portal:** Disabled

**DHCP:** Provided by external gateway or static IPs

**Use Cases:**
- Backend application server
- Database server (MongoDB)
- File server
- Backup server
- Monitoring server
- Gateway management interface

**Security:**
- Firewall rules restrict access to trusted networks only
- Database access restricted to backend server only
- Management interfaces restricted to staff network
- Regular security updates and patches

---

### VLAN 40: Guest / Testing Network

**Purpose:** Guest access and testing

**Network Details:**
- VLAN ID: 40
- Subnet: 192.168.40.0/24
- Gateway: 192.168.40.1
- DNS: 192.168.40.1 (or upstream DNS)

**Allowed Access:**
- Limited Internet access (optional)
- Access to captive portal (if enabled)

**Restricted Access:**
- No access to staff/admin network (VLAN 10)
- No access to student network (VLAN 20)
- No access to infrastructure network (VLAN 30)
- No access to backend systems

**Captive Portal:** Optional (can be enabled for guest authentication)

**DHCP:** Provided by external gateway

**Use Cases:**
- Guest devices
- Testing devices
- Temporary access

**Security:**
- Client isolation enabled
- Time-limited sessions
- Bandwidth throttling (optional)

---

## Firewall Rules

### Default Policy

**Inbound:** Deny all  
**Outbound:** Allow all (with restrictions per VLAN)

### VLAN 10 → VLAN 20 (Staff → Students)

**Allowed:**
- Management access to student devices (for troubleshooting)
- Access to captive portal management

**Denied:**
- Unnecessary access to student devices

### VLAN 10 → VLAN 30 (Staff → Infrastructure)

**Allowed:**
- SSH to backend server
- HTTP/HTTPS to backend admin panels
- Database access from backend server only
- Monitoring access

**Denied:**
- Direct database access from staff workstations

### VLAN 20 → VLAN 10 (Students → Staff)

**Denied:** All access (students cannot access staff network)

### VLAN 20 → VLAN 30 (Students → Infrastructure)

**Allowed:**
- HTTP/HTTPS to backend authentication endpoints
- HTTP/HTTPS to captive portal

**Denied:**
- SSH to backend server
- Database access
- Admin panel access
- Direct infrastructure access

### VLAN 30 → All (Infrastructure → All)

**Allowed:**
- Outbound Internet access
- API calls to external services
- Backup to external locations

**Denied:**
- None (infrastructure needs full access)

### VLAN 40 → All (Guest → All)

**Allowed:**
- Limited Internet access (if enabled)
- Captive portal access (if enabled)

**Denied:**
- Access to VLAN 10, 20, 30

---

## Captive Portal Configuration

### Student Network (VLAN 20)

**Portal Type:** Authentication captive portal

**Authentication Method:** External authentication (backend)

**Redirect URL:** `https://YOUR-DOMAIN/network/portal`

**Session Timeout:** 12 hours (configurable via `WIFI_SESSION_DURATION_MINUTES`)

**Idle Timeout:** 30 minutes (configurable)

**Concurrent Sessions:** 2 per student (configurable via `MAX_WIFI_DEVICES_PER_STUDENT`)

**Client Isolation:** Enabled

**Bandwidth Limit:** Optional (can be configured per user or globally)

### Guest Network (VLAN 40)

**Portal Type:** Optional (can be enabled for guest authentication)

**Authentication Method:** Voucher code or simple password

**Session Timeout:** 1 hour

**Idle Timeout:** 15 minutes

**Client Isolation:** Enabled

**Bandwidth Limit:** Restricted (optional)

---

## DHCP Configuration

### VLAN 10: Staff / Admin

**DHCP Scope:** 192.168.10.100 - 192.168.10.200  
**Lease Time:** 24 hours  
**Gateway:** 192.168.10.1  
**DNS:** 192.168.10.1, 8.8.8.8

### VLAN 20: Students

**DHCP Scope:** 192.168.20.100 - 192.168.20.250  
**Lease Time:** 2 hours  
**Gateway:** 192.168.20.1  
**DNS:** 192.168.20.1, 8.8.8.8

### VLAN 30: Infrastructure

**DHCP Scope:** 192.168.30.100 - 192.168.30.150  
**Lease Time:** 7 days  
**Gateway:** 192.168.30.1  
**DNS:** 192.168.30.1, 8.8.8.8

**Static IPs:**
- Backend server: 192.168.30.10
- Database server: 192.168.30.11
- File server: 192.168.30.12
- Monitoring server: 192.168.30.13

### VLAN 40: Guest / Testing

**DHCP Scope:** 192.168.40.100 - 192.168.40.150  
**Lease Time:** 1 hour  
**Gateway:** 192.168.40.1  
**DNS:** 192.168.40.1, 8.8.8.8

---

## DNS Configuration

### Internal DNS

**Primary DNS:** External gateway (192.168.10.1, 192.168.20.1, 192.168.30.1, 192.168.40.1)  
**Secondary DNS:** 8.8.8.8 (Google DNS) or 1.1.1.1 (Cloudflare DNS)

### Internal DNS Records

```
backend.durga-library.local → 192.168.30.10
db.durga-library.local → 192.168.30.11
files.durga-library.local → 192.168.30.12
monitor.durga-library.local → 192.168.30.13
gateway.durga-library.local → 192.168.10.1
portal.durga-library.local → External IP (for captive portal)
```

---

## Airtel AAP321NK Configuration

### Target Configuration

**Mode:** Access Point Mode (if supported) or Router Mode with DHCP Disabled

**SSID Configuration:**
- Staff SSID: VLAN 10 tagged
- Student SSID: VLAN 20 tagged
- Guest SSID: VLAN 40 tagged (optional)

**DHCP:** Disabled on AAP321NK (provided by external gateway)

**NAT:** Disabled (handled by external gateway)

**Firewall:** Disabled (handled by external gateway)

**IMPORTANT:** The ability of the Airtel AAP321NK to support VLAN tagging, Access Point mode, or DHCP disabling must be confirmed physically. If the device cannot support these features, additional access points may be required.

### Alternative Configuration (If AAP321NK Cannot Be AP Mode)

**Mode:** Router Mode

**SSID:** Single SSID for all networks (or multiple SSIDs if supported)

**DHCP:** Disabled (provided by external gateway)

**NAT:** Disabled (handled by external gateway)

**Role:** Wireless access point only

**Note:** This configuration may result in all devices being on the same broadcast domain unless VLAN tagging is supported.

---

## External Gateway Configuration

### Gateway Selection

**Options:** MikroTik, pfSense, OPNsense, Ubiquiti (see GATEWAY_SELECTION_MATRIX.md)

### Required Features

- VLAN support (802.1Q)
- Captive portal with external authentication
- RADIUS support (optional, for future use)
- DHCP server
- DNS server
- Stateful firewall
- REST API for automation
- Client session management

### Gateway Responsibilities

- Network segmentation (VLANs)
- DHCP server
- DNS server
- Firewall rules
- Captive portal enforcement
- Client authorization
- Client deauthorization
- Session management
- Internet routing
- NAT

### Gateway-to-Backend Communication

- Gateway authenticates to backend using API credentials
- Gateway calls backend for external authentication
- Backend calls gateway API for client authorization/deauthorization
- Communication over HTTPS (TLS encryption)

---

## Migration Plan

### Phase 1: Lab Testing

1. Set up isolated test network
2. Deploy test gateway
3. Configure VLANs
4. Configure captive portal
5. Test backend integration
6. Verify all functionality

### Phase 2: Hardware Procurement

1. Select gateway platform based on lab testing
2. Purchase gateway hardware
3. Purchase additional access points (if needed)
4. Plan physical installation

### Phase 3: Deployment

1. Install external gateway
2. Configure gateway with production settings
3. Reconfigure Airtel AAP321NK (if possible)
4. Deploy additional access points (if needed)
5. Test all VLANs
6. Test captive portal
7. Test backend integration
8. Migrate devices to new network

### Phase 4: Cutover

1. Schedule maintenance window
2. Switch from old network to new network
3. Monitor for issues
4. Rollback plan ready

---

## Security Considerations

### Network Isolation

- Student devices isolated from staff and infrastructure
- Infrastructure isolated from student and guest networks
- Guest network isolated from all internal networks
- Client isolation on student and guest networks

### Access Control

- Captive portal required for student Internet access
- Staff devices bypass captive portal (no authentication required)
- Infrastructure access restricted to staff network
- Firewall rules enforce isolation

### Monitoring

- Monitor gateway logs
- Monitor captive portal authentication attempts
- Monitor failed authorization attempts
- Monitor network traffic patterns
- Alert on suspicious activity

### Maintenance

- Regular gateway firmware updates
- Regular security patching
- Regular backup of gateway configuration
- Regular review of firewall rules
- Regular review of captive portal settings

---

## Unknowns and Dependencies

### Unknowns

- Airtel AAP321NK support for Access Point mode
- Airtel AAP321NK support for VLAN tagging
- Airtel AAP321NK support for DHCP disabling
- Actual number of concurrent Wi-Fi users
- Peak bandwidth requirements
- Physical space for gateway installation
- Power requirements for gateway

### Dependencies

- Physical gateway deployment
- Gateway platform selection
- Airtel AAP321NK capability confirmation
- Network cabling (if additional access points required)
- Power availability for gateway
- Internet connection stability
- Backend server capacity

---

## Conclusion

This network architecture plan provides a secure, segmented network design for the Durga Digital Library. The architecture isolates student, staff, and infrastructure networks while enabling captive portal enforcement for student authentication.

**Status:** DESIGN PROPOSAL  
**Next Step:** Select gateway platform and perform lab testing in isolated environment.

**IMPORTANT:** Do not implement VLANs on the current Airtel router. This is a design proposal for the future external gateway deployment.
