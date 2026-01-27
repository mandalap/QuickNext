#!/bin/bash

# QuickKasir - Setup Cron Jobs for VPS
# Script ini akan setup cron jobs untuk Laravel scheduler dan backup

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/kasir-pos"
BACKEND_DIR="${PROJECT_DIR}/app/backend"
PHP_PATH="/usr/bin/php8.3"

echo "⏰ QuickKasir - Cron Jobs Setup"
echo "================================"
echo ""

# Check if running as correct user
CURRENT_USER=$(whoami)
echo "Current user: ${CURRENT_USER}"
echo ""

# Check PHP path
if [ ! -f "${PHP_PATH}" ]; then
    # Try to find PHP
    PHP_PATH=$(which php)
    if [ -z "$PHP_PATH" ]; then
        echo -e "${RED}❌ Error: PHP not found${NC}"
        echo "Please install PHP or update PHP_PATH in this script"
        exit 1
    fi
    echo -e "${YELLOW}⚠️  Using PHP from: ${PHP_PATH}${NC}"
else
    echo -e "${GREEN}✅ PHP found: ${PHP_PATH}${NC}"
fi

# Check if backend directory exists
if [ ! -d "${BACKEND_DIR}" ]; then
    echo -e "${RED}❌ Error: Backend directory not found: ${BACKEND_DIR}${NC}"
    exit 1
fi

echo ""
echo "📋 Cron Jobs yang akan di-setup:"
echo "   1. Laravel Scheduler (setiap menit)"
echo "   2. Database Backup (setiap hari jam 3:00 AM)"
echo "   3. Storage Backup (setiap minggu hari Minggu jam 4:00 AM)"
echo ""

# Backup existing crontab
CRON_BACKUP="${PROJECT_DIR}/crontab_backup_$(date +%Y%m%d_%H%M%S).txt"
crontab -l > "${CRON_BACKUP}" 2>/dev/null || echo "# No existing crontab" > "${CRON_BACKUP}"
echo -e "${GREEN}✅ Existing crontab backed up to: ${CRON_BACKUP}${NC}"
echo ""

# Create temporary crontab file
TEMP_CRON=$(mktemp)

# Get existing crontab
crontab -l > "${TEMP_CRON}" 2>/dev/null || echo "" > "${TEMP_CRON}"

# Add Laravel Scheduler (if not exists)
if ! grep -q "artisan schedule:run" "${TEMP_CRON}"; then
    echo "" >> "${TEMP_CRON}"
    echo "# QuickKasir - Laravel Scheduler" >> "${TEMP_CRON}"
    echo "* * * * * cd ${BACKEND_DIR} && ${PHP_PATH} artisan schedule:run >> /dev/null 2>&1" >> "${TEMP_CRON}"
    echo -e "${GREEN}✅ Added Laravel Scheduler cron job${NC}"
else
    echo -e "${YELLOW}⚠️  Laravel Scheduler cron job already exists${NC}"
fi

# Add Database Backup (if not exists)
if [ ! -z "$(which mysqldump)" ]; then
    if ! grep -q "database-backup.sh" "${TEMP_CRON}"; then
        echo "" >> "${TEMP_CRON}"
        echo "# QuickKasir - Database Backup (Daily at 3:00 AM)" >> "${TEMP_CRON}"
        echo "0 3 * * * ${PROJECT_DIR}/scripts/database-backup.sh >> ${PROJECT_DIR}/backups/backup.log 2>&1" >> "${TEMP_CRON}"
        echo -e "${GREEN}✅ Added Database Backup cron job${NC}"
    else
        echo -e "${YELLOW}⚠️  Database Backup cron job already exists${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  mysqldump not found, skipping database backup cron job${NC}"
fi

# Add Storage Backup (if not exists)
if ! grep -q "storage-backup.sh" "${TEMP_CRON}"; then
    echo "" >> "${TEMP_CRON}"
    echo "# QuickKasir - Storage Backup (Weekly on Sunday at 4:00 AM)" >> "${TEMP_CRON}"
    echo "0 4 * * 0 ${PROJECT_DIR}/scripts/storage-backup.sh >> ${PROJECT_DIR}/backups/backup.log 2>&1" >> "${TEMP_CRON}"
    echo -e "${GREEN}✅ Added Storage Backup cron job${NC}"
else
    echo -e "${YELLOW}⚠️  Storage Backup cron job already exists${NC}"
fi

# Install new crontab
crontab "${TEMP_CRON}"
rm "${TEMP_CRON}"

echo ""
echo -e "${GREEN}✅ Cron jobs installed successfully!${NC}"
echo ""

# Show current crontab
echo "📋 Current cron jobs:"
echo "===================="
crontab -l
echo ""

# Test Laravel Scheduler
echo "🧪 Testing Laravel Scheduler..."
cd "${BACKEND_DIR}"
${PHP_PATH} artisan schedule:list || echo -e "${YELLOW}⚠️  Could not list scheduled tasks${NC}"
echo ""

echo -e "${GREEN}================================"
echo "✅ Cron Jobs Setup Completed!"
echo "================================"
echo ""
echo "📝 Next steps:"
echo "   1. Verify cron jobs: crontab -l"
echo "   2. Check Laravel scheduler: cd ${BACKEND_DIR} && ${PHP_PATH} artisan schedule:list"
echo "   3. Monitor logs: tail -f ${PROJECT_DIR}/backups/backup.log"
echo ""
