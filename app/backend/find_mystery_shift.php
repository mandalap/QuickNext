<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CashierShift;
use App\Models\Order;

echo "FIND MYSTERY SHIFT FOR SALIM\n";
echo "============================\n\n";

// Cari shifts dengan nama "Shift Baru" atau opening_balance = 0
echo "1. Shifts dengan nama 'Shift Baru':\n";
$shiftsBaru = CashierShift::where('shift_name', 'like', '%Shift Baru%')
    ->where('status', 'open')
    ->with('user')
    ->get();

echo "Found: {$shiftsBaru->count()} shifts\n\n";

foreach ($shiftsBaru as $shift) {
    echo "Shift ID: {$shift->id}\n";
    echo "  User: {$shift->user->name} (ID: {$shift->user_id})\n";
    echo "  Employee ID: " . ($shift->employee_id ?? 'NULL') . "\n";
    echo "  Outlet: {$shift->outlet_id}\n";
    echo "  Opening Balance: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";
    echo "  Opened: {$shift->opened_at}\n";

    // Count orders dengan shift_id
    $ordersWithShiftId = Order::where('shift_id', $shift->id)->count();
    echo "  Orders (via shift_id): {$ordersWithShiftId}\n";

    // Recalculate to see what it shows
    $shift->calculateExpectedTotals();
    echo "  Total Transactions: {$shift->total_transactions}\n";
    echo "  Expected Cash: Rp " . number_format($shift->expected_cash, 0, ',', '.') . "\n";
    echo "  Expected Total: Rp " . number_format($shift->expected_total, 0, ',', '.') . "\n";
    echo "\n";
}

// Cari shifts dengan opening_balance = 0 di outlet 1
echo "2. Shifts dengan opening_balance = 0 (Outlet 1):\n";
$shiftsZero = CashierShift::where('outlet_id', 1)
    ->where('opening_balance', 0)
    ->where('status', 'open')
    ->with('user')
    ->get();

echo "Found: {$shiftsZero->count()} shifts\n\n";

foreach ($shiftsZero as $shift) {
    echo "Shift ID: {$shift->id}\n";
    echo "  Name: {$shift->shift_name}\n";
    echo "  User: {$shift->user->name} (ID: {$shift->user_id})\n";
    echo "  Employee ID: " . ($shift->employee_id ?? 'NULL') . "\n";
    echo "  Outlet: {$shift->outlet_id}\n";
    echo "  Opened: {$shift->opened_at}\n";

    $ordersWithShiftId = Order::where('shift_id', $shift->id)->count();
    echo "  Orders (via shift_id): {$ordersWithShiftId}\n";

    $shift->calculateExpectedTotals();
    echo "  Total Transactions: {$shift->total_transactions}\n";
    echo "  Expected Cash: Rp " . number_format($shift->expected_cash, 0, ',', '.') . "\n";
    echo "\n";
}

// Cari shift yang punya exactly 2 orders
echo "3. Shifts dengan exactly 2 transactions:\n";
$allOpenShifts = CashierShift::where('outlet_id', 1)
    ->where('status', 'open')
    ->with('user')
    ->get();

foreach ($allOpenShifts as $shift) {
    $ordersCount = Order::where('shift_id', $shift->id)->count();

    if ($ordersCount == 2) {
        echo "Shift ID: {$shift->id}\n";
        echo "  Name: {$shift->shift_name}\n";
        echo "  User: {$shift->user->name} (ID: {$shift->user_id})\n";
        echo "  Employee ID: " . ($shift->employee_id ?? 'NULL') . "\n";
        echo "  Opening Balance: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";
        echo "  Orders: {$ordersCount}\n";

        // Show order details
        $orders = Order::where('shift_id', $shift->id)->get();
        foreach ($orders as $order) {
            echo "    - Order #{$order->order_number}: Rp " . number_format($order->total, 0, ',', '.') . "\n";
        }

        $shift->calculateExpectedTotals();
        echo "  Expected Cash: Rp " . number_format($shift->expected_cash, 0, ',', '.') . "\n";
        echo "\n";
    }
}

// Check employee 25's orders yang shift_id NULL
echo "4. Employee 25's orders dengan shift_id NULL (today):\n";
$ordersNull = Order::where('employee_id', 25)
    ->where('outlet_id', 1)
    ->whereDate('created_at', '2025-10-22')
    ->whereNull('shift_id')
    ->get();

echo "Found: {$ordersNull->count()} orders\n";
foreach ($ordersNull as $order) {
    echo "  Order #{$order->order_number} (ID: {$order->id}): Rp " . number_format($order->total, 0, ',', '.') . "\n";
}
echo "\n";
