#!/bin/bash

# Deployment script for Durga Digital Library
# This script handles the deployment process for both client and server

set -e

echo "🚀 Starting deployment process..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Build server
echo "📦 Building server..."
cd server
npm install
npm run build
cd ..

# Build client
echo "📦 Building client..."
cd client
npm install
npm run build
cd ..

# Restart server with PM2
echo "🔄 Restarting server with PM2..."
cd server
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
cd ..

echo "✅ Deployment completed successfully!"
echo "📊 Check PM2 status: cd server && pm2 status"
echo "📊 View logs: cd server && pm2 logs"
