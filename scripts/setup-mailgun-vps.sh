#!/bin/bash

# QuickKasir - Setup Mailgun Email Service
# Alternative to SMTP when VPS blocks outbound SMTP connections

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

echo "📧 QuickKasir - Setup Mailgun Email Service"
echo "============================================"
echo ""
echo "Mailgun adalah email service yang recommended untuk production"
echo "dan tidak memerlukan outbound SMTP connections."
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

# Check if Mailgun package is installed
if ! grep -q "mailgun/mailgun-php" composer.json 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Mailgun package not found in composer.json${NC}"
    echo "Installing Mailgun package..."
    composer require mailgun/mailgun-php symfony/http-client
    echo -e "${GREEN}✅ Mailgun package installed${NC}"
    echo ""
fi

# Get Mailgun credentials
echo "📋 Mailgun Configuration:"
echo "========================"
echo ""
echo "Untuk mendapatkan Mailgun credentials:"
echo "1. Daftar di https://www.mailgun.com (Free tier: 5,000 emails/month)"
echo "2. Verifikasi domain atau gunakan sandbox domain"
echo "3. Dapatkan API Key dari Dashboard > Settings > API Keys"
echo "4. Dapatkan Domain dari Dashboard > Sending > Domains"
echo ""

read -p "Enter Mailgun Domain (e.g., mg.yourdomain.com or sandbox123.mailgun.org): " MAILGUN_DOMAIN
read -p "Enter Mailgun Secret Key: " MAILGUN_SECRET
read -p "Enter Mailgun Endpoint (default: api.mailgun.net): " MAILGUN_ENDPOINT
MAILGUN_ENDPOINT=${MAILGUN_ENDPOINT:-api.mailgun.net}

read -p "Enter From Email Address (e.g., noreply@yourdomain.com): " FROM_EMAIL
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
    sed -i 's/^MAIL_MAILER=.*/MAIL_MAILER=mailgun/' .env
else
    echo "MAIL_MAILER=mailgun" >> .env
fi

# Update MAIL_FROM_ADDRESS
if grep -q "^MAIL_FROM_ADDRESS=" .env; then
    sed -i "s|^MAIL_FROM_ADDRESS=.*|MAIL_FROM_ADDRESS=\"${FROM_EMAIL}\"|" .env
else
    echo "MAIL_FROM_ADDRESS=\"${FROM_EMAIL}\"" >> .env
fi

# Update MAIL_FROM_NAME
if grep -q "^MAIL_FROM_NAME=" .env; then
    sed -i "s|^MAIL_FROM_NAME=.*|MAIL_FROM_NAME=\"${FROM_NAME}\"|" .env
else
    echo "MAIL_FROM_NAME=\"${FROM_NAME}\"" >> .env
fi

# Add Mailgun configuration
if grep -q "^MAILGUN_DOMAIN=" .env; then
    sed -i "s|^MAILGUN_DOMAIN=.*|MAILGUN_DOMAIN=${MAILGUN_DOMAIN}|" .env
else
    echo "MAILGUN_DOMAIN=${MAILGUN_DOMAIN}" >> .env
fi

if grep -q "^MAILGUN_SECRET=" .env; then
    sed -i "s|^MAILGUN_SECRET=.*|MAILGUN_SECRET=${MAILGUN_SECRET}|" .env
else
    echo "MAILGUN_SECRET=${MAILGUN_SECRET}" >> .env
fi

if grep -q "^MAILGUN_ENDPOINT=" .env; then
    sed -i "s|^MAILGUN_ENDPOINT=.*|MAILGUN_ENDPOINT=${MAILGUN_ENDPOINT}|" .env
else
    echo "MAILGUN_ENDPOINT=${MAILGUN_ENDPOINT}" >> .env
fi

echo -e "${GREEN}✅ .env file updated${NC}"
echo ""

# Check config/mail.php
echo "Checking config/mail.php..."
if ! grep -q "mailgun" config/mail.php 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Mailgun configuration might need to be added to config/mail.php${NC}"
    echo "Laravel should auto-detect Mailgun from .env, but check if needed."
fi

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
    Mail::raw('Test email from QuickKasir using Mailgun', function (\$message) use (\$testEmail) {
        \$message->to('${TEST_EMAIL}')
                ->subject('[QuickKasir] Mailgun Test Email');
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
    echo "✅ Mailgun Setup Completed!"
    echo "==========================${NC}"
    echo ""
    echo "📧 Check your inbox: ${TEST_EMAIL}"
    echo ""
    echo "Next steps:"
    echo "  1. Verify email was received"
    echo "  2. Test registration emails: bash scripts/test-registration-emails-vps.sh"
    echo "  3. Monitor Mailgun dashboard for email delivery"
    echo ""
else
    echo -e "${RED}=========================="
    echo "❌ Mailgun Setup Failed!"
    echo "==========================${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify Mailgun credentials are correct"
    echo "  2. Check Mailgun domain is verified"
    echo "  3. Check Laravel logs: tail -50 storage/logs/laravel.log"
    echo "  4. Verify Mailgun package is installed: composer show mailgun/mailgun-php"
    echo ""
    exit 1
fi
