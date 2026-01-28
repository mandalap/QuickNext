#!/bin/bash

# QuickKasir - Switch SMTP to SSL (Port 465)
# Switch from TLS (port 587) to SSL (port 465)

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/kasir-pos"
BACKEND_DIR="${PROJECT_DIR}/app/backend"

echo "🔄 QuickKasir - Switch to SSL SMTP (Port 465)"
echo "=============================================="
echo ""

# Check if backend directory exists
if [ ! -d "${BACKEND_DIR}" ]; then
    echo -e "${RED}❌ Error: Backend directory not found: ${BACKEND_DIR}${NC}"
    exit 1
fi

cd "${BACKEND_DIR}"

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

# Backup .env
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
cp .env "$BACKUP_FILE"
echo -e "${GREEN}✅ Backed up .env to: ${BACKUP_FILE}${NC}"
echo ""

# Get current configuration
CURRENT_PORT=$(grep "^MAIL_PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
CURRENT_ENCRYPTION=$(grep "^MAIL_ENCRYPTION=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)

echo "📋 Current Configuration:"
echo "   Port: ${CURRENT_PORT:-'Not set'}"
echo "   Encryption: ${CURRENT_ENCRYPTION:-'Not set'}"
echo ""

# Update port to 465
if grep -q "^MAIL_PORT=" .env; then
    sed -i 's/^MAIL_PORT=.*/MAIL_PORT=465/' .env
else
    echo "MAIL_PORT=465" >> .env
fi

# Update encryption to ssl
if grep -q "^MAIL_ENCRYPTION=" .env; then
    sed -i 's/^MAIL_ENCRYPTION=.*/MAIL_ENCRYPTION=ssl/' .env
else
    echo "MAIL_ENCRYPTION=ssl" >> .env
fi

echo -e "${GREEN}✅ Updated configuration:${NC}"
echo "   MAIL_PORT=465"
echo "   MAIL_ENCRYPTION=ssl"
echo ""

# Clear config cache
PHP_PATH="/usr/bin/php8.3"
if [ ! -f "${PHP_PATH}" ]; then
    PHP_PATH=$(which php)
fi

echo "Clearing config cache..."
${PHP_PATH} artisan config:clear > /dev/null 2>&1
echo -e "${GREEN}✅ Config cache cleared${NC}"
echo ""

# Test port 465 connectivity
echo "Testing connection to smtp.gmail.com:465..."
if timeout 5 bash -c "echo > /dev/tcp/smtp.gmail.com/465" 2>/dev/null; then
    echo -e "${GREEN}✅ Port 465 is accessible${NC}"
else
    echo -e "${RED}❌ Port 465 is blocked or unreachable${NC}"
    echo ""
    echo "You may need to:"
    echo "  1. Contact your VPS provider to unblock port 465"
    echo "  2. Use an alternative email service (Mailgun, SendGrid, etc.)"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}=========================="
echo "✅ SMTP Configuration Updated!"
echo "==========================${NC}"
echo ""
echo "Next steps:"
echo "  1. Test email: bash scripts/test-email-vps.sh"
echo "  2. If still fails, check:"
echo "     - Gmail App Password is correct (no spaces)"
echo "     - Two-factor authentication is enabled"
echo "     - MAIL_USERNAME matches your Gmail address"
echo ""
