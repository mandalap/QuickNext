#!/bin/bash

# Script untuk Create BingSiteAuth.xml di VPS
# Usage: bash scripts/create-bing-auth-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/var/www/kasir-pos"
PUBLIC_DIR="$PROJECT_DIR/app/beranda/public"
FILE_NAME="BingSiteAuth.xml"

# Content dari user
BING_CONTENT='<?xml version="1.0"?>
<users>
        <user>7E7C45DA0468161BA549B81C27DF546B</user>
</users>'

echo "📁 Creating BingSiteAuth.xml..."
echo ""

# Step 1: Check directory
echo -e "${YELLOW}Step 1: Checking directory...${NC}"
if [ ! -d "$PUBLIC_DIR" ]; then
    echo -e "${RED}❌ Error: Public directory not found at $PUBLIC_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Public directory found${NC}"
echo ""

# Step 2: Create file
echo -e "${YELLOW}Step 2: Creating BingSiteAuth.xml...${NC}"
cd "$PUBLIC_DIR"

FILE_PATH="$PUBLIC_DIR/$FILE_NAME"

if [ -f "$FILE_NAME" ]; then
    echo -e "${YELLOW}⚠️  File $FILE_NAME already exists${NC}"
    read -p "Do you want to overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
fi

# Create file with content
cat > "$FILE_NAME" << 'EOF'
<?xml version="1.0"?>
<users>
        <user>7E7C45DA0468161BA549B81C27DF546B</user>
</users>
EOF

echo -e "${GREEN}✅ File created: $FILE_NAME${NC}"
echo ""
echo "File content:"
cat "$FILE_NAME"
echo ""

# Step 3: Set permissions
echo -e "${YELLOW}Step 3: Setting permissions...${NC}"
chmod 644 "$FILE_NAME"
chown www-data:www-data "$FILE_NAME" 2>/dev/null || chown quick:quick "$FILE_NAME" 2>/dev/null || true
echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

# Step 4: Verify file
echo -e "${YELLOW}Step 4: Verifying file...${NC}"
ls -la "$FILE_NAME"
echo ""

# Step 5: Test accessibility
echo -e "${YELLOW}Step 5: Testing file accessibility...${NC}"
SITE_URL="${SITE_URL:-https://www.quickkasir.com}"
FILE_URL="$SITE_URL/$FILE_NAME"

# Wait a bit for file system
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FILE_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ File is accessible: $FILE_URL${NC}"
    echo "   HTTP Status: $HTTP_CODE"
    echo ""
    echo "File content from web:"
    curl -s "$FILE_URL"
    echo ""
else
    echo -e "${YELLOW}⚠️  File not accessible yet (HTTP $HTTP_CODE)${NC}"
    echo "   URL: $FILE_URL"
    echo ""
    echo "Trying to fix..."
    
    # Restart PM2
    echo "Restarting PM2..."
    pm2 restart quickkasir-landing 2>/dev/null || true
    
    # Reload Nginx
    echo "Reloading Nginx..."
    sudo systemctl reload nginx 2>/dev/null || true
    
    # Wait a bit
    sleep 3
    
    # Test again
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FILE_URL" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ File is now accessible after restart!${NC}"
        curl -s "$FILE_URL"
    else
        echo -e "${YELLOW}⚠️  Still not accessible (HTTP $HTTP_CODE)${NC}"
        echo ""
        echo "This might be normal if:"
        echo "  - Next.js needs to rebuild"
        echo "  - Nginx needs configuration update"
        echo ""
        echo "File is created correctly. Try verify in Bing Webmaster Tools."
    fi
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ BingSiteAuth.xml Created!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "File location: $FILE_PATH"
echo "File URL: $FILE_URL"
echo ""
echo "Next steps:"
echo "  1. Go to Bing Webmaster Tools"
echo "  2. Click 'Verify' button"
echo "  3. Bing will check the file"
echo ""
echo -e "${BLUE}========================================${NC}"
