<?php

/**
 * Script to create sample outlets for testing
 * Run this script to ensure there are outlets available for the self-service modal
 */

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\Business;
use App\Models\Outlet;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Creating sample outlets...\n";

try {
    // Get or create a business
    $business = Business::first();

    if (!$business) {
        echo "No business found. Creating a test business...\n";
        $business = Business::create([
            'name' => 'Test Business',
            'address' => 'Test Address',
            'phone' => '081234567890',
            'email' => 'test@business.com',
            'owner_id' => 1, // Assuming user with ID 1 exists
        ]);
        echo "Created business: {$business->name}\n";
    }

    // Check if outlets already exist
    $existingOutlets = Outlet::where('business_id', $business->id)->count();

    if ($existingOutlets > 0) {
        echo "Outlets already exist for business: {$business->name}\n";
        echo "Existing outlets:\n";
        $outlets = Outlet::where('business_id', $business->id)->get();
        foreach ($outlets as $outlet) {
            echo "- {$outlet->name} (ID: {$outlet->id})\n";
        }
    } else {
        echo "Creating outlets for business: {$business->name}\n";

        // Create sample outlets
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
            [
                'name' => 'Outlet Cabang 2',
                'code' => 'OUT-003',
                'address' => 'Jl. Gatot Subroto No. 789, Jakarta Barat',
                'phone' => '021-3456789',
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
            echo "Created outlet: {$outlet->name} (ID: {$outlet->id})\n";
        }
    }

    echo "\n✅ Sample outlets created successfully!\n";
    echo "You can now test the self-service table creation modal.\n";

} catch (Exception $e) {
    echo "❌ Error creating outlets: " . $e->getMessage() . "\n";
    echo "Make sure the database is set up and migrations are run.\n";
}













































































