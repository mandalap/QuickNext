#!/bin/bash

# Script untuk Reset Users di VPS (Hapus semua user kecuali admin Filament)
# Usage: bash scripts/reset-users-vps.sh

set -e

echo "⚠️  WARNING: This will delete ALL users except Filament admin!"
echo "⚠️  This will also delete ALL subscriptions, businesses, and related data!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Cancelled."
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/var/www/kasir-pos"
BACKEND_DIR="$PROJECT_DIR/app/backend"

cd "$BACKEND_DIR" || {
    echo -e "${RED}❌ Error: Backend directory not found${NC}"
    exit 1
}

echo -e "${YELLOW}Step 1: Checking Filament admin...${NC}"

# Check if Filament admin exists
ADMIN_EXISTS=$(php artisan tinker --execute="
\$admin = \App\Models\User::where('email', 'admin@filament.com')->first();
echo \$admin ? 'EXISTS' : 'NOT_FOUND';
")

if [ "$ADMIN_EXISTS" != "EXISTS" ]; then
    echo -e "${RED}❌ Filament admin not found! Creating admin first...${NC}"
    php artisan filament:user --email=admin@filament.com --name=Admin --password=admin123
    echo -e "${GREEN}✅ Filament admin created${NC}"
else
    echo -e "${GREEN}✅ Filament admin exists${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Getting user count...${NC}"

TOTAL_USERS=$(php artisan tinker --execute="
echo \App\Models\User::where('email', '!=', 'admin@filament.com')->count();
")

echo "Total users to delete: $TOTAL_USERS"
echo ""

if [ "$TOTAL_USERS" -eq 0 ]; then
    echo -e "${GREEN}✅ No users to delete${NC}"
    exit 0
fi

echo -e "${YELLOW}Step 3: Deleting users and related data...${NC}"

php artisan tinker --execute="
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

DB::beginTransaction();

try {
    // Get all users except Filament admin
    \$users = User::where('email', '!=', 'admin@filament.com')->get();
    \$deletedCount = 0;
    \$subscriptionCount = 0;
    \$businessCount = 0;
    
    foreach (\$users as \$user) {
        // Delete subscriptions
        \$subs = UserSubscription::where('user_id', \$user->id)->get();
        \$subscriptionCount += \$subs->count();
        foreach (\$subs as \$sub) {
            \$sub->delete();
        }
        
        // Delete businesses owned by user
        \$businesses = Business::where('owner_id', \$user->id)->get();
        \$businessCount += \$businesses->count();
        foreach (\$businesses as \$business) {
            // Delete employees
            Employee::where('business_id', \$business->id)->delete();
            \$business->delete();
        }
        
        // Delete employees assigned to user
        Employee::where('user_id', \$user->id)->delete();
        
        // Delete user
        \$user->delete();
        \$deletedCount++;
    }
    
    DB::commit();
    
    echo 'Deleted users: ' . \$deletedCount . PHP_EOL;
    echo 'Deleted subscriptions: ' . \$subscriptionCount . PHP_EOL;
    echo 'Deleted businesses: ' . \$businessCount . PHP_EOL;
} catch (\Exception \$e) {
    DB::rollBack();
    echo 'Error: ' . \$e->getMessage() . PHP_EOL;
    exit(1);
}
"

echo ""
echo -e "${YELLOW}Step 4: Clearing cache...${NC}"
php artisan config:clear
php artisan route:clear
php artisan cache:clear
redis-cli FLUSHDB 2>/dev/null || echo "Redis not available or not configured"
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

echo -e "${YELLOW}Step 5: Re-caching...${NC}"
php artisan config:cache
php artisan route:cache
echo -e "${GREEN}✅ Re-cached${NC}"
echo ""

echo -e "${YELLOW}Step 6: Restarting services...${NC}"
pm2 restart quickkasir-api || echo "PM2 restart failed"
sudo systemctl reload nginx || echo "Nginx reload failed"
echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Reset Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Remaining users:"
php artisan tinker --execute="
\$users = \App\Models\User::all();
foreach (\$users as \$user) {
    echo '  - ' . \$user->email . ' (ID: ' . \$user->id . ', Role: ' . \$user->role . ')' . PHP_EOL;
}
"
echo ""
echo "Next steps:"
echo "  1. Login dengan admin@filament.com / admin123"
echo "  2. Create new user untuk testing"
echo "  3. Test subscription flow dari awal"
echo ""
