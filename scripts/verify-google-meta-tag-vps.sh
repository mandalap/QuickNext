#!/bin/bash

# Script untuk Verify Google Meta Tag di VPS
# Usage: bash scripts/verify-google-meta-tag-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SITE_URL="${1:-https://www.quickkasir.com}"
VERIFICATION_CODE="0SbxrfLo5YxuQali4sbzU-sdSKfdn1qKx024ZvL6ZOQ"

echo "🔍 Verifying Google Meta Tag..."
echo ""

# Test 1: Check if meta tag exists in HTML
echo -e "${YELLOW}Test 1: Checking Google verification meta tag...${NC}"
HTML_CONTENT=$(curl -s "$SITE_URL")

if echo "$HTML_CONTENT" | grep -q "google-site-verification"; then
    META_TAG=$(echo "$HTML_CONTENT" | grep -oP '<meta name="google-site-verification" content="\K[^"]*')
    echo -e "${GREEN}✅ Google verification meta tag found!${NC}"
    echo "   Meta tag content: $META_TAG"
    
    if [ "$META_TAG" = "$VERIFICATION_CODE" ]; then
        echo -e "${GREEN}✅ Verification code matches!${NC}"
    else
        echo -e "${YELLOW}⚠️  Verification code doesn't match${NC}"
        echo "   Expected: $VERIFICATION_CODE"
        echo "   Found: $META_TAG"
    fi
else
    echo -e "${RED}❌ Google verification meta tag not found!${NC}"
    echo ""
    echo "Possible reasons:"
    echo "  1. Next.js belum di-rebuild"
    echo "  2. PM2 belum restart"
    echo "  3. Meta tag belum ditambahkan ke layout.js"
    echo ""
    echo "Solution:"
    echo "  1. cd /var/www/kasir-pos/app/beranda"
    echo "  2. rm -rf .next"
    echo "  3. npm run build"
    echo "  4. pm2 restart quickkasir-landing --update-env"
fi
echo ""

# Test 2: Check full meta tag
echo -e "${YELLOW}Test 2: Full meta tag in HTML...${NC}"
FULL_TAG=$(echo "$HTML_CONTENT" | grep "google-site-verification" | head -1)
if [ -n "$FULL_TAG" ]; then
    echo "   $FULL_TAG"
else
    echo -e "${RED}❌ Meta tag not found in HTML${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
if echo "$HTML_CONTENT" | grep -q "google-site-verification"; then
    echo -e "${GREEN}✅ Google verification meta tag is present!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Go to Google Search Console"
    echo "  2. Switch to 'HTML tag' verification method"
    echo "  3. Click 'Verify'"
else
    echo -e "${RED}❌ Google verification meta tag is NOT present!${NC}"
    echo ""
    echo "Please rebuild Next.js:"
    echo "  cd /var/www/kasir-pos/app/beranda"
    echo "  rm -rf .next"
    echo "  npm run build"
    echo "  pm2 restart quickkasir-landing --update-env"
fi
echo -e "${BLUE}========================================${NC}"
