#!/bin/bash

# Script untuk Start PM2 Processes di VPS
# Usage: bash scripts/start-pm2-vps.sh

set -e

echo "🚀 Starting PM2 Processes..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/var/www/kasir-pos"

# Step 1: Start Backend API
echo -e "${YELLOW}Step 1: Starting Backend API...${NC}"
cd "$PROJECT_DIR/app/backend"

# Stop existing if any
pm2 delete quickkasir-api 2>/dev/null || true

# Start backend
pm2 start "php artisan serve --host=0.0.0.0 --port=8000" --name "quickkasir-api"
pm2 save

echo -e "${GREEN}✅ Backend API started!${NC}"
echo ""

# Step 2: Start Landing Page (if exists)
if [ -d "$PROJECT_DIR/app/beranda" ]; then
    echo -e "${YELLOW}Step 2: Starting Landing Page...${NC}"
    cd "$PROJECT_DIR/app/beranda"
    
    # Stop existing if any
    pm2 delete quickkasir-landing 2>/dev/null || true
    
    # Start landing page
    pm2 start npm --name "quickkasir-landing" -- start
    pm2 save
    
    echo -e "${GREEN}✅ Landing Page started!${NC}"
    echo ""
fi

# Step 3: Setup PM2 startup
echo -e "${YELLOW}Step 3: Setting up PM2 startup...${NC}"
pm2 startup systemd -u root --hp /root 2>/dev/null || echo -e "${YELLOW}⚠️  PM2 startup already configured${NC}"
pm2 save

echo -e "${GREEN}✅ PM2 startup configured!${NC}"
echo ""

# Step 4: Show PM2 status
echo -e "${YELLOW}Step 4: PM2 Status:${NC}"
pm2 list

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ PM2 Processes Started!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "To view logs:"
echo "  pm2 logs quickkasir-api"
echo "  pm2 logs quickkasir-landing"
echo ""
echo "To restart:"
echo "  pm2 restart all"
echo ""
