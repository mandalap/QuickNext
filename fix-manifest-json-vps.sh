#!/bin/bash

# ==========================================
# Fix manifest.json 404 Error
# ==========================================

set -e  # Exit on error

echo "🔧 Fixing manifest.json 404 Error..."
echo ""

# ==========================================
# STEP 1: Verifikasi/Create File Source
# ==========================================
echo "=== STEP 1: Verify/Create Source File ==="
cd /var/www/quickkasir/app/frontend

if [ -f public/manifest.json ]; then
    echo "✅ manifest.json exists in public folder"
else
    echo "⚠️ manifest.json NOT found in public folder, creating..."
    
    # Create manifest.json
    cat > public/manifest.json << 'EOF'
{
  "short_name": "QuickKasir",
  "name": "QuickKasir - Kasir POS System",
  "description": "Sistem POS Multi-Outlet untuk Restaurant & Retail",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "icon-16x16.png",
      "sizes": "16x16",
      "type": "image/png"
    },
    {
      "src": "icon-32x32.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "icon-48x48.png",
      "sizes": "48x48",
      "type": "image/png"
    },
    {
      "src": "icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "icon-180x180.png",
      "sizes": "180x180",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "scope": "/",
  "shortcuts": [
    {
      "name": "Kasir POS",
      "short_name": "POS",
      "description": "Buka POS untuk transaksi",
      "url": "/cashier/pos",
      "icons": [{ "src": "logo-qk.png", "sizes": "192x192" }]
    },
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "description": "Lihat dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "logo-qk.png", "sizes": "192x192" }]
    }
  ],
  "categories": ["business", "productivity", "finance"],
  "screenshots": [],
  "prefer_related_applications": false
}
EOF
    
    echo "✅ manifest.json created"
fi

# ==========================================
# STEP 2: Rebuild Frontend
# ==========================================
echo ""
echo "=== STEP 2: Rebuild Frontend ==="
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

# Rebuild
echo "Building frontend (this may take a few minutes)..."
npm run build

# Verifikasi manifest.json ada di build
if [ -f build/manifest.json ]; then
    echo "✅ manifest.json exists in build folder"
else
    echo "⚠️ manifest.json NOT in build, copying from public..."
    cp public/manifest.json build/manifest.json
    echo "✅ manifest.json copied to build folder"
fi

# Fix permissions
sudo chown -R www-data:www-data build
sudo chmod -R 755 build
sudo chmod 644 build/manifest.json

echo "✅ Permissions fixed"

# ==========================================
# STEP 3: Update Nginx Config
# ==========================================
echo ""
echo "=== STEP 3: Update Nginx Config ==="

NGINX_CONFIG="/etc/nginx/sites-available/quickkasir-app"

# Backup config
sudo cp $NGINX_CONFIG ${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Nginx config backed up"

# Check if manifest.json location block exists
if sudo grep -q "location.*manifest.json" $NGINX_CONFIG; then
    echo "✅ manifest.json location block already exists"
else
    echo "⚠️ Adding manifest.json location block..."
    
    # Create temp file with updated config
    sudo sed -i '/location \/service-worker\.js {/a\
\
    # Manifest.json - PWA support\
    location = /manifest.json {\
        add_header Cache-Control "public, max-age=3600";\
        add_header Content-Type "application/manifest+json";\
        try_files $uri =404;\
    }
' $NGINX_CONFIG
    
    echo "✅ manifest.json location block added"
fi

# Test Nginx config
if sudo nginx -t; then
    echo "✅ Nginx config is valid"
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx config has errors!"
    echo "Restoring backup..."
    sudo cp ${NGINX_CONFIG}.backup.* $NGINX_CONFIG
    exit 1
fi

# ==========================================
# STEP 4: Verification
# ==========================================
echo ""
echo "=== STEP 4: Verification ==="

# Check file exists
if [ -f /var/www/quickkasir/app/frontend/build/manifest.json ]; then
    echo "✅ File exists: build/manifest.json"
    ls -lh /var/www/quickkasir/app/frontend/build/manifest.json
else
    echo "❌ File NOT found: build/manifest.json"
fi

# Test with curl
echo ""
echo "Testing with curl..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://app.quickkasir.com/manifest.json)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ manifest.json accessible (HTTP 200)"
else
    echo "⚠️ manifest.json returned HTTP $HTTP_CODE"
    echo "Checking Nginx error log..."
    sudo tail -5 /var/log/nginx/error.log
fi

# Check Content-Type
echo ""
echo "Checking Content-Type..."
CONTENT_TYPE=$(curl -s -I https://app.quickkasir.com/manifest.json | grep -i "content-type" | cut -d: -f2 | tr -d '\r\n')

if echo "$CONTENT_TYPE" | grep -qi "manifest"; then
    echo "✅ Content-Type correct: $CONTENT_TYPE"
else
    echo "⚠️ Content-Type: $CONTENT_TYPE (should be application/manifest+json)"
fi

echo ""
echo "🎉 Fix completed!"
echo ""
echo "🧪 Test di browser:"
echo "   1. Buka: https://app.quickkasir.com/manifest.json"
echo "   2. Harus return JSON (bukan 404)"
echo "   3. Check browser console - tidak ada error manifest fetch"
echo ""
