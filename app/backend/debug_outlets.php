<?php

/**
 * Debug script to check outlets and business data
 */

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\Business;
use App\Models\Outlet;
use App\Models\User;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 DEBUGGING OUTLETS AND BUSINESS DATA\n";
echo "=====================================\n\n";

try {
    // Check businesses
    echo "📊 BUSINESSES:\n";
    $businesses = Business::all();
    if ($businesses->count() > 0) {
        foreach ($businesses as $business) {
            echo "- ID: {$business->id}, Name: {$business->name}, Owner ID: {$business->owner_id}\n";
        }
    } else {
        echo "❌ No businesses found\n";
    }
    echo "\n";

    // Check outlets
    echo "🏪 OUTLETS:\n";
    $outlets = Outlet::all();
    if ($outlets->count() > 0) {
        foreach ($outlets as $outlet) {
            echo "- ID: {$outlet->id}, Name: {$outlet->name}, Business ID: {$outlet->business_id}, Active: " . ($outlet->is_active ? 'Yes' : 'No') . "\n";
        }
    } else {
        echo "❌ No outlets found\n";
    }
    echo "\n";

    // Check users
    echo "👤 USERS:\n";
    $users = User::all();
    if ($users->count() > 0) {
        foreach ($users as $user) {
            echo "- ID: {$user->id}, Name: {$user->name}, Email: {$user->email}, Role: {$user->role}\n";
        }
    } else {
        echo "❌ No users found\n";
    }
    echo "\n";

    // Check if we need to create sample data
    if ($businesses->count() === 0) {
        echo "🔧 Creating sample business...\n";
        $business = Business::create([
            'name' => 'Test Business',
            'address' => 'Test Address',
            'phone' => '081234567890',
            'email' => 'test@business.com',
            'owner_id' => 1,
        ]);
        echo "✅ Created business: {$business->name} (ID: {$business->id})\n\n";
    }

    if ($outlets->count() === 0) {
        echo "🔧 Creating sample outlets...\n";
        $business = Business::first();
        if ($business) {
            $outlets = [
                [
                    'name' => 'Outlet Pusat',
                    'code' => 'OUT-001',
                    'address' => 'Jl. Sudirman No. 123, Jakarta Pusat',
                    'phone' => '021-1234567',
                    'is_active' => true,
                ],
                [
                    'name' => 'Outlet Cabang 1',
                    'code' => 'OUT-002',
                    'address' => 'Jl. Thamrin No. 456, Jakarta Selatan',
                    'phone' => '021-2345678',
                    'is_active' => true,
                ],
            ];

            foreach ($outlets as $outletData) {
                $outlet = Outlet::create([
                    'business_id' => $business->id,
                    'name' => $outletData['name'],
                    'code' => $outletData['code'],
                    'address' => $outletData['address'],
                    'phone' => $outletData['phone'],
                    'is_active' => $outletData['is_active'],
                ]);
                echo "✅ Created outlet: {$outlet->name} (ID: {$outlet->id})\n";
            }
        } else {
            echo "❌ No business found to create outlets\n";
        }
    }

    echo "\n✅ Debug completed!\n";
    echo "\nTo test the frontend:\n";
    echo "1. Make sure you're logged in\n";
    echo "2. Select a business\n";
    echo "3. Check the console for debug messages\n";
    echo "4. Click 'Debug Outlets' button if available\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}




















































































