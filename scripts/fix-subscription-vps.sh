#!/bin/bash

# Script untuk Fix Subscription di VPS
# Usage: bash scripts/fix-subscription-vps.sh [user_email]

set -e

echo "🔧 Starting Subscription Fix Process..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/var/www/kasir-pos"
BACKEND_DIR="$PROJECT_DIR/app/backend"
USER_EMAIL="${1:-}"

cd "$BACKEND_DIR" || {
    echo -e "${RED}❌ Error: Backend directory not found${NC}"
    exit 1
}

# Step 1: Clear cache
echo -e "${YELLOW}Step 1: Clearing cache...${NC}"
php artisan config:clear
php artisan route:clear
php artisan cache:clear
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

# Step 2: Fix multiple active subscriptions
echo -e "${YELLOW}Step 2: Fixing multiple active subscriptions...${NC}"
if [ -n "$USER_EMAIL" ]; then
    echo "Fixing for user: $USER_EMAIL"
    # Get user ID from email
    USER_ID=$(php artisan tinker --execute="echo \App\Models\User::where('email', '$USER_EMAIL')->first()->id ?? '0';")
    if [ "$USER_ID" != "0" ]; then
        php artisan subscription:fix-multiple-active --user=$USER_ID
    else
        echo -e "${RED}❌ User not found: $USER_EMAIL${NC}"
        exit 1
    fi
else
    echo "Fixing for all users..."
    php artisan subscription:fix-multiple-active
fi
echo ""

# Step 3: Re-cache
echo -e "${YELLOW}Step 3: Re-caching...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache
echo -e "${GREEN}✅ Re-cached${NC}"
echo ""

# Step 4: Restart services
echo -e "${YELLOW}Step 4: Restarting services...${NC}"
pm2 restart quickkasir-api || echo -e "${YELLOW}⚠️  PM2 restart failed${NC}"
sudo systemctl reload nginx || echo -e "${YELLOW}⚠️  Nginx reload failed${NC}"
echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Subscription Fix Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Clear browser cache"
echo "  2. Refresh subscription page"
echo "  3. Check subscription status"
echo ""
