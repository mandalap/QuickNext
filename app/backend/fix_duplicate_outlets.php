<?php

/**
 * Script to fix duplicate Main Outlets for businesses
 * 
 * This script will:
 * 1. Find businesses with duplicate "Main Outlet" outlets
 * 2. Keep the first one and delete the rest
 * 3. Log the changes
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Business;
use App\Models\Outlet;
use Illuminate\Support\Facades\DB;

echo "🔍 Checking for duplicate Main Outlets...\n\n";

// Find all businesses
$businesses = Business::with('outlets')->get();

$fixedCount = 0;
$deletedCount = 0;

foreach ($businesses as $business) {
    // Find all "Main Outlet" outlets for this business
    $mainOutlets = $business->outlets()
        ->where('name', 'like', '%Main Outlet%')
        ->orderBy('created_at', 'asc')
        ->get();
    
    if ($mainOutlets->count() > 1) {
        echo "⚠️  Business '{$business->name}' (ID: {$business->id}) has {$mainOutlets->count()} Main Outlets\n";
        $ownerEmail = $business->owner ? $business->owner->email : 'N/A';
        echo "   Owner: {$ownerEmail}\n";
        
        // Keep the first one (oldest)
        $keepOutlet = $mainOutlets->first();
        $duplicates = $mainOutlets->skip(1);
        
        echo "   ✅ Keeping: {$keepOutlet->name} (ID: {$keepOutlet->id}, Code: {$keepOutlet->code})\n";
        
        // Delete duplicates
        foreach ($duplicates as $duplicate) {
            echo "   ❌ Deleting: {$duplicate->name} (ID: {$duplicate->id}, Code: {$duplicate->code})\n";
            
            // Check if outlet has any orders (only check orders table)
            try {
                $hasOrders = DB::table('orders')->where('outlet_id', $duplicate->id)->exists();
                
                if ($hasOrders) {
                    echo "   ⚠️  WARNING: Outlet has orders. Consider transferring data first!\n";
                    echo "   ⏭️  Skipping deletion for safety.\n";
                    continue;
                }
            } catch (\Exception $e) {
                // Table might not exist, continue with deletion
                echo "   ℹ️  Could not check orders (table might not exist), proceeding with deletion...\n";
            }
            
            $duplicate->delete();
            $deletedCount++;
        }
        
        $fixedCount++;
        echo "\n";
    }
}

echo "\n";
echo "✅ Summary:\n";
echo "   - Businesses fixed: {$fixedCount}\n";
echo "   - Duplicate outlets deleted: {$deletedCount}\n";
echo "\n";
echo "🎉 Done!\n";

