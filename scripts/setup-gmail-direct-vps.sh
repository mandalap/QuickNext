#!/bin/bash

# QuickKasir - Setup Gmail Direct (Production)
# Try different methods to use Gmail directly

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/kasir-pos"
BACKEND_DIR="${PROJECT_DIR}/app/backend"

echo "📧 QuickKasir - Setup Gmail Direct"
echo "==================================="
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

echo "📋 Testing SMTP Ports..."
echo "========================"

# Test port 25 (unencrypted SMTP)
echo -n "   Testing port 25 (unencrypted)... "
if timeout 5 bash -c "echo > /dev/tcp/smtp.gmail.com/25" 2>/dev/null; then
    echo -e "${GREEN}✅ Port 25 is accessible${NC}"
    PORT_25_OK=true
else
    echo -e "${RED}❌ Port 25 is blocked${NC}"
    PORT_25_OK=false
fi

# Test port 587 (TLS)
echo -n "   Testing port 587 (TLS)... "
if timeout 5 bash -c "echo > /dev/tcp/smtp.gmail.com/587" 2>/dev/null; then
    echo -e "${GREEN}✅ Port 587 is accessible${NC}"
    PORT_587_OK=true
else
    echo -e "${RED}❌ Port 587 is blocked${NC}"
    PORT_587_OK=false
fi

# Test port 465 (SSL)
echo -n "   Testing port 465 (SSL)... "
if timeout 5 bash -c "echo > /dev/tcp/smtp.gmail.com/465" 2>/dev/null; then
    echo -e "${GREEN}✅ Port 465 is accessible${NC}"
    PORT_465_OK=true
else
    echo -e "${RED}❌ Port 465 is blocked${NC}"
    PORT_465_OK=false
fi

echo ""

# Determine which port to use
if [ "$PORT_25_OK" = true ]; then
    RECOMMENDED_PORT=25
    RECOMMENDED_ENCRYPTION=null
    echo -e "${GREEN}✅ Recommended: Port 25 (unencrypted)${NC}"
elif [ "$PORT_587_OK" = true ]; then
    RECOMMENDED_PORT=587
    RECOMMENDED_ENCRYPTION=tls
    echo -e "${GREEN}✅ Recommended: Port 587 (TLS)${NC}"
elif [ "$PORT_465_OK" = true ]; then
    RECOMMENDED_PORT=465
    RECOMMENDED_ENCRYPTION=ssl
    echo -e "${GREEN}✅ Recommended: Port 465 (SSL)${NC}"
else
    echo -e "${RED}❌ All SMTP ports are blocked!${NC}"
    echo ""
    echo "Options:"
    echo "  1. Contact VPS provider to unblock SMTP ports"
    echo "  2. Use Mailgun (recommended for production)"
    echo "  3. Use Gmail API with OAuth2 (more complex)"
    echo ""
    exit 1
fi

echo ""
echo "📋 Gmail Configuration:"
echo "========================"
echo ""
echo "Requirements:"
echo "  1. Gmail account: quickkasir@gmail.com"
echo "  2. Gmail App Password (not regular password)"
echo "  3. 2-Step Verification must be enabled"
echo ""

read -p "Enter Gmail address (default: quickkasir@gmail.com): " GMAIL_ADDRESS
GMAIL_ADDRESS=${GMAIL_ADDRESS:-quickkasir@gmail.com}

echo ""
echo "To get Gmail App Password:"
echo "  1. Go to: https://myaccount.google.com/security"
echo "  2. Enable '2-Step Verification' if not already enabled"
echo "  3. Go to: https://myaccount.google.com/apppasswords"
echo "  4. Select app: 'Mail'"
echo "  5. Select device: 'Other (Custom name)'"
echo "  6. Enter: 'QuickKasir POS'"
echo "  7. Click 'Generate'"
echo "  8. Copy the 16-character password (no spaces)"
echo ""

read -p "Enter Gmail App Password (16 characters, no spaces): " GMAIL_PASSWORD

if [ -z "$GMAIL_PASSWORD" ]; then
    echo -e "${RED}❌ Error: App Password is required${NC}"
    exit 1
fi

# Remove spaces from password
GMAIL_PASSWORD=$(echo "$GMAIL_PASSWORD" | tr -d ' ')

read -p "Enter From Name (default: QuickKasir POS): " FROM_NAME
FROM_NAME=${FROM_NAME:-QuickKasir POS}

# Backup .env
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
cp .env "$BACKUP_FILE"
echo -e "${GREEN}✅ Backed up .env to: ${BACKUP_FILE}${NC}"
echo ""

# Update .env
echo "Updating .env file..."

# Update MAIL_MAILER
if grep -q "^MAIL_MAILER=" .env; then
    sed -i 's/^MAIL_MAILER=.*/MAIL_MAILER=smtp/' .env
else
    echo "MAIL_MAILER=smtp" >> .env
fi

# Update MAIL_HOST
if grep -q "^MAIL_HOST=" .env; then
    sed -i 's/^MAIL_HOST=.*/MAIL_HOST=smtp.gmail.com/' .env
else
    echo "MAIL_HOST=smtp.gmail.com" >> .env
fi

# Update MAIL_PORT
if grep -q "^MAIL_PORT=" .env; then
    sed -i "s/^MAIL_PORT=.*/MAIL_PORT=${RECOMMENDED_PORT}/" .env
else
    echo "MAIL_PORT=${RECOMMENDED_PORT}" >> .env
fi

# Update MAIL_USERNAME
if grep -q "^MAIL_USERNAME=" .env; then
    sed -i "s|^MAIL_USERNAME=.*|MAIL_USERNAME=${GMAIL_ADDRESS}|" .env
else
    echo "MAIL_USERNAME=${GMAIL_ADDRESS}" >> .env
fi

# Update MAIL_PASSWORD
if grep -q "^MAIL_PASSWORD=" .env; then
    sed -i "s|^MAIL_PASSWORD=.*|MAIL_PASSWORD=${GMAIL_PASSWORD}|" .env
else
    echo "MAIL_PASSWORD=${GMAIL_PASSWORD}" >> .env
fi

# Update MAIL_ENCRYPTION
if [ "$RECOMMENDED_ENCRYPTION" = "null" ]; then
    if grep -q "^MAIL_ENCRYPTION=" .env; then
        sed -i 's/^MAIL_ENCRYPTION=.*/MAIL_ENCRYPTION=null/' .env
    else
        echo "MAIL_ENCRYPTION=null" >> .env
    fi
else
    if grep -q "^MAIL_ENCRYPTION=" .env; then
        sed -i "s/^MAIL_ENCRYPTION=.*/MAIL_ENCRYPTION=${RECOMMENDED_ENCRYPTION}/" .env
    else
        echo "MAIL_ENCRYPTION=${RECOMMENDED_ENCRYPTION}" >> .env
    fi
fi

# Update MAIL_FROM_ADDRESS
if grep -q "^MAIL_FROM_ADDRESS=" .env; then
    sed -i "s|^MAIL_FROM_ADDRESS=.*|MAIL_FROM_ADDRESS=\"${GMAIL_ADDRESS}\"|" .env
else
    echo "MAIL_FROM_ADDRESS=\"${GMAIL_ADDRESS}\"" >> .env
fi

# Update MAIL_FROM_NAME
if grep -q "^MAIL_FROM_NAME=" .env; then
    sed -i "s|^MAIL_FROM_NAME=.*|MAIL_FROM_NAME=\"${FROM_NAME}\"|" .env
else
    echo "MAIL_FROM_NAME=\"${FROM_NAME}\"" >> .env
fi

echo -e "${GREEN}✅ .env file updated${NC}"
echo ""

# Clear config cache
PHP_PATH="/usr/bin/php8.3"
if [ ! -f "${PHP_PATH}" ]; then
    PHP_PATH=$(which php)
fi

echo "Clearing config cache..."
${PHP_PATH} artisan config:clear > /dev/null 2>&1
${PHP_PATH} artisan config:cache > /dev/null 2>&1
echo -e "${GREEN}✅ Config cache cleared and re-cached${NC}"
echo ""

# Test email
echo "Testing email configuration..."
read -p "Enter test email address: " TEST_EMAIL

${PHP_PATH} artisan tinker --execute="
use Illuminate\Support\Facades\Mail;

try {
    Mail::raw('Test email from QuickKasir using Gmail SMTP', function (\$message) use (\$testEmail) {
        \$message->to('${TEST_EMAIL}')
                ->subject('[QuickKasir] Gmail SMTP Test Email');
    });
    echo '✅ Test email sent successfully!' . PHP_EOL;
} catch (\Exception \$e) {
    echo '❌ Error: ' . \$e->getMessage() . PHP_EOL;
    exit(1);
}
"

EXIT_CODE=$?

echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}=========================="
    echo "✅ Gmail Setup Completed!"
    echo "==========================${NC}"
    echo ""
    echo "📧 Check your inbox: ${TEST_EMAIL}"
    echo ""
    echo "Configuration:"
    echo "   Mailer: smtp"
    echo "   Host: smtp.gmail.com"
    echo "   Port: ${RECOMMENDED_PORT}"
    echo "   Encryption: ${RECOMMENDED_ENCRYPTION:-none}"
    echo "   From: ${GMAIL_ADDRESS}"
    echo ""
else
    echo -e "${RED}=========================="
    echo "❌ Gmail Setup Failed!"
    echo "==========================${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify Gmail App Password is correct (no spaces)"
    echo "  2. Check 2-Step Verification is enabled"
    echo "  3. Check Laravel logs: tail -50 storage/logs/laravel.log"
    echo "  4. If all ports blocked, contact VPS provider or use Mailgun"
    echo ""
    exit 1
fi
