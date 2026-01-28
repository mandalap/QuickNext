#!/bin/bash

# QuickKasir - Setup Mailtrap Email Service
# For testing/development only - emails are captured, not actually sent

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

echo "📧 QuickKasir - Setup Mailtrap (Testing Only)"
echo "============================================="
echo ""
echo -e "${YELLOW}⚠️  WARNING: Mailtrap is for TESTING only!${NC}"
echo "   Emails will NOT be actually sent to users."
echo "   They will be captured in Mailtrap inbox for testing."
echo ""
echo "For PRODUCTION, use Mailgun instead!"
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

# Get Mailtrap credentials
echo "📋 Mailtrap Configuration:"
echo "==========================="
echo ""
echo "Untuk mendapatkan Mailtrap credentials:"
echo "1. Daftar di https://mailtrap.io (Free tier available)"
echo "2. Buat inbox baru"
echo "3. Pilih inbox > SMTP Settings"
echo "4. Copy SMTP credentials"
echo ""

read -p "Enter Mailtrap SMTP Host (default: sandbox.smtp.mailtrap.io): " MAIL_HOST
MAIL_HOST=${MAIL_HOST:-sandbox.smtp.mailtrap.io}

read -p "Enter Mailtrap SMTP Port (default: 2525): " MAIL_PORT
MAIL_PORT=${MAIL_PORT:-2525}

read -p "Enter Mailtrap Username: " MAIL_USERNAME
read -p "Enter Mailtrap Password: " MAIL_PASSWORD

read -p "Enter From Email Address (e.g., noreply@quickkasir.com): " FROM_EMAIL
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
    sed -i "s|^MAIL_HOST=.*|MAIL_HOST=${MAIL_HOST}|" .env
else
    echo "MAIL_HOST=${MAIL_HOST}" >> .env
fi

# Update MAIL_PORT
if grep -q "^MAIL_PORT=" .env; then
    sed -i "s|^MAIL_PORT=.*|MAIL_PORT=${MAIL_PORT}|" .env
else
    echo "MAIL_PORT=${MAIL_PORT}" >> .env
fi

# Update MAIL_USERNAME
if grep -q "^MAIL_USERNAME=" .env; then
    sed -i "s|^MAIL_USERNAME=.*|MAIL_USERNAME=${MAIL_USERNAME}|" .env
else
    echo "MAIL_USERNAME=${MAIL_USERNAME}" >> .env
fi

# Update MAIL_PASSWORD
if grep -q "^MAIL_PASSWORD=" .env; then
    sed -i "s|^MAIL_PASSWORD=.*|MAIL_PASSWORD=${MAIL_PASSWORD}|" .env
else
    echo "MAIL_PASSWORD=${MAIL_PASSWORD}" >> .env
fi

# Update MAIL_ENCRYPTION
if grep -q "^MAIL_ENCRYPTION=" .env; then
    sed -i 's/^MAIL_ENCRYPTION=.*/MAIL_ENCRYPTION=tls/' .env
else
    echo "MAIL_ENCRYPTION=tls" >> .env
fi

# Update MAIL_FROM_ADDRESS
if grep -q "^MAIL_FROM_ADDRESS=" .env; then
    sed -i "s|^MAIL_FROM_ADDRESS=.*|MAIL_FROM_ADDRESS=\"${FROM_EMAIL}\"|" .env
else
    echo "MAIL_FROM_ADDRESS=\"${FROM_EMAIL}\"|" >> .env
fi

# Update MAIL_FROM_NAME
if grep -q "^MAIL_FROM_NAME=" .env; then
    sed -i "s|^MAIL_FROM_NAME=.*|MAIL_FROM_NAME=\"${FROM_NAME}\"|" .env
else
    echo "MAIL_FROM_NAME=\"${FROM_NAME}\"|" >> .env
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
echo -e "${YELLOW}Note: Email will be captured in Mailtrap inbox, not actually sent.${NC}"
echo ""

${PHP_PATH} artisan tinker --execute="
use Illuminate\Support\Facades\Mail;

try {
    Mail::raw('Test email from QuickKasir using Mailtrap', function (\$message) {
        \$message->to('test@example.com')
                ->subject('[QuickKasir] Mailtrap Test Email');
    });
    echo '✅ Test email sent successfully!' . PHP_EOL;
    echo '📧 Check your Mailtrap inbox: https://mailtrap.io/inboxes' . PHP_EOL;
} catch (\Exception \$e) {
    echo '❌ Error: ' . \$e->getMessage() . PHP_EOL;
    exit(1);
}
"

EXIT_CODE=$?

echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}=========================="
    echo "✅ Mailtrap Setup Completed!"
    echo "==========================${NC}"
    echo ""
    echo "📧 Check your Mailtrap inbox:"
    echo "   https://mailtrap.io/inboxes"
    echo ""
    echo -e "${YELLOW}⚠️  REMEMBER: Mailtrap is for TESTING only!${NC}"
    echo "   For PRODUCTION, switch to Mailgun:"
    echo "   bash scripts/setup-mailgun-vps.sh"
    echo ""
else
    echo -e "${RED}=========================="
    echo "❌ Mailtrap Setup Failed!"
    echo "==========================${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify Mailtrap credentials are correct"
    echo "  2. Check Laravel logs: tail -50 storage/logs/laravel.log"
    echo "  3. Verify SMTP settings in Mailtrap dashboard"
    echo ""
    exit 1
fi
