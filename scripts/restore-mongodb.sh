#!/bin/bash

# MongoDB Restore Script
# This script restores MongoDB database from a backup

set -e

# Configuration
BACKUP_DIR="./backups/mongodb"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/server/.env" ]; then
    export $(cat "$PROJECT_ROOT/server/.env" | grep -v '^#' | xargs)
fi

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <backup_file.tar.gz>"
    echo "📋 Available backups:"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will replace the current database with the backup."
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Extract backup
echo "📦 Extracting backup..."
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the extracted backup directory
EXTRACTED_DIR=$(find "$TEMP_DIR" -type d -name "backup_*" | head -n 1)

if [ -z "$EXTRACTED_DIR" ]; then
    echo "❌ Could not find extracted backup directory"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Restore database
echo "🗄️  Restoring database..."
mongorestore \
    --uri="$MONGODB_URI" \
    --drop \
    --gzip \
    "$EXTRACTED_DIR"

if [ $? -eq 0 ]; then
    echo "✅ Restore completed successfully"
    rm -rf "$TEMP_DIR"
else
    echo "❌ Restore failed"
    rm -rf "$TEMP_DIR"
    exit 1
fi
