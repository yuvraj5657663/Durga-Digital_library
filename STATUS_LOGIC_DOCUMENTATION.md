# Status Logic Documentation

## Current Status Meanings

### ONLINE
- **Definition:** Device is in ARP table AND responds to ping (ICMP echo)
- **Agent Logic:** `isReachable ? 'online' : 'recently_seen'`
- **Evidence:**
  - Recent ARP observation (device in current ARP table)
  - Successful ping response (ICMP echo)
  - lastSeenAt updated on each discovery cycle

### RECENTLY_SEEN
- **Definition:** Device is in ARP table BUT does NOT respond to ping
- **Agent Logic:** `isReachable ? 'online' : 'recently_seen'`
- **Evidence:**
  - Recent ARP observation (device in current ARP table)
  - Ping timeout or failure
  - Device may be connected to Wi-Fi but ignoring ICMP
  - lastSeenAt updated on each discovery cycle
- **Important:** This status distinguishes devices that are likely connected but not responding to ping from truly unreachable devices

### UNREACHABLE
- **Definition:** Device was not reachable during enrichment failure
- **Agent Logic:** Used as fallback when enrichment fails
- **Evidence:**
  - Device in ARP table
  - Enrichment process failed (error handling)
  - lastSeenAt updated on each discovery cycle

### OFFLINE
- **Definition:** Device has not been observed in ARP table for >5 minutes
- **Backend Logic:** Marked offline if lastSeenAt < offlineThreshold
- **Evidence:**
  - Not in recent ARP table
  - No updates from agent for configured duration
  - lastSeenAt > 5 minutes ago

## Current Implementation Details

### Agent Side (local-network-agent/index.js)

```javascript
// Check reachability via ping (with timeout)
const isReachable = await isDeviceReachable(device.ipAddress);

// Set status based on ping result
status: isReachable ? 'online' : 'recently_seen'
```

### Backend Side (server/src/services/networkDeviceService.js)

```javascript
// Preserve the status from agent (online, recently_seen, or unreachable)
existing.status = deviceData.status || 'unreachable';

// Mark unseen devices as offline after threshold
if (device.lastSeenAt < offlineThreshold) {
  device.status = 'offline';
}
```

## Rationale for RECENTLY_SEEN Status

### Problem
- Android/iPhone devices often ignore ICMP ping while still being connected to Wi-Fi
- Without "recently_seen" status, these devices would be marked "unreachable"
- "Unreachable" implies the device is not connected, which is misleading

### Solution
- Added "recently_seen" status to distinguish:
  - Devices in ARP but not pingable (likely connected, ignoring ICMP)
  - Devices not in ARP at all (truly offline)
- This provides more accurate information to admins

### Status Hierarchy
1. **ONLINE:** ARP + ping success (highest confidence)
2. **RECENTLY_SEEN:** ARP + ping failure (still in network, likely connected)
3. **UNREACHABLE:** Enrichment failure (edge case)
4. **OFFLINE:** Not in ARP for >5 minutes (truly gone)

## Known Limitations

### 1. Ping-Only Online Detection
**Issue:** Phones can ignore ICMP ping while still being connected to Wi-Fi
**Impact:** Device marked "recently_seen" instead of "online"
**Mitigation:** "recently_seen" status now distinguishes this from truly offline devices
**Future Improvement:** Consider adding UDP/TCP reachability probes if ICMP consistently fails

### 2. ARP Cache Persistence
**Issue:** ARP table may persist for several minutes after disconnect
**Impact:** Device may appear in ARP even after disconnect
**Mitigation:** Backend marks offline after 5 minutes of no updates (not just one missing ARP entry)

### 3. ICMP vs Actual Connectivity
**Issue:** ICMP blocking on some devices
**Impact:** Cannot definitively determine if device is actually connected
**Mitigation:** "recently_seen" status acknowledges this limitation

## Current Status for Production

The current implementation is **adequate for initial deployment** with improved accuracy:

- ✅ Distinguishes between reachable and recently-seen devices
- ✅ Distinguishes between recently-seen and truly offline devices
- ✅ Uses multiple signals (ARP + ping + lastSeenAt)
- ✅ Handles devices that ignore ICMP gracefully
- ✅ Clear status hierarchy for admins

**Recommendation:** Proceed with current implementation for Phase 4, gather real phone test data, and refine status logic in Phase 5 based on actual phone behavior.

## Replay Protection (NEW)

### Implementation
- Added nonce/requestId to HMAC signature
- Nonce is random 16-byte hex string (32 characters)
- Backend stores used nonces in MongoDB with 5-minute TTL
- Duplicate nonces are rejected as replay attacks

### Authentication Header Format
```
X-Agent-Auth: agentId:timestamp:nonce:signature
```

### Signature Calculation
```javascript
const canonicalString = `${agentId}:${timestamp}:${nonce}`;
const signature = crypto.createHmac('sha256', secret).update(canonicalString).digest('hex');
```

### Validation Steps
1. Parse agentId, timestamp, nonce, signature
2. Validate agentId matches configured value
3. Validate timestamp is within ±60 seconds
4. Validate nonce length (16-64 characters)
5. Check if nonce was already used (replay protection)
6. Store nonce in MongoDB with 5-minute TTL
7. Validate HMAC signature matches canonical string
8. Validate request body structure and size
9. Validate all IPs are in private range

### Security Benefits
- ✅ Prevents replay attacks within 60-second window
- ✅ Bounded storage (nonces auto-expire after 5 minutes)
- ✅ Deterministic canonical signature
- ✅ No unlimited nonce storage
- ✅ Fails safe on duplicate nonce detection
