#!/bin/bash

# Script untuk Setup Google Verification via HTML File
# Usage: bash scripts/setup-google-html-file-vps.sh [filename] [content]

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

echo "📁 Setting up Google Verification via HTML File..."
echo ""

# Check if filename provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: bash scripts/setup-google-html-file-vps.sh [filename] [content]${NC}"
    echo ""
    echo "Example:"
    echo "  bash scripts/setup-google-html-file-vps.sh google1234567890.html 'google-site-verification: google1234567890.html'"
    echo ""
    echo "Or interactive mode:"
    read -p "Enter filename from Google (e.g., google1234567890.html): " FILENAME
    read -p "Enter content from Google: " CONTENT
else
    FILENAME="$1"
    CONTENT="${2:-google-site-verification: $FILENAME}"
fi

if [ -z "$FILENAME" ]; then
    echo -e "${RED}❌ Error: Filename is required${NC}"
    exit 1
fi

# Step 1: Check directory
echo -e "${YELLOW}Step 1: Checking directory...${NC}"
if [ ! -d "$PUBLIC_DIR" ]; then
    echo -e "${RED}❌ Error: Public directory not found at $PUBLIC_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Public directory found${NC}"
echo ""

# Step 2: Create HTML file
echo -e "${YELLOW}Step 2: Creating HTML file...${NC}"
cd "$PUBLIC_DIR"

FILE_PATH="$PUBLIC_DIR/$FILENAME"

if [ -f "$FILENAME" ]; then
    echo -e "${YELLOW}⚠️  File $FILENAME already exists${NC}"
    read -p "Do you want to overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
fi

# Create file with content
echo "$CONTENT" > "$FILENAME"
echo -e "${GREEN}✅ File created: $FILENAME${NC}"
echo "   Content: $CONTENT"
echo ""

# Step 3: Set permissions
echo -e "${YELLOW}Step 3: Setting permissions...${NC}"
chmod 644 "$FILENAME"
chown www-data:www-data "$FILENAME" 2>/dev/null || chown quick:quick "$FILENAME" 2>/dev/null || true
echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

# Step 4: Test accessibility
echo -e "${YELLOW}Step 4: Testing file accessibility...${NC}"
SITE_URL="${SITE_URL:-https://www.quickkasir.com}"
FILE_URL="$SITE_URL/$FILENAME"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FILE_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ File is accessible: $FILE_URL${NC}"
    echo "   HTTP Status: $HTTP_CODE"
    echo ""
    echo "File content:"
    curl -s "$FILE_URL"
    echo ""
else
    echo -e "${YELLOW}⚠️  File not accessible yet (HTTP $HTTP_CODE)${NC}"
    echo "   URL: $FILE_URL"
    echo ""
    echo "This is normal if:"
    echo "  - Server just restarted"
    echo "  - Nginx needs reload"
    echo "  - File needs to be served by Next.js"
    echo ""
    echo "Try:"
    echo "  1. Wait a few seconds"
    echo "  2. Reload Nginx: sudo systemctl reload nginx"
    echo "  3. Restart PM2: pm2 restart quickkasir-landing"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ HTML File Setup Completed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "File created: $FILE_PATH"
echo "File URL: $FILE_URL"
echo ""
echo "Next steps:"
echo "  1. Go to Google Search Console"
echo "  2. Select 'HTML file' verification method"
echo "  3. Click 'Verify'"
echo ""
echo -e "${BLUE}========================================${NC}"
