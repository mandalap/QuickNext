#!/bin/bash

# Script untuk Force Delete Semua Soft-Deleted Users di VPS
# Usage: bash scripts/force-delete-soft-deleted-users-vps.sh [--dry-run]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}⚠️  DRY RUN MODE - No changes will be made${NC}"
fi

PROJECT_DIR="/var/www/kasir-pos"
BACKEND_DIR="$PROJECT_DIR/app/backend"

cd "$BACKEND_DIR" || {
    echo -e "${RED}❌ Error: Backend directory not found${NC}"
    exit 1
}

echo "🔍 Checking for soft-deleted users..."
echo ""

# Check soft-deleted users
php artisan tinker --execute="
\$softDeletedUsers = \App\Models\User::onlyTrashed()->get();
echo 'Soft-deleted users found: ' . \$softDeletedUsers->count() . PHP_EOL;
echo PHP_EOL;

if (\$softDeletedUsers->count() > 0) {
    echo '═══════════════════════════════════════════════════════' . PHP_EOL;
    echo '📋 SOFT-DELETED USERS:' . PHP_EOL;
    echo '═══════════════════════════════════════════════════════' . PHP_EOL;
    foreach (\$softDeletedUsers as \$user) {
        echo 'ID: ' . \$user->id . PHP_EOL;
        echo 'Name: ' . \$user->name . PHP_EOL;
        echo 'Email: ' . \$user->email . PHP_EOL;
        echo 'Google ID: ' . (\$user->google_id ?: 'N/A') . PHP_EOL;
        echo 'Role: ' . \$user->role . PHP_EOL;
        echo 'Deleted At: ' . \$user->deleted_at . PHP_EOL;
        echo '───────────────────────────────────────────────────────' . PHP_EOL;
    }
}
"

echo ""
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}⚠️  DRY RUN - Would force delete all soft-deleted users${NC}"
    echo "Run without --dry-run to actually delete them"
    exit 0
fi

# Confirm deletion
echo -e "${YELLOW}⚠️  WARNING: This will permanently delete all soft-deleted users!${NC}"
echo "This action cannot be undone."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

echo ""
echo "🗑️  Force deleting soft-deleted users..."
echo ""

# Force delete all soft-deleted users
php artisan tinker --execute="
\$softDeletedUsers = \App\Models\User::onlyTrashed()->get();
\$count = \$softDeletedUsers->count();

if (\$count > 0) {
    echo 'Force deleting ' . \$count . ' soft-deleted user(s)...' . PHP_EOL;
    echo PHP_EOL;
    
    foreach (\$softDeletedUsers as \$user) {
        echo 'Deleting user ID: ' . \$user->id . ' (' . \$user->email . ')...' . PHP_EOL;
        \$user->forceDelete();
    }
    
    echo PHP_EOL;
    echo '✅ Successfully force deleted ' . \$count . ' user(s)' . PHP_EOL;
} else {
    echo 'No soft-deleted users found.' . PHP_EOL;
}
"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Force Delete Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
