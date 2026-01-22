<?php

/**
 * Script untuk hard delete user dan data terkait
 * 
 * WARNING: Script ini akan menghapus user secara permanen (hard delete)
 * dan akan trigger cascade delete untuk beberapa data terkait.
 * 
 * Usage: php hard_delete_user.php <user_id> [--force]
 * Example: php hard_delete_user.php 20 --force
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$userId = $argv[1] ?? null;
$force = in_array('--force', $argv);

if (!$userId) {
    echo "❌ Usage: php hard_delete_user.php <user_id> [--force]\n";
    echo "Example: php hard_delete_user.php 20 --force\n";
    exit(1);
}

echo "⚠️  HARD DELETE USER\n";
echo str_repeat("=", 60) . "\n\n";

// Check user exists
$user = DB::table('users')->where('id', $userId)->first();
if (!$user) {
    echo "❌ User ID {$userId} tidak ditemukan!\n";
    exit(1);
}

echo "📋 User yang akan dihapus:\n";
echo "   ID: {$user->id}\n";
echo "   Name: {$user->name}\n";
echo "   Email: {$user->email}\n";
echo "   Phone: {$user->phone}\n";
echo "   Role: {$user->role}\n";
echo "\n";

// Check related data first
echo "🔍 Checking related data...\n";
$businesses = DB::table('businesses')->where('owner_id', $userId)->count();
$employees = DB::table('employees')->where('user_id', $userId)->count();
$businessUsers = DB::table('business_users')->where('user_id', $userId)->count();
$employeeOutlets = DB::table('employee_outlets')->where('user_id', $userId)->count();
$orders = DB::table('orders')->where('employee_id', $userId)->count();
$customers = DB::table('customers')->where('user_id', $userId)->count();
$subscriptions = DB::table('user_subscriptions')->where('user_id', $userId)->count();
$shifts = DB::table('cashier_shifts')->where('user_id', $userId)->count();

echo "   Businesses (as owner): {$businesses}\n";
echo "   Employees: {$employees}\n";
echo "   Business Users: {$businessUsers}\n";
echo "   Employee Outlets: {$employeeOutlets}\n";
echo "   Orders: {$orders}\n";
echo "   Customers: {$customers}\n";
echo "   Subscriptions: {$subscriptions}\n";
echo "   Shifts: {$shifts}\n";
echo "\n";

if (!$force) {
    echo "⚠️  WARNING: Hard delete akan menghapus user secara permanen!\n";
    echo "⚠️  Data yang akan terhapus (cascade):\n";
    echo "   - Employees (cascade)\n";
    echo "   - Business Users (cascade)\n";
    echo "   - Employee Outlets (cascade)\n";
    echo "\n";
    echo "⚠️  Data yang akan di-set NULL:\n";
    echo "   - Businesses.owner_id (set null)\n";
    echo "   - Orders.employee_id (set null)\n";
    echo "   - Customers.user_id (set null)\n";
    echo "   - Audit Logs.user_id (set null)\n";
    echo "\n";
    echo "❌ Gunakan flag --force untuk melanjutkan\n";
    exit(1);
}

echo "🗑️  Starting hard delete...\n\n";

DB::beginTransaction();

try {
    // 1. Update businesses.owner_id to NULL (set null constraint)
    if ($businesses > 0) {
        echo "   📝 Updating businesses.owner_id to NULL...\n";
        DB::table('businesses')
            ->where('owner_id', $userId)
            ->update(['owner_id' => null]);
        echo "   ✅ Updated {$businesses} businesses\n";
    }

    // 2. Update orders.employee_id to NULL (set null constraint)
    if ($orders > 0) {
        echo "   📝 Updating orders.employee_id to NULL...\n";
        DB::table('orders')
            ->where('employee_id', $userId)
            ->update(['employee_id' => null]);
        echo "   ✅ Updated {$orders} orders\n";
    }

    // 3. Update customers.user_id to NULL (if exists)
    if ($customers > 0) {
        echo "   📝 Updating customers.user_id to NULL...\n";
        DB::table('customers')
            ->where('user_id', $userId)
            ->update(['user_id' => null]);
        echo "   ✅ Updated {$customers} customers\n";
    }

    // 4. Update audit_logs.user_id to NULL (set null constraint)
    echo "   📝 Updating audit_logs.user_id to NULL...\n";
    $auditLogs = DB::table('audit_logs')
        ->where('user_id', $userId)
        ->update(['user_id' => null]);
    echo "   ✅ Updated audit logs\n";

    // 5. Delete employees (cascade)
    if ($employees > 0) {
        echo "   🗑️  Deleting employees (cascade)...\n";
        DB::table('employees')->where('user_id', $userId)->delete();
        echo "   ✅ Deleted {$employees} employees\n";
    }

    // 6. Delete business_users (cascade)
    if ($businessUsers > 0) {
        echo "   🗑️  Deleting business_users (cascade)...\n";
        DB::table('business_users')->where('user_id', $userId)->delete();
        echo "   ✅ Deleted {$businessUsers} business_users\n";
    }

    // 7. Delete employee_outlets (cascade)
    if ($employeeOutlets > 0) {
        echo "   🗑️  Deleting employee_outlets (cascade)...\n";
        DB::table('employee_outlets')->where('user_id', $userId)->delete();
        echo "   ✅ Deleted {$employeeOutlets} employee_outlets\n";
    }

    // 8. Delete cashier_shifts
    if ($shifts > 0) {
        echo "   🗑️  Deleting cashier_shifts...\n";
        DB::table('cashier_shifts')->where('user_id', $userId)->delete();
        echo "   ✅ Deleted {$shifts} shifts\n";
    }

    // 9. Delete user_subscriptions
    if ($subscriptions > 0) {
        echo "   🗑️  Deleting user_subscriptions...\n";
        DB::table('user_subscriptions')->where('user_id', $userId)->delete();
        echo "   ✅ Deleted {$subscriptions} subscriptions\n";
    }

    // 10. Hard delete user (this will also delete soft deleted user)
    echo "   🗑️  Hard deleting user...\n";
    DB::table('users')->where('id', $userId)->delete();
    echo "   ✅ User deleted\n";

    DB::commit();

    echo "\n";
    echo "✅ SUCCESS: User ID {$userId} berhasil dihapus secara permanen!\n";
    echo "\n";
    echo "📋 Data yang telah dihapus/diupdate:\n";
    echo "   - User: DELETED\n";
    echo "   - Businesses.owner_id: SET NULL ({$businesses} records)\n";
    echo "   - Orders.employee_id: SET NULL ({$orders} records)\n";
    echo "   - Employees: DELETED ({$employees} records)\n";
    echo "   - Business Users: DELETED ({$businessUsers} records)\n";
    echo "   - Employee Outlets: DELETED ({$employeeOutlets} records)\n";
    echo "   - Cashier Shifts: DELETED ({$shifts} records)\n";
    echo "   - Subscriptions: DELETED ({$subscriptions} records)\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "\n";
    echo "❌ ERROR: Gagal menghapus user!\n";
    echo "   Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    exit(1);
}

