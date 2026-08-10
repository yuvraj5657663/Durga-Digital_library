# EC2 Deployment Guide for Durga Digital Library

## Pre-Deployment Checklist

### 1. AWS Security Group Configuration
**Required: Add inbound rules to your EC2 Security Group**
- Port 3000 (TCP) - Allow from your IP (for direct API access)
- Port 5173 (TCP) - Allow from your IP (for development access)
- Port 80 (TCP) - Allow from 0.0.0.0/0 (for HTTP)
- Port 443 (TCP) - Allow from 0.0.0.0/0 (for HTTPS)

**AWS Console Steps:**
1. Go to EC2 → Security Groups
2. Select your EC2 instance's security group
3. Add Inbound Rules:
   - Type: Custom TCP, Port: 3000, Source: Your IP/32
   - Type: Custom TCP, Port: 5173, Source: Your IP/32
   - Type: HTTP, Port: 80, Source: 0.0.0.0/0
   - Type: HTTPS, Port: 443, Source: 0.0.0.0/0

### 2. EC2 Terminal Commands

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@65.1.235.131

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Clone the repository
cd /var/www
sudo git clone https://github.com/yuvraj5657663/Durga-Digital_library.git
cd Durga-Digital_library

# Install server dependencies
cd server
sudo npm install

# Copy production environment file
sudo cp .env.production .env
sudo nano .env  # Fill in your real values:
# - MONGODB_URI=mongodb://localhost:27017/durga-library
# - JWT_SECRET=generate-64-char-secret
# - ADMIN_PASS=your-strong-password
# - EMAIL_USER=your-gmail@gmail.com
# - EMAIL_PASS=your-gmail-app-password

# Build the client
cd ../client
sudo npm install
sudo npm run build

# Setup PM2 for server
cd ../server
sudo pm2 start src/index.js --name durga-library-server
sudo pm2 save
sudo pm2 startup

# Configure Nginx
sudo nano /etc/nginx/sites-available/durga-library
```

### 3. Nginx Configuration

Copy this content to `/etc/nginx/sites-available/durga-library`:

```nginx
server {
    listen 80;
    server_name 65.1.235.131;

    # Serve React frontend
    location / {
        root /var/www/Durga-Digital_library/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/durga-library /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Final Deployment Commands

```bash
# Pull latest changes
cd /var/www/Durga-Digital_library
sudo git pull origin main

# Rebuild client
cd client
sudo npm install
sudo npm run build

# Restart server
cd ../server
sudo pm2 restart durga-library-server

# Check status
sudo pm2 status
sudo pm2 logs durga-library-server
```

### 5. Verify Deployment

```bash
# Check server health
curl http://65.1.235.131/health

# Check frontend
curl http://65.1.235.131/

# Check API
curl http://65.1.235.131/api/v1/health
```

## Troubleshooting

### Server not accessible
```bash
# Check if server is running
sudo pm2 status

# Check server logs
sudo pm2 logs durga-library-server

# Check if port 3000 is listening
sudo netstat -tlnp | grep 3000

# Check MongoDB status
sudo systemctl status mongod
```

### CORS errors
```bash
# Check environment variables
cd /var/www/Durga-Digital_library/server
sudo cat .env | grep ALLOWED_ORIGINS
```

### Database connection issues
```bash
# Check MongoDB connection
sudo systemctl status mongod
sudo tail -f /var/log/mongodb/mongod.log
```

## Important Notes

1. **Security**: Never commit the filled `.env` file to git
2. **MongoDB**: For production, use MongoDB Atlas instead of local MongoDB
3. **SSL**: Configure SSL certificate for HTTPS (use Let's Encrypt)
4. **Firewall**: Ensure UFW allows necessary ports
5. **Backups**: Set up automated database backups
6. **Monitoring**: Set up monitoring (PM2 Plus, New Relic, etc.)