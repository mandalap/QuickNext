#!/bin/bash

# Script untuk Verify Livewire Configuration
# Usage: bash scripts/verify-livewire-vps.sh

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

echo "🔍 Verifying Livewire Configuration..."
echo ""

# Step 1: Check Livewire assets
echo -e "${YELLOW}Step 1: Checking Livewire assets...${NC}"
if [ -d "public/vendor/livewire" ]; then
    echo -e "${GREEN}✅ Livewire assets found in public/vendor/livewire${NC}"
    ls -la public/vendor/livewire/ | head -10
else
    echo -e "${RED}❌ Livewire assets not found${NC}"
    echo "   Run: php artisan vendor:publish --tag=livewire:assets --force"
fi
echo ""

# Step 2: Check Livewire config
echo -e "${YELLOW}Step 2: Checking Livewire configuration...${NC}"
if [ -f "config/livewire.php" ]; then
    echo "Livewire config file exists"
    echo "Checking asset_url..."
    ASSET_URL_CONFIG=$(grep -E "asset_url" config/livewire.php | head -1 || echo "")
    if [ -n "$ASSET_URL_CONFIG" ]; then
        echo "asset_url config: $ASSET_URL_CONFIG"
    else
        echo -e "${YELLOW}⚠️  asset_url not set in config (using default)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Livewire config not found (using defaults)${NC}"
    echo "   To publish config: php artisan livewire:publish --config"
fi
echo ""

# Step 3: Check .env
echo -e "${YELLOW}Step 3: Checking .env configuration...${NC}"
APP_URL=$(grep "^APP_URL=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")
ASSET_URL=$(grep "^ASSET_URL=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")

if [ -n "$APP_URL" ]; then
    echo -e "${GREEN}✅ APP_URL: $APP_URL${NC}"
else
    echo -e "${RED}❌ APP_URL not set${NC}"
fi

if [ -n "$ASSET_URL" ]; then
    echo -e "${GREEN}✅ ASSET_URL: $ASSET_URL${NC}"
else
    echo -e "${YELLOW}⚠️  ASSET_URL not set (will use APP_URL)${NC}"
fi
echo ""

# Step 4: Test local assets
echo -e "${YELLOW}Step 4: Testing local Livewire assets...${NC}"
if [ -f "public/vendor/livewire/livewire.min.js" ]; then
    echo -e "${GREEN}✅ livewire.min.js found${NC}"
    FILE_SIZE=$(stat -c%s "public/vendor/livewire/livewire.min.js" 2>/dev/null || stat -f%z "public/vendor/livewire/livewire.min.js" 2>/dev/null || echo "unknown")
    echo "   File size: $FILE_SIZE bytes"
    
    # Test if accessible via web
    if [ -n "$APP_URL" ]; then
        echo "Testing: $APP_URL/vendor/livewire/livewire.min.js"
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/vendor/livewire/livewire.min.js" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✅ Local assets accessible via web (HTTP $HTTP_CODE)${NC}"
        else
            echo -e "${RED}❌ Local assets not accessible (HTTP $HTTP_CODE)${NC}"
            echo "   Check Nginx configuration and file permissions"
        fi
    fi
else
    echo -e "${RED}❌ livewire.min.js not found${NC}"
fi
echo ""

# Step 5: Check file permissions
echo -e "${YELLOW}Step 5: Checking file permissions...${NC}"
if [ -d "public/vendor/livewire" ]; then
    PERMS=$(stat -c "%a" public/vendor/livewire 2>/dev/null || stat -f "%OLp" public/vendor/livewire 2>/dev/null || echo "unknown")
    OWNER=$(stat -c "%U:%G" public/vendor/livewire 2>/dev/null || stat -f "%Su:%Sg" public/vendor/livewire 2>/dev/null || echo "unknown")
    echo "Permissions: $PERMS"
    echo "Owner: $OWNER"
    
    if [ "$PERMS" != "755" ] && [ "$PERMS" != "775" ]; then
        echo -e "${YELLOW}⚠️  Permissions may need adjustment${NC}"
    fi
fi
echo ""

# Step 6: Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Verification Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
echo "  2. Hard refresh the page (Ctrl+F5)"
echo "  3. Check browser console - should load from:"
if [ -n "$APP_URL" ]; then
    echo "     $APP_URL/vendor/livewire/livewire.min.js"
else
    echo "     /vendor/livewire/livewire.min.js"
fi
echo "  4. If still 404, check Nginx configuration"
echo ""
