#!/bin/bash

# ==========================================
# Check Google OAuth Status
# ==========================================

echo "🔍 Checking Google OAuth Status..."
echo ""

# ==========================================
# STEP 1: Check Backend .env
# ==========================================
echo "=== STEP 1: Backend .env Configuration ==="
cd /var/www/quickkasir/app/backend

if [ -f .env ]; then
    echo "✅ .env file exists"
    echo ""
    echo "Google OAuth Config:"
    grep -E "^GOOGLE_CLIENT_ID=" .env | sed 's/GOOGLE_CLIENT_ID=.*/GOOGLE_CLIENT_ID=***SET***/' || echo "❌ GOOGLE_CLIENT_ID: NOT SET"
    grep -E "^GOOGLE_CLIENT_SECRET=" .env | sed 's/GOOGLE_CLIENT_SECRET=.*/GOOGLE_CLIENT_SECRET=***SET***/' || echo "❌ GOOGLE_CLIENT_SECRET: NOT SET"
    grep -E "^FRONTEND_URL=" .env || echo "❌ FRONTEND_URL: NOT SET"
    grep -E "^APP_ENV=" .env || echo "❌ APP_ENV: NOT SET"
    grep -E "^APP_DEBUG=" .env || echo "❌ APP_DEBUG: NOT SET"
else
    echo "❌ .env file not found!"
fi

# ==========================================
# STEP 2: Check Laravel Config Cache
# ==========================================
echo ""
echo "=== STEP 2: Laravel Config Cache ==="
cd /var/www/quickkasir/app/backend

php artisan tinker --execute="
echo 'GOOGLE_CLIENT_ID: ' . (config('services.google.client_id') ? 'SET (' . substr(config('services.google.client_id'), 0, 20) . '...)' : 'NOT SET') . PHP_EOL;
echo 'GOOGLE_CLIENT_SECRET: ' . (config('services.google.client_secret') ? 'SET' : 'NOT SET') . PHP_EOL;
echo 'GOOGLE_REDIRECT_URI: ' . config('services.google.redirect') . PHP_EOL;
echo 'FRONTEND_URL (env): ' . (env('FRONTEND_URL') ?: 'NOT SET') . PHP_EOL;
echo 'APP_ENV: ' . env('APP_ENV', 'NOT SET') . PHP_EOL;
echo 'APP_DEBUG: ' . (env('APP_DEBUG') ? 'true' : 'false') . PHP_EOL;
" 2>/dev/null || echo "⚠️ Could not check config (may need to run: php artisan config:cache)"

# ==========================================
# STEP 3: Check Code Changes
# ==========================================
echo ""
echo "=== STEP 3: Check Code Changes ==="
cd /var/www/quickkasir

# Check if latest code is pulled
LATEST_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git ls-remote origin main | cut -f1)

if [ "$LATEST_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo "✅ Code is up to date"
else
    echo "⚠️ Code is not up to date"
    echo "   Local:  $LATEST_COMMIT"
    echo "   Remote: $REMOTE_COMMIT"
    echo "   Run: git pull origin main"
fi

# Check if SocialAuthController has code check
if grep -q "Check if code parameter exists" app/backend/app/Http/Controllers/Api/SocialAuthController.php 2>/dev/null; then
    echo "✅ SocialAuthController has code parameter check"
else
    echo "⚠️ SocialAuthController missing code parameter check"
fi

# ==========================================
# STEP 4: Test OAuth Endpoints
# ==========================================
echo ""
echo "=== STEP 4: Test OAuth Endpoints ==="

echo "Testing redirect endpoint..."
REDIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://api.quickkasir.com/auth/google/redirect" 2>/dev/null)
if [ "$REDIRECT_STATUS" = "302" ]; then
    echo "✅ Redirect endpoint: OK (HTTP 302 - redirects to Google)"
else
    echo "⚠️ Redirect endpoint: HTTP $REDIRECT_STATUS"
fi

echo ""
echo "Testing callback endpoint (without code - should redirect to error)..."
CALLBACK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://api.quickkasir.com/auth/google/callback" 2>/dev/null)
if [ "$CALLBACK_STATUS" = "302" ]; then
    CALLBACK_LOCATION=$(curl -s -I "https://api.quickkasir.com/auth/google/callback" 2>/dev/null | grep -i "location:" | cut -d' ' -f2 | tr -d '\r')
    if echo "$CALLBACK_LOCATION" | grep -q "oauth_error=1"; then
        echo "✅ Callback endpoint: OK (redirects to error page when no code)"
    else
        echo "⚠️ Callback endpoint: HTTP 302 but unexpected redirect: $CALLBACK_LOCATION"
    fi
else
    echo "⚠️ Callback endpoint: HTTP $CALLBACK_STATUS"
fi

# ==========================================
# STEP 5: Check Recent Logs
# ==========================================
echo ""
echo "=== STEP 5: Recent OAuth Errors (Last 5) ==="
cd /var/www/quickkasir/app/backend

if [ -f storage/logs/laravel.log ]; then
    OAUTH_ERRORS=$(grep -i "Google OAuth failed" storage/logs/laravel.log | tail -5)
    if [ -z "$OAUTH_ERRORS" ]; then
        echo "✅ No recent OAuth errors found"
    else
        echo "⚠️ Recent OAuth errors found:"
        echo "$OAUTH_ERRORS" | while IFS= read -r line; do
            echo "   $line"
        done
    fi
else
    echo "⚠️ Laravel log file not found"
fi

# ==========================================
# STEP 6: Check Nginx Config
# ==========================================
echo ""
echo "=== STEP 6: Nginx Configuration ==="

if sudo grep -q "server_name api.quickkasir.com" /etc/nginx/sites-available/quickkasir-api 2>/dev/null; then
    echo "✅ Nginx config for api.quickkasir.com exists"
    
    # Check if /auth/google routes are accessible
    if sudo grep -q "location /" /etc/nginx/sites-available/quickkasir-api; then
        echo "✅ Nginx allows /auth/google routes"
    fi
else
    echo "⚠️ Nginx config for api.quickkasir.com not found"
fi

# ==========================================
# STEP 7: Summary & Recommendations
# ==========================================
echo ""
echo "=== STEP 7: Summary ==="
echo ""
echo "📋 Checklist:"
echo "   [ ] FRONTEND_URL set to https://app.quickkasir.com"
echo "   [ ] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set in .env"
echo "   [ ] Config cache cleared and rebuilt"
echo "   [ ] Code is up to date (with code parameter check)"
echo "   [ ] Google Cloud Console redirect URI: https://api.quickkasir.com/auth/google/callback"
echo ""
echo "🔧 If issues found, run:"
echo "   ./fix-google-oauth-complete-vps.sh"
echo ""
