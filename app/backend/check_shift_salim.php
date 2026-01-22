<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CashierShift;
use App\Models\Order;
use Carbon\Carbon;

echo "CHECK SHIFT FOR KASIR SALIM\n";
echo "===========================\n\n";

$userId = 22;
$employeeId = 25;

// Cek all shifts untuk user ini
echo "All Shifts for User 22:\n";
$shifts = CashierShift::where('user_id', $userId)->orderBy('opened_at', 'desc')->get();
echo "Found: {$shifts->count()} shifts\n\n";

foreach ($shifts as $shift) {
    echo "Shift ID: {$shift->id}\n";
    echo "  Status: {$shift->status}\n";
    echo "  Name: " . ($shift->shift_name ?? 'NULL') . "\n";
    echo "  Opened: {$shift->opened_at}\n";
    echo "  Closed: " . ($shift->closed_at ?? 'NULL') . "\n";
    echo "  Outlet: {$shift->outlet_id}\n";
    echo "  Employee: " . ($shift->employee_id ?? 'NULL') . "\n";
    echo "  Opening Balance: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";
    echo "\n";
}

// Cek open shifts di semua user untuk outlet 1
echo "Open Shifts for Outlet 1:\n";
$openShifts = CashierShift::where('outlet_id', 1)
    ->where('status', 'open')
    ->with('user')
    ->get();
echo "Found: {$openShifts->count()} open shifts\n\n";

foreach ($openShifts as $shift) {
    echo "Shift ID: {$shift->id}\n";
    echo "  User: {$shift->user->name} (ID: {$shift->user_id})\n";
    echo "  Status: {$shift->status}\n";
    echo "  Name: " . ($shift->shift_name ?? 'NULL') . "\n";
    echo "  Opened: {$shift->opened_at}\n";
    echo "  Employee: " . ($shift->employee_id ?? 'NULL') . "\n";
    echo "  Opening Balance: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";

    // Count orders
    $orders = Order::where('shift_id', $shift->id)->get();
    echo "  Orders (via shift_id): {$orders->count()}\n";
    echo "\n";
}

// Cek orders hari ini untuk employee 25, outlet 1
echo "Orders Today for Employee 25, Outlet 1:\n";
$ordersToday = Order::where('employee_id', $employeeId)
    ->where('outlet_id', 1)
    ->whereDate('created_at', Carbon::today())
    ->get();

echo "Found: {$ordersToday->count()} orders\n\n";

foreach ($ordersToday as $order) {
    echo "Order #{$order->order_number} (ID: {$order->id})\n";
    echo "  Shift ID: " . ($order->shift_id ?? 'NULL') . "\n";
    echo "  Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
    echo "  Created: {$order->created_at}\n";
    echo "\n";
}
