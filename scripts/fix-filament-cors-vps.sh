#!/bin/bash

# Script untuk Fix Filament CORS Error
# Usage: bash scripts/fix-filament-cors-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔧 Fixing Filament CORS Configuration..."
echo ""

# Step 1: Check Nginx config
echo -e "${YELLOW}Step 1: Checking Nginx configuration...${NC}"
NGINX_CONFIG="/etc/nginx/sites-available/quickkasir-api"
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Nginx config not found at $NGINX_CONFIG${NC}"
    echo "Please check your Nginx configuration file location"
    exit 1
fi

echo "Nginx config found: $NGINX_CONFIG"
echo ""

# Step 2: Check current config
echo -e "${YELLOW}Step 2: Checking current Nginx config for static assets...${NC}"
if grep -q "location.*fonts\|location.*js\|location.*css" "$NGINX_CONFIG"; then
    echo "Static assets location found in config"
    grep -A 5 "location.*fonts\|location.*js\|location.*css" "$NGINX_CONFIG" | head -20
else
    echo -e "${YELLOW}⚠️  No specific static assets location found${NC}"
fi
echo ""

# Step 3: Create backup
echo -e "${YELLOW}Step 3: Creating backup of Nginx config...${NC}"
sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✅ Backup created${NC}"
echo ""

# Step 4: Instructions
echo -e "${YELLOW}Step 4: Nginx Configuration Update Required${NC}"
echo ""
echo "You need to add CORS headers for static assets in Nginx config."
echo ""
echo "Add this to your Nginx config (inside server block for api.quickkasir.com):"
echo ""
echo "    # CORS headers for Filament static assets"
echo "    location ~* \.(woff2?|woff|ttf|eot|js|css)$ {"
echo "        add_header 'Access-Control-Allow-Origin' 'https://admin.quickkasir.com' always;"
echo "        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;"
echo "        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept' always;"
echo "        add_header 'Access-Control-Max-Age' 86400 always;"
echo "        expires 1y;"
echo "        add_header Cache-Control \"public, immutable\";"
echo "        access_log off;"
echo "    }"
echo ""
echo "Or for all static files:"
echo ""
echo "    # CORS headers for all static assets"
echo "    location ~* \.(woff2?|woff|ttf|eot|js|css|png|jpg|jpeg|gif|ico|svg)$ {"
echo "        add_header 'Access-Control-Allow-Origin' 'https://admin.quickkasir.com' always;"
echo "        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;"
echo "        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept' always;"
echo "        expires 1y;"
echo "        add_header Cache-Control \"public, immutable\";"
echo "    }"
echo ""

# Step 5: Check APP_URL
echo -e "${YELLOW}Step 5: Checking APP_URL configuration...${NC}"
cd /var/www/kasir-pos/app/backend || exit 1
APP_URL=$(grep "^APP_URL=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "")
if [ -z "$APP_URL" ]; then
    echo -e "${RED}❌ APP_URL not set in .env${NC}"
else
    echo "APP_URL: $APP_URL"
    if [[ "$APP_URL" == *"api.quickkasir.com"* ]]; then
        echo -e "${YELLOW}⚠️  APP_URL points to api.quickkasir.com${NC}"
        echo "   Filament assets will be served from api.quickkasir.com"
        echo "   Need CORS headers in Nginx for admin.quickkasir.com"
    fi
fi
echo ""

# Step 6: Alternative solution - Set Filament domain
echo -e "${YELLOW}Step 6: Alternative Solution - Serve Filament from admin.quickkasir.com${NC}"
echo ""
echo "Option 1: Add CORS headers in Nginx (recommended)"
echo "   - Edit Nginx config as shown above"
echo "   - sudo nginx -t (test config)"
echo "   - sudo systemctl reload nginx"
echo ""
echo "Option 2: Serve Filament from same domain (admin.quickkasir.com)"
echo "   - Configure Nginx to serve Filament from admin.quickkasir.com"
echo "   - Update APP_URL to admin.quickkasir.com"
echo "   - This requires separate Nginx config for admin domain"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ CORS Fix Instructions Provided!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit Nginx config: sudo nano $NGINX_CONFIG"
echo "  2. Add CORS headers for static assets (see above)"
echo "  3. Test config: sudo nginx -t"
echo "  4. Reload Nginx: sudo systemctl reload nginx"
echo "  5. Clear browser cache and test Filament"
echo ""
