#!/bin/bash

# QuickKasir - Database Backup Script
# Backup database MySQL ke file dengan timestamp
# Recommended: Run daily via cron job

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/kasir-pos"
BACKUP_DIR="${PROJECT_DIR}/backups"
DB_NAME="kasir_pos"
DB_USER="root"
DB_PASS=""  # Will be read from .env or prompt
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_backup_${DATE}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"
RETENTION_DAYS=30  # Keep backups for 30 days

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

echo "🗄️  QuickKasir - Database Backup"
echo "=================================="
echo ""

# Get database credentials from .env if available
if [ -f "${PROJECT_DIR}/app/backend/.env" ]; then
    DB_NAME=$(grep "^DB_DATABASE=" "${PROJECT_DIR}/app/backend/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
    DB_USER=$(grep "^DB_USERNAME=" "${PROJECT_DIR}/app/backend/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
    DB_PASS=$(grep "^DB_PASSWORD=" "${PROJECT_DIR}/app/backend/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
fi

# If password is empty, try to get from MySQL config or prompt
if [ -z "$DB_PASS" ]; then
    # Try to read from MySQL config file
    if [ -f ~/.my.cnf ]; then
        DB_PASS=$(grep "^password=" ~/.my.cnf | cut -d '=' -f2 | xargs)
    fi
fi

# Validate database name
if [ -z "$DB_NAME" ]; then
    echo -e "${RED}❌ Error: Database name not found${NC}"
    exit 1
fi

echo "📋 Configuration:"
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo "   Backup File: ${BACKUP_FILE_GZ}"
echo ""

# Check if MySQL is running
if ! systemctl is-active --quiet mysql; then
    echo -e "${RED}❌ Error: MySQL service is not running${NC}"
    exit 1
fi

# Perform backup
echo -e "${YELLOW}📦 Creating database backup...${NC}"

if [ -z "$DB_PASS" ]; then
    # Backup without password (if using socket or .my.cnf)
    mysqldump -u "${DB_USER}" "${DB_NAME}" > "${BACKUP_FILE}" 2>/dev/null || {
        echo -e "${RED}❌ Error: Failed to create backup. Please check MySQL credentials.${NC}"
        exit 1
    }
else
    # Backup with password
    mysqldump -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" > "${BACKUP_FILE}" 2>/dev/null || {
        echo -e "${RED}❌ Error: Failed to create backup. Please check MySQL credentials.${NC}"
        exit 1
    }
fi

# Compress backup
echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
gzip -f "${BACKUP_FILE}"

# Get file size
FILE_SIZE=$(du -h "${BACKUP_FILE_GZ}" | cut -f1)

echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo "   File: ${BACKUP_FILE_GZ}"
echo "   Size: ${FILE_SIZE}"
echo ""

# Cleanup old backups (older than RETENTION_DAYS)
echo -e "${YELLOW}🧹 Cleaning up old backups (older than ${RETENTION_DAYS} days)...${NC}"
find "${BACKUP_DIR}" -name "db_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

DELETED_COUNT=$(find "${BACKUP_DIR}" -name "db_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} 2>/dev/null | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Deleted ${DELETED_COUNT} old backup(s)${NC}"
else
    echo -e "${GREEN}✅ No old backups to delete${NC}"
fi

# List current backups
echo ""
echo "📋 Current backups:"
ls -lh "${BACKUP_DIR}"/db_backup_*.sql.gz 2>/dev/null | tail -5 || echo "   No backups found"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo ""
echo "📊 Total backup size: ${TOTAL_SIZE}"
echo ""

# Send email notification (if configured)
if [ -f "${PROJECT_DIR}/app/backend/.env" ]; then
    ADMIN_EMAIL=$(grep "^ADMIN_EMAIL=" "${PROJECT_DIR}/app/backend/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
    if [ ! -z "$ADMIN_EMAIL" ]; then
        cd "${PROJECT_DIR}/app/backend"
        /usr/bin/php8.3 artisan tinker --execute="
        use Illuminate\Support\Facades\Mail;
        try {
            Mail::raw('Database backup completed successfully!\n\nFile: ${BACKUP_FILE_GZ}\nSize: ${FILE_SIZE}\nTime: $(date)', function (\$message) {
                \$message->to('${ADMIN_EMAIL}')
                        ->subject('[QuickKasir] Database Backup Completed - ' . date('Y-m-d H:i:s'));
            });
        } catch (\Exception \$e) {
            // Silently fail - don't break backup process
        }
        " > /dev/null 2>&1 || true
    fi
fi

echo -e "${GREEN}=================================="
echo "✅ Database Backup Completed!"
echo "==================================${NC}"
