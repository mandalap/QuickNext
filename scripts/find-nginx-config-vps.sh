#!/bin/bash

# Script untuk Find Nginx Configuration File
# Usage: bash scripts/find-nginx-config-vps.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 Finding Nginx Configuration Files..."
echo ""

# Step 1: Check common locations
echo -e "${YELLOW}Step 1: Checking common Nginx config locations...${NC}"

CONFIG_FOUND=false

# Check sites-available
if [ -d "/etc/nginx/sites-available" ]; then
    echo "✅ /etc/nginx/sites-available/ found"
    echo "Files in sites-available:"
    ls -la /etc/nginx/sites-available/ | grep -v "^total" | grep -v "^d" | awk '{print "  " $9}'
    echo ""
    
    # Check for quickkasir or api related configs
    QUICKKASIR_CONFIG=$(ls /etc/nginx/sites-available/ | grep -i "quickkasir\|api" | head -1)
    if [ -n "$QUICKKASIR_CONFIG" ]; then
        echo -e "${GREEN}✅ Found config: $QUICKKASIR_CONFIG${NC}"
        CONFIG_FOUND=true
    fi
else
    echo -e "${YELLOW}⚠️  /etc/nginx/sites-available/ not found${NC}"
fi

# Check sites-enabled
if [ -d "/etc/nginx/sites-enabled" ]; then
    echo "✅ /etc/nginx/sites-enabled/ found"
    echo "Files in sites-enabled:"
    ls -la /etc/nginx/sites-enabled/ | grep -v "^total" | grep -v "^d" | awk '{print "  " $9}'
    echo ""
    
    # Check for quickkasir or api related configs
    QUICKKASIR_ENABLED=$(ls /etc/nginx/sites-enabled/ | grep -i "quickkasir\|api" | head -1)
    if [ -n "$QUICKKASIR_ENABLED" ]; then
        echo -e "${GREEN}✅ Found enabled config: $QUICKKASIR_ENABLED${NC}"
        CONFIG_FOUND=true
    fi
else
    echo -e "${YELLOW}⚠️  /etc/nginx/sites-enabled/ not found${NC}"
fi

# Check conf.d
if [ -d "/etc/nginx/conf.d" ]; then
    echo "✅ /etc/nginx/conf.d/ found"
    echo "Files in conf.d:"
    ls -la /etc/nginx/conf.d/ | grep -v "^total" | grep -v "^d" | awk '{print "  " $9}'
    echo ""
    
    # Check for quickkasir or api related configs
    QUICKKASIR_CONFD=$(ls /etc/nginx/conf.d/ | grep -i "quickkasir\|api" | head -1)
    if [ -n "$QUICKKASIR_CONFD" ]; then
        echo -e "${GREEN}✅ Found config: $QUICKKASIR_CONFD${NC}"
        CONFIG_FOUND=true
    fi
else
    echo -e "${YELLOW}⚠️  /etc/nginx/conf.d/ not found${NC}"
fi

# Step 2: Search for api.quickkasir.com in configs
echo -e "${YELLOW}Step 2: Searching for api.quickkasir.com in configs...${NC}"
if command -v grep &> /dev/null; then
    API_CONFIG=$(sudo grep -r "api.quickkasir.com" /etc/nginx/ 2>/dev/null | head -1 | cut -d ':' -f1 || echo "")
    if [ -n "$API_CONFIG" ]; then
        echo -e "${GREEN}✅ Found config with api.quickkasir.com: $API_CONFIG${NC}"
        CONFIG_FOUND=true
    else
        echo -e "${YELLOW}⚠️  No config found with api.quickkasir.com${NC}"
    fi
fi
echo ""

# Step 3: Check main nginx.conf
echo -e "${YELLOW}Step 3: Checking main nginx.conf...${NC}"
if [ -f "/etc/nginx/nginx.conf" ]; then
    echo "✅ /etc/nginx/nginx.conf found"
    # Check if it includes other configs
    INCLUDES=$(grep -E "include.*sites|include.*conf.d" /etc/nginx/nginx.conf 2>/dev/null || echo "")
    if [ -n "$INCLUDES" ]; then
        echo "Includes found:"
        echo "$INCLUDES"
    fi
else
    echo -e "${RED}❌ /etc/nginx/nginx.conf not found${NC}"
fi
echo ""

# Step 4: List all .conf files
echo -e "${YELLOW}Step 4: Listing all .conf files in /etc/nginx/...${NC}"
find /etc/nginx/ -name "*.conf" -type f 2>/dev/null | head -10 || echo "No .conf files found"
echo ""

# Step 5: Check active sites
echo -e "${YELLOW}Step 5: Checking active Nginx sites...${NC}"
if command -v nginx &> /dev/null; then
    echo "Nginx version:"
    nginx -v 2>&1 || echo "Could not get version"
    echo ""
    echo "Testing config:"
    sudo nginx -t 2>&1 | head -10 || echo "Could not test config"
fi
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
if [ "$CONFIG_FOUND" = true ]; then
    echo -e "${GREEN}✅ Nginx config files found!${NC}"
    echo ""
    echo "To edit config, use:"
    if [ -n "$QUICKKASIR_CONFIG" ]; then
        echo "  sudo nano /etc/nginx/sites-available/$QUICKKASIR_CONFIG"
    elif [ -n "$QUICKKASIR_ENABLED" ]; then
        echo "  sudo nano /etc/nginx/sites-enabled/$QUICKKASIR_ENABLED"
    elif [ -n "$API_CONFIG" ]; then
        echo "  sudo nano $API_CONFIG"
    fi
else
    echo -e "${YELLOW}⚠️  QuickKasir config not found automatically${NC}"
    echo ""
    echo "Please check manually:"
    echo "  1. List all configs: ls -la /etc/nginx/sites-available/"
    echo "  2. Or check: ls -la /etc/nginx/conf.d/"
    echo "  3. Or search: sudo grep -r 'api.quickkasir.com' /etc/nginx/"
fi
echo -e "${GREEN}========================================${NC}"
echo ""
