#!/bin/bash

# Script untuk Verify SEO Setup di VPS
# Usage: bash scripts/verify-seo-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SITE_URL="${1:-https://www.quickkasir.com}"

echo "🔍 Verifying SEO Setup for $SITE_URL..."
echo ""

# Test 1: Check sitemap.xml
echo -e "${YELLOW}Test 1: Checking sitemap.xml...${NC}"
SITEMAP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/sitemap.xml")
if [ "$SITEMAP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Sitemap.xml is accessible (HTTP $SITEMAP_STATUS)${NC}"
    echo "   URL: $SITE_URL/sitemap.xml"
    echo "   Content preview:"
    curl -s "$SITE_URL/sitemap.xml" | head -20
else
    echo -e "${RED}❌ Sitemap.xml not accessible (HTTP $SITEMAP_STATUS)${NC}"
fi
echo ""

# Test 2: Check robots.txt
echo -e "${YELLOW}Test 2: Checking robots.txt...${NC}"
ROBOTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/robots.txt")
if [ "$ROBOTS_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Robots.txt is accessible (HTTP $ROBOTS_STATUS)${NC}"
    echo "   URL: $SITE_URL/robots.txt"
    echo "   Content:"
    curl -s "$SITE_URL/robots.txt"
else
    echo -e "${RED}❌ Robots.txt not accessible (HTTP $ROBOTS_STATUS)${NC}"
fi
echo ""

# Test 3: Check meta tags
echo -e "${YELLOW}Test 3: Checking meta tags...${NC}"
HTML_CONTENT=$(curl -s "$SITE_URL")
if echo "$HTML_CONTENT" | grep -q '<meta name="description"'; then
    DESCRIPTION=$(echo "$HTML_CONTENT" | grep -oP '<meta name="description" content="\K[^"]*' | head -1)
    echo -e "${GREEN}✅ Meta description found${NC}"
    echo "   Description: $DESCRIPTION"
else
    echo -e "${YELLOW}⚠️  Meta description not found${NC}"
fi

if echo "$HTML_CONTENT" | grep -q '<meta property="og:title"'; then
    OG_TITLE=$(echo "$HTML_CONTENT" | grep -oP '<meta property="og:title" content="\K[^"]*' | head -1)
    echo -e "${GREEN}✅ Open Graph title found${NC}"
    echo "   OG Title: $OG_TITLE"
else
    echo -e "${YELLOW}⚠️  Open Graph title not found${NC}"
fi
echo ""

# Test 4: Check structured data
echo -e "${YELLOW}Test 4: Checking structured data (JSON-LD)...${NC}"
if echo "$HTML_CONTENT" | grep -q 'application/ld+json'; then
    echo -e "${GREEN}✅ Structured data (JSON-LD) found${NC}"
    echo "$HTML_CONTENT" | grep -oP '<script type="application/ld\+json">\K[^<]*' | head -1 | jq . 2>/dev/null || echo "   (JSON-LD present but cannot parse)"
else
    echo -e "${YELLOW}⚠️  Structured data (JSON-LD) not found${NC}"
fi
echo ""

# Test 5: Check Google indexing
echo -e "${YELLOW}Test 5: Checking Google indexing...${NC}"
echo "   Search: site:$SITE_URL"
echo "   (Check manually at: https://www.google.com/search?q=site:$SITE_URL)"
echo ""

# Test 6: Check page speed (basic)
echo -e "${YELLOW}Test 6: Checking page load time...${NC}"
LOAD_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$SITE_URL")
echo "   Load time: ${LOAD_TIME}s"
if (( $(echo "$LOAD_TIME < 3.0" | bc -l) )); then
    echo -e "${GREEN}✅ Page load time is good (< 3s)${NC}"
else
    echo -e "${YELLOW}⚠️  Page load time is slow (> 3s)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}📋 SEO Verification Summary:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "✅ Sitemap.xml: $([ "$SITEMAP_STATUS" = "200" ] && echo "OK" || echo "FAIL")"
echo "✅ Robots.txt: $([ "$ROBOTS_STATUS" = "200" ] && echo "OK" || echo "FAIL")"
echo "✅ Meta tags: $(echo "$HTML_CONTENT" | grep -q '<meta name="description"' && echo "OK" || echo "FAIL")"
echo "✅ Structured data: $(echo "$HTML_CONTENT" | grep -q 'application/ld+json' && echo "OK" || echo "FAIL")"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Submit sitemap to Google Search Console"
echo "2. Submit sitemap to Bing Webmaster Tools"
echo "3. Monitor indexing status"
echo "4. Test with Google Rich Results Test"
echo ""
