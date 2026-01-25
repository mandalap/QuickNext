#!/bin/bash

# Script untuk Fix Google OAuth di VPS
# Usage: bash scripts/fix-google-oauth-vps.sh

set -e

echo "🔧 Fixing Google OAuth Configuration..."
echo ""

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

# Step 1: Check Google OAuth config
echo -e "${YELLOW}Step 1: Checking Google OAuth configuration...${NC}"

php artisan tinker --execute="
echo 'Google OAuth Configuration:' . PHP_EOL;
echo '─────────────────────────────────────────────────────' . PHP_EOL;
echo 'GOOGLE_CLIENT_ID: ' . (env('GOOGLE_CLIENT_ID') ? 'SET (' . substr(env('GOOGLE_CLIENT_ID'), 0, 30) . '...)' : '❌ NOT SET') . PHP_EOL;
echo 'GOOGLE_CLIENT_SECRET: ' . (env('GOOGLE_CLIENT_SECRET') ? 'SET (' . substr(env('GOOGLE_CLIENT_SECRET'), 0, 10) . '...)' : '❌ NOT SET') . PHP_EOL;
echo 'GOOGLE_REDIRECT_URI: ' . env('GOOGLE_REDIRECT_URI', 'NOT SET') . PHP_EOL;
echo 'FRONTEND_URL: ' . env('FRONTEND_URL', 'NOT SET') . PHP_EOL;
echo 'APP_URL: ' . env('APP_URL', 'NOT SET') . PHP_EOL;
echo 'APP_ENV: ' . env('APP_ENV', 'NOT SET') . PHP_EOL;
echo PHP_EOL;
"

echo ""

# Step 2: Check recent OAuth errors
echo -e "${YELLOW}Step 2: Checking recent OAuth errors in logs...${NC}"
tail -100 storage/logs/laravel.log | grep -i "google oauth\|oauth" | tail -20 || echo "No recent OAuth errors found"
echo ""

# Step 3: Verify redirect URI
echo -e "${YELLOW}Step 3: Verifying redirect URI configuration...${NC}"

# Get APP_URL from .env
APP_URL=$(grep "^APP_URL=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")

if [ -z "$APP_URL" ]; then
    echo -e "${RED}❌ APP_URL not set in .env${NC}"
    echo "Please set APP_URL in .env file"
    exit 1
fi

# Expected redirect URI
EXPECTED_REDIRECT="${APP_URL}/auth/google/callback"
echo "Expected redirect URI: $EXPECTED_REDIRECT"
echo ""

# Step 4: Check if redirect URI matches Google Console
echo -e "${YELLOW}Step 4: Important - Verify in Google Cloud Console:${NC}"
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Select your OAuth 2.0 Client ID"
echo "3. Check 'Authorized redirect URIs'"
echo "4. Must include: $EXPECTED_REDIRECT"
echo ""

# Step 5: Clear cache
echo -e "${YELLOW}Step 5: Clearing cache...${NC}"
php artisan config:clear
php artisan route:clear
php artisan cache:clear
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

# Step 6: Re-cache
echo -e "${YELLOW}Step 6: Re-caching...${NC}"
php artisan config:cache
php artisan route:cache
echo -e "${GREEN}✅ Re-cached${NC}"
echo ""

# Step 7: Test OAuth redirect
echo -e "${YELLOW}Step 7: Testing OAuth redirect endpoint...${NC}"
REDIRECT_URL="${APP_URL}/auth/google/redirect"
echo "Redirect URL: $REDIRECT_URL"
curl -I "$REDIRECT_URL" 2>&1 | head -5 || echo -e "${YELLOW}⚠️  Could not test redirect (might require browser)${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Google OAuth Fix Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
echo "  2. Verify GOOGLE_REDIRECT_URI in .env matches Google Console"
echo "  3. Check Google Cloud Console authorized redirect URIs"
echo "  4. Test login with Google again"
echo ""
