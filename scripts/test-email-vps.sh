#!/bin/bash

# QuickKasir - Test Email Configuration
# Test email sending from Laravel

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

echo "📧 QuickKasir - Email Test"
echo "=========================="
echo ""

# Check if backend directory exists
if [ ! -d "${BACKEND_DIR}" ]; then
    echo -e "${RED}❌ Error: Backend directory not found: ${BACKEND_DIR}${NC}"
    exit 1
fi

cd "${BACKEND_DIR}"

# Check PHP path
if [ ! -f "${PHP_PATH}" ]; then
    PHP_PATH=$(which php)
    if [ -z "$PHP_PATH" ]; then
        echo -e "${RED}❌ Error: PHP not found${NC}"
        exit 1
    fi
fi

echo "📋 Email Configuration:"
echo "======================="

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

# Get email configuration from .env
MAIL_MAILER=$(grep "^MAIL_MAILER=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
MAIL_HOST=$(grep "^MAIL_HOST=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
MAIL_PORT=$(grep "^MAIL_PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
MAIL_USERNAME=$(grep "^MAIL_USERNAME=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
MAIL_FROM_ADDRESS=$(grep "^MAIL_FROM_ADDRESS=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
MAIL_FROM_NAME=$(grep "^MAIL_FROM_NAME=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
ADMIN_EMAIL=$(grep "^ADMIN_EMAIL=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)

echo "   Mailer: ${MAIL_MAILER:-'Not set'}"
echo "   Host: ${MAIL_HOST:-'Not set'}"
echo "   Port: ${MAIL_PORT:-'Not set'}"
echo "   Username: ${MAIL_USERNAME:-'Not set'}"
echo "   From Address: ${MAIL_FROM_ADDRESS:-'Not set'}"
echo "   From Name: ${MAIL_FROM_NAME:-'Not set'}"
echo "   Admin Email: ${ADMIN_EMAIL:-'Not set'}"
echo ""

# Check if email is configured
if [ -z "$MAIL_MAILER" ] || [ "$MAIL_MAILER" = "log" ]; then
    echo -e "${YELLOW}⚠️  Warning: MAIL_MAILER is set to 'log' or not configured${NC}"
    echo "   Email will be logged to storage/logs/laravel.log, not actually sent."
    echo ""
    read -p "Continue with test? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Get test email address
if [ -z "$ADMIN_EMAIL" ]; then
    echo -e "${YELLOW}⚠️  ADMIN_EMAIL not set in .env${NC}"
    read -p "Enter test email address: " TEST_EMAIL
    if [ -z "$TEST_EMAIL" ]; then
        echo -e "${RED}❌ Error: Email address required${NC}"
        exit 1
    fi
else
    TEST_EMAIL="$ADMIN_EMAIL"
    echo "Using ADMIN_EMAIL: ${TEST_EMAIL}"
fi

echo ""
echo -e "${YELLOW}📤 Sending test email...${NC}"

# Clear config cache
${PHP_PATH} artisan config:clear > /dev/null 2>&1

# Send test email using tinker
${PHP_PATH} artisan tinker --execute="
use Illuminate\Support\Facades\Mail;
try {
    Mail::raw('This is a test email from QuickKasir POS System.\\n\\nIf you receive this email, your email configuration is working correctly!\\n\\nTimestamp: ' . now(), function (\$message) use (\$argv) {
        \$message->to('${TEST_EMAIL}')
                ->subject('[QuickKasir] Test Email - ' . now()->format('Y-m-d H:i:s'));
    });
    echo '✅ Email sent successfully!';
} catch (\Exception \$e) {
    echo '❌ Error: ' . \$e->getMessage();
    exit(1);
}
"

EXIT_CODE=$?

echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Test email sent successfully!${NC}"
    echo ""
    echo "📧 Check your inbox: ${TEST_EMAIL}"
    echo ""
    
    if [ "$MAIL_MAILER" = "log" ]; then
        echo -e "${YELLOW}ℹ️  Note: Email was logged to storage/logs/laravel.log${NC}"
        echo "   View log: tail -20 storage/logs/laravel.log"
    fi
else
    echo -e "${RED}❌ Failed to send test email${NC}"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check email configuration in .env"
    echo "   2. Check Laravel logs: tail -50 storage/logs/laravel.log"
    echo "   3. Verify SMTP credentials"
    echo "   4. Check firewall/network connectivity"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}=========================="
echo "✅ Email Test Completed!"
echo "==========================${NC}"
