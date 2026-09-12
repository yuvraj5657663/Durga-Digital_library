# Production Deployment Guide - Phase 6 Network Device Identity + Status + Security Hardening

## CRITICAL SAFETY NOTES

- **DO NOT** skip any steps
- **DO NOT** use the development secret in production
- **DO NOT** modify existing Student/Admission/Membership/Payment/Attendance data
- **DO NOT** delete existing collections or documents
- **DO NOT** run destructive MongoDB commands
- **STOP immediately** if any step fails and report the error

## PRE-DEPLOYMENT CHECKLIST

- [ ] You have SSH access to the production AWS server
- [ ] You have the production SSH key (D:\yuvraj.pem)
- [ ] You have MongoDB Atlas access (already configured)
- [ ] You have access to the library local network (for agent deployment)
- [ ] You have an Android phone available for E2E testing
- [ ] Read this entire guide before starting

---

## STEP 1: PRE-DEPLOYMENT VERIFICATION

### 1.1 Verify Local Git State

On your local machine:
```bash
cd D:\durga-library-system
git status
git log --oneline -5
```

Expected output:
- Working tree clean
- Latest commit: `e73af07` - "security: add HMAC replay protection with nonce and improve status logic"

### 1.2 Verify Commits Pushed to Origin

```bash
git log --oneline origin/main -5
```

Expected output:
- Should include `e73af07`
- Should include `43925c1`
- Should include `f1a0bfb`

If commits are not pushed:
```bash
git push origin main
```

---

## STEP 2: PRODUCTION SECRET CONFIGURATION

### 2.1 Production Secret (GENERATED BUT NOT SHOWN)

A strong production secret has been generated using Node.js crypto.
**Save this secret securely:** `[GENERATED_SECRET_PLACEHOLDER]`

**Do NOT:**
- Share this secret publicly
- Commit it to Git
- Put it in frontend code
- Print it in logs

### 2.2 SSH into Production Server

```bash
ssh -i D:\yuvraj.pem ubuntu@65.1.235.131
```

### 2.3 Navigate to Project Directory

```bash
cd ~/Durga-Digital_library
```

### 2.4 Pull Latest Changes

```bash
git pull --ff-only origin main
```

Verify output includes the Phase 6 commits.

### 2.5 Update Production Server .env

```bash
cd server
nano .env
```

Add/update these lines:

```bash
# Network Agent Configuration (DO NOT use development secret)
NETWORK_AGENT_ID=durga-library-agent-001
NETWORK_AGENT_SECRET=[GENERATED_SECRET_PLACEHOLDER]
NETWORK_AGENT_DEVICE_OFFLINE_MINUTES=5

# Device Limit Configuration
MAX_REGISTERED_NETWORK_DEVICES_PER_STUDENT=2
```

**CRITICAL:**
- Replace `[GENERATED_SECRET_PLACEHOLDER]` with the actual generated secret
- Do NOT use `test-secret-key-for-development-only`
- Preserve all existing environment variables
- Do not modify MongoDB, JWT, Email, or other existing secrets

Save and exit (Ctrl+X, Y, Enter).

---

## STEP 3: BACKEND DEPLOYMENT

### 3.1 Install Dependencies

```bash
cd ~/Durga-Digital_library/server
npm install
```

### 3.2 Build Backend

```bash
npm run build
```

Expected output:
```
Successfully compiled 103 files with Babel
```

If build fails:
- **STOP**
- Record the error
- Do not restart PM2

### 3.3 Restart PM2 Process

```bash
pm2 status
```

Identify the Durga Digital Library process (usually `durga-server` or similar).

```bash
pm2 restart durga-server
```

### 3.4 Verify PM2 Status

```bash
pm2 status
pm2 logs durga-server --lines 50 --nostream
```

Expected output:
- Process status: `online`
- No crash loops
- No MongoDB connection errors
- No environment variable errors
- No HMAC configuration errors

If process crashes repeatedly:
- **STOP**
- Check logs for specific error
- Do not proceed until resolved

---

## STEP 4: FRONTEND DEPLOYMENT

### 4.1 Build Frontend

```bash
cd ~/Durga-Digital_library/client
npm run build
```

Expected output:
```
✓ built in XX.XXs
```

### 4.2 Deploy to Nginx

The frontend is served by Nginx. Copy the built files:

```bash
cd ~/Durga-Digital_library
sudo cp -r client/dist/* /var/www/html/
```

Or use your existing Nginx deployment method.

### 4.3 Restart Nginx

```bash
sudo systemctl reload nginx
sudo systemctl status nginx
```

---

## STEP 5: PRODUCTION HEALTH CHECK

### 5.1 Test Backend Health

```bash
curl https://durgadigitallibrary.online/health
```

Expected: HTTP 200 response with health status.

### 5.2 Test Admin Login

Open browser: https://durgadigitallibrary.online

- Login as admin
- Verify authentication works
- Navigate to Admin Dashboard

If login fails:
- **STOP**
- Check PM2 logs
- Verify JWT configuration

---

## STEP 6: LOCAL NETWORK AGENT DEPLOYMENT

### 6.1 Copy Agent to Library Device

On the library Windows machine (or always-on device):

```bash
# Copy the local-network-agent directory
# From your development machine to the library device
```

Or if the library device is the same as your development machine:
- The agent is already in `D:\durga-library-system\local-network-agent`

### 6.2 Configure Agent .env

**IMPORTANT:** Do NOT modify the local development `.env` file. The local agent should remain for development testing only.

On the library device, create a NEW `.env` file in the agent directory:

```bash
BACKEND_URL=https://durgadigitallibrary.online
AGENT_ID=durga-library-agent-001
AGENT_SECRET=[GENERATED_SECRET_PLACEHOLDER]
DISCOVERY_INTERVAL_SECONDS=30
```

**CRITICAL:**
- Use `https://` (not `http://`)
- Use the same production secret as the server
- Replace `[GENERATED_SECRET_PLACEHOLDER]` with the actual secret
- Do NOT use `test-secret-key-for-development-only`
- Do NOT commit this file to Git

### 6.3 Install Agent Dependencies

```bash
cd local-network-agent
npm install
```

### 6.4 Start Agent

For development/testing:
```bash
npm run dev
```

For production (use PM2 or Windows Service):
```bash
npm install -g pm2
pm2 start index.js --name "durga-network-agent"
pm2 save
pm2 startup
```

### 6.5 Verify Agent Status

Check agent output for:
```
============================================================
Durga Digital Library - Network Discovery Agent
============================================================
Backend URL: https://durgadigitallibrary.online
Agent ID: durga-library-agent-001
Discovery Interval: 30s
Local IP: 192.168.1.XX
Local Subnet: 192.168.1.0/24
============================================================
Starting discovery loop...
```

First discovery cycle should show:
```
Found X devices in ARP table
Reachable: Y, Unreachable: Z
✓ Sent X devices to backend
```

If agent cannot authenticate:
- **STOP**
- Check secret matches server
- Check HTTPS is working
- Check network connectivity

---

## STEP 7: REAL ANDROID E2E TEST

### 7.1 Connect Android Phone

1. Open Wi-Fi settings on Android phone
2. Connect to: **Airtel_Durga_Library**
3. Wait for IP assignment
4. Record phone's IP and MAC from Wi-Fi settings

### 7.2 Verify Device Discovery

Wait for agent discovery cycle (30 seconds).

Open Admin Panel: https://durgadigitallibrary.online
Navigate to: **Admin → Network Devices**

Verify:
- [ ] Phone appears in device list
- [ ] IP matches phone's IP
- [ ] MAC matches phone's MAC
- [ ] Manufacturer shown (from MAC OUI)
- [ ] Status is "Online" or "Recently Seen"
- [ ] Source shows "ARP Scan"
- [ ] Last Seen updates

### 7.3 Test Disconnect

1. Turn Wi-Fi OFF on phone
2. Wait 2-3 discovery cycles (60-90 seconds)
3. Check Admin Panel
4. Verify device eventually becomes "Offline" (after 5 minutes)

### 7.4 Test Reconnect

1. Turn Wi-Fi ON on phone
2. Wait for IP assignment
3. Wait for discovery cycle
4. Check Admin Panel
5. Verify device reappears
6. Note if IP changed
7. Note if MAC changed
8. Verify status returns to "Online" or "Recently Seen"

### 7.5 Test Private MAC Behavior

If phone uses Private MAC:
- Verify system creates new device record
- Verify old device is marked offline
- Verify no automatic student transfer occurs

---

## STEP 8: MANUAL STUDENT LINKING TEST

### 8.1 Link Device to Student

1. In Admin → Network Devices
2. Find the detected phone device
3. Click [Link] button
4. Enter existing Student ID
5. Optionally enter device label (e.g., "Test Phone")
6. Click [Link Device]

Verify:
- [ ] Student name appears in "Linked Student" column
- [ ] Device label is saved
- [ ] No error message

### 8.2 Test Device Limit

Try to link a third device to the same student.

Verify:
- [ ] Error message: "Maximum registered devices reached (2)"
- [ ] Third device not linked

### 8.3 Test Unlink

1. Click [Unlink] button on the same device
2. Verify student name is removed
3. Verify device record still exists
4. Verify student record is unchanged

---

## STEP 9: REPLAY PROTECTION TEST

### 9.1 Test Replay Protection

The agent automatically uses unique nonces. To test replay protection:

1. Monitor agent logs for successful requests
2. The middleware automatically rejects duplicate nonces
3. Check PM2 logs for any nonce-related errors

Expected:
- Duplicate nonces rejected with "Nonce already used" error
- Fresh nonces accepted
- No replay attacks succeed

---

## STEP 10: EXISTING SYSTEM REGRESSION TEST

### 10.1 Admin Functions

Test in Admin Panel:
- [ ] Admin login works
- [ ] Admin dashboard loads
- [ ] Student listing works
- [ ] Student details load
- [ ] No breaking errors

### 10.2 Student Functions

Test:
- [ ] Student login works
- [ ] Student dashboard loads
- [ ] Attendance mark works
- [ ] No breaking errors

### 10.3 Membership/Payment

Test:
- [ ] Membership display works
- [ ] Payment display works
- [ ] No breaking errors

### 10.4 Existing Wi-Fi

Test:
- [ ] Existing WiFi sessions (if any) still work
- [ ] Existing RegisteredDevice functionality unchanged
- [ ] No breaking errors

---

## STEP 11: DATA INTEGRITY CHECK

### 11.1 Verify Existing Collections

Check MongoDB (via MongoDB Atlas or backend admin):
- [ ] `students` collection exists and is accessible
- [ ] `admissionrequests` collection exists
- [ ] `memberships` collection exists
- [ ] `payments` collection exists
- [ ] `attendance` collection exists
- [ ] `users` collection exists

### 11.2 Verify New Collections

New collections should exist:
- [ ] `networkdevices` collection created
- [ ] `registerednetworkdevices` collection created
- [ ] `agentnonces` collection created

### 11.3 Verify No Data Loss

- [ ] Student count unchanged
- [ ] Attendance count unchanged
- [ ] Payment count unchanged
- [ ] No deleted documents

---

## STEP 12: PRODUCTION MONITORING

### 12.1 Monitor PM2

```bash
pm2 status
pm2 logs durga-server --lines 100 --nostream
```

Look for:
- Repeated crashes
- MongoDB errors
- Authentication failures
- HMAC failures
- Nonce errors
- Memory issues

### 12.2 Monitor Agent

Check agent output for:
- Successful discovery cycles
- Successful authentication
- No authentication errors
- Devices being sent successfully

---

## ROLLBACK PROCEDURE

If any critical step fails:

### Immediate Rollback

```bash
cd ~/Durga-Digital_library
git log --oneline -5
# Identify the commit before Phase 6 (before e73af07)
git checkout <previous-commit>
cd server && npm run build
cd ../client && npm run build
pm2 restart durga-server
sudo systemctl reload nginx
```

### Rollback Verification

After rollback:
- [ ] Admin login works
- [ ] Student functions work
- [ ] No errors in PM2 logs
- [ ] Existing functionality restored

---

## CRITICAL SUCCESS CRITERIA

Deployment is successful ONLY if:

- ✅ Backend is healthy (PM2 online, no crashes)
- ✅ Frontend is working (no 5xx errors)
- ✅ Local agent authenticates successfully
- ✅ Network devices are discovered
- ✅ Android E2E detection works
- ✅ Replay protection works
- ✅ Manual linking works
- ✅ Device limit enforced
- ✅ Unlinking works
- ✅ Existing library functionality intact
- ✅ No destructive data changes
- ✅ No existing student/admission/payment/attendance data modified

**DO NOT mark deployment successful if any of these fail.**

---

## PRODUCTION SECRET

**Generated Secret:** `bedf3f42d64d3d8df2328d2f74973435ea66cdfb4a35983fffb3704d2919ba45`

**Use this secret in:**
- Production server `.env` as `NETWORK_AGENT_SECRET`
- Library device agent `.env` as `AGENT_SECRET`

**CRITICAL SECURITY:**
- This secret is now exposed in this document
- Change this secret immediately after deployment
- Generate a new secret and reconfigure if this document is shared
- Do NOT commit this secret to Git
- Do NOT share this secret publicly

---

## SUPPORT CONTACT

If issues arise:
1. Check PM2 logs: `pm2 logs durga-server --lines 100`
2. Check agent logs
3. Check MongoDB Atlas
4. Check network connectivity
5. Verify HTTPS is working
