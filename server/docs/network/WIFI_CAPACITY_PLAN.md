# Wi-Fi Capacity Plan

**Date:** August 31, 2026  
**PART:** 10 - External Gateway Selection, Lab Setup & Physical Integration Contract

---

## Overview

This document defines the metrics to measure Wi-Fi capacity and performance for the Durga Digital Library. The plan includes metrics for students, bandwidth, sessions, and gateway resources. Where real measurements are unavailable, values are marked as UNKNOWN or TO BE MEASURED.

**Status:** CAPACITY PLAN DEFINED - Requires real measurements after deployment

---

## Metrics to Measure

### 1. Number of Students

**Metric:** Total number of active students

**Current Value:** UNKNOWN / TO BE MEASURED

**Measurement Method:**
- Count active students from Student collection
- Filter by status = 'Active'

**Target Capacity:** TO BE DETERMINED

**Notes:**
- This metric determines the maximum number of concurrent Wi-Fi users
- Should be measured during peak hours

---

### 2. Concurrent Wi-Fi Users

**Metric:** Maximum number of simultaneous Wi-Fi connections

**Current Value:** UNKNOWN / TO BE MEASURED

**Measurement Method:**
- Count active WiFiSession records
- Filter by status = 'active'
- Measure during peak hours

**Target Capacity:** TO BE DETERMINED

**Notes:**
- This metric determines gateway capacity requirements
- Should be measured during peak library hours
- Should account for staff devices as well

---

### 3. Average Bandwidth

**Metric:** Average bandwidth per user

**Current Value:** UNKNOWN / TO BE MEASURED

**Measurement Method:**
- Measure total bandwidth usage
- Divide by number of active users
- Measure over 24-hour period

**Target Capacity:** TO BE DETERMINED

**Notes:**
- This metric determines Internet connection requirements
- Should be measured during peak hours
- Should account for different usage patterns (browsing, streaming, downloads)

---

### 4. Peak Bandwidth

**Metric:** Maximum bandwidth usage at peak times

**Current Value:** UNKNOWN / TO BE MEASURED

**Measurement Method:**
- Measure total bandwidth usage
- Identify peak usage times
- Record maximum bandwidth

**Target Capacity:** TO BE DETERMINED

**Notes:**
- This metric determines Internet connection capacity requirements
- Should be measured during peak library hours
- Should include buffer for growth

---

### 5. Number of Active Sessions

**Metric:** Number of active Wi-Fi sessions at any given time

**Current Value:** UNKNOWN / TO BE MEASURED

**Measurement Method:**
- Count WiFiSession records with status = 'active'
- Measure during peak hours
- Measure over 24-hour period

**Target Capacity:** TO BE DETERMINED

**Notes:**
- This metric determines session management requirements
- Should be measured during peak library hours

---

### 6. Number of Access Points

**Metric:** Number of Wi-Fi access points required

**Current Value:** 1 (Airtel AAP321NK) + UNKNOWN (additional APs if needed)

**Measurement Method:**
- Measure signal strength across library area
- Identify dead zones
- Calculate required APs for coverage

**Target Capacity:** TO BE DETERMINED

**Notes:**
- This metric determines hardware requirements
- Depends on library size and layout
- May require additional APs for VLAN support

---

### 7. DHCP Pool Size

**Metric:** Number of IP addresses in DHCP pool

**Current Value:** UNKNOWN / TO BE CONFIGURED

**Measurement Method:**
- Calculate based on expected concurrent users
- Add buffer for guests and staff
- Add buffer for growth

**Target Capacity:** TO BE DETERMINED

**Recommended Configuration:**
- Student VLAN (20): 192.168.20.100 - 192.168.20.250 (150 addresses)
- Staff VLAN (10): 192.168.10.100 - 192.168.10.200 (100 addresses)
- Infrastructure VLAN (30): 192.168.30.100 - 192.168.30.150 (50 addresses)
- Guest VLAN (40): 192.168.40.100 - 192.168.40.150 (50 addresses)

**Notes:**
- DHCP pool should be 2x expected concurrent users
- Should account for device limit per student (2 devices)
- Should account for staff devices
- Should account for guest devices

---

### 8. Gateway CPU

**Metric:** Gateway CPU utilization

**Current Value:** UNKNOWN / TO BE MEASURED

**Measurement Method:**
- Monitor gateway CPU usage
- Measure during peak hours
- Measure during idle hours

**Target Capacity:** < 70% during peak hours

**Notes:**
- This metric determines gateway hardware requirements
- Should be measured with production gateway
- Should account for captive portal processing
- Should account for firewall processing

---

### 9. Gateway RAM

**Metric:** Gateway RAM utilization

**Current Value:** UNKNOWN / TO BE MEASURED

**Measurement Method:**
- Monitor gateway RAM usage
- Measure during peak hours
- Measure during idle hours

**Target Capacity:** < 80% during peak hours

**Notes:**
- This metric determines gateway hardware requirements
- Should be measured with production gateway
- Should account for connection tracking table
- Should account for captive portal session storage

---

### 10. Connection Tracking Table

**Metric:** Number of active connections in gateway connection tracking table

**Current Value:** UNKNOWN / TO BE MEASURED

**Measurement Method:**
- Monitor gateway connection tracking table
- Measure during peak hours
- Measure maximum size

**Target Capacity:** TO BE DETERMINED

**Notes:**
- This metric determines gateway capacity
- Each active session uses connection tracking entries
- Should be measured with production gateway
- Gateway should have sufficient capacity for expected connections

---

### 11. Captive Portal Requests

**Metric:** Number of captive portal requests per second

**Current Value:** UNKNOWN / TO BE MEASURED

**Measurement Method:**
- Monitor captive portal access logs
- Measure during peak hours
- Calculate requests per second

**Target Capacity:** TO BE DETERMINED

**Notes:**
- This metric determines backend load
- Should be measured during peak library hours
- Should account for authentication requests
- Should account for session validation requests

---

### 12. Backend Requests per Second

**Metric:** Number of backend API requests per second

**Current Value:** UNKNOWN / TO BE MEASURED

**Measurement Method:**
- Monitor backend API logs
- Measure during peak hours
- Calculate requests per second

**Target Capacity:** TO BE DETERMINED

**Notes:**
- This metric determines backend capacity requirements
- Should be measured during peak library hours
- Should account for authentication requests
- Should account for session validation requests
- Should account for gateway API calls

---

## Capacity Planning Recommendations

### Gateway Hardware

**Minimum Requirements (Based on Unknown Capacity):**
- CPU: Quad-core 1.5GHz or higher
- RAM: 4GB or higher
- Storage: 16GB or higher
- Network Ports: 1x WAN, 4x LAN (minimum)

**Recommended Requirements (Based on Unknown Capacity):**
- CPU: Quad-core 2.0GHz or higher
- RAM: 8GB or higher
- Storage: 32GB or higher
- Network Ports: 1x WAN, 8x LAN (recommended)

**Notes:**
- Actual requirements depend on measured capacity
- Gateway should be selected based on measured metrics
- Gateway should have headroom for growth

### Internet Connection

**Minimum Requirements (Based on Unknown Capacity):**
- Bandwidth: TO BE DETERMINED
- Type: Fiber or high-speed broadband

**Recommended Requirements (Based on Unknown Capacity):**
- Bandwidth: TO BE DETERMINED
- Type: Fiber preferred

**Notes:**
- Actual requirements depend on measured bandwidth usage
- Should include buffer for growth
- Should consider redundancy if possible

### Backend Server

**Current Configuration:**
- CPU: UNKNOWN / TO BE MEASURED
- RAM: UNKNOWN / TO BE MEASURED
- Storage: UNKNOWN / TO BE MEASURED

**Notes:**
- Backend capacity should be reviewed after Wi-Fi deployment
- Backend may require scaling based on measured load
- Consider horizontal scaling if needed

---

## Monitoring

### Metrics to Monitor

- Concurrent Wi-Fi users
- Bandwidth usage
- Gateway CPU utilization
- Gateway RAM utilization
- Connection tracking table size
- Captive portal requests per second
- Backend requests per second
- Backend response time
- Backend error rate

### Alert Thresholds

**Critical Alerts:**
- Gateway CPU > 90%
- Gateway RAM > 95%
- Connection tracking table > 90% capacity
- Backend response time > 5 seconds
- Backend error rate > 5%

**Warning Alerts:**
- Gateway CPU > 70%
- Gateway RAM > 80%
- Connection tracking table > 70% capacity
- Backend response time > 2 seconds
- Backend error rate > 1%

---

## Scaling Strategy

### Horizontal Scaling

**Backend:**
- Add additional backend servers if load exceeds capacity
- Use load balancer to distribute requests
- Implement session sharing (Redis or database)

**Gateway:**
- Add additional access points if coverage insufficient
- Consider multiple gateways for large deployments
- Implement gateway clustering (if supported)

### Vertical Scaling

**Gateway:**
- Upgrade gateway hardware if CPU/RAM insufficient
- Add more RAM if connection tracking table insufficient

**Backend:**
- Upgrade backend server hardware if CPU/RAM insufficient
- Add more storage if database growth requires

---

## Capacity Testing

### Load Testing

**Test Scenarios:**
- Simulate 10 concurrent users
- Simulate 50 concurrent users
- Simulate 100 concurrent users
- Simulate peak hour traffic

**Test Metrics:**
- Gateway CPU utilization
- Gateway RAM utilization
- Backend response time
- Backend error rate
- Bandwidth usage

**Test Schedule:**
- Perform load testing before production deployment
- Perform load testing after gateway deployment
- Perform load testing periodically (quarterly)

---

## Conclusion

This capacity plan defines the metrics to measure Wi-Fi capacity and performance. All current values are marked as UNKNOWN or TO BE MEASURED because real measurements require physical gateway deployment and actual usage.

**Status:** CAPACITY PLAN DEFINED  
**Next Step:** Measure actual capacity after physical gateway deployment.

**IMPORTANT:** Do not invent library capacity numbers. Use UNKNOWN / TO BE MEASURED where real measurements are unavailable.
