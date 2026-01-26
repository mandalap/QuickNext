#!/bin/bash

# Script untuk Check WhatsApp OTP Configuration
# Usage: bash scripts/check-whatsapp-otp-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/var/www/kasir-pos"
BACKEND_DIR="$PROJECT_DIR/app/backend"

cd "$BACKEND_DIR" || {
    echo -e "${RED}❌ Error: Backend directory not found${NC}"
    exit 1
}

echo "🔍 Checking WhatsApp OTP Configuration..."
echo ""

# Step 1: Check recent OTP errors
echo -e "${YELLOW}Step 1: Checking recent OTP errors in logs...${NC}"
tail -100 storage/logs/laravel.log | grep -i "whatsapp.*otp\|failed.*otp\|otp.*error" | tail -20 || echo "No recent OTP errors found"
echo ""

# Step 2: Check WhatsApp API token
echo -e "${YELLOW}Step 2: Checking WhatsApp API token configuration...${NC}"
php artisan tinker --execute="
\$token = \App\Models\WhatsappApiToken::where('status', 'active')->first();
if (\$token) {
    echo '✅ Active WhatsApp token found' . PHP_EOL;
    echo '   ID: ' . \$token->id . PHP_EOL;
    echo '   Name: ' . \$token->name . PHP_EOL;
    echo '   Provider: ' . \$token->provider . PHP_EOL;
    echo '   Status: ' . \$token->status . PHP_EOL;
} else {
    echo '❌ No active WhatsApp token found' . PHP_EOL;
    echo '   This is why OTP sending fails!' . PHP_EOL;
}
"
echo ""

# Step 3: Check WhatsApp verification records
echo -e "${YELLOW}Step 3: Checking recent WhatsApp verification attempts...${NC}"
php artisan tinker --execute="
\$recent = \App\Models\WhatsappVerification::orderBy('created_at', 'desc')->limit(5)->get();
if (\$recent->count() > 0) {
    echo 'Recent verification attempts:' . PHP_EOL;
    foreach (\$recent as \$v) {
        echo '   Phone: ' . \$v->phone . ' | Code: ' . \$v->code . ' | Created: ' . \$v->created_at . ' | Verified: ' . (\$v->verified_at ? 'Yes' : 'No') . PHP_EOL;
    }
} else {
    echo 'No recent verification attempts found' . PHP_EOL;
}
"
echo ""

# Step 4: Test phone number formatting
echo -e "${YELLOW}Step 4: Testing phone number formatting...${NC}"
echo "Enter a test phone number (or press Enter to skip):"
read -r test_phone || test_phone=""

if [ -n "$test_phone" ]; then
    php artisan tinker --execute="
    \$phone = '$test_phone';
    \$formatted = preg_replace('/[^0-9]/', '', \$phone);
    if (substr(\$formatted, 0, 1) === '0') {
        \$formatted = '62' . substr(\$formatted, 1);
    } elseif (substr(\$formatted, 0, 2) !== '62') {
        \$formatted = '62' . \$formatted;
    }
    echo 'Original: ' . \$phone . PHP_EOL;
    echo 'Formatted: ' . \$formatted . PHP_EOL;
    "
else
    echo "Skipped phone number test"
fi
echo ""

# Step 5: Check environment variables
echo -e "${YELLOW}Step 5: Checking environment variables...${NC}"
grep -E "WHATSAPP|APP_URL|FRONTEND_URL" .env | grep -v "^#" | head -10 || echo "No WhatsApp-related env vars found"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ WhatsApp OTP Check Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Common issues:"
echo "  1. No active WhatsApp API token - Check Step 2"
echo "  2. Phone number format issue - Check Step 4"
echo "  3. WhatsApp API error - Check Step 1 (logs)"
echo ""
