#!/bin/bash

# Script untuk Fix Livewire tidak terload di Filament
# Usage: bash scripts/fix-livewire-vps.sh

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

echo "🔧 Fixing Livewire Configuration..."
echo ""

# Step 1: Clear all caches
echo -e "${YELLOW}Step 1: Clearing all caches...${NC}"
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
php artisan optimize:clear
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

# Step 2: Publish Livewire assets
echo -e "${YELLOW}Step 2: Publishing Livewire assets...${NC}"
php artisan livewire:publish --config 2>/dev/null || echo "Livewire config already published or not needed"
php artisan vendor:publish --tag=livewire:config --force 2>/dev/null || echo "Livewire config already published"
echo -e "${GREEN}✅ Livewire assets published${NC}"
echo ""

# Step 3: Publish Filament assets
echo -e "${YELLOW}Step 3: Publishing Filament assets...${NC}"
php artisan filament:assets 2>/dev/null || echo "Filament assets already published"
php artisan vendor:publish --tag=filament-assets --force 2>/dev/null || echo "Filament assets already published"
echo -e "${GREEN}✅ Filament assets published${NC}"
echo ""

# Step 4: Build assets (if npm is available)
echo -e "${YELLOW}Step 4: Building assets...${NC}"
if command -v npm &> /dev/null; then
    if [ -f "package.json" ]; then
        echo "Installing npm dependencies..."
        npm install --production 2>/dev/null || npm install
        
        echo "Building assets..."
        npm run build 2>/dev/null || {
            echo -e "${YELLOW}⚠️  npm run build failed, trying alternative...${NC}"
            npx vite build 2>/dev/null || echo -e "${YELLOW}⚠️  Vite build skipped (may need manual build)${NC}"
        }
        echo -e "${GREEN}✅ Assets built${NC}"
    else
        echo -e "${YELLOW}⚠️  package.json not found, skipping npm build${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  npm not found, skipping asset build${NC}"
    echo "   You may need to build assets manually: npm run build"
fi
echo ""

# Step 5: Re-cache
echo -e "${YELLOW}Step 5: Re-caching...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache
echo -e "${GREEN}✅ Re-cached${NC}"
echo ""

# Step 6: Check Livewire config
echo -e "${YELLOW}Step 6: Checking Livewire configuration...${NC}"
if [ -f "config/livewire.php" ]; then
    echo "Livewire config file exists"
    grep -E "asset_url|app_url" config/livewire.php | head -5 || echo "Config file found"
else
    echo -e "${YELLOW}⚠️  Livewire config file not found (may be using defaults)${NC}"
fi
echo ""

# Step 7: Check APP_URL
echo -e "${YELLOW}Step 7: Checking APP_URL configuration...${NC}"
APP_URL=$(grep "^APP_URL=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")
if [ -z "$APP_URL" ]; then
    echo -e "${RED}❌ APP_URL not set in .env${NC}"
    echo "   Please set APP_URL in .env file"
else
    echo "APP_URL: $APP_URL"
fi
echo ""

# Step 8: Restart services
echo -e "${YELLOW}Step 8: Restarting services...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart quickkasir-api 2>/dev/null || echo "PM2 restart skipped (process may not exist)"
    echo -e "${GREEN}✅ Services restarted${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found, skipping service restart${NC}"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Livewire Fix Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
echo "  2. Hard refresh the page (Ctrl+F5)"
echo "  3. Check browser console for any errors"
echo "  4. Verify APP_URL in .env matches your domain"
echo ""
echo "If Livewire still doesn't load:"
echo "  1. Check browser console for JavaScript errors"
echo "  2. Verify assets are accessible: curl -I \$APP_URL/build/assets/app-*.js"
echo "  3. Check file permissions: ls -la public/build"
echo "  4. Rebuild assets manually: npm run build"
echo ""
