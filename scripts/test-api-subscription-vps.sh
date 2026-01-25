#!/bin/bash

# Script untuk Test API Subscription Response
# Usage: bash scripts/test-api-subscription-vps.sh [user_email] [token]

set -e

echo "🧪 Testing API Subscription Response..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

USER_EMAIL="${1:-advertisertim@gmail.com}"
TOKEN="${2:-}"

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Token not provided. Getting token from database...${NC}"
    echo ""
    
    cd /var/www/kasir-pos/app/backend || exit 1
    
    # Get token from database
    TOKEN=$(php artisan tinker --execute="
        \$user = \App\Models\User::where('email', '$USER_EMAIL')->first();
        if (\$user) {
            \$token = \$user->createToken('test-token')->plainTextToken;
            echo \$token;
        } else {
            echo 'USER_NOT_FOUND';
        }
    ")
    
    if [ "$TOKEN" = "USER_NOT_FOUND" ]; then
        echo -e "${RED}❌ User not found: $USER_EMAIL${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Token generated${NC}"
    echo ""
fi

# Test API
echo "Testing GET /api/v1/subscriptions/current"
echo "─────────────────────────────────────────────────────"
echo ""

RESPONSE=$(curl -s -X GET "http://103.59.95.78:8000/api/v1/subscriptions/current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "─────────────────────────────────────────────────────"
echo ""

# Parse response
SUCCESS=$(echo "$RESPONSE" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' ')
HAS_SUBSCRIPTION=$(echo "$RESPONSE" | grep -o '"has_subscription":[^,]*' | cut -d':' -f2 | tr -d ' ')
IS_TRIAL=$(echo "$RESPONSE" | grep -o '"is_trial":[^,}]*' | cut -d':' -f2 | tr -d ' ')
STATUS=$(echo "$RESPONSE" | grep -o '"subscription_status":"[^"]*"' | cut -d'"' -f4)
PLAN_NAME=$(echo "$RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "📊 Parsed Response:"
echo "  Success: $SUCCESS"
echo "  Has Subscription: $HAS_SUBSCRIPTION"
echo "  Is Trial: $IS_TRIAL"
echo "  Status: $STATUS"
echo "  Plan Name: $PLAN_NAME"
echo ""

if [ "$IS_TRIAL" = "true" ]; then
    echo -e "${RED}❌ PROBLEM: API masih return trial subscription!${NC}"
    echo ""
    echo "Possible causes:"
    echo "  1. Cache belum ter-clear"
    echo "  2. Query masih salah"
    echo "  3. Frontend cache"
    echo ""
else
    echo -e "${GREEN}✅ API return paid subscription (correct)${NC}"
    echo ""
    echo "If frontend still shows 'Expired', clear browser cache:"
    echo "  - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
    echo "  - Or clear localStorage in browser console"
fi

echo ""
