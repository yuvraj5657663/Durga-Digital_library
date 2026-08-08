#!/bin/bash

# System Backup Script
# This script creates a complete backup of the application including database, uploads, and configuration

set -e

# Configuration
BACKUP_DIR="./backups/system"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting system backup..."

# Backup MongoDB
echo "🗄️  Backing up MongoDB..."
bash "$SCRIPT_DIR/backup-mongodb.sh"

# Backup uploads directory
if [ -d "$PROJECT_ROOT/server/uploads" ]; then
    echo "📁 Backing up uploads..."
    tar -czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C "$PROJECT_ROOT/server" uploads
    echo "✅ Uploads backed up"
fi

# Backup configuration files
echo "⚙️  Backing up configuration..."
tar -czf "$BACKUP_DIR/config_${TIMESTAMP}.tar.gz" \
    -C "$PROJECT_ROOT" \
    server/.env \
    client/.env \
    server/ecosystem.config.js \
    nginx.conf \
    docker-compose.yml

echo "✅ Configuration backed up"

# Backup WhatsApp authentication
if [ -d "$PROJECT_ROOT/.wwebjs_auth" ]; then
    echo "📱 Backing up WhatsApp authentication..."
    tar -czf "$BACKUP_DIR/whatsapp_auth_${TIMESTAMP}.tar.gz" -C "$PROJECT_ROOT" .wwebjs_auth
    echo "✅ WhatsApp authentication backed up"
fi

# Create a manifest
cat > "$BACKUP_DIR/manifest_${TIMESTAMP}.txt" << EOF
System Backup Manifest
=======================
Date: $(date)
Timestamp: $TIMESTAMP
Environment: ${NODE_ENV:-development}

Components Backed Up:
- MongoDB database
- Uploads directory
- Configuration files
- WhatsApp authentication

Files:
EOF

ls -lh "$BACKUP_DIR"/*_${TIMESTAMP}.tar.gz >> "$BACKUP_DIR/manifest_${TIMESTAMP}.txt"

echo "📋 Manifest created"

# Remove old backups
find "$BACKUP_DIR" -name "*_${TIMESTAMP}.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "manifest_*.txt" -type f -mtime +$RETENTION_DAYS -delete
echo "🧹 Old backups removed (older than $RETENTION_DAYS days)"

echo ""
echo "✅ System backup completed successfully"
echo "📂 Backup location: $BACKUP_DIR"
