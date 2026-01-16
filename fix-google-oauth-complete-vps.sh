#!/bin/bash

# ==========================================
# Complete Fix for Google OAuth Error
# ==========================================

set -e

echo "🔧 Fixing Google OAuth Error..."
echo ""

# ==========================================
# STEP 1: Pull Latest Code
# ==========================================
echo "=== STEP 1: Pull Latest Code ==="
cd /var/www/quickkasir
git pull origin main

# ==========================================
# STEP 2: Fix Backend .env
# ==========================================
echo ""
echo "=== STEP 2: Fix Backend .env ==="
cd /var/www/quickkasir/app/backend

# Backup .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Ensure FRONTEND_URL is set
if ! grep -q "^FRONTEND_URL=" .env; then
    echo "FRONTEND_URL=https://app.quickkasir.com" >> .env
    echo "✅ FRONTEND_URL added"
elif ! grep -q "^FRONTEND_URL=https://app.quickkasir.com" .env; then
    sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://app.quickkasir.com|g' .env
    echo "✅ FRONTEND_URL updated"
else
    echo "✅ FRONTEND_URL already correct"
fi

# Verify
echo ""
echo "Current .env values:"
grep -E "GOOGLE_|FRONTEND_URL" .env

# ==========================================
# STEP 3: Clear & Re-cache Config
# ==========================================
echo ""
echo "=== STEP 3: Clear & Re-cache Config ==="
cd /var/www/quickkasir/app/backend

# Clear config (ignore cache errors)
php artisan config:clear || echo "⚠️ Config clear warning (cache driver issue)"

# Re-cache config
php artisan config:cache

# Verify
echo ""
echo "Verifying config:"
php artisan tinker --execute="
echo 'GOOGLE_CLIENT_ID: ' . (config('services.google.client_id') ? 'SET' : 'NOT SET') . PHP_EOL;
echo 'GOOGLE_REDIRECT_URI: ' . config('services.google.redirect') . PHP_EOL;
echo 'FRONTEND_URL from env: ' . (env('FRONTEND_URL') ?: 'NOT SET') . PHP_EOL;
"

# ==========================================
# STEP 4: Fix Database Connection (Optional)
# ==========================================
echo ""
echo "=== STEP 4: Check Database Connection ==="
cd /var/www/quickkasir/app/backend

# Test database connection
php artisan tinker --execute="
try {
    DB::connection()->getPdo();
    echo '✅ Database connection: OK' . PHP_EOL;
} catch (Exception \$e) {
    echo '⚠️ Database connection: FAILED' . PHP_EOL;
    echo 'Error: ' . \$e->getMessage() . PHP_EOL;
    echo 'Note: This may affect OAuth if user creation fails' . PHP_EOL;
}
" || echo "⚠️ Database connection check failed (may not affect OAuth)"

# ==========================================
# STEP 5: Test OAuth Endpoints
# ==========================================
echo ""
echo "=== STEP 5: Test OAuth Endpoints ==="

echo "Testing redirect endpoint..."
REDIRECT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.quickkasir.com/auth/google/redirect")
if [ "$REDIRECT_RESPONSE" = "302" ]; then
    echo "✅ Redirect endpoint: OK (HTTP 302)"
else
    echo "⚠️ Redirect endpoint: HTTP $REDIRECT_RESPONSE"
fi

# ==========================================
# STEP 6: Final Verification
# ==========================================
echo ""
echo "=== STEP 6: Final Verification ==="
echo ""
echo "✅ Configuration Summary:"
echo "   - Google OAuth config: Checked"
echo "   - FRONTEND_URL: Updated"
echo "   - Config cache: Rebuilt"
echo ""
echo "🧪 Testing Instructions:"
echo "   1. Buka: https://app.quickkasir.com/login"
echo "   2. Klik: 'Lanjutkan dengan Google'"
echo "   3. Approve di Google OAuth consent screen"
echo "   4. Harus redirect ke: https://app.quickkasir.com/login/sso?token=..."
echo ""
echo "📝 If still getting oauth_error=1:"
echo "   - Check Laravel logs: tail -f /var/www/quickkasir/app/backend/storage/logs/laravel.log"
echo "   - Verify Google Cloud Console redirect URI matches: https://api.quickkasir.com/auth/google/callback"
echo ""
