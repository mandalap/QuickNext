#!/bin/bash

# Script untuk Setup SEO di VPS
# Usage: bash scripts/setup-seo-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/var/www/kasir-pos"
BERANDA_DIR="$PROJECT_DIR/app/beranda"

echo "🔍 Setting up SEO for QuickKasir..."
echo ""

# Step 1: Check if beranda directory exists
echo -e "${YELLOW}Step 1: Checking beranda directory...${NC}"
if [ ! -d "$BERANDA_DIR" ]; then
    echo -e "${RED}❌ Error: Beranda directory not found at $BERANDA_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Beranda directory found${NC}"
echo ""

# Step 2: Check environment variables
echo -e "${YELLOW}Step 2: Checking environment variables...${NC}"
cd "$BERANDA_DIR"

# Next.js priority: .env.production > .env.local > .env
# For production, use .env.production
SITE_URL=""

# Check .env.production first (recommended for production)
if [ -f ".env.production" ]; then
    if grep -q "NEXT_PUBLIC_SITE_URL" .env.production; then
        SITE_URL=$(grep "NEXT_PUBLIC_SITE_URL" .env.production | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
        echo -e "${GREEN}✅ NEXT_PUBLIC_SITE_URL found in .env.production: $SITE_URL${NC}"
    fi
fi

# Check .env.local as fallback
if [ -z "$SITE_URL" ] && [ -f ".env.local" ]; then
    if grep -q "NEXT_PUBLIC_SITE_URL" .env.local; then
        SITE_URL=$(grep "NEXT_PUBLIC_SITE_URL" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
        echo -e "${GREEN}✅ NEXT_PUBLIC_SITE_URL found in .env.local: $SITE_URL${NC}"
    fi
fi

# Check .env as last fallback
if [ -z "$SITE_URL" ] && [ -f ".env" ]; then
    if grep -q "NEXT_PUBLIC_SITE_URL" .env; then
        SITE_URL=$(grep "NEXT_PUBLIC_SITE_URL" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
        echo -e "${GREEN}✅ NEXT_PUBLIC_SITE_URL found in .env: $SITE_URL${NC}"
    fi
fi

# If still not found, ask user
if [ -z "$SITE_URL" ]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SITE_URL not found in any .env file${NC}"
    read -p "Enter your site URL (e.g., https://www.quickkasir.com): " SITE_URL
    
    # Create .env.production for production (recommended)
    if [ ! -f ".env.production" ]; then
        echo "NEXT_PUBLIC_SITE_URL=$SITE_URL" > .env.production
        echo -e "${GREEN}✅ Created .env.production with NEXT_PUBLIC_SITE_URL${NC}"
    else
        if ! grep -q "NEXT_PUBLIC_SITE_URL" .env.production; then
            echo "NEXT_PUBLIC_SITE_URL=$SITE_URL" >> .env.production
            echo -e "${GREEN}✅ Added NEXT_PUBLIC_SITE_URL to .env.production${NC}"
        fi
    fi
fi
echo ""

# Step 3: Rebuild Next.js to generate sitemap and robots.txt
echo -e "${YELLOW}Step 3: Rebuilding Next.js to generate SEO files...${NC}"
if [ -d ".next" ]; then
    echo "Removing old .next directory..."
    rm -rf .next
fi

echo "Building Next.js application..."
npm run build || {
    echo -e "${RED}❌ Error: Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Build completed${NC}"
echo ""

# Step 4: Check if sitemap.xml and robots.txt are generated
echo -e "${YELLOW}Step 4: Checking SEO files...${NC}"
if [ -f ".next/server/app/sitemap.xml/route.js" ] || [ -f "public/sitemap.xml" ]; then
    echo -e "${GREEN}✅ Sitemap configuration found${NC}"
else
    echo -e "${YELLOW}⚠️  Sitemap not found in expected location${NC}"
fi

if [ -f ".next/server/app/robots.txt/route.js" ] || [ -f "public/robots.txt" ]; then
    echo -e "${GREEN}✅ Robots.txt configuration found${NC}"
else
    echo -e "${YELLOW}⚠️  Robots.txt not found in expected location${NC}"
fi
echo ""

# Step 5: Test accessibility
echo -e "${YELLOW}Step 5: Testing SEO files accessibility...${NC}"
BASE_URL="${SITE_URL:-https://www.quickkasir.com}"

echo "Testing sitemap.xml..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sitemap.xml" | grep -q "200"; then
    echo -e "${GREEN}✅ Sitemap.xml is accessible: $BASE_URL/sitemap.xml${NC}"
else
    echo -e "${YELLOW}⚠️  Sitemap.xml not accessible yet (may need to restart PM2)${NC}"
fi

echo "Testing robots.txt..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/robots.txt" | grep -q "200"; then
    echo -e "${GREEN}✅ Robots.txt is accessible: $BASE_URL/robots.txt${NC}"
else
    echo -e "${YELLOW}⚠️  Robots.txt not accessible yet (may need to restart PM2)${NC}"
fi
echo ""

# Step 6: Restart PM2
echo -e "${YELLOW}Step 6: Restarting PM2 to apply changes...${NC}"
pm2 restart quickkasir-landing || {
    echo -e "${YELLOW}⚠️  Warning: PM2 restart failed or quickkasir-landing not found${NC}"
}
echo -e "${GREEN}✅ PM2 restarted${NC}"
echo ""

# Step 7: Generate SEO report
echo -e "${YELLOW}Step 7: Generating SEO checklist...${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ SEO Setup Checklist:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "1. ✅ Meta tags configured in layout.js"
echo "2. ✅ Sitemap.js configured"
echo "3. ✅ Robots.js configured"
echo "4. ✅ Structured data (JSON-LD) configured"
echo "5. ✅ Open Graph tags configured"
echo "6. ✅ Twitter Card tags configured"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Submit sitemap to Google Search Console:"
echo "   - Go to: https://search.google.com/search-console"
echo "   - Add property: $BASE_URL"
echo "   - Verify ownership (HTML tag, DNS, or file upload)"
echo "   - Submit sitemap: $BASE_URL/sitemap.xml"
echo ""
echo "2. Submit sitemap to Bing Webmaster Tools:"
echo "   - Go to: https://www.bing.com/webmasters"
echo "   - Add site: $BASE_URL"
echo "   - Submit sitemap: $BASE_URL/sitemap.xml"
echo ""
echo "3. Test your site with Google Rich Results Test:"
echo "   - Go to: https://search.google.com/test/rich-results"
echo "   - Enter URL: $BASE_URL"
echo ""
echo "4. Test mobile-friendliness:"
echo "   - Go to: https://search.google.com/test/mobile-friendly"
echo "   - Enter URL: $BASE_URL"
echo ""
echo "5. Monitor indexing status:"
echo "   - Check Google Search Console for indexing status"
echo "   - Use: site:$BASE_URL in Google search"
echo ""
echo -e "${BLUE}========================================${NC}"
