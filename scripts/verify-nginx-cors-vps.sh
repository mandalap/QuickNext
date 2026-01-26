#!/bin/bash

# Script untuk Verify Nginx CORS Configuration
# Usage: bash scripts/verify-nginx-cors-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

NGINX_CONFIG="/etc/nginx/sites-available/kasir-pos"

echo "🔍 Verifying Nginx CORS Configuration..."
echo ""

# Step 1: Check if config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Config file not found: $NGINX_CONFIG${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Config file found: $NGINX_CONFIG${NC}"
echo ""

# Step 2: Check Nginx syntax
echo -e "${YELLOW}Step 1: Testing Nginx configuration syntax...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Nginx configuration syntax is OK${NC}"
else
    echo -e "${RED}❌ Nginx configuration has syntax errors!${NC}"
    sudo nginx -t
    exit 1
fi
echo ""

# Step 3: Check for api.quickkasir.com server blocks
echo -e "${YELLOW}Step 2: Checking server blocks for api.quickkasir.com...${NC}"
SERVER_BLOCKS=$(sudo grep -c "server_name.*api.quickkasir.com" "$NGINX_CONFIG" || echo "0")
if [ "$SERVER_BLOCKS" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $SERVER_BLOCKS server block(s) for api.quickkasir.com${NC}"
else
    echo -e "${RED}❌ No server block found for api.quickkasir.com${NC}"
    exit 1
fi
echo ""

# Step 4: Check for CORS headers in static assets location
echo -e "${YELLOW}Step 3: Checking for CORS headers in static assets location...${NC}"
CORS_FOUND=$(sudo grep -c "Access-Control-Allow-Origin.*admin.quickkasir.com" "$NGINX_CONFIG" 2>/dev/null | tr -d '\n' || echo "0")
STATIC_LOCATION=$(sudo grep -c "location ~\*.*\\.(woff2?|woff|ttf|eot|js|css)" "$NGINX_CONFIG" 2>/dev/null | tr -d '\n' || echo "0")

# Convert to integer (handle empty or multi-line output)
CORS_FOUND=${CORS_FOUND:-0}
STATIC_LOCATION=${STATIC_LOCATION:-0}

if [ "$CORS_FOUND" -gt 0 ] 2>/dev/null; then
    echo -e "${GREEN}✅ Found CORS headers for admin.quickkasir.com ($CORS_FOUND occurrences)${NC}"
else
    echo -e "${RED}❌ No CORS headers found for admin.quickkasir.com${NC}"
    echo -e "${YELLOW}   You need to add CORS headers to the Nginx config${NC}"
fi

if [ "$STATIC_LOCATION" -gt 0 ] 2>/dev/null; then
    echo -e "${GREEN}✅ Found static assets location block ($STATIC_LOCATION occurrences)${NC}"
else
    echo -e "${YELLOW}⚠️  No static assets location block found${NC}"
fi
echo ""

# Step 5: Show relevant server block sections
echo -e "${YELLOW}Step 4: Showing server block configuration for api.quickkasir.com...${NC}"
echo -e "${BLUE}========================================${NC}"
sudo awk '/server_name.*api\.quickkasir\.com/,/^[[:space:]]*server[[:space:]]*{|^[[:space:]]*}/' "$NGINX_CONFIG" | head -50
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 6: Show CORS-related lines
echo -e "${YELLOW}Step 5: Showing CORS-related configuration...${NC}"
if sudo grep -q "Access-Control-Allow-Origin" "$NGINX_CONFIG"; then
    echo -e "${GREEN}CORS headers found:${NC}"
    sudo grep -n "Access-Control-Allow" "$NGINX_CONFIG" | head -20
else
    echo -e "${RED}No CORS headers found in configuration${NC}"
fi
echo ""

# Step 7: Check if Nginx is running
echo -e "${YELLOW}Step 6: Checking Nginx status...${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is not running${NC}"
    echo "   Start with: sudo systemctl start nginx"
fi
echo ""

# Step 8: Test CORS headers with curl
echo -e "${YELLOW}Step 7: Testing CORS headers with curl...${NC}"
echo "Testing: https://api.quickkasir.com/vendor/livewire/livewire.min.js"
CORS_HEADER=$(curl -s -I -H "Origin: https://admin.quickkasir.com" \
    "https://api.quickkasir.com/vendor/livewire/livewire.min.js" \
    | grep -i "access-control-allow-origin" || echo "")

if [ -n "$CORS_HEADER" ]; then
    echo -e "${GREEN}✅ CORS header found in response:${NC}"
    echo "   $CORS_HEADER"
else
    echo -e "${RED}❌ No CORS header in response${NC}"
    echo "   This means CORS headers are not being sent correctly"
fi
echo ""

# Step 9: Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}📋 Summary:${NC}"
echo -e "${BLUE}========================================${NC}"
if [ "$CORS_FOUND" -gt 0 ] 2>/dev/null && [ -n "$CORS_HEADER" ]; then
    echo -e "${GREEN}✅ CORS configuration looks good!${NC}"
    echo "   - CORS headers found in config"
    echo "   - CORS headers present in HTTP response"
    echo ""
    echo "If you still see CORS errors in browser:"
    echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
    echo "  2. Hard refresh (Ctrl+F5)"
    echo "  3. Check browser console for specific errors"
elif [ "$CORS_FOUND" -gt 0 ] 2>/dev/null && [ -z "$CORS_HEADER" ]; then
    echo -e "${YELLOW}⚠️  CORS headers in config but not in response${NC}"
    echo "   - CORS headers found in config file"
    echo "   - But not present in HTTP response"
    echo ""
    echo "Possible issues:"
    echo "  1. Nginx not reloaded after config change"
    echo "  2. CORS headers in wrong location block"
    echo "  3. Static files served from different location"
    echo ""
    echo "Try: sudo systemctl reload nginx"
else
    echo -e "${RED}❌ CORS configuration needs to be added${NC}"
    echo "   - No CORS headers found in config"
    echo "   - No CORS headers in HTTP response"
    echo ""
    echo "Next steps:"
    echo "  1. Edit: sudo nano $NGINX_CONFIG"
    echo "  2. Add CORS headers to static assets location"
    echo "  3. Test: sudo nginx -t"
    echo "  4. Reload: sudo systemctl reload nginx"
fi
echo -e "${BLUE}========================================${NC}"
