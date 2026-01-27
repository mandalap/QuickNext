#!/bin/bash

# QuickKasir - Storage Files Backup Script
# Backup storage directory (uploads, files, etc.)
# Recommended: Run weekly via cron job

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/kasir-pos"
BACKUP_DIR="${PROJECT_DIR}/backups"
STORAGE_DIR="${PROJECT_DIR}/app/backend/storage/app"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/storage_backup_${DATE}.tar.gz"
RETENTION_DAYS=14  # Keep backups for 14 days

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

echo "📦 QuickKasir - Storage Backup"
echo "==============================="
echo ""

# Check if storage directory exists
if [ ! -d "${STORAGE_DIR}" ]; then
    echo -e "${RED}❌ Error: Storage directory not found: ${STORAGE_DIR}${NC}"
    exit 1
fi

# Check if storage directory is empty
if [ -z "$(ls -A ${STORAGE_DIR} 2>/dev/null)" ]; then
    echo -e "${YELLOW}⚠️  Warning: Storage directory is empty${NC}"
    exit 0
fi

echo "📋 Configuration:"
echo "   Storage Dir: ${STORAGE_DIR}"
echo "   Backup File: ${BACKUP_FILE}"
echo ""

# Perform backup
echo -e "${YELLOW}📦 Creating storage backup...${NC}"

# Exclude log files and cache from backup
tar -czf "${BACKUP_FILE}" \
    -C "${PROJECT_DIR}/app/backend" \
    --exclude="storage/logs/*" \
    --exclude="storage/framework/cache/*" \
    --exclude="storage/framework/sessions/*" \
    --exclude="storage/framework/views/*" \
    storage/app 2>/dev/null || {
    echo -e "${RED}❌ Error: Failed to create backup${NC}"
    exit 1
}

# Get file size
FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo "   File: ${BACKUP_FILE}"
echo "   Size: ${FILE_SIZE}"
echo ""

# Cleanup old backups (older than RETENTION_DAYS)
echo -e "${YELLOW}🧹 Cleaning up old backups (older than ${RETENTION_DAYS} days)...${NC}"
find "${BACKUP_DIR}" -name "storage_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

DELETED_COUNT=$(find "${BACKUP_DIR}" -name "storage_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} 2>/dev/null | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Deleted ${DELETED_COUNT} old backup(s)${NC}"
else
    echo -e "${GREEN}✅ No old backups to delete${NC}"
fi

# List current backups
echo ""
echo "📋 Current backups:"
ls -lh "${BACKUP_DIR}"/storage_backup_*.tar.gz 2>/dev/null | tail -5 || echo "   No backups found"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo ""
echo "📊 Total backup size: ${TOTAL_SIZE}"
echo ""

echo -e "${GREEN}==============================="
echo "✅ Storage Backup Completed!"
echo "===============================${NC}"
