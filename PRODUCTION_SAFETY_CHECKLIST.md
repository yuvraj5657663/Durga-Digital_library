# Production Safety Checklist

## CRITICAL: DO NOT DEPLOY AUTOMATICALLY

This checklist must be completed and approved by the user before any production deployment.

## PRE-DEPLOYMENT REQUIREMENTS

### 1. Real Android Phone Test
- [ ] User has tested with real Android phone connected to Airtel_Durga_Library
- [ ] Phone detection confirmed (IP and MAC match)
- [ ] Disconnect behavior confirmed
- [ ] Reconnect behavior confirmed
- [ ] Private MAC behavior documented
- [ ] Device name resolution documented

### 2. Secret Management
- [ ] Development secret (`test-secret-key-for-development-only`) NOT used in production
- [ ] Strong production secret generated
- [ ] Production secret added to server .env
- [ ] Production secret added to local agent .env
- [ ] Secrets match between server and agent
- [ ] No secrets committed to Git
- [ ] No secrets in frontend code
- [ ] No secrets in logs

### 3. Configuration Verification
- [ ] Backend URL set to HTTPS: `https://durgadigitallibrary.online`
- [ ] Agent ID configured: `durga-library-agent-001`
- [ ] Device offline threshold configured: `NETWORK_AGENT_DEVICE_OFFLINE_MINUTES=5`
- [ ] Device limit configured: `MAX_REGISTERED_NETWORK_DEVICES_PER_STUDENT=2`

## PRODUCTION DEPLOYMENT STEPS

### Step 1: Generate Production Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Record the generated secret securely.

### Step 2: Update Production Server
```bash
# SSH into production server
ssh -i D:\yuvraj.pem ubuntu@65.1.235.131

# Navigate to project
cd ~/Durga-Digital_library

# Pull latest changes
git pull --ff-only origin main

# Update server .env
cd server
nano .env
# Add/update:
# NETWORK_AGENT_ID=durga-library-agent-001
# NETWORK_AGENT_SECRET=<your-generated-secret>
# NETWORK_AGENT_DEVICE_OFFLINE_MINUTES=5
# MAX_REGISTERED_NETWORK_DEVICES_PER_STUDENT=2

# Build backend
npm run build

# Restart PM2
pm2 restart durga-server

# Check logs
pm2 logs durga-server --lines 50
```

### Step 3: Deploy Frontend
```bash
cd ~/Durga-Digital_library/client
npm run build
# Frontend files are served by Nginx, may need to copy dist/ to nginx directory
```

### Step 4: Deploy Local Agent
- Copy `local-network-agent/` directory to always-on device at library
- Update `.env` with:
  - `BACKEND_URL=https://durgadigitallibrary.online`
  - `AGENT_ID=durga-library-agent-001`
  - `AGENT_SECRET=<same-as-production-secret>`
- Start agent with PM2 or Windows Service
- Verify agent connects to backend
- Verify agent heartbeat shows "online" in Admin Panel

### Step 5: Test Production
- Login to admin panel at https://durgadigitallibrary.online
- Navigate to Network Devices page
- Verify agent heartbeat shows "online"
- Verify devices are being discovered
- Test device linking with existing student
- Verify device limit enforcement
- Verify audit logging

## POST-DEPLOYMENT VERIFICATION

### Security Verification
- [ ] HTTPS working for agent communication
- [ ] HMAC authentication working
- [ ] No router credentials stored
- [ ] No Wi-Fi passwords stored
- [ ] No secrets in frontend
- [ ] Admin RBAC working (WIFI_VIEW, WIFI_MANAGE)
- [ ] Audit logs being created

### Functionality Verification
- [ ] Agent heartbeat shows "online"
- [ ] Devices being discovered
- [ ] Status logic working (online/unreachable/offline)
- [ ] Device linking working
- [ ] Device unlinking working
- [ ] Device limit enforced
- [ ] Student data not modified
- [ ] Attendance not automatically marked

### Data Safety Verification
- [ ] No student data modified
- [ ] No admission data modified
- [ ] No membership/payment data modified
- [ ] No attendance data modified
- [ ] NetworkDevice records created correctly
- [ ] RegisteredNetworkDevice records created correctly
- [ ] IP/MAC changes handled correctly

## ROLLBACK PROCEDURE

If issues occur:
```bash
# On production server
cd ~/Durga-Digital_library
git log --oneline -5
# Identify the commit before network device changes
git checkout <previous-commit>
cd server && npm run build
cd ../client && npm run build
pm2 restart durga-server
```

## IMPORTANT NOTES

1. **Do NOT deploy until real Android phone test is completed**
2. **Do NOT use development secret in production**
3. **Do NOT commit .env files**
4. **Do NOT modify router configuration**
5. **Do NOT automatically mark attendance**
6. **Do NOT modify existing student/admission/membership/payment data**

## CONTACT INFORMATION

If issues arise during deployment:
- Check PM2 logs: `pm2 logs durga-server`
- Check MongoDB: Ensure database is accessible
- Check agent logs: Ensure agent is running and connecting
- Check network: Ensure HTTPS is working
