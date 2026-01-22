<?php

/**
 * Script untuk mencari semua data terkait dengan email tertentu
 * 
 * Usage: php find_data_by_email.php <email>
 * Example: php find_data_by_email.php juli23man@gmail.com
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$email = $argv[1] ?? null;

if (!$email) {
    echo "❌ Usage: php find_data_by_email.php <email>\n";
    echo "Example: php find_data_by_email.php juli23man@gmail.com\n";
    exit(1);
}

echo "🔍 Mencari semua data terkait dengan email: {$email}\n";
echo str_repeat("=", 60) . "\n\n";

// Find all users with this email (including soft deleted)
$users = DB::table('users')
    ->where('email', $email)
    ->get();

echo "👤 Users dengan email ini:\n";
if ($users->count() === 0) {
    echo "   ❌ Tidak ada user dengan email ini\n";
    exit(1);
}

foreach ($users as $user) {
    $status = $user->deleted_at ? "DELETED (soft delete)" : "ACTIVE";
    echo "   - ID: {$user->id}, Name: {$user->name}, Phone: {$user->phone}, Status: {$status}\n";
    if ($user->deleted_at) {
        echo "     Deleted At: {$user->deleted_at}\n";
    }
}
echo "\n";

// Check for each user
foreach ($users as $user) {
    $userId = $user->id;
    $status = $user->deleted_at ? "DELETED" : "ACTIVE";
    
    echo str_repeat("-", 60) . "\n";
    echo "🔍 Data untuk User ID: {$userId} (Status: {$status})\n";
    echo str_repeat("-", 60) . "\n";

    // Check businesses
    $businesses = DB::table('businesses')->where('owner_id', $userId)->get();
    if ($businesses->count() > 0) {
        echo "🏢 Businesses (owner_id = {$userId}):\n";
        foreach ($businesses as $business) {
            echo "   - Business ID: {$business->id}, Name: {$business->name}, Status: {$business->status}\n";
        }
    } else {
        echo "   ✅ Tidak ada business\n";
    }

    // Check employees
    $employees = DB::table('employees')->where('user_id', $userId)->get();
    if ($employees->count() > 0) {
        echo "👤 Employees (user_id = {$userId}):\n";
        foreach ($employees as $employee) {
            echo "   - Employee ID: {$employee->id}, Code: {$employee->employee_code}, Business ID: {$employee->business_id}\n";
        }
    } else {
        echo "   ✅ Tidak ada employee\n";
    }

    // Check business_users
    $businessUsers = DB::table('business_users')->where('user_id', $userId)->get();
    if ($businessUsers->count() > 0) {
        echo "👥 Business Users (user_id = {$userId}):\n";
        foreach ($businessUsers as $bu) {
            echo "   - Business ID: {$bu->business_id}, Role: {$bu->role}, Active: " . ($bu->is_active ? 'Yes' : 'No') . "\n";
        }
    } else {
        echo "   ✅ Tidak ada business_users\n";
    }

    // Check employee_outlets
    $employeeOutlets = DB::table('employee_outlets')->where('user_id', $userId)->get();
    if ($employeeOutlets->count() > 0) {
        echo "🏪 Employee Outlets (user_id = {$userId}):\n";
        foreach ($employeeOutlets as $eo) {
            echo "   - Outlet ID: {$eo->outlet_id}, Business ID: {$eo->business_id}\n";
        }
    } else {
        echo "   ✅ Tidak ada employee_outlets\n";
    }

    // Check orders
    $orders = DB::table('orders')->where('employee_id', $userId)->count();
    if ($orders > 0) {
        echo "📦 Orders (employee_id = {$userId}): {$orders} orders\n";
        $sampleOrders = DB::table('orders')->where('employee_id', $userId)->limit(3)->get(['id', 'order_number', 'total', 'created_at']);
        foreach ($sampleOrders as $order) {
            echo "   - Order #{$order->order_number}, Total: Rp " . number_format($order->total, 0, ',', '.') . ", Date: {$order->created_at}\n";
        }
    } else {
        echo "   ✅ Tidak ada orders\n";
    }

    // Check subscriptions
    $subscriptions = DB::table('user_subscriptions')->where('user_id', $userId)->get();
    if ($subscriptions->count() > 0) {
        echo "💳 Subscriptions (user_id = {$userId}):\n";
        foreach ($subscriptions as $sub) {
            echo "   - Subscription ID: {$sub->id}, Status: {$sub->status}, Plan: {$sub->subscription_plan_id}\n";
        }
    } else {
        echo "   ✅ Tidak ada subscriptions\n";
    }

    // Check cashier_shifts
    $shifts = DB::table('cashier_shifts')->where('user_id', $userId)->count();
    if ($shifts > 0) {
        echo "💰 Cashier Shifts (user_id = {$userId}): {$shifts} shifts\n";
    } else {
        echo "   ✅ Tidak ada shifts\n";
    }

    echo "\n";
}

echo str_repeat("=", 60) . "\n";
echo "💡 KESIMPULAN:\n";
echo "   Jika ada data yang masih reference ke user ID lama (yang sudah dihapus),\n";
echo "   data tersebut perlu dihapus atau di-update.\n";
echo "\n";
echo "   Untuk hard delete user lama:\n";
echo "   php hard_delete_user.php <old_user_id> --force\n";

