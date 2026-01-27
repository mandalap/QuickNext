#!/bin/bash

# QuickKasir - Memory Check Script
# Check memory usage and send alert if memory is low
# Recommended: Run daily via cron job

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
THRESHOLD=80  # Alert if memory usage > 80%
PROJECT_DIR="/var/www/kasir-pos"
LOG_FILE="${PROJECT_DIR}/backups/memory-check.log"

# Create log directory if not exists
mkdir -p "${PROJECT_DIR}/backups"

echo "🧠 QuickKasir - Memory Check"
echo "============================"
echo ""

# Get memory usage
MEMORY_INFO=$(free -h | grep Mem)
TOTAL_MEM=$(echo $MEMORY_INFO | awk '{print $2}')
USED_MEM=$(echo $MEMORY_INFO | awk '{print $3}')
FREE_MEM=$(echo $MEMORY_INFO | awk '{print $4}')
AVAILABLE_MEM=$(echo $MEMORY_INFO | awk '{print $7}')

# Get memory usage percentage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", ($3/$2) * 100}')

echo "📊 Memory Usage:"
echo "   Total: ${TOTAL_MEM}"
echo "   Used: ${USED_MEM} (${MEMORY_USAGE}%)"
echo "   Free: ${FREE_MEM}"
echo "   Available: ${AVAILABLE_MEM}"
echo ""

# Check if threshold exceeded
if [ "${MEMORY_USAGE}" -gt "${THRESHOLD}" ]; then
    echo -e "${RED}⚠️  WARNING: Memory usage is ${MEMORY_USAGE}% (threshold: ${THRESHOLD}%)${NC}"
    echo ""
    
    # Show top memory consuming processes
    echo "🔝 Top 10 memory consuming processes:"
    ps aux --sort=-%mem | head -11 | awk '{print $2, $4, $11}' | column -t || echo "   Could not analyze processes"
    echo ""
    
    # Log warning
    echo "$(date): WARNING - Memory usage is ${MEMORY_USAGE}%" >> "${LOG_FILE}"
    
    # Send email notification (if configured)
    if [ -f "${PROJECT_DIR}/app/backend/.env" ]; then
        ADMIN_EMAIL=$(grep "^ADMIN_EMAIL=" "${PROJECT_DIR}/app/backend/.env" | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
        if [ ! -z "$ADMIN_EMAIL" ]; then
            cd "${PROJECT_DIR}/app/backend"
            /usr/bin/php8.3 artisan tinker --execute="
            use Illuminate\Support\Facades\Mail;
            try {
                Mail::raw('⚠️  WARNING: Memory usage is ${MEMORY_USAGE}% (threshold: ${THRESHOLD}%)\n\nTotal: ${TOTAL_MEM}\nUsed: ${USED_MEM} (${MEMORY_USAGE}%)\nAvailable: ${AVAILABLE_MEM}\n\nPlease check memory-consuming processes!', function (\$message) {
                    \$message->to('${ADMIN_EMAIL}')
                            ->subject('[QuickKasir] ⚠️  Memory Warning - ${MEMORY_USAGE}%');
                });
            } catch (\Exception \$e) {
                // Silently fail
            }
            " > /dev/null 2>&1 || true
        fi
    fi
    
    exit 1
else
    echo -e "${GREEN}✅ Memory usage is OK (${MEMORY_USAGE}%)${NC}"
    echo "$(date): OK - Memory usage is ${MEMORY_USAGE}%" >> "${LOG_FILE}"
fi

echo ""
echo -e "${GREEN}============================"
echo "✅ Memory Check Completed!"
echo "============================${NC}"
