#!/bin/bash

# Script untuk Add CORS Headers ke Nginx Config
# Usage: bash scripts/add-cors-to-nginx-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

NGINX_CONFIG="/etc/nginx/sites-available/kasir-pos"

echo "🔧 Adding CORS Headers to Nginx Configuration..."
echo ""

# Step 1: Check if config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Config file not found: $NGINX_CONFIG${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Config file found: $NGINX_CONFIG${NC}"
echo ""

# Step 2: Create backup
echo -e "${YELLOW}Step 1: Creating backup...${NC}"
BACKUP_FILE="${NGINX_CONFIG}.backup-$(date +%Y%m%d-%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
echo ""

# Step 3: Check if CORS already exists
echo -e "${YELLOW}Step 2: Checking if CORS headers already exist...${NC}"
if sudo grep -q "Access-Control-Allow-Origin.*admin.quickkasir.com" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}⚠️  CORS headers for admin.quickkasir.com already exist${NC}"
    echo "Current CORS config:"
    sudo grep -A 3 "Access-Control-Allow-Origin.*admin.quickkasir.com" "$NGINX_CONFIG" | head -10
    echo ""
    read -p "Do you want to update it? (yes/no): " update_cors
    if [ "$update_cors" != "yes" ]; then
        echo "Skipping CORS update"
        exit 0
    fi
else
    echo "No CORS headers found for admin.quickkasir.com"
fi
echo ""

# Step 4: Show current server blocks
echo -e "${YELLOW}Step 3: Current server blocks for api.quickkasir.com...${NC}"
sudo grep -B 5 -A 20 "server_name.*api.quickkasir.com" "$NGINX_CONFIG" | head -30
echo ""

# Step 5: Instructions
echo -e "${YELLOW}Step 4: Manual Edit Required${NC}"
echo ""
echo "Please edit the Nginx config manually:"
echo "  sudo nano $NGINX_CONFIG"
echo ""
echo "Find the server block for 'api.quickkasir.com' and add this INSIDE the server block:"
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
echo ""
echo "        # Handle OPTIONS preflight"
echo "        if (\$request_method = 'OPTIONS') {"
echo "            add_header 'Access-Control-Allow-Origin' 'https://admin.quickkasir.com' always;"
echo "            add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;"
echo "            add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept' always;"
echo "            add_header 'Access-Control-Max-Age' 86400 always;"
echo "            add_header 'Content-Length' 0;"
echo "            add_header 'Content-Type' 'text/plain';"
echo "            return 204;"
echo "        }"
echo "    }"
echo ""
echo "After editing:"
echo "  1. Test config: sudo nginx -t"
echo "  2. If OK, reload: sudo systemctl reload nginx"
echo ""
