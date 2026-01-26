#!/bin/bash

# Script Quick Setup SEO untuk VPS
# Usage: bash scripts/setup-seo-quick-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/var/www/kasir-pos"
BERANDA_DIR="$PROJECT_DIR/app/beranda"

echo "🚀 Quick Setup SEO untuk QuickKasir..."
echo ""

# Step 1: Check directory
echo -e "${YELLOW}Step 1: Checking directory...${NC}"
if [ ! -d "$BERANDA_DIR" ]; then
    echo -e "${RED}❌ Error: Beranda directory not found at $BERANDA_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Beranda directory found${NC}"
echo ""

# Step 2: Get site URL
echo -e "${YELLOW}Step 2: Setting up environment variable...${NC}"
cd "$BERANDA_DIR"

# Default URL
DEFAULT_URL="https://www.quickkasir.com"

# Check if already set
if [ -f ".env.production" ] && grep -q "NEXT_PUBLIC_SITE_URL" .env.production; then
    CURRENT_URL=$(grep "NEXT_PUBLIC_SITE_URL" .env.production | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
    echo -e "${GREEN}✅ NEXT_PUBLIC_SITE_URL already set: $CURRENT_URL${NC}"
    read -p "Do you want to change it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        SITE_URL="$CURRENT_URL"
    else
        read -p "Enter your site URL (default: $DEFAULT_URL): " SITE_URL
        SITE_URL="${SITE_URL:-$DEFAULT_URL}"
    fi
else
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SITE_URL not found${NC}"
    read -p "Enter your site URL (default: $DEFAULT_URL): " SITE_URL
    SITE_URL="${SITE_URL:-$DEFAULT_URL}"
fi

# Ensure URL has https://
if [[ ! "$SITE_URL" =~ ^https?:// ]]; then
    SITE_URL="https://$SITE_URL"
fi

# Save to .env.production
echo "NEXT_PUBLIC_SITE_URL=$SITE_URL" > .env.production
echo -e "${GREEN}✅ Saved to .env.production: $SITE_URL${NC}"
echo ""

# Step 3: Rebuild Next.js
echo -e "${YELLOW}Step 3: Rebuilding Next.js...${NC}"
echo "This may take a few minutes..."
rm -rf .next
npm run build || {
    echo -e "${RED}❌ Error: Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Step 4: Restart PM2
echo -e "${YELLOW}Step 4: Restarting PM2...${NC}"
pm2 restart quickkasir-landing --update-env || {
    echo -e "${YELLOW}⚠️  PM2 restart failed, trying to start...${NC}"
    pm2 start npm --name "quickkasir-landing" -- start --update-env
}
pm2 save
echo -e "${GREEN}✅ PM2 restarted${NC}"
echo ""

# Step 5: Wait a bit for server to start
echo -e "${YELLOW}Step 5: Waiting for server to start...${NC}"
sleep 5

# Step 6: Verify
echo -e "${YELLOW}Step 6: Verifying SEO files...${NC}"
SITEMAP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/sitemap.xml" || echo "000")
ROBOTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/robots.txt" || echo "000")

if [ "$SITEMAP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Sitemap.xml is accessible: $SITE_URL/sitemap.xml${NC}"
else
    echo -e "${YELLOW}⚠️  Sitemap.xml not accessible yet (HTTP $SITEMAP_STATUS)${NC}"
    echo "   This is normal if server just started. Wait a few seconds and try again."
fi

if [ "$ROBOTS_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Robots.txt is accessible: $SITE_URL/robots.txt${NC}"
else
    echo -e "${YELLOW}⚠️  Robots.txt not accessible yet (HTTP $ROBOTS_STATUS)${NC}"
    echo "   This is normal if server just started. Wait a few seconds and try again."
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ SEO Setup Completed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Summary:"
echo "  - Environment variable: ✅ Set to $SITE_URL"
echo "  - Next.js build: ✅ Completed"
echo "  - PM2 restarted: ✅ Completed"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Submit sitemap to Google Search Console:"
echo "   - Go to: https://search.google.com/search-console"
echo "   - Add property: $SITE_URL"
echo "   - Verify ownership"
echo "   - Submit sitemap: $SITE_URL/sitemap.xml"
echo ""
echo "2. Submit sitemap to Bing Webmaster Tools:"
echo "   - Go to: https://www.bing.com/webmasters"
echo "   - Add site: $SITE_URL"
echo "   - Submit sitemap: $SITE_URL/sitemap.xml"
echo ""
echo "3. Test your site:"
echo "   - Sitemap: $SITE_URL/sitemap.xml"
echo "   - Robots: $SITE_URL/robots.txt"
echo ""
echo -e "${BLUE}========================================${NC}"
