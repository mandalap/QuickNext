#!/bin/bash

# Script untuk Fix Livewire Assets (404 error)
# Usage: bash scripts/fix-livewire-assets-vps.sh

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

echo "🔧 Fixing Livewire Assets (404 Error)..."
echo ""

# Step 1: Fix permissions (with sudo)
echo -e "${YELLOW}Step 1: Fixing file permissions...${NC}"
sudo chown -R www-data:www-data public/build 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not change ownership (may need manual sudo)${NC}"
    echo "   Run manually: sudo chown -R www-data:www-data public/build"
}
sudo chmod -R 755 public/build 2>/dev/null || chmod -R 755 public/build
echo -e "${GREEN}✅ Permissions fixed${NC}"
echo ""

# Step 2: Clear all caches
echo -e "${YELLOW}Step 2: Clearing all caches...${NC}"
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
php artisan optimize:clear
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

# Step 3: Publish Livewire assets
echo -e "${YELLOW}Step 3: Publishing Livewire assets...${NC}"

# Check if Livewire config exists
if [ ! -f "config/livewire.php" ]; then
    echo "Publishing Livewire config..."
    php artisan livewire:publish --config 2>/dev/null || php artisan vendor:publish --tag=livewire:config --force
fi

# Publish Livewire assets
php artisan vendor:publish --tag=livewire:assets --force 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Livewire assets publish command not found${NC}"
    echo "   This is normal for Filament 4.0 (uses CDN)"
}

echo -e "${GREEN}✅ Livewire assets check completed${NC}"
echo ""

# Step 4: Check Livewire config
echo -e "${YELLOW}Step 4: Checking Livewire configuration...${NC}"
if [ -f "config/livewire.php" ]; then
    echo "Livewire config found"
    # Check asset_url
    ASSET_URL=$(grep -E "asset_url" config/livewire.php | head -1 || echo "")
    if [ -z "$ASSET_URL" ]; then
        echo -e "${YELLOW}⚠️  asset_url not set in Livewire config${NC}"
        echo "   Livewire will use CDN (default for Filament 4.0)"
    else
        echo "asset_url: $ASSET_URL"
    fi
else
    echo -e "${YELLOW}⚠️  Livewire config not found (using defaults)${NC}"
    echo "   Filament 4.0 uses Livewire CDN by default"
fi
echo ""

# Step 5: Check APP_URL and ASSET_URL
echo -e "${YELLOW}Step 5: Checking APP_URL and ASSET_URL...${NC}"
APP_URL=$(grep "^APP_URL=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")
ASSET_URL=$(grep "^ASSET_URL=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")

if [ -z "$APP_URL" ]; then
    echo -e "${RED}❌ APP_URL not set in .env${NC}"
    echo "   Please set APP_URL in .env file"
else
    echo "APP_URL: $APP_URL"
fi

if [ -z "$ASSET_URL" ]; then
    echo -e "${YELLOW}⚠️  ASSET_URL not set (will use APP_URL)${NC}"
    if [ -n "$APP_URL" ]; then
        echo "   Consider adding: ASSET_URL=$APP_URL"
    fi
else
    echo "ASSET_URL: $ASSET_URL"
fi
echo ""

# Step 6: Set ASSET_URL if not set and APP_URL exists
if [ -z "$ASSET_URL" ] && [ -n "$APP_URL" ]; then
    echo -e "${YELLOW}Step 6: Setting ASSET_URL in .env...${NC}"
    if ! grep -q "^ASSET_URL=" .env 2>/dev/null; then
        echo "" >> .env
        echo "ASSET_URL=$APP_URL" >> .env
        echo -e "${GREEN}✅ ASSET_URL added to .env${NC}"
    else
        echo "ASSET_URL already exists in .env"
    fi
    echo ""
fi

# Step 7: Re-cache
echo -e "${YELLOW}Step 7: Re-caching...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache
echo -e "${GREEN}✅ Re-cached${NC}"
echo ""

# Step 8: Test Livewire CDN
echo -e "${YELLOW}Step 8: Testing Livewire CDN accessibility...${NC}"
if command -v curl &> /dev/null; then
    echo "Testing: https://cdn.jsdelivr.net/gh/livewire/livewire@v3/dist/livewire.min.js"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://cdn.jsdelivr.net/gh/livewire/livewire@v3/dist/livewire.min.js" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Livewire CDN is accessible${NC}"
    else
        echo -e "${RED}❌ Livewire CDN is not accessible (HTTP $HTTP_CODE)${NC}"
        echo "   This might be a network/firewall issue"
    fi
else
    echo -e "${YELLOW}⚠️  curl not found, skipping CDN test${NC}"
fi
echo ""

# Step 9: Restart services
echo -e "${YELLOW}Step 9: Restarting services...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart quickkasir-api 2>/dev/null || echo "PM2 restart skipped"
    echo -e "${GREEN}✅ Services restarted${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found, skipping service restart${NC}"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Livewire Assets Fix Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
echo "  2. Hard refresh the page (Ctrl+F5)"
echo "  3. Check browser console - Livewire should load from CDN"
echo ""
echo "If Livewire still shows 404:"
echo "  1. Check if firewall blocks CDN: https://cdn.jsdelivr.net"
echo "  2. Verify APP_URL matches your domain"
echo "  3. Check browser network tab for failed requests"
echo "  4. Try setting ASSET_URL manually in .env if CDN is blocked"
echo ""
