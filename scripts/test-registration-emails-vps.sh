#!/bin/bash

# QuickKasir - Test Registration Emails
# Test welcome email and verification email for new user registration

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
PHP_PATH="/usr/bin/php8.3"

echo "📧 QuickKasir - Test Registration Emails"
echo "=========================================="
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

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

echo "📋 Email Configuration Check:"
echo "============================="

# Get email configuration
MAIL_MAILER=$(grep "^MAIL_MAILER=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
MAIL_HOST=$(grep "^MAIL_HOST=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
MAIL_PORT=$(grep "^MAIL_PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
ADMIN_EMAIL=$(grep "^ADMIN_EMAIL=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)

echo "   Mailer: ${MAIL_MAILER:-'Not set'}"
echo "   Host: ${MAIL_HOST:-'Not set'}"
echo "   Port: ${MAIL_PORT:-'Not set'}"
echo "   Admin Email: ${ADMIN_EMAIL:-'Not set'}"
echo ""

# Check if email is configured
if [ -z "$MAIL_MAILER" ] || [ "$MAIL_MAILER" = "log" ]; then
    echo -e "${YELLOW}⚠️  Warning: MAIL_MAILER is set to 'log' or not configured${NC}"
    echo "   Email will be logged to storage/logs/laravel.log, not actually sent."
    echo ""
fi

# Check if SMTP is blocked
if [ "$MAIL_MAILER" = "smtp" ]; then
    echo -e "${YELLOW}⚠️  Using SMTP mailer${NC}"
    echo "   If you get connection timeout errors, your VPS might be blocking SMTP."
    echo "   Consider using Mailgun or other alternatives. See: SMTP_ALTERNATIVES.md"
    echo ""
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
echo -e "${BLUE}Step 1: Testing Welcome Email...${NC}"

# Clear config cache
${PHP_PATH} artisan config:clear > /dev/null 2>&1

# Test welcome email
${PHP_PATH} artisan tinker --execute="
use App\Notifications\WelcomeEmailNotification;
use App\Models\User;

try {
    // Create a test user (or use existing)
    \$testUser = User::where('email', '${TEST_EMAIL}')->first();
    
    if (!\$testUser) {
        echo 'Creating test user...' . PHP_EOL;
        \$testUser = User::create([
            'name' => 'Test User',
            'email' => '${TEST_EMAIL}',
            'password' => bcrypt('test123456'),
            'phone' => '6281234567890',
            'role' => 'owner'
        ]);
    }
    
    // Send welcome email (without password = registration email)
    \$testUser->notify(new WelcomeEmailNotification());
    echo '✅ Welcome email sent successfully!' . PHP_EOL;
} catch (\Exception \$e) {
    echo '❌ Error: ' . \$e->getMessage() . PHP_EOL;
    exit(1);
}
"

WELCOME_EXIT=$?

echo ""
echo -e "${BLUE}Step 2: Testing Verification Email...${NC}"

# Test verification email
${PHP_PATH} artisan tinker --execute="
use App\Notifications\VerifyEmailNotification;
use App\Models\User;

try {
    \$testUser = User::where('email', '${TEST_EMAIL}')->first();
    
    if (!\$testUser) {
        echo '❌ Test user not found!' . PHP_EOL;
        exit(1);
    }
    
    // Send verification email
    \$testUser->notify(new VerifyEmailNotification());
    echo '✅ Verification email sent successfully!' . PHP_EOL;
} catch (\Exception \$e) {
    echo '❌ Error: ' . \$e->getMessage() . PHP_EOL;
    exit(1);
}
"

VERIFY_EXIT=$?

echo ""

# Summary
if [ $WELCOME_EXIT -eq 0 ] && [ $VERIFY_EXIT -eq 0 ]; then
    echo -e "${GREEN}=========================="
    echo "✅ All Emails Sent Successfully!"
    echo "==========================${NC}"
    echo ""
    echo "📧 Check your inbox: ${TEST_EMAIL}"
    echo ""
    echo "You should receive:"
    echo "  1. ✅ Welcome Email - Selamat Datang di QuickKasir POS!"
    echo "  2. ✅ Verification Email - Verifikasi Email Anda"
    echo ""
    
    if [ "$MAIL_MAILER" = "log" ]; then
        echo -e "${YELLOW}ℹ️  Note: Emails were logged to storage/logs/laravel.log${NC}"
        echo "   View log: tail -50 storage/logs/laravel.log | grep -i mail"
    fi
else
    echo -e "${RED}=========================="
    echo "❌ Some Emails Failed!"
    echo "==========================${NC}"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check email configuration in .env"
    echo "   2. Check Laravel logs: tail -50 storage/logs/laravel.log"
    echo "   3. Verify SMTP credentials"
    echo "   4. Test SMTP connection: bash scripts/test-email-vps.sh"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}=========================="
echo "✅ Registration Email Test Completed!"
echo "==========================${NC}"
