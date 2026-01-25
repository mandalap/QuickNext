#!/bin/bash

# Script untuk Git Pull di VPS
# Usage: bash scripts/git-pull-vps.sh

set -e  # Exit on error

echo "🚀 Starting Git Pull Process..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Navigate to project directory
echo -e "${YELLOW}Step 1: Navigating to project directory...${NC}"
cd /var/www/kasir-pos || {
    echo -e "${RED}❌ Error: Directory /var/www/kasir-pos not found${NC}"
    exit 1
}
echo -e "${GREEN}✅ Current directory: $(pwd)${NC}"
echo ""

# Step 2: Check git status
echo -e "${YELLOW}Step 2: Checking git status...${NC}"
git status --short || {
    echo -e "${RED}❌ Error: Not a git repository${NC}"
    exit 1
}
echo ""

# Step 3: Check for local changes
echo -e "${YELLOW}Step 3: Checking for local changes...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    read -p "Do you want to stash local changes? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stashing local changes..."
        git stash
        echo -e "${GREEN}✅ Local changes stashed${NC}"
    else
        echo -e "${YELLOW}⚠️  Continuing with local changes...${NC}"
    fi
fi
echo ""

# Step 4: Fetch latest changes
echo -e "${YELLOW}Step 4: Fetching latest changes from GitHub...${NC}"
git fetch origin development || {
    echo -e "${RED}❌ Error: Failed to fetch from GitHub${NC}"
    exit 1
}
echo -e "${GREEN}✅ Fetched latest changes${NC}"
echo ""

# Step 5: Pull changes
echo -e "${YELLOW}Step 5: Pulling changes from development branch...${NC}"
git pull origin development || {
    echo -e "${RED}❌ Error: Failed to pull changes${NC}"
    echo -e "${YELLOW}⚠️  Trying to resolve conflicts...${NC}"
    read -p "Do you want to force pull (overwrite local changes)? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Force pulling..."
        git fetch origin
        git reset --hard origin/development
        echo -e "${GREEN}✅ Force pull completed${NC}"
    else
        echo -e "${RED}❌ Pull cancelled. Please resolve conflicts manually.${NC}"
        exit 1
    fi
}
echo -e "${GREEN}✅ Pull completed successfully${NC}"
echo ""

# Step 6: Navigate to backend
echo -e "${YELLOW}Step 6: Navigating to backend directory...${NC}"
cd app/backend || {
    echo -e "${RED}❌ Error: Backend directory not found${NC}"
    exit 1
}
echo -e "${GREEN}✅ Current directory: $(pwd)${NC}"
echo ""

# Step 7: Clear Laravel cache
echo -e "${YELLOW}Step 7: Clearing Laravel cache...${NC}"
php artisan config:clear || echo -e "${YELLOW}⚠️  Warning: config:clear failed${NC}"
php artisan route:clear || echo -e "${YELLOW}⚠️  Warning: route:clear failed${NC}"
php artisan view:clear || echo -e "${YELLOW}⚠️  Warning: view:clear failed${NC}"
php artisan cache:clear || echo -e "${YELLOW}⚠️  Warning: cache:clear failed${NC}"
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

# Step 8: Re-cache for production
echo -e "${YELLOW}Step 8: Re-caching for production...${NC}"
php artisan config:cache || {
    echo -e "${RED}❌ Error: config:cache failed${NC}"
    exit 1
}
php artisan route:cache || {
    echo -e "${RED}❌ Error: route:cache failed${NC}"
    exit 1
}
php artisan view:cache || echo -e "${YELLOW}⚠️  Warning: view:cache failed${NC}"
echo -e "${GREEN}✅ Re-cached successfully${NC}"
echo ""

# Step 9: Install Composer dependencies
echo -e "${YELLOW}Step 9: Installing Composer dependencies...${NC}"
read -p "Do you want to install/update Composer dependencies? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    composer install --optimize-autoloader --no-dev || {
        echo -e "${YELLOW}⚠️  Warning: composer install failed${NC}"
    }
    echo -e "${GREEN}✅ Composer dependencies installed${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping Composer install${NC}"
fi
echo ""

# Step 10: Run migrations
echo -e "${YELLOW}Step 10: Checking for pending migrations...${NC}"
read -p "Do you want to run migrations? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    php artisan migrate --force || {
        echo -e "${YELLOW}⚠️  Warning: migrate failed${NC}"
    }
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping migrations${NC}"
fi
echo ""

# Step 11: Restart services
echo -e "${YELLOW}Step 11: Restarting services...${NC}"
pm2 restart all || echo -e "${YELLOW}⚠️  Warning: pm2 restart failed${NC}"
sudo systemctl reload nginx || echo -e "${YELLOW}⚠️  Warning: nginx reload failed${NC}"
echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

# Step 12: Verification
echo -e "${YELLOW}Step 12: Verifying services...${NC}"
echo "PM2 Status:"
pm2 list || echo -e "${YELLOW}⚠️  PM2 not running${NC}"
echo ""

echo "Testing API endpoint:"
curl -I http://103.59.95.78:8000/api 2>/dev/null | head -1 || echo -e "${YELLOW}⚠️  API endpoint not accessible${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Git Pull Process Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Summary:"
echo "  - Git pull: ✅"
echo "  - Cache cleared: ✅"
echo "  - Cache re-cached: ✅"
echo "  - Services restarted: ✅"
echo ""
echo "Next steps:"
echo "  1. Check PM2 logs: pm2 logs"
echo "  2. Check Laravel logs: tail -f storage/logs/laravel.log"
echo "  3. Test API: curl http://103.59.95.78:8000/api"
echo ""
