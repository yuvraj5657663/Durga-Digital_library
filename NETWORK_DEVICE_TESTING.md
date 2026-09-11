# Network Device Testing Instructions

## PHASE 3A - REAL PHONE TEST

### Pre-Test Baseline

1. **Record Current State:**
   - Run local network agent: `cd local-network-agent && npm run dev`
   - Note the number of devices discovered
   - Check Admin Panel → Network Devices page
   - Record current device list

2. **Connect Android Phone:**
   - Connect phone to Airtel_Durga_Library Wi-Fi
   - Wait for phone to receive IP (check phone's Wi-Fi settings)
   - Note the phone's assigned IP address
   - Note the phone's MAC address (from phone Wi-Fi settings)

3. **Run Discovery:**
   - Let the agent complete a discovery cycle (30 seconds)
   - Check agent output for device count
   - Check Admin Panel for new device

4. **Verify Detection:**
   - Does the phone's IP appear in the device list?
   - Does the MAC address match the phone's MAC?
   - What is the device name shown?
   - What is the manufacturer shown?
   - What is the status (online/unreachable)?

5. **Correlate Device:**
   - Match the detected IP/MAC with the phone's Wi-Fi settings
   - Confirm this is the correct device

### PHASE 3B - DISCONNECT TEST

1. **Disconnect Phone:**
   - Turn Wi-Fi OFF on the phone
   - Do NOT reboot the router
   - Do NOT restart the agent

2. **Observe Persistence:**
   - Watch subsequent discovery cycles (every 30 seconds)
   - How long does the device remain in the list?
   - Does the status change?
   - When does it become "offline" (after 5 minutes of no updates)?

3. **Expected Behavior:**
   - Device disappears from ARP table
   - Agent stops sending the device
   - Backend marks device offline after 5 minutes

### PHASE 3C - RECONNECT TEST

1. **Reconnect Phone:**
   - Turn Wi-Fi ON on the phone
   - Wait for IP assignment

2. **Verify Rediscovery:**
   - Does the device reappear in the list?
   - Is the IP the same or different?
   - Is the MAC the same or different (randomized MAC)?
   - Does status return to "online"?
   - Is firstSeen preserved from initial discovery?
   - Does lastSeen update correctly?

### PHASE 3D - PRIVATE MAC TEST

1. **Check Phone Settings:**
   - Android: Settings → Network & Internet → Wi-Fi → Network name → MAC address type
   - iOS: Settings → Wi-Fi → Network name → Private Wi-Fi Address

2. **Document Behavior:**
   - Is phone using device MAC or randomized MAC?
   - Does MAC change between connections?
   - Does the system handle MAC changes correctly?

### PHASE 3E - DEVICE NAME VALIDATION

1. **Check Device Name:**
   - What does the Admin Panel show as device name?
   - Is it the actual phone name (e.g., "Rahul's Samsung")?
   - Or is it "Unknown Device"?
   - Or is it something else?

2. **Expected:**
   - Likely shows "Unknown Device" for Android/iPhone
   - Router DHCP information not available
   - DNS/NetBIOS unlikely to resolve phone names

### PHASE 3F - MANUAL DEVICE REGISTRATION

1. **Test Device Linking:**
   - Go to Admin Panel → Network Devices
   - Click [Link] button on a detected device
   - Enter student ID (must be existing student)
   - Optionally enter device label (e.g., "Rahul's Phone")
   - Click [Link Device]

2. **Verify Registration:**
   - Does the device show the linked student name?
   - Can you unlink the device?
   - Does the limit work (max 2 devices per student)?

## DATA SAFETY CHECKLIST

Before testing, verify:

- [ ] No student data will be modified by device discovery
- [ ] No admission data will be modified
- [ ] No membership/payment data will be modified
- [ ] No attendance will be automatically marked
- [ ] Device registration only links existing devices to existing students
- [ ] No new students will be created automatically
- [ ] Existing NetworkDevice records will not be deleted

## TEST RESULTS RECORDING

Record the following after each test:

### Test A: Phone Detection
- Phone detected: YES/NO
- Correct IP: YES/NO
- Correct MAC: YES/NO
- Manufacturer detected: YES/NO
- Device name shown: [actual value]
- Hostname shown: [actual value]
- Status: [actual value]

### Test B: Disconnect
- Device disappeared from ARP: YES/NO
- Device marked offline: YES/NO
- Time to offline: [actual time]

### Test C: Reconnect
- Device reappeared: YES/NO
- IP changed: YES/NO
- MAC changed: YES/NO
- Status returned to online: YES/NO

### Test D: Private MAC
- Phone using private MAC: YES/NO
- MAC changed on reconnect: YES/NO

### Test E: Device Name
- Actual phone name obtained: YES/NO
- What name was shown: [actual value]

### Test F: Manual Registration
- Device linked to student: YES/NO
- Student name shown correctly: YES/NO
- Device limit enforced: YES/NO
