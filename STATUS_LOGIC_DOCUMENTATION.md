# Status Logic Documentation

## Current Status Meanings

### ONLINE
- **Definition:** Device is in ARP table AND responds to ping (ICMP echo)
- **Agent Logic:** `isReachable ? 'online' : 'unreachable'`
- **Evidence:**
  - Recent ARP observation (device in current ARP table)
  - Successful ping response (ICMP echo)
  - lastSeenAt updated on each discovery cycle

### UNREACHABLE
- **Definition:** Device is in ARP table BUT does NOT respond to ping
- **Agent Logic:** `isReachable ? 'online' : 'unreachable'`
- **Evidence:**
  - Recent ARP observation (device in current ARP table)
  - Ping timeout or failure
  - Device may be connected to Wi-Fi but ignoring ICMP
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
status: isReachable ? 'online' : 'unreachable'
```

### Backend Side (server/src/services/networkDeviceService.js)

```javascript
// Preserve the status from agent (online or unreachable)
existing.status = deviceData.status || 'unreachable';

// Mark unseen devices as offline after threshold
if (device.lastSeenAt < offlineThreshold) {
  device.status = 'offline';
}
```

## Known Limitations

### 1. Ping-Only Online Detection
**Issue:** Phones can ignore ICMP ping while still being connected to Wi-Fi
**Impact:** Device may be marked "unreachable" even though it's actually connected
**Current Behavior:** Requires ping success for "online" status
**Future Improvement:** Consider adding "recently_seen" status for devices in ARP but not pingable

### 2. ARP Cache Persistence
**Issue:** ARP table may persist for several minutes after disconnect
**Impact:** Device may appear in ARP even after disconnect
**Mitigation:** Backend marks offline after 5 minutes of no updates (not just one missing ARP entry)

### 3. No "Recently Seen" Status
**Issue:** Current implementation only has online/unreachable/offline
**Impact:** Cannot distinguish between "seen in ARP but not pingable" and "not seen recently"
**Future Improvement:** Add "recently_seen" status for devices in ARP but not responding to ping

## Recommended Status Logic (For Future Enhancement)

```javascript
ONLINE:
- Device in current ARP table
- AND (ping succeeds OR ping not available)
- AND lastSeenAt < 1 minute ago

RECENTLY_SEEN:
- Device in current ARP table
- AND ping fails
- AND lastSeenAt < 5 minutes ago

UNREACHABLE:
- Device in current ARP table
- AND ping fails
- AND lastSeenAt < 1 minute ago

OFFLINE:
- Device not in recent ARP table
- OR lastSeenAt > 5 minutes ago
```

## Current Status for Production

The current implementation is **adequate for initial deployment** but has known limitations:

- ✅ Distinguishes between reachable and unreachable devices
- ✅ Marks devices offline after inactivity
- ✅ Uses multiple signals (ARP + ping + lastSeenAt)
- ⚠️ May mark devices as "unreachable" even if they're connected (ping limitation)
- ⚠️ No "recently_seen" status for devices that don't respond to ping

**Recommendation:** Proceed with current implementation for Phase 4, gather real phone test data, and refine status logic in Phase 5 based on actual phone behavior.
