<?php

/**
 * Script to check outlet business assignments
 * 
 * This script checks which outlets belong to which business
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Business;
use App\Models\Outlet;

echo "🔍 Checking Outlet Business Assignments...\n\n";

// Find user jowincoffee@gmail.com
$user = User::where('email', 'jowincoffee@gmail.com')->first();

if (!$user) {
    echo "❌ User jowincoffee@gmail.com not found\n";
    exit(1);
}

echo "👤 User: {$user->name} ({$user->email})\n";
echo "   Role: {$user->role}\n";
echo "   ID: {$user->id}\n\n";

// Find user's businesses
$businesses = Business::where('owner_id', $user->id)->get();

if ($businesses->isEmpty()) {
    echo "⚠️  User has no businesses\n\n";
} else {
    echo "📊 User's Businesses:\n";
    foreach ($businesses as $business) {
        echo "   - {$business->name} (ID: {$business->id})\n";
        
        // Get outlets for this business
        $outlets = Outlet::where('business_id', $business->id)->get();
        
        echo "     Outlets ({$outlets->count()}):\n";
        foreach ($outlets as $outlet) {
            echo "       • {$outlet->name} (ID: {$outlet->id}, Code: {$outlet->code})\n";
        }
        echo "\n";
    }
}

// Check all outlets in database
echo "\n📋 All Outlets in Database:\n";
$allOutlets = Outlet::with('business')->orderBy('business_id')->get();

$outletsByBusiness = [];
foreach ($allOutlets as $outlet) {
    $businessId = $outlet->business_id;
    if (!isset($outletsByBusiness[$businessId])) {
        $business = $outlet->business;
        $owner = $business ? User::find($business->owner_id) : null;
        $outletsByBusiness[$businessId] = [
            'business' => $business ? $business->name : "Business ID {$businessId} (not found)",
            'owner' => $owner ? "{$owner->name} ({$owner->email})" : "Unknown",
            'outlets' => []
        ];
    }
    $outletsByBusiness[$businessId]['outlets'][] = $outlet;
}

foreach ($outletsByBusiness as $businessId => $data) {
    $outletCount = count($data['outlets']);
    echo "\n   Business: {$data['business']} (ID: {$businessId})\n";
    echo "   Owner: {$data['owner']}\n";
    echo "   Outlets ({$outletCount}):\n";
    foreach ($data['outlets'] as $outlet) {
        echo "     • {$outlet->name} (ID: {$outlet->id}, Code: {$outlet->code})\n";
    }
}

echo "\n✅ Check complete!\n";

