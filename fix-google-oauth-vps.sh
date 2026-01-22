#!/bin/bash

# ==========================================
# Fix Google OAuth Redirect ke localhost
# ==========================================

set -e  # Exit on error

echo "🔧 Fixing Google OAuth Redirect..."
echo ""

# ==========================================
# STEP 1: Update Backend .env
# ==========================================
echo "=== STEP 1: Update Backend .env ==="
cd /var/www/quickkasir/app/backend

# Backup .env
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ .env backed up"
fi

# Update FRONTEND_URL
if grep -q "FRONTEND_URL=" .env; then
    sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://app.quickkasir.com|g' .env
    echo "✅ FRONTEND_URL updated"
else
    echo "FRONTEND_URL=https://app.quickkasir.com" >> .env
    echo "✅ FRONTEND_URL added"
fi

# Verifikasi
echo ""
echo "Current FRONTEND_URL:"
grep "FRONTEND_URL" .env

# ==========================================
# STEP 2: Clear Laravel Config Cache
# ==========================================
echo ""
echo "=== STEP 2: Clear Laravel Config Cache ==="
cd /var/www/quickkasir/app/backend

php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

echo "✅ Cache cleared"

# Re-cache config
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ Config cached"

# ==========================================
# STEP 3: Verifikasi Backend Config
# ==========================================
echo ""
echo "=== STEP 3: Verify Backend Config ==="
cd /var/www/quickkasir/app/backend

php artisan tinker --execute="
echo 'FRONTEND_URL: ' . env('FRONTEND_URL') . PHP_EOL;
echo 'APP_ENV: ' . env('APP_ENV') . PHP_EOL;
"

# ==========================================
# STEP 4: Update Frontend .env.production
# ==========================================
echo ""
echo "=== STEP 4: Update Frontend .env.production ==="
cd /var/www/quickkasir/app/frontend

cat > .env.production << 'EOF'
NODE_ENV=production
REACT_APP_BACKEND_URL=https://api.quickkasir.com
REACT_APP_API_BASE_URL=https://api.quickkasir.com/api
REACT_APP_API_URL=https://api.quickkasir.com/api
EOF

echo "✅ .env.production created/updated"
echo ""
echo "Content:"
cat .env.production

# ==========================================
# STEP 5: Rebuild Frontend
# ==========================================
echo ""
echo "=== STEP 5: Rebuild Frontend ==="
cd /var/www/quickkasir/app/frontend

# Stop PM2 (jika running)
pm2 stop quickkasir-frontend 2>/dev/null || echo "Frontend tidak running"

# Backup build lama
if [ -d build ]; then
    cp -r build build.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Build backed up"
fi

# Remove old build
rm -rf build
echo "✅ Old build removed"

# Rebuild dengan production env
echo "Building frontend (this may take a few minutes)..."
npm run build

# Fix permissions
sudo chown -R www-data:www-data build
sudo chmod -R 755 build

echo "✅ Frontend rebuilt"

# ==========================================
# STEP 6: Pull Latest Code dari GitHub
# ==========================================
echo ""
echo "=== STEP 6: Pull Latest Code ==="
cd /var/www/quickkasir

# Check if git repo
if [ -d .git ]; then
    echo "Pulling latest code..."
    git pull origin main || git pull origin master || echo "⚠️ Git pull failed, continue anyway"
    echo "✅ Code updated"
else
    echo "⚠️ Not a git repository, skipping git pull"
fi

# ==========================================
# STEP 7: Restart Services
# ==========================================
echo ""
echo "=== STEP 7: Restart Services ==="

# Restart PHP-FPM
sudo systemctl restart php8.3-fpm
echo "✅ PHP-FPM restarted"

# Restart Nginx
sudo systemctl restart nginx
echo "✅ Nginx restarted"

# Restart PM2
pm2 restart all
echo "✅ PM2 restarted"

# ==========================================
# STEP 8: Final Verification
# ==========================================
echo ""
echo "=== STEP 8: Final Verification ==="
echo ""
echo "✅ Backend FRONTEND_URL:"
grep "FRONTEND_URL" /var/www/quickkasir/app/backend/.env

echo ""
echo "✅ Frontend .env.production:"
cat /var/www/quickkasir/app/frontend/.env.production

echo ""
echo "✅ Build folder exists:"
ls -la /var/www/quickkasir/app/frontend/build/ | head -3

echo ""
echo "✅ PM2 Status:"
pm2 status

echo ""
echo "🎉 Fix completed!"
echo ""
echo "🧪 Test di browser:"
echo "   1. Buka: https://app.quickkasir.com/login"
echo "   2. Klik: 'Lanjutkan dengan Google'"
echo "   3. Harus redirect ke Google OAuth (bukan localhost)"
echo ""
