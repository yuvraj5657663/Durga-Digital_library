# Network Device Testing Instructions

## IMPORTANT SAFETY NOTES

- Do NOT modify Airtel router configuration
- Do NOT disable Wi-Fi on the router
- Do NOT reboot the router
- Do NOT share Wi-Fi passwords
- Do NOT request router credentials
- Do NOT disable private MAC settings on your phone (test with actual settings)

## PRE-TEST PREPARATION

### 1. Start Local Network Agent

Open a terminal and run:

```bash
cd D:\durga-library-system\local-network-agent
npm run dev
```

You should see:

```
============================================================
Durga Digital Library - Network Discovery Agent
============================================================
Backend URL: http://localhost:3000
Agent ID: durga-library-agent-001
Discovery Interval: 30s
Local IP: 192.168.1.24
Local Subnet: 192.168.1.0/24
============================================================
Starting discovery loop...
```

### 2. Verify Agent is Working

Wait for the first discovery cycle (30 seconds). You should see:

```
[timestamp] Starting network discovery...
Found X devices in ARP table
Reachable: Y, Unreachable: Z
✓ Sent X devices to backend
```

### 3. Open Admin Panel

- Go to http://localhost:5173 (or your local frontend URL)
- Login as admin
- Navigate to: **Admin → Network Devices**
- Note the current device count
- Record the list of existing devices (if any)

## PHASE 3A - REAL ANDROID PHONE TEST

### Step 1: Connect Android Phone

1. Open Wi-Fi settings on your Android phone
2. Connect to: **Airtel_Durga_Library**
3. Wait for the phone to receive an IP address

### Step 2: Record Phone Information (CRITICAL)

On your Android phone, go to:
- Settings → Network & Internet → Wi-Fi
- Tap on the connected network (Airtel_Durga_Library)

Record the following information:

```
Phone Information:
├─ IP Address: _____.___.___.___
├─ MAC Address: __:__:__:__:__:__
├─ Private MAC Setting: [Device MAC / Randomized MAC]
├─ Phone Name: ___________________ (if shown)
└─ Manufacturer: ___________________ (if shown)
```

**IMPORTANT:** You need the actual IP and MAC from the phone to correlate with the discovered device.

### Step 3: Run Discovery

The agent runs automatically every 30 seconds. Wait for the next cycle.

You should see output like:

```
[timestamp] Starting network discovery...
Found X devices in ARP table
Reachable: Y, Unreachable: Z
✓ Sent X devices to backend
```

### Step 4: Correlate Device

1. Go to Admin Panel → Network Devices
2. Look for a device with:
   - IP address matching your phone's IP
   - MAC address matching your phone's MAC

**CRITICAL:** Do NOT assume a device is your phone just because it appeared recently. You must match the IP and MAC.

### Step 5: Record Discovery Results

For the matched device, record:

```
Discovery Results:
├─ IP Address: _____.___.___.___
├─ MAC Address: __:__:__:__:__:__
├─ Device Name: ___________________
├─ Hostname: ___________________
├─ Manufacturer: ___________________
├─ Source: ___________________
├─ Status: ___________________
├─ First Seen: ___________________
└─ Last Seen: ___________________
```

**Status Explanation:**
- **Online:** Device responded to ping (highest confidence)
- **Recently Seen:** Device in ARP but didn't respond to ping (likely connected, ignoring ICMP)
- **Unreachable:** Enrichment failed (edge case)
- **Offline:** Not seen for >5 minutes

## PHASE 3B - DISCONNECT TEST

### Step 1: Disconnect Phone

1. On your Android phone, turn Wi-Fi OFF
2. Do NOT reboot the router
3. Do NOT restart the agent

### Step 2: Observe Behavior

Watch the agent output for several discovery cycles (every 30 seconds):

```
Cycle 1 (0-30s):   Device count = ___, Status = ___
Cycle 2 (30-60s):  Device count = ___, Status = ___
Cycle 3 (60-90s):  Device count = ___, Status = ___
Cycle 4 (90-120s): Device count = ___, Status = ___
Cycle 5 (120-150s): Device count = ___, Status = ___
Cycle 6 (150-180s): Device count = ___, Status = ___
Cycle 7 (180-210s): Device count = ___, Status = ___
Cycle 8 (210-240s): Device count = ___, Status = ___
Cycle 9 (240-270s): Device count = ___, Status = ___
Cycle 10 (270-300s): Device count = ___, Status = ___
```

### Step 3: Check Admin Panel

Refresh the Network Devices page and note:
- When does the device disappear from the list?
- What is the final status?
- Does it show as "offline" after 5 minutes?

## PHASE 3C - RECONNECT TEST

### Step 1: Reconnect Phone

1. On your Android phone, turn Wi-Fi ON
2. Wait for IP assignment
3. Record the new IP and MAC (they may change)

```
Reconnection Information:
├─ New IP Address: _____.___.___.___
├─ New MAC Address: __:__:__:__:__:__
└─ MAC Changed: [YES / NO]
```

### Step 2: Observe Rediscovery

Wait for the next discovery cycle and check:
- Does the device reappear in the list?
- Is the IP the same or different?
- Is the MAC the same or different?
- Does status return to "online" or "recently_seen"?
- Is firstSeen preserved from initial discovery?
- Does lastSeen update correctly?

## PHASE 3D - PRIVATE MAC BEHAVIOR

### Check MAC Settings

On your Android phone:
- Settings → Network & Internet → Wi-Fi
- Tap on network → MAC address type

Record:
```
MAC Setting: [Device MAC / Randomized MAC]
```

If MAC changed between connections:
- Record both MAC addresses
- Verify the system created a new device record
- Verify the old device is marked offline

## PHASE 3E - DEVICE NAME VALIDATION

### Check What Name Was Detected

From the Admin Panel Network Devices page, for your phone device:

```
Device Name Shown: ___________________
Hostname Shown: ___________________
Manufacturer Shown: ___________________
```

### Expected Results

- **Likely:** Shows "Unknown Device" for Android phones
- **Reason:** Router DHCP information not available, phones don't broadcast names via DNS/NetBIOS
- **Manufacturer:** May show Samsung/Xiaomi/etc. from MAC OUI database

### Important

- If the device name is NOT your actual phone name, this is **EXPECTED**
- The system cannot reliably obtain actual Android device names without router API access
- Manual device labeling is the solution (see Phase 3F)

## PHASE 3F - MANUAL DEVICE REGISTRATION

### Step 1: Find an Existing Student

Go to Admin Panel → Students and find an existing student to use for testing.
Record the Student ID.

```
Test Student ID: _________________
Test Student Name: _________________
```

### Step 2: Link Device to Student

1. Go to Admin Panel → Network Devices
2. Find your phone device
3. Click the [Link] button
4. Enter the Student ID
5. Optionally enter a device label (e.g., "Test Phone")
6. Click [Link Device]

### Step 3: Verify Registration

Check that:
- Student name appears in the "Linked Student" column
- Device label is saved
- The link is stored in the database

### Step 4: Test Unlink

1. Click the [Unlink] button on the same device
2. Verify the student name is removed
3. Verify the device record still exists
4. Verify the student record is unchanged

## PHASE 3G - DEVICE LIMIT TEST

### Step 1: Check Current Configuration

Default limit: 2 devices per student

### Step 2: Link Multiple Devices

Try to link 3 different devices to the same student:
- First device: Should succeed
- Second device: Should succeed
- Third device: Should be rejected with error message

### Step 3: Verify Error Message

You should see: "Maximum registered devices reached (2)"

## DATA SAFETY VERIFICATION

After all tests, verify:

- [ ] No student data was modified
- [ ] No admission data was modified
- [ ] No membership/payment data was modified
- [ ] No attendance was automatically marked
- [ ] Device registration only linked existing devices to existing students
- [ ] No new students were created automatically
- [ ] Existing NetworkDevice records were not deleted

## FINAL TEST RESULTS

Complete this checklist:

### Phone Detection
- [ ] Phone detected: YES/NO
- [ ] Correct IP: YES/NO
- [ ] Correct MAC: YES/NO
- [ ] Manufacturer detected: YES/NO
- [ ] Device name shown: [actual value]
- [ ] Hostname shown: [actual value]
- [ ] Status: [actual value]

### Disconnect
- [ ] Device disappeared from ARP: YES/NO
- [ ] Device marked offline: YES/NO
- [ ] Time to offline: [actual time]

### Reconnect
- [ ] Device reappeared: YES/NO
- [ ] IP changed: YES/NO
- [ ] MAC changed: YES/NO
- [ ] Status returned to online/recently_seen: YES/NO

### Private MAC
- [ ] Phone using private MAC: YES/NO
- [ ] MAC changed on reconnect: YES/NO

### Device Name
- [ ] Actual phone name obtained: YES/NO
- [ ] What name was shown: [actual value]

### Manual Registration
- [ ] Device linked to student: YES/NO
- [ ] Student name shown correctly: YES/NO
- [ ] Device limit enforced: YES/NO
- [ ] Unlink worked correctly: YES/NO

## TROUBLESHOOTING

### Agent Not Connecting

If you see "connect ECONNREFUSED":
- Make sure backend is running: `cd server && npm run dev`
- Check backend is on port 3000
- Check BACKEND_URL in local-network-agent/.env

### Device Not Appearing

If your phone doesn't appear:
- Verify phone is connected to Airtel_Durga_Library
- Wait for 2-3 discovery cycles (60-90 seconds)
- Check phone Wi-Fi settings for IP address
- Compare with device list to find match

### Device Name Shows as "Unknown Device"

This is EXPECTED for Android phones:
- Router DHCP information not available
- Phones don't broadcast names via DNS/NetBIOS
- Use manual device labeling as solution

### Status Shows "Recently Seen" Instead of "Online"

This is EXPECTED if the phone ignores ICMP ping:
- "Recently Seen" means device is in ARP but didn't respond to ping
- This is normal for many Android/iPhone devices
- The device is likely still connected to Wi-Fi
- This is more accurate than marking it "unreachable"
