# AWS EC2 Deployment Checklist

## Pre-Deployment Preparation

### 1. AWS Account Setup
- [ ] Create AWS account if not exists
- [ ] Set up IAM user with appropriate permissions
- [ ] Configure AWS CLI locally
- [ ] Generate SSH key pair for EC2 access
- [ ] Save private key securely (chmod 400)

### 2. Security Configuration
- [ ] Create Security Group with rules:
  - [ ] SSH (Port 22) - Your IP only
  - [ ] HTTP (Port 80) - 0.0.0.0/0
  - [ ] HTTPS (Port 443) - 0.0.0.0/0
  - [ ] Custom TCP (Port 3000) - Security Group only (for internal)
- [ ] Configure Network ACLs
- [ ] Set up VPC if required
- [ ] Configure IAM roles for EC2

### 3. EC2 Instance Setup
- [ ] Launch EC2 instance (Ubuntu 22.04 LTS recommended)
- [ ] Instance type: t3.medium or higher
- [ ] Storage: 20GB GP3 SSD
- [ ] Attach security group
- [ ] Assign public IP
- [ ] Create and attach IAM role
- [ ] Configure instance metadata (IMDSv2)

### 4. Server Configuration

#### System Updates
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential git curl wget ufw fail2ban
```

#### Node.js Installation
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should be 18.x or higher
npm --version
```

#### MongoDB Installation
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### PM2 Installation
```bash
sudo npm install -g pm2
pm2 startup
```

#### Nginx Installation
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Application Deployment

#### Clone Repository
```bash
cd /var/www
sudo git clone <your-repo-url> durga-library-system
cd durga-library-system
sudo chown -R ubuntu:ubuntu .
```

#### Install Dependencies
```bash
npm run install:all
```

#### Environment Configuration
```bash
# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit with production values
nano server/.env
nano client/.env
```

#### Production Environment Variables
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/durga-library
JWT_SECRET=<your-super-secret-jwt-key-min-32-chars>
JWT_ACCESS_EXPIRES=1h
JWT_REFRESH_EXPIRES=7d
ADMIN_USER=admin
ADMIN_PASS=<strong-password>
ADMIN_EMAIL=admin@yourdomain.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=<app-specific-password>
DISABLE_WHATSAPP=false
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Build Application
```bash
npm run build
```

#### Start with PM2
```bash
cd server
pm2 start ecosystem.config.js --env production
pm2 save
pm2 list
```

### 6. SSL/TLS Configuration

#### Obtain SSL Certificate (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Auto-renewal
```bash
sudo certbot renew --dry-run
# Cron job is automatically added
```

### 7. Nginx Configuration

#### Copy Nginx Config
```bash
sudo cp nginx.conf /etc/nginx/sites-available/durga-library
sudo ln -s /etc/nginx/sites-available/durga-library /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Update Nginx Config for Production
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Client (React app)
    location / {
        root /var/www/durga-library-system/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 8. MongoDB Atlas (Recommended for Production)

#### Create Atlas Cluster
- [ ] Sign up for MongoDB Atlas
- [ ] Create cluster (M10 or higher for production)
- [ ] Configure network access (Whitelist EC2 IP)
- [ ] Create database user
- [ ] Get connection string
- [ ] Update MONGODB_URI in server/.env

#### Enable Backup
- [ ] Configure automated backups
- [ ] Set retention period (7 days minimum)
- [ ] Enable point-in-time recovery

### 9. Backup Configuration

#### Setup Automated Backups
```bash
# Create backup directories
sudo mkdir -p /var/backups/mongodb
sudo mkdir -p /var/backups/system

# Copy backup scripts
sudo cp scripts/backup-mongodb.sh /usr/local/bin/
sudo cp scripts/backup-system.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup-*.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-mongodb.sh
# Add: 0 3 * * 0 /usr/local/bin/backup-system.sh
```

### 10. Security Hardening

#### Firewall Configuration
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### Fail2Ban Configuration
```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

#### SSH Hardening
```bash
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
# Set: PubkeyAuthentication yes
sudo systemctl restart sshd
```

### 11. Monitoring Setup

#### PM2 Monitoring
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

#### CloudWatch (Optional)
- [ ] Install CloudWatch agent
- [ ] Configure memory and CPU monitoring
- [ ] Set up log streaming
- [ ] Create alarms for:
  - [ ] CPU > 80%
  - [ ] Memory > 90%
  - [ ] Disk space < 10%

### 12. Domain Configuration

#### DNS Settings
- [ ] Point A record to EC2 public IP
- [ ] Configure CNAME for www subdomain
- [ ] Verify DNS propagation

### 13. Application Verification

#### Health Check
```bash
curl https://yourdomain.com/health
```

#### Test Authentication
```bash
curl -X POST https://yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

#### Test Admin Portal
- [ ] Access https://yourdomain.com
- [ ] Login with admin credentials
- [ ] Verify dashboard loads
- [ ] Test student management
- [ ] Test attendance marking

#### Test Student Portal
- [ ] Access https://yourdomain.com/student
- [ ] Login with student credentials
- [ ] Verify dashboard loads
- [ ] Test profile viewing

### 14. Performance Optimization

#### Enable Gzip Compression
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
```

#### Configure Browser Caching
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### Enable PM2 Cluster Mode
```javascript
// ecosystem.config.js
instances: 'max',
exec_mode: 'cluster',
```

### 15. Zero-Downtime Deployment

#### Deployment Script
```bash
#!/bin/bash
cd /var/www/durga-library-system
git pull origin main
npm run install:all
npm run build
pm2 reload ecosystem.config.js --env production
```

#### Make Script Executable
```bash
chmod +x deploy.sh
```

### 16. Post-Deployment Verification

#### Load Testing
```bash
# Install k6
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/

# Run load test
cd k6
k6 run load-test.js
```

#### Security Audit
```bash
npm audit
npm audit fix
```

#### Dependency Check
```bash
npm outdated
```

### 17. Documentation

#### Update Documentation
- [ ] Update README with production URL
- [ ] Document API endpoints
- [ ] Create admin user guide
- [ ] Create student user guide
- [ ] Document backup procedures
- [ ] Document rollback procedures

### 18. Disaster Recovery

#### Create Recovery Plan
- [ ] Document recovery steps
- [ ] Test restore procedure
- [ ] Keep recent backups accessible
- [ ] Document MongoDB Atlas restore process
- [ ] Test failover procedures

### 19. Compliance

#### Security Checklist
- [ ] All secrets stored in environment variables
- [ ] No sensitive data in logs
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation in place
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] File upload restrictions

### 20. Final Verification

#### Pre-Launch Checklist
- [ ] All tests passing
- [ ] Health endpoint responding
- [ ] Database connection stable
- [ ] WhatsApp connection verified (if enabled)
- [ ] Email service verified
- [ ] SSL certificate valid
- [ ] Domain DNS resolved
- [ ] Nginx configuration valid
- [ ] PM2 processes running
- [ ] Backup scripts working
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Documentation complete

## Emergency Contacts

- [ ] Technical Lead: ___________
- [ ] DevOps Engineer: ___________
- [ ] Database Admin: ___________
- [ ] AWS Support: ___________

## Rollback Procedure

If deployment fails:

1. Stop new deployment:
   ```bash
   pm2 stop all
   ```

2. Restore previous version:
   ```bash
   git checkout <previous-commit>
   npm run install:all
   npm run build
   pm2 restart ecosystem.config.js --env production
   ```

3. Restore database if needed:
   ```bash
   mongorestore --uri="mongodb+srv://..." --drop backup_directory
   ```

4. Verify health:
   ```bash
   curl https://yourdomain.com/health
   ```

---

**Deployment Date:** ___________
**Deployed By:** ___________
**Verified By:** ___________
**Approved By:** ___________
