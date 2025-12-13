<?php

/**
 * Script untuk mencari data yang masih reference ke user ID yang tidak ada di tabel users
 * (orphaned references)
 * 
 * Usage: php find_orphaned_references.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🔍 Mencari data yang masih reference ke user ID yang tidak ada...\n";
echo str_repeat("=", 60) . "\n\n";

// Get all existing user IDs
$existingUserIds = DB::table('users')->pluck('id')->toArray();
echo "📋 Total users di database: " . count($existingUserIds) . "\n";
echo "   User IDs: " . implode(', ', array_slice($existingUserIds, 0, 10)) . (count($existingUserIds) > 10 ? '...' : '') . "\n\n";

// Check businesses with owner_id that doesn't exist
echo "🏢 Checking businesses.owner_id...\n";
$orphanedBusinesses = DB::table('businesses')
    ->whereNotNull('owner_id')
    ->whereNotIn('owner_id', $existingUserIds)
    ->get(['id', 'name', 'owner_id', 'status']);

if ($orphanedBusinesses->count() > 0) {
    echo "   ⚠️  Found {$orphanedBusinesses->count()} businesses dengan owner_id yang tidak ada:\n";
    foreach ($orphanedBusinesses as $business) {
        echo "      - Business ID: {$business->id}, Name: {$business->name}, Owner ID: {$business->owner_id} (NOT FOUND)\n";
    }
} else {
    echo "   ✅ Semua businesses.owner_id valid\n";
}
echo "\n";

// Check employees with user_id that doesn't exist
echo "👤 Checking employees.user_id...\n";
$orphanedEmployees = DB::table('employees')
    ->whereNotIn('user_id', $existingUserIds)
    ->get(['id', 'name', 'user_id', 'business_id', 'employee_code']);

if ($orphanedEmployees->count() > 0) {
    echo "   ⚠️  Found {$orphanedEmployees->count()} employees dengan user_id yang tidak ada:\n";
    foreach ($orphanedEmployees as $employee) {
        echo "      - Employee ID: {$employee->id}, Name: {$employee->name}, User ID: {$employee->user_id} (NOT FOUND), Business ID: {$employee->business_id}\n";
    }
} else {
    echo "   ✅ Semua employees.user_id valid\n";
}
echo "\n";

// Check business_users with user_id that doesn't exist
echo "👥 Checking business_users.user_id...\n";
$orphanedBusinessUsers = DB::table('business_users')
    ->whereNotIn('user_id', $existingUserIds)
    ->get(['id', 'business_id', 'user_id', 'role']);

if ($orphanedBusinessUsers->count() > 0) {
    echo "   ⚠️  Found {$orphanedBusinessUsers->count()} business_users dengan user_id yang tidak ada:\n";
    foreach ($orphanedBusinessUsers as $bu) {
        echo "      - Business ID: {$bu->business_id}, User ID: {$bu->user_id} (NOT FOUND), Role: {$bu->role}\n";
    }
} else {
    echo "   ✅ Semua business_users.user_id valid\n";
}
echo "\n";

// Check employee_outlets with user_id that doesn't exist
echo "🏪 Checking employee_outlets.user_id...\n";
$orphanedEmployeeOutlets = DB::table('employee_outlets')
    ->whereNotIn('user_id', $existingUserIds)
    ->get(['id', 'user_id', 'outlet_id', 'business_id']);

if ($orphanedEmployeeOutlets->count() > 0) {
    echo "   ⚠️  Found {$orphanedEmployeeOutlets->count()} employee_outlets dengan user_id yang tidak ada:\n";
    foreach ($orphanedEmployeeOutlets as $eo) {
        echo "      - User ID: {$eo->user_id} (NOT FOUND), Outlet ID: {$eo->outlet_id}, Business ID: {$eo->business_id}\n";
    }
} else {
    echo "   ✅ Semua employee_outlets.user_id valid\n";
}
echo "\n";

// Check orders with employee_id that doesn't exist
echo "📦 Checking orders.employee_id...\n";
$orphanedOrders = DB::table('orders')
    ->whereNotNull('employee_id')
    ->whereNotIn('employee_id', $existingUserIds)
    ->count();

if ($orphanedOrders > 0) {
    echo "   ⚠️  Found {$orphanedOrders} orders dengan employee_id yang tidak ada\n";
    $sampleOrders = DB::table('orders')
        ->whereNotNull('employee_id')
        ->whereNotIn('employee_id', $existingUserIds)
        ->limit(5)
        ->get(['id', 'order_number', 'employee_id', 'business_id']);
    foreach ($sampleOrders as $order) {
        echo "      - Order #{$order->order_number}, Employee ID: {$order->employee_id} (NOT FOUND), Business ID: {$order->business_id}\n";
    }
} else {
    echo "   ✅ Semua orders.employee_id valid\n";
}
echo "\n";

// Check user_subscriptions with user_id that doesn't exist
echo "💳 Checking user_subscriptions.user_id...\n";
$orphanedSubscriptions = DB::table('user_subscriptions')
    ->whereNotIn('user_id', $existingUserIds)
    ->get(['id', 'user_id', 'subscription_plan_id', 'status']);

if ($orphanedSubscriptions->count() > 0) {
    echo "   ⚠️  Found {$orphanedSubscriptions->count()} subscriptions dengan user_id yang tidak ada:\n";
    foreach ($orphanedSubscriptions as $sub) {
        echo "      - Subscription ID: {$sub->id}, User ID: {$sub->user_id} (NOT FOUND), Status: {$sub->status}\n";
    }
} else {
    echo "   ✅ Semua user_subscriptions.user_id valid\n";
}
echo "\n";

// Check cashier_shifts with user_id that doesn't exist
echo "💰 Checking cashier_shifts.user_id...\n";
$orphanedShifts = DB::table('cashier_shifts')
    ->whereNotIn('user_id', $existingUserIds)
    ->count();

if ($orphanedShifts > 0) {
    echo "   ⚠️  Found {$orphanedShifts} shifts dengan user_id yang tidak ada\n";
} else {
    echo "   ✅ Semua cashier_shifts.user_id valid\n";
}
echo "\n";

// Summary
$totalOrphaned = $orphanedBusinesses->count() + $orphanedEmployees->count() + 
                 $orphanedBusinessUsers->count() + $orphanedEmployeeOutlets->count() + 
                 $orphanedOrders + $orphanedSubscriptions->count() + $orphanedShifts;

echo str_repeat("=", 60) . "\n";
echo "📊 SUMMARY:\n";
echo "   Total orphaned references: {$totalOrphaned}\n";
echo "\n";

if ($totalOrphaned > 0) {
    echo "⚠️  Ditemukan data yang masih reference ke user ID yang tidak ada!\n";
    echo "\n";
    echo "💡 SOLUSI:\n";
    echo "   1. Hapus data orphaned tersebut:\n";
    echo "      php cleanup_orphaned_data.php\n";
    echo "\n";
    echo "   2. Atau update ke user ID baru (jika ada):\n";
    echo "      php transfer_orphaned_data.php <old_user_id> <new_user_id>\n";
} else {
    echo "✅ Tidak ada orphaned references ditemukan!\n";
}

