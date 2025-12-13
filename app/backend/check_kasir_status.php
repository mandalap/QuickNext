<?php

/**
 * Script untuk mengecek kondisi kasir dan kenapa transaksi tidak muncul
 *
 * Cara penggunaan:
 * php check_kasir_status.php [user_id atau email]
 *
 * Contoh:
 * php check_kasir_status.php 5
 * php check_kasir_status.php kasir@example.com
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Employee;
use App\Models\CashierShift;
use App\Models\Order;
use App\Models\EmployeeOutlet;
use App\Models\Business;
use Illuminate\Support\Facades\DB;

echo "===========================================\n";
echo "  DIAGNOSTIC TOOL - KASIR STATUS CHECKER  \n";
echo "===========================================\n\n";

// Get user identifier from command line argument
$userIdentifier = $argv[1] ?? null;

if (!$userIdentifier) {
    echo "❌ ERROR: Please provide user ID or email\n";
    echo "Usage: php check_kasir_status.php [user_id or email]\n";
    echo "\nExample:\n";
    echo "  php check_kasir_status.php 5\n";
    echo "  php check_kasir_status.php kasir@example.com\n\n";

    // Show list of kasir users
    echo "Available kasir users:\n";
    echo "=====================\n";
    $kasirs = User::where('role', 'kasir')->get();
    foreach ($kasirs as $kasir) {
        echo "  ID: {$kasir->id} | Email: {$kasir->email} | Name: {$kasir->name}\n";
    }
    exit(1);
}

// Find user
$user = null;
if (is_numeric($userIdentifier)) {
    $user = User::find($userIdentifier);
} else {
    $user = User::where('email', $userIdentifier)->first();
}

if (!$user) {
    echo "❌ ERROR: User not found with identifier: {$userIdentifier}\n";
    exit(1);
}

echo "✅ USER FOUND\n";
echo "================\n";
echo "ID       : {$user->id}\n";
echo "Name     : {$user->name}\n";
echo "Email    : {$user->email}\n";
echo "Role     : {$user->role}\n";
echo "Created  : {$user->created_at}\n\n";

// Check if user is kasir
if (!in_array($user->role, ['kasir', 'admin', 'kitchen', 'waiter'])) {
    echo "⚠️  WARNING: User is not kasir/admin/kitchen/waiter (role: {$user->role})\n";
    echo "This diagnostic is designed for employee roles.\n\n";
}

// Check business relationship
echo "📊 BUSINESS INFORMATION\n";
echo "========================\n";

$businessId = null;
$employee = Employee::where('user_id', $user->id)->first();

if ($employee) {
    echo "✅ Employee Record Found\n";
    echo "   Employee ID  : {$employee->id}\n";
    echo "   Business ID  : {$employee->business_id}\n";
    echo "   Position     : {$employee->position}\n";
    echo "   Status       : {$employee->status}\n";
    $businessId = $employee->business_id;

    $business = Business::find($businessId);
    if ($business) {
        echo "   Business Name: {$business->name}\n";
    }
} else {
    echo "❌ NO Employee Record Found\n";
    echo "   This is likely the main issue!\n";
    echo "   Kasir needs an employee record to see transactions.\n";
}
echo "\n";

// Check active shift
echo "🕐 ACTIVE SHIFT STATUS\n";
echo "======================\n";

$activeShift = CashierShift::where('user_id', $user->id)
    ->where('status', 'open')
    ->first();

if ($activeShift) {
    echo "✅ Active Shift Found\n";
    echo "   Shift ID      : {$activeShift->id}\n";
    echo "   Employee ID   : " . ($activeShift->employee_id ?? 'NULL') . "\n";
    echo "   Outlet ID     : {$activeShift->outlet_id}\n";
    echo "   Business ID   : {$activeShift->business_id}\n";
    echo "   Opening Cash  : Rp " . number_format($activeShift->opening_cash, 0, ',', '.') . "\n";
    echo "   Opened At     : {$activeShift->opened_at}\n";
} else {
    echo "❌ NO Active Shift\n";
    echo "   Kasir has not opened a shift yet.\n";

    // Check if there are any closed shifts
    $lastShift = CashierShift::where('user_id', $user->id)
        ->orderBy('closed_at', 'desc')
        ->first();

    if ($lastShift) {
        echo "   Last shift closed at: {$lastShift->closed_at}\n";
    } else {
        echo "   No previous shifts found.\n";
    }
}
echo "\n";

// Check outlet assignment
echo "🏪 OUTLET ASSIGNMENT\n";
echo "====================\n";

$outletAssignments = EmployeeOutlet::where('user_id', $user->id)->get();

if ($outletAssignments->count() > 0) {
    echo "✅ Outlet Assignments Found: {$outletAssignments->count()}\n";
    foreach ($outletAssignments as $assignment) {
        $outlet = $assignment->outlet;
        echo "   - Outlet ID: {$assignment->outlet_id}";
        if ($outlet) {
            echo " | Name: {$outlet->name}";
        }
        echo " | Primary: " . ($assignment->is_primary ? 'YES' : 'NO') . "\n";
    }

    $primaryOutlet = $outletAssignments->where('is_primary', 1)->first();
    if ($primaryOutlet) {
        echo "\n   Primary Outlet ID: {$primaryOutlet->outlet_id}\n";
    } else {
        echo "\n   ⚠️  No primary outlet set\n";
    }
} else {
    echo "❌ NO Outlet Assignments\n";
    echo "   Kasir is not assigned to any outlet.\n";
}
echo "\n";

// Check orders
echo "📦 ORDERS ANALYSIS\n";
echo "==================\n";

if ($employee) {
    $employeeId = $employee->id;

    // Total orders for this employee
    $totalOrders = Order::where('employee_id', $employeeId)->count();
    echo "Total orders for employee_id {$employeeId}: {$totalOrders}\n";

    if ($totalOrders > 0) {
        // Orders by status
        $ordersByStatus = Order::where('employee_id', $employeeId)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get();

        echo "\nOrders by status:\n";
        foreach ($ordersByStatus as $stat) {
            echo "   {$stat->status}: {$stat->count}\n";
        }

        // Recent orders
        $recentOrders = Order::where('employee_id', $employeeId)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        echo "\nRecent 5 orders:\n";
        foreach ($recentOrders as $order) {
            echo "   #{$order->order_number} | {$order->status} | Rp " . number_format($order->total, 0, ',', '.') . " | {$order->created_at}\n";
        }

        // Orders today
        $ordersToday = Order::where('employee_id', $employeeId)
            ->whereDate('created_at', today())
            ->count();
        echo "\nOrders today: {$ordersToday}\n";

    } else {
        echo "⚠️  No orders found for this employee.\n";
        echo "This means either:\n";
        echo "  1. Kasir hasn't created any orders yet\n";
        echo "  2. Orders were created by different employees\n";
    }
} else {
    echo "❌ Cannot check orders - No employee record\n";
}

// Check orders with null employee_id
$ordersWithoutEmployee = Order::whereNull('employee_id')->count();
echo "\nOrders with NULL employee_id: {$ordersWithoutEmployee}\n";

// Total orders in database
$totalOrdersInDB = Order::count();
echo "Total orders in database: {$totalOrdersInDB}\n";

echo "\n";

// DIAGNOSIS SUMMARY
echo "===========================================\n";
echo "  🔍 DIAGNOSIS SUMMARY\n";
echo "===========================================\n\n";

$issues = [];
$warnings = [];

if (!$employee) {
    $issues[] = "❌ CRITICAL: No employee record found";
    $issues[] = "   Solution: Create employee record for this user";
    $issues[] = "   Command: Create via Employee Management in admin panel";
}

if (!$activeShift && $employee) {
    $warnings[] = "⚠️  WARNING: No active shift";
    $warnings[] = "   Solution: Kasir needs to open a shift first";
    $warnings[] = "   This might be why transactions don't show";
}

if ($outletAssignments->count() === 0) {
    $issues[] = "❌ CRITICAL: No outlet assignment";
    $issues[] = "   Solution: Assign kasir to at least one outlet";
    $issues[] = "   Command: Use Employee Outlet Assignment in admin panel";
}

if ($employee && Order::where('employee_id', $employee->id)->count() === 0) {
    $warnings[] = "⚠️  INFO: No orders created by this employee";
    $warnings[] = "   This is normal if kasir is new or hasn't made orders";
}

if (count($issues) > 0) {
    echo "CRITICAL ISSUES FOUND:\n";
    echo "======================\n";
    foreach ($issues as $issue) {
        echo $issue . "\n";
    }
    echo "\n";
}

if (count($warnings) > 0) {
    echo "WARNINGS:\n";
    echo "=========\n";
    foreach ($warnings as $warning) {
        echo $warning . "\n";
    }
    echo "\n";
}

if (count($issues) === 0 && count($warnings) === 0) {
    echo "✅ No critical issues found!\n";
    echo "   Kasir setup looks good.\n\n";

    if ($employee && Order::where('employee_id', $employee->id)->count() > 0) {
        echo "   If transactions still don't show in frontend:\n";
        echo "   1. Check X-Outlet-Id header is being sent\n";
        echo "   2. Check X-Business-Id header is being sent\n";
        echo "   3. Check browser console for errors\n";
        echo "   4. Call /api/v1/sales/debug endpoint\n";
    }
}

echo "\n===========================================\n";
echo "  END OF DIAGNOSTIC\n";
echo "===========================================\n";
