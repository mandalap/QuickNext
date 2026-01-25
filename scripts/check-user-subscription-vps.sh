#!/bin/bash

# Script untuk Check Subscription User di VPS
# Usage: bash scripts/check-user-subscription-vps.sh [user_email]

set -e

echo "🔍 Checking User Subscription..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/var/www/kasir-pos"
BACKEND_DIR="$PROJECT_DIR/app/backend"
USER_EMAIL="${1:-advertisertim@gmail.com}"

cd "$BACKEND_DIR" || {
    echo -e "${RED}❌ Error: Backend directory not found${NC}"
    exit 1
}

echo "Checking subscription for user: $USER_EMAIL"
echo ""

# Check all subscriptions for this user
php artisan tinker --execute="
\$user = \App\Models\User::where('email', '$USER_EMAIL')->first();
if (!\$user) {
    echo '❌ User not found: $USER_EMAIL' . PHP_EOL;
    exit;
}

echo '👤 User: ' . \$user->email . ' (ID: ' . \$user->id . ')' . PHP_EOL;
echo '' . PHP_EOL;

// Get ALL subscriptions
\$allSubs = \App\Models\UserSubscription::with('subscriptionPlan')
    ->where('user_id', \$user->id)
    ->orderBy('created_at', 'desc')
    ->get();

echo '📋 ALL SUBSCRIPTIONS (' . \$allSubs->count() . '):' . PHP_EOL;
echo '─────────────────────────────────────────────────────' . PHP_EOL;
foreach (\$allSubs as \$sub) {
    echo 'ID: ' . \$sub->id . PHP_EOL;
    echo '  Code: ' . \$sub->subscription_code . PHP_EOL;
    echo '  Status: ' . \$sub->status . PHP_EOL;
    echo '  Is Trial: ' . (\$sub->is_trial ? 'Yes' : 'No') . PHP_EOL;
    echo '  Plan: ' . (\$sub->subscriptionPlan->name ?? 'N/A') . PHP_EOL;
    echo '  Starts: ' . \$sub->starts_at . PHP_EOL;
    echo '  Ends: ' . \$sub->ends_at . PHP_EOL;
    echo '  Days Remaining: ' . (\$sub->ends_at ? round((strtotime(\$sub->ends_at) - time()) / 86400, 1) : 'N/A') . PHP_EOL;
    echo '' . PHP_EOL;
}

// Get ACTIVE subscriptions only
\$activeSubs = \App\Models\UserSubscription::with('subscriptionPlan')
    ->where('user_id', \$user->id)
    ->where('status', 'active')
    ->where('ends_at', '>', now())
    ->orderBy('is_trial', 'asc')
    ->orderBy('created_at', 'desc')
    ->get();

echo '✅ ACTIVE SUBSCRIPTIONS (' . \$activeSubs->count() . '):' . PHP_EOL;
echo '─────────────────────────────────────────────────────' . PHP_EOL;
if (\$activeSubs->count() > 0) {
    foreach (\$activeSubs as \$sub) {
        echo 'ID: ' . \$sub->id . PHP_EOL;
        echo '  Code: ' . \$sub->subscription_code . PHP_EOL;
        echo '  Is Trial: ' . (\$sub->is_trial ? 'Yes' : 'No') . PHP_EOL;
        echo '  Plan: ' . (\$sub->subscriptionPlan->name ?? 'N/A') . PHP_EOL;
        echo '  Ends: ' . \$sub->ends_at . PHP_EOL;
        echo '' . PHP_EOL;
    }
    
    // Show which one will be selected
    \$selected = \$activeSubs->first();
    echo '🎯 SELECTED BY API (first in query):' . PHP_EOL;
    echo '  ID: ' . \$selected->id . PHP_EOL;
    echo '  Code: ' . \$selected->subscription_code . PHP_EOL;
    echo '  Is Trial: ' . (\$selected->is_trial ? 'Yes' : 'No') . PHP_EOL;
    echo '  Plan: ' . (\$selected->subscriptionPlan->name ?? 'N/A') . PHP_EOL;
} else {
    echo 'No active subscriptions found' . PHP_EOL;
}

// Get subscriptions with status 'upgraded'
\$upgradedSubs = \App\Models\UserSubscription::with('subscriptionPlan')
    ->where('user_id', \$user->id)
    ->where('status', 'upgraded')
    ->get();

echo '' . PHP_EOL;
echo '🔄 UPGRADED SUBSCRIPTIONS (' . \$upgradedSubs->count() . '):' . PHP_EOL;
echo '─────────────────────────────────────────────────────' . PHP_EOL;
foreach (\$upgradedSubs as \$sub) {
    echo 'ID: ' . \$sub->id . PHP_EOL;
    echo '  Code: ' . \$sub->subscription_code . PHP_EOL;
    echo '  Is Trial: ' . (\$sub->is_trial ? 'Yes' : 'No') . PHP_EOL;
    echo '  Plan: ' . (\$sub->subscriptionPlan->name ?? 'N/A') . PHP_EOL;
    echo '' . PHP_EOL;
}
"

echo ""
echo -e "${GREEN}✅ Check completed!${NC}"
echo ""
