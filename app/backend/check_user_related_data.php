<?php

/**
 * Script untuk cek data yang masih terkait dengan user ID tertentu
 * 
 * Usage: php check_user_related_data.php <user_id>
 * Example: php check_user_related_data.php 20
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$userId = $argv[1] ?? null;

if (!$userId) {
    echo "❌ Usage: php check_user_related_data.php <user_id>\n";
    echo "Example: php check_user_related_data.php 20\n";
    exit(1);
}

echo "🔍 Checking data related to user ID: {$userId}\n";
echo str_repeat("=", 60) . "\n\n";

// Check user exists
$user = DB::table('users')->where('id', $userId)->first();
if (!$user) {
    echo "❌ User ID {$userId} tidak ditemukan!\n";
    exit(1);
}

echo "📋 User Info:\n";
echo "   ID: {$user->id}\n";
echo "   Name: {$user->name}\n";
echo "   Email: {$user->email}\n";
echo "   Phone: {$user->phone}\n";
echo "   Role: {$user->role}\n";
echo "   Deleted At: " . ($user->deleted_at ?? 'NULL (Active)') . "\n";
echo "\n";

// Check businesses (owner_id)
echo "🏢 Businesses (as owner):\n";
$businesses = DB::table('businesses')->where('owner_id', $userId)->get();
if ($businesses->count() > 0) {
    foreach ($businesses as $business) {
        echo "   - Business ID: {$business->id}, Name: {$business->name}, Status: {$business->status}\n";
    }
} else {
    echo "   ✅ Tidak ada business yang dimiliki\n";
}
echo "\n";

// Check employees
echo "👤 Employees:\n";
$employees = DB::table('employees')->where('user_id', $userId)->get();
if ($employees->count() > 0) {
    foreach ($employees as $employee) {
        echo "   - Employee ID: {$employee->id}, Code: {$employee->employee_code}, Business ID: {$employee->business_id}\n";
    }
} else {
    echo "   ✅ Tidak ada employee record\n";
}
echo "\n";

// Check business_users
echo "👥 Business Users (pivot):\n";
$businessUsers = DB::table('business_users')->where('user_id', $userId)->get();
if ($businessUsers->count() > 0) {
    foreach ($businessUsers as $bu) {
        echo "   - Business ID: {$bu->business_id}, Role: {$bu->role}, Active: " . ($bu->is_active ? 'Yes' : 'No') . "\n";
    }
} else {
    echo "   ✅ Tidak ada business_users record\n";
}
echo "\n";

// Check employee_outlets
echo "🏪 Employee Outlets:\n";
$employeeOutlets = DB::table('employee_outlets')->where('user_id', $userId)->get();
if ($employeeOutlets->count() > 0) {
    foreach ($employeeOutlets as $eo) {
        echo "   - Outlet ID: {$eo->outlet_id}, Business ID: {$eo->business_id}, Primary: " . ($eo->is_primary ? 'Yes' : 'No') . "\n";
    }
} else {
    echo "   ✅ Tidak ada employee_outlets record\n";
}
echo "\n";

// Check orders (employee_id)
echo "📦 Orders (as employee):\n";
$orders = DB::table('orders')->where('employee_id', $userId)->count();
if ($orders > 0) {
    echo "   ⚠️  Found {$orders} orders (showing first 5):\n";
    $sampleOrders = DB::table('orders')->where('employee_id', $userId)->limit(5)->get();
    foreach ($sampleOrders as $order) {
        echo "   - Order ID: {$order->id}, Number: {$order->order_number}, Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
    }
    if ($orders > 5) {
        echo "   ... and " . ($orders - 5) . " more orders\n";
    }
} else {
    echo "   ✅ Tidak ada orders\n";
}
echo "\n";

// Check customers (user_id)
echo "👤 Customers (linked to user):\n";
$customers = DB::table('customers')->where('user_id', $userId)->get();
if ($customers->count() > 0) {
    foreach ($customers as $customer) {
        echo "   - Customer ID: {$customer->id}, Name: {$customer->name}, Business ID: {$customer->business_id}\n";
    }
} else {
    echo "   ✅ Tidak ada customers\n";
}
echo "\n";

// Check user_subscriptions
echo "💳 User Subscriptions:\n";
$subscriptions = DB::table('user_subscriptions')->where('user_id', $userId)->get();
if ($subscriptions->count() > 0) {
    foreach ($subscriptions as $sub) {
        echo "   - Subscription ID: {$sub->id}, Plan: {$sub->subscription_plan_id}, Status: {$sub->status}\n";
    }
} else {
    echo "   ✅ Tidak ada subscriptions\n";
}
echo "\n";

// Check cashier_shifts
echo "💰 Cashier Shifts:\n";
$shifts = DB::table('cashier_shifts')->where('user_id', $userId)->count();
if ($shifts > 0) {
    echo "   ⚠️  Found {$shifts} shifts\n";
} else {
    echo "   ✅ Tidak ada shifts\n";
}
echo "\n";

// Summary
echo str_repeat("=", 60) . "\n";
echo "📊 SUMMARY:\n";
echo "   Businesses: {$businesses->count()}\n";
echo "   Employees: {$employees->count()}\n";
echo "   Business Users: {$businessUsers->count()}\n";
echo "   Employee Outlets: {$employeeOutlets->count()}\n";
echo "   Orders: {$orders}\n";
echo "   Customers: {$customers->count()}\n";
echo "   Subscriptions: {$subscriptions->count()}\n";
echo "   Shifts: {$shifts}\n";
echo "\n";

$totalRelated = $businesses->count() + $employees->count() + $businessUsers->count() + 
                $employeeOutlets->count() + $orders + $customers->count() + 
                $subscriptions->count() + $shifts;

if ($totalRelated > 0) {
    echo "⚠️  WARNING: User masih memiliki {$totalRelated} data terkait!\n";
    echo "\n";
    echo "💡 SOLUSI:\n";
    echo "   1. Hard delete user (akan trigger cascade delete untuk beberapa data):\n";
    echo "      php hard_delete_user.php {$userId}\n";
    echo "\n";
    echo "   2. Atau update data terkait ke user baru (jika ada):\n";
    echo "      php transfer_user_data.php {$userId} <new_user_id>\n";
    echo "\n";
    echo "   3. Atau hapus manual data terkait sebelum hard delete user\n";
} else {
    echo "✅ User tidak memiliki data terkait, aman untuk dihapus\n";
}

