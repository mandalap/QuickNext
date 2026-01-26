#!/bin/bash

# Script untuk Add CORS Headers ke Nginx Config (Interactive)
# Usage: bash scripts/add-cors-nginx-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

NGINX_CONFIG="/etc/nginx/sites-available/kasir-pos"
BACKUP_FILE="${NGINX_CONFIG}.backup-$(date +%Y%m%d-%H%M%S)"

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
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
echo ""

# Step 3: Check if CORS already exists
echo -e "${YELLOW}Step 2: Checking if CORS headers already exist...${NC}"
if sudo grep -q "Access-Control-Allow-Origin.*admin.quickkasir.com" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}⚠️  CORS headers for admin.quickkasir.com already exist${NC}"
    echo ""
    echo "Current CORS config:"
    sudo grep -B 2 -A 5 "Access-Control-Allow-Origin.*admin.quickkasir.com" "$NGINX_CONFIG" | head -15
    echo ""
    read -p "Do you want to update/replace it? (yes/no): " update_cors
    if [ "$update_cors" != "yes" ]; then
        echo "Skipping CORS update"
        exit 0
    fi
else
    echo "No CORS headers found for admin.quickkasir.com"
fi
echo ""

# Step 4: Show current server block structure
echo -e "${YELLOW}Step 3: Current server block structure for api.quickkasir.com...${NC}"
echo -e "${BLUE}========================================${NC}"
sudo awk '/server_name.*api\.quickkasir\.com/,/^[[:space:]]*server[[:space:]]*{|^[[:space:]]*}/' "$NGINX_CONFIG" | head -60
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 5: Show template
echo -e "${YELLOW}Step 4: CORS Configuration Template${NC}"
echo ""
echo -e "${BLUE}Copy this block and add it to your Nginx config:${NC}"
echo ""
cat << 'EOF'
    # CORS headers for Filament static assets
    location ~* \.(woff2?|woff|ttf|eot|js|css)$ {
        add_header 'Access-Control-Allow-Origin' 'https://admin.quickkasir.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept' always;
        add_header 'Access-Control-Max-Age' 86400 always;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;

        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://admin.quickkasir.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept' always;
            add_header 'Access-Control-Max-Age' 86400 always;
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain';
            return 204;
        }
    }
EOF
echo ""

# Step 6: Instructions
echo -e "${YELLOW}Step 5: Manual Edit Instructions${NC}"
echo ""
echo "1. Edit the Nginx config:"
echo "   ${GREEN}sudo nano $NGINX_CONFIG${NC}"
echo ""
echo "2. Find the HTTPS server block (listen 443) for api.quickkasir.com"
echo ""
echo "3. Add the CORS location block:"
echo "   - AFTER the 'location /' block"
echo "   - BEFORE the 'location ~ \.php$' block"
echo ""
echo "4. Save and exit (Ctrl+X, then Y, then Enter)"
echo ""
echo "5. Test configuration:"
echo "   ${GREEN}sudo nginx -t${NC}"
echo ""
echo "6. If test passes, reload Nginx:"
echo "   ${GREEN}sudo systemctl reload nginx${NC}"
echo ""
echo "7. Verify CORS headers:"
echo "   ${GREEN}bash scripts/verify-nginx-cors-vps.sh${NC}"
echo ""

read -p "Press Enter to open the config file in nano, or Ctrl+C to cancel..."
sudo nano "$NGINX_CONFIG"

# Step 7: Test after edit
echo ""
echo -e "${YELLOW}Step 6: Testing configuration...${NC}"
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo -e "${GREEN}✅ Nginx configuration syntax is OK${NC}"
    echo ""
    read -p "Do you want to reload Nginx now? (yes/no): " reload_nginx
    if [ "$reload_nginx" = "yes" ]; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ Nginx reloaded${NC}"
        echo ""
        echo "Verifying CORS headers..."
        bash scripts/verify-nginx-cors-vps.sh
    else
        echo "Nginx not reloaded. Reload manually with: sudo systemctl reload nginx"
    fi
else
    echo -e "${RED}❌ Nginx configuration has syntax errors!${NC}"
    sudo nginx -t
    echo ""
    echo "Please fix the errors and try again."
    echo "If you need to restore the backup:"
    echo "  sudo cp $BACKUP_FILE $NGINX_CONFIG"
    exit 1
fi
