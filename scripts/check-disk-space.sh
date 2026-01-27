#!/bin/bash

# QuickKasir - Disk Space Check Script
# Check disk usage and send alert if space is low
# Recommended: Run daily via cron job

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
THRESHOLD=80  # Alert if disk usage > 80%
PROJECT_DIR="/var/www/kasir-pos"
LOG_FILE="${PROJECT_DIR}/backups/disk-check.log"

# Create log directory if not exists
mkdir -p "${PROJECT_DIR}/backups"

echo "💾 QuickKasir - Disk Space Check"
echo "================================="
echo ""

# Get disk usage for root partition
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_AVAILABLE=$(df -h / | awk 'NR==2 {print $4}')
DISK_TOTAL=$(df -h / | awk 'NR==2 {print $2}')
DISK_USED=$(df -h / | awk 'NR==2 {print $3}')

echo "📊 Disk Usage:"
echo "   Total: ${DISK_TOTAL}"
echo "   Used: ${DISK_USED} (${DISK_USAGE}%)"
echo "   Available: ${DISK_AVAILABLE}"
echo ""

# Check if threshold exceeded
if [ "${DISK_USAGE}" -gt "${THRESHOLD}" ]; then
    echo -e "${RED}⚠️  WARNING: Disk usage is ${DISK_USAGE}% (threshold: ${THRESHOLD}%)${NC}"
    echo ""
    
    # Find largest directories
    echo "📁 Top 10 largest directories:"
    du -h /var/www 2>/dev/null | sort -rh | head -10 || echo "   Could not analyze directories"
    echo ""
    
    # Log warning
    echo "$(date): WARNING - Disk usage is ${DISK_USAGE}%" >> "${LOG_FILE}"
    
    # Send email notification (if configured)
    if [ -f "${PROJECT_DIR}/app/backend/.env" ]; then
        ADMIN_EMAIL=$(grep "^ADMIN_EMAIL=" "${PROJECT_DIR}/app/backend/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
        if [ ! -z "$ADMIN_EMAIL" ]; then
            cd "${PROJECT_DIR}/app/backend"
            /usr/bin/php8.3 artisan tinker --execute="
            use Illuminate\Support\Facades\Mail;
            try {
                Mail::raw('⚠️  WARNING: Disk usage is ${DISK_USAGE}% (threshold: ${THRESHOLD}%)\n\nTotal: ${DISK_TOTAL}\nUsed: ${DISK_USED} (${DISK_USAGE}%)\nAvailable: ${DISK_AVAILABLE}\n\nPlease free up disk space immediately!', function (\$message) {
                    \$message->to('${ADMIN_EMAIL}')
                            ->subject('[QuickKasir] ⚠️  Disk Space Warning - ${DISK_USAGE}%');
                });
            } catch (\Exception \$e) {
                // Silently fail
            }
            " > /dev/null 2>&1 || true
        fi
    fi
    
    exit 1
else
    echo -e "${GREEN}✅ Disk usage is OK (${DISK_USAGE}%)${NC}"
    echo "$(date): OK - Disk usage is ${DISK_USAGE}%" >> "${LOG_FILE}"
fi

echo ""
echo -e "${GREEN}================================="
echo "✅ Disk Space Check Completed!"
echo "=================================${NC}"
