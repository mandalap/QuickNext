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
    
    # TODO: Send email notification (if configured)
    # mail -s "Disk Space Warning" admin@quickkasir.com << EOF
    # Disk usage on server is ${DISK_USAGE}%
    # Available: ${DISK_AVAILABLE}
    # EOF
    
    exit 1
else
    echo -e "${GREEN}✅ Disk usage is OK (${DISK_USAGE}%)${NC}"
    echo "$(date): OK - Disk usage is ${DISK_USAGE}%" >> "${LOG_FILE}"
fi

echo ""
echo -e "${GREEN}================================="
echo "✅ Disk Space Check Completed!"
echo "=================================${NC}"
