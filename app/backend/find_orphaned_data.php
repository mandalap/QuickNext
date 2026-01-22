<?php

/**
 * Script untuk mencari data yang masih reference ke user ID yang sudah dihapus
 * 
 * Usage: php find_orphaned_data.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🔍 Mencari data yang masih reference ke user yang sudah dihapus...\n";
echo str_repeat("=", 60) . "\n\n";

// Get all deleted users
$deletedUsers = DB::table('users')
    ->whereNotNull('deleted_at')
    ->get(['id', 'name', 'email', 'phone', 'deleted_at']);

if ($deletedUsers->count() === 0) {
    echo "✅ Tidak ada user yang dihapus (soft delete)\n";
    exit(0);
}

echo "📋 Deleted Users (Soft Delete):\n";
foreach ($deletedUsers as $user) {
    echo "   - ID: {$user->id}, Email: {$user->email}, Phone: {$user->phone}, Deleted: {$user->deleted_at}\n";
}
echo "\n";

// Check for each deleted user
foreach ($deletedUsers as $user) {
    $userId = $user->id;
    echo str_repeat("-", 60) . "\n";
    echo "🔍 Checking data for deleted user ID: {$userId} ({$user->email})\n";
    echo str_repeat("-", 60) . "\n";

    // Check businesses
    $businesses = DB::table('businesses')->where('owner_id', $userId)->get();
    if ($businesses->count() > 0) {
        echo "⚠️  Businesses (owner_id = {$userId}):\n";
        foreach ($businesses as $business) {
            echo "   - Business ID: {$business->id}, Name: {$business->name}\n";
        }
    }

    // Check employees
    $employees = DB::table('employees')->where('user_id', $userId)->get();
    if ($employees->count() > 0) {
        echo "⚠️  Employees (user_id = {$userId}):\n";
        foreach ($employees as $employee) {
            echo "   - Employee ID: {$employee->id}, Code: {$employee->employee_code}, Business ID: {$employee->business_id}\n";
        }
    }

    // Check business_users
    $businessUsers = DB::table('business_users')->where('user_id', $userId)->get();
    if ($businessUsers->count() > 0) {
        echo "⚠️  Business Users (user_id = {$userId}):\n";
        foreach ($businessUsers as $bu) {
            echo "   - Business ID: {$bu->business_id}, Role: {$bu->role}\n";
        }
    }

    // Check employee_outlets
    $employeeOutlets = DB::table('employee_outlets')->where('user_id', $userId)->get();
    if ($employeeOutlets->count() > 0) {
        echo "⚠️  Employee Outlets (user_id = {$userId}):\n";
        foreach ($employeeOutlets as $eo) {
            echo "   - Outlet ID: {$eo->outlet_id}, Business ID: {$eo->business_id}\n";
        }
    }

    // Check orders
    $orders = DB::table('orders')->where('employee_id', $userId)->count();
    if ($orders > 0) {
        echo "⚠️  Orders (employee_id = {$userId}): {$orders} orders\n";
    }

    // Check customers
    $customers = DB::table('customers')->where('user_id', $userId)->get();
    if ($customers->count() > 0) {
        echo "⚠️  Customers (user_id = {$userId}):\n";
        foreach ($customers as $customer) {
            echo "   - Customer ID: {$customer->id}, Name: {$customer->name}\n";
        }
    }

    // Check subscriptions
    $subscriptions = DB::table('user_subscriptions')->where('user_id', $userId)->get();
    if ($subscriptions->count() > 0) {
        echo "⚠️  Subscriptions (user_id = {$userId}):\n";
        foreach ($subscriptions as $sub) {
            echo "   - Subscription ID: {$sub->id}, Status: {$sub->status}\n";
        }
    }

    echo "\n";
}

echo str_repeat("=", 60) . "\n";
echo "💡 SOLUSI:\n";
echo "   1. Hard delete user yang sudah dihapus untuk trigger cascade:\n";
echo "      php hard_delete_user.php <user_id> --force\n";
echo "\n";
echo "   2. Atau update data terkait ke user baru (jika ada):\n";
echo "      php transfer_user_data.php <old_user_id> <new_user_id>\n";

