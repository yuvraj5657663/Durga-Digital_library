# Domain Migration Guide - durgadigitallibrary.online

## Overview
This document details all changes made to configure the application for the new domain `https://durgadigitallibrary.online`

## Changes Made

### 1. Server Configuration (`server/.env.production`)

**CORS Origins Updated:**
```env
ALLOWED_ORIGINS=https://durgadigitallibrary.online,http://durgadigitallibrary.online,https://www.durgadigitallibrary.online,http://65.1.235.131,http://65.1.235.131:5173,http://localhost:5173,http://localhost:3000
```

**Application URL Updated:**
```env
APP_URL=https://durgadigitallibrary.online
```

**Email Configuration Updated:**
```env
EMAIL_FROM="Durga Digital Library <noreply@durgadigitallibrary.online>"
```

### 2. Client Configuration (`client/.env.production`)

**API URL Updated:**
```env
VITE_API_URL=https://durgadigitallibrary.online/api/v1
```

### 3. CORS Configuration (`server/src/app.js`)

**Fallback Origins Updated:**
```javascript
const domainOrigins = ['https://durgadigitallibrary.online', 'http://durgadigitallibrary.online', 'http://65.1.235.131', 'http://65.1.235.131:5173'];
```

### 4. Notification Templates (`server/src/services/notificationService.js`)

**Admission Notification Updated:**
- Added website URL: `🌐 Website: https://durgadigitallibrary.online`

**Renewal Reminder Updated:**
- Added website URL: `🌐 Website: https://durgadigitallibrary.online`

**Shift End Notification Updated:**
- Added website URL: `🌐 Website: https://durgadigitallibrary.online`

### 5. PDF Receipts (`server/src/services/pdfService.js`)

**Admission Receipt Updated:**
- Added website URL: `Website: https://durgadigitallibrary.online`

**Renewal Receipt Updated:**
- Added website URL: `Website: https://durgadigitallibrary.online`

## Deployment Instructions

### 1. Update EC2 Server Environment

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@65.1.235.131

# Navigate to project directory
cd /var/www/Durga-Digital_library

# Pull latest changes
sudo git pull origin main

# Update server .env file
cd server
sudo nano .env

# Update these values:
# ALLOWED_ORIGINS=https://durgadigitallibrary.online,http://durgadigitallibrary.online,https://www.durgadigitallibrary.online
# APP_URL=https://durgadigitallibrary.online
# EMAIL_FROM="Durga Digital Library <noreply@durgadigitallibrary.online>"

# Restart server
sudo pm2 restart durga-library-server
```

### 2. Configure Nginx for Domain

```bash
# Update Nginx configuration
sudo nano /etc/nginx/sites-available/durga-library
```

**Update server_name:**
```nginx
server {
    listen 80;
    server_name durgadigitallibrary.online www.durgadigitallibrary.online 65.1.235.131;
    
    # ... rest of configuration
}
```

**Test and restart Nginx:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Update DNS Settings

**Go to your domain registrar (e.g., GoDaddy, Namecheap, etc.)**

**Add DNS Records:**
- **Type**: A Record
- **Name**: @ (or leave blank)
- **Value**: 65.1.235.131
- **TTL**: 3600 (or default)

- **Type**: A Record
- **Name**: www
- **Value**: 65.1.235.131
- **TTL**: 3600 (or default)

### 4. Configure SSL Certificate (HTTPS)

**Using Let's Encrypt with Certbot:**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d durgadigitallibrary.online -d www.durgadigitallibrary.online

# Certbot will automatically update Nginx configuration
# Test Nginx configuration
sudo nginx -t
sudo systemctl restart nginx

# Auto-renewal is configured automatically
```

### 5. Rebuild Frontend

```bash
cd /var/www/Durga-Digital_library/client
sudo npm install
sudo npm run build
```

### 6. Restart Services

```bash
# Restart PM2
sudo pm2 restart durga-library-server

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo pm2 status
sudo systemctl status nginx
```

## Verification Steps

### 1. Test Domain Resolution
```bash
# From your local machine
ping durgadigitallibrary.online
```

### 2. Test Website Access
- Open browser: `https://durgadigitallibrary.online`
- Check SSL certificate (if configured)
- Test admin login
- Test student login

### 3. Test API Endpoints
```bash
# Test health endpoint
curl https://durgadigitallibrary.online/health

# Test API endpoint
curl https://durgadigitallibrary.online/api/v1/health
```

### 4. Test CORS
- Open browser console
- Navigate to `https://durgadigitallibrary.online`
- Try logging in
- Check for CORS errors in console

## Contact Information Updates

### Updated Contact Details in All Templates:
- **Contact Number**: 7542893960 (remains same)
- **Website**: https://durgadigitallibrary.online (NEW)
- **Email**: noreply@durgadigitallibrary.online (NEW)

### Receipt Information:
- **Contact Person**: Saurav Kumar (7542893960)
- **Website**: https://durgadigitallibrary.online (NEW)
- **Location**: Kalarampur, Near Shiv Mandir, NH-80, Munger - 811211

## Post-Deployment Checklist

- [ ] DNS propagation completed (may take 24-48 hours)
- [ ] SSL certificate installed and working
- [ ] Nginx configured for domain
- [ ] Server .env file updated with new domain
- [ ] Frontend rebuilt with new API URL
- [ ] All services restarted
- [ ] Admin login working
- [ ] Student login working
- [ ] Notifications sending with new website URL
- [ ] PDF receipts showing new website URL
- [ ] CORS properly configured for new domain
- [ ] Health endpoint accessible
- [ ] Mobile devices working correctly

## Troubleshooting

### DNS Not Propagating
- Check DNS status: `nslookup durgadigitallibrary.online`
- Wait 24-48 hours for full propagation
- Clear browser DNS cache

### SSL Certificate Issues
- Check certificate: `sudo certbot certificates`
- Renew certificate: `sudo certbot renew`
- Check Nginx SSL configuration

### CORS Errors
- Check server .env ALLOWED_ORIGINS
- Check app.js CORS configuration
- Verify domain is in both places

### API Connection Issues
- Check firewall rules (Security Group)
- Verify Nginx proxy configuration
- Check PM2 logs: `sudo pm2 logs durga-library-server`

## Additional Notes

- **EC2 IP**: 65.1.235.131 (still works as fallback)
- **Local Development**: Use `http://localhost:5173` or `http://localhost:5174`
- **Production**: Use `https://durgadigitallibrary.online`
- **Contact Number**: 7542893960 (unchanged)

## Support

For any issues during migration:
1. Check server logs: `sudo pm2 logs durga-library-server`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check application health: `curl https://durgadigitallibrary.online/health`

---
**Migration Date**: 2026-08-11
**Domain**: durgadigitallibrary.online
**Status**: ✅ Configuration Complete
