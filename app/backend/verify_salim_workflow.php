<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Order;
use App\Models\User;
use App\Models\Employee;
use App\Models\CashierShift;

echo "VERIFY KASIR SALIM WORKFLOW\n";
echo "============================\n\n";

$user = User::where('email', 'kasirsalim@gmail.com')->first();
if (!$user) {
    echo "❌ User kasirsalim@gmail.com not found!\n";
    exit;
}

echo "✅ User found: {$user->name} (ID: {$user->id})\n";
echo "   Role: {$user->role}\n\n";

$employee = Employee::where('user_id', $user->id)->first();
if ($employee) {
    echo "✅ Employee record: ID {$employee->id}\n";
    echo "   Business ID: {$employee->business_id}\n";
    echo "   Outlet ID: " . ($employee->outlet_id ?? 'NULL') . "\n\n";
} else {
    echo "❌ No employee record found\n\n";
}

// Check shifts for this user
$shifts = CashierShift::where('user_id', $user->id)->get();
echo "Shifts for this user: {$shifts->count()}\n";
if ($shifts->count() > 0) {
    foreach ($shifts as $shift) {
        echo "  - Shift ID {$shift->id}: {$shift->shift_name} ({$shift->status})\n";
    }
} else {
    echo "  ❌ NO SHIFTS FOUND - User has never opened a shift!\n";
}
echo "\n";

// Check orders for today
$orders = Order::where('employee_id', $employee?->id)
    ->whereDate('created_at', '2025-10-22')
    ->get();

echo "Orders today (2025-10-22) for employee {$employee?->id}: {$orders->count()}\n";
foreach ($orders as $order) {
    echo "  Order #{$order->order_number} (ID: {$order->id})\n";
    echo "    shift_id: " . ($order->shift_id ?? 'NULL') . "\n";
    echo "    Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
    echo "    Created: {$order->created_at}\n";
}
echo "\n";

echo "CONCLUSION:\n";
echo "===========\n";
if ($shifts->count() == 0 && $orders->count() > 0) {
    echo "⚠️  WORKFLOW ISSUE DETECTED:\n";
    echo "   - Kasir created {$orders->count()} orders WITHOUT opening a shift first\n";
    echo "   - All orders have shift_id = NULL\n";
    echo "   - To close shift properly, kasir must first OPEN a shift\n";
    echo "   - Then the system can associate orders with the shift\n\n";
    echo "RECOMMENDATION:\n";
    echo "1. Kasir Salim should OPEN A SHIFT first (modal awal Rp 200.000)\n";
    echo "2. Make new transactions - they will be linked to the shift\n";
    echo "3. Then CLOSE the shift to see proper calculations\n\n";
    echo "NOTE: The 4 existing orders (shift_id NULL) cannot be retroactively\n";
    echo "      assigned to a new shift. They are orphaned transactions.\n";
} else if ($shifts->count() > 0) {
    $activeShift = $shifts->where('status', 'open')->first();
    if ($activeShift) {
        echo "✅ Kasir has an active shift (ID: {$activeShift->id})\n";
        echo "   Can proceed to close shift normally\n";
    } else {
        echo "⚠️  All shifts are closed\n";
        echo "   Kasir needs to open a new shift to continue\n";
    }
}
