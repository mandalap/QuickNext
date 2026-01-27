#!/bin/bash

# Script untuk Check BingSiteAuth.xml di VPS
# Usage: bash scripts/check-bing-file-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/var/www/kasir-pos"
BERANDA_DIR="$PROJECT_DIR/app/beranda"
PUBLIC_DIR="$BERANDA_DIR/public"
FILE_NAME="BingSiteAuth.xml"

echo "🔍 Checking BingSiteAuth.xml..."
echo ""

# Step 1: Check if file exists
echo -e "${YELLOW}Step 1: Checking if file exists...${NC}"
if [ -f "$PUBLIC_DIR/$FILE_NAME" ]; then
    echo -e "${GREEN}✅ File found: $PUBLIC_DIR/$FILE_NAME${NC}"
    echo ""
    echo "File content:"
    cat "$PUBLIC_DIR/$FILE_NAME"
    echo ""
else
    echo -e "${RED}❌ File not found: $PUBLIC_DIR/$FILE_NAME${NC}"
    echo ""
    echo "File needs to be created. Please:"
    echo "  1. Download BingSiteAuth.xml from Bing Webmaster Tools"
    echo "  2. Upload to: $PUBLIC_DIR/$FILE_NAME"
    echo "  3. Or create manually:"
    echo "     cd $PUBLIC_DIR"
    echo "     nano $FILE_NAME"
    echo "     (Paste content from Bing)"
    exit 1
fi

# Step 2: Check permissions
echo -e "${YELLOW}Step 2: Checking file permissions...${NC}"
ls -la "$PUBLIC_DIR/$FILE_NAME"
echo ""

# Step 3: Test accessibility
echo -e "${YELLOW}Step 3: Testing file accessibility...${NC}"
SITE_URL="https://www.quickkasir.com"
FILE_URL="$SITE_URL/$FILE_NAME"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FILE_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ File is accessible: $FILE_URL${NC}"
    echo "   HTTP Status: $HTTP_CODE"
    echo ""
    echo "File content from web:"
    curl -s "$FILE_URL"
    echo ""
else
    echo -e "${RED}❌ File not accessible (HTTP $HTTP_CODE)${NC}"
    echo "   URL: $FILE_URL"
    echo ""
    echo "Possible issues:"
    echo "  1. File exists but Next.js not serving it"
    echo "  2. Nginx configuration issue"
    echo "  3. PM2 needs restart"
    echo ""
    echo "Solutions:"
    echo "  1. Restart PM2: pm2 restart quickkasir-landing"
    echo "  2. Reload Nginx: sudo systemctl reload nginx"
    echo "  3. Check Nginx config for static files"
fi
echo ""
