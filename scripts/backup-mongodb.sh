#!/bin/bash

# MongoDB Backup Script
# This script creates automated backups of MongoDB database

set -e

# Configuration
BACKUP_DIR="./backups/mongodb"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/server/.env" ]; then
    export $(cat "$PROJECT_ROOT/server/.env" | grep -v '^#' | xargs)
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🗄️  Starting MongoDB backup..."

# Extract database name from MONGODB_URI
DB_NAME=$(echo $MONGODB_URI | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ -z "$DB_NAME" ]; then
    echo "❌ Could not extract database name from MONGODB_URI"
    exit 1
fi

# Create backup
mongodump \
    --uri="$MONGODB_URI" \
    --out="$BACKUP_DIR/backup_$TIMESTAMP" \
    --gzip

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully: $BACKUP_DIR/backup_$TIMESTAMP"
    
    # Create a compressed archive
    cd "$BACKUP_DIR"
    tar -czf "backup_${DB_NAME}_${TIMESTAMP}.tar.gz" "backup_$TIMESTAMP"
    rm -rf "backup_$TIMESTAMP"
    cd -
    
    echo "📦 Archive created: backup_${DB_NAME}_${TIMESTAMP}.tar.gz"
    
    # Remove old backups (older than RETENTION_DAYS)
    find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    echo "🧹 Old backups removed (older than $RETENTION_DAYS days)"
    
    # List current backups
    echo ""
    echo "📋 Current backups:"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "No backups found"
else
    echo "❌ Backup failed"
    exit 1
fi
