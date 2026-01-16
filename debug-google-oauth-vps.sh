#!/bin/bash

# ==========================================
# Debug Google OAuth Error
# ==========================================

set -e

echo "🔍 Debugging Google OAuth Error..."
echo ""

# ==========================================
# STEP 1: Check Backend Logs
# ==========================================
echo "=== STEP 1: Check Backend Logs ==="
cd /var/www/quickkasir/app/backend

echo "Last 20 lines of Laravel log (Google OAuth errors):"
echo "----------------------------------------"
tail -20 storage/logs/laravel.log | grep -i "oauth\|google" || echo "No OAuth errors found in last 20 lines"
echo ""

# Check for recent errors
echo "Recent errors (last 50 lines):"
echo "----------------------------------------"
tail -50 storage/logs/laravel.log | grep -A 5 -B 5 "Google OAuth failed" || echo "No 'Google OAuth failed' found"
echo ""

# ==========================================
# STEP 2: Verify Environment Variables
# ==========================================
echo "=== STEP 2: Verify Environment Variables ==="
cd /var/www/quickkasir/app/backend

echo "Google OAuth Configuration:"
echo "----------------------------------------"
php artisan tinker --execute="
echo 'GOOGLE_CLIENT_ID: ' . (env('GOOGLE_CLIENT_ID') ? 'SET (' . substr(env('GOOGLE_CLIENT_ID'), 0, 20) . '...)' : 'NOT SET') . PHP_EOL;
echo 'GOOGLE_CLIENT_SECRET: ' . (env('GOOGLE_CLIENT_SECRET') ? 'SET (' . substr(env('GOOGLE_CLIENT_SECRET'), 0, 10) . '...)' : 'NOT SET') . PHP_EOL;
echo 'GOOGLE_REDIRECT_URI: ' . env('GOOGLE_REDIRECT_URI', 'NOT SET') . PHP_EOL;
echo 'FRONTEND_URL: ' . env('FRONTEND_URL', 'NOT SET') . PHP_EOL;
echo 'APP_ENV: ' . env('APP_ENV', 'NOT SET') . PHP_EOL;
echo 'APP_DEBUG: ' . (env('APP_DEBUG') ? 'true' : 'false') . PHP_EOL;
"

# ==========================================
# STEP 3: Verify Services Config
# ==========================================
echo ""
echo "=== STEP 3: Verify Services Config ==="
cd /var/www/quickkasir/app/backend

php artisan tinker --execute="
echo 'Google Service Config:' . PHP_EOL;
echo '  client_id: ' . config('services.google.client_id') . PHP_EOL;
echo '  client_secret: ' . (config('services.google.client_secret') ? 'SET' : 'NOT SET') . PHP_EOL;
echo '  redirect: ' . config('services.google.redirect') . PHP_EOL;
"

# ==========================================
# STEP 4: Check Database Connection
# ==========================================
echo ""
echo "=== STEP 4: Check Database Connection ==="
cd /var/www/quickkasir/app/backend

php artisan tinker --execute="
try {
    DB::connection()->getPdo();
    echo '✅ Database connection: OK' . PHP_EOL;
} catch (Exception \$e) {
    echo '❌ Database connection: FAILED' . PHP_EOL;
    echo 'Error: ' . \$e->getMessage() . PHP_EOL;
}
"

# ==========================================
# STEP 5: Check User Table Structure
# ==========================================
echo ""
echo "=== STEP 5: Check User Table Structure ==="
cd /var/www/quickkasir/app/backend

php artisan tinker --execute="
try {
    \$columns = DB::select('DESCRIBE users');
    echo 'User table columns:' . PHP_EOL;
    foreach (\$columns as \$col) {
        echo '  - ' . \$col->Field . ' (' . \$col->Type . ')' . PHP_EOL;
    }
} catch (Exception \$e) {
    echo '❌ Error checking user table: ' . \$e->getMessage() . PHP_EOL;
}
"

# ==========================================
# STEP 6: Test Google OAuth Redirect URL
# ==========================================
echo ""
echo "=== STEP 6: Test Google OAuth Redirect URL ==="
echo "Testing redirect endpoint..."
curl -I "https://api.quickkasir.com/auth/google/redirect" 2>&1 | head -10

echo ""
echo "Testing callback endpoint (should return error without code)..."
curl -I "https://api.quickkasir.com/auth/google/callback" 2>&1 | head -10

# ==========================================
# STEP 7: Check Nginx Config for API
# ==========================================
echo ""
echo "=== STEP 7: Check Nginx Config for API ==="
echo "Checking if /auth/google routes are accessible..."
sudo grep -A 10 "server_name api.quickkasir.com" /etc/nginx/sites-available/quickkasir-api | head -15

# ==========================================
# STEP 8: Recommendations
# ==========================================
echo ""
echo "=== STEP 8: Recommendations ==="
echo ""
echo "1. Check Google Cloud Console:"
echo "   - Authorized JavaScript origins: https://app.quickkasir.com"
echo "   - Authorized redirect URIs: https://api.quickkasir.com/auth/google/callback"
echo ""
echo "2. Verify .env file has correct values:"
echo "   GOOGLE_CLIENT_ID=..."
echo "   GOOGLE_CLIENT_SECRET=..."
echo "   GOOGLE_REDIRECT_URI=https://api.quickkasir.com/auth/google/callback"
echo ""
echo "3. Clear config cache after .env changes:"
echo "   php artisan config:clear"
echo "   php artisan config:cache"
echo ""
echo "4. Check Laravel logs for detailed error:"
echo "   tail -f storage/logs/laravel.log"
echo ""
