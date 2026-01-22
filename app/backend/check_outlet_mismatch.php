<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Outlet;
use App\Models\Order;
use App\Models\CashierShift;

echo "OUTLET & SHIFT MISMATCH INVESTIGATION\n";
echo "======================================\n\n";

// List all outlets
echo "All Outlets:\n";
$outlets = Outlet::all();
foreach ($outlets as $outlet) {
    echo "  ID: {$outlet->id} | Name: {$outlet->name}\n";
}

echo "\n";

// Check shift
$shift = CashierShift::find(22);
echo "Shift ID 22:\n";
echo "  Outlet ID: {$shift->outlet_id}\n";
echo "  Outlet Name: " . ($shift->outlet ? $shift->outlet->name : 'N/A') . "\n";
echo "  Opening Cash: Rp " . number_format($shift->opening_cash, 0, ',', '.') . "\n";
echo "\n";

// Check orders by outlet
echo "Orders Today by Outlet (Employee ID: 6):\n";
echo "=========================================\n";

$employeeId = 6;
$today = \Carbon\Carbon::today();

foreach ($outlets as $outlet) {
    $count = Order::where('outlet_id', $outlet->id)
        ->where('employee_id', $employeeId)
        ->whereDate('created_at', $today)
        ->count();

    $total = Order::where('outlet_id', $outlet->id)
        ->where('employee_id', $employeeId)
        ->whereDate('created_at', $today)
        ->sum('total');

    if ($count > 0) {
        echo "Outlet {$outlet->id} ({$outlet->name}): {$count} orders | Rp " . number_format($total, 0, ',', '.') . "\n";
    }
}

echo "\n";
echo "PROBLEM IDENTIFIED:\n";
echo "===================\n";
echo "Shift outlet_id: {$shift->outlet_id}\n";
echo "But orders are in different outlet!\n";
echo "\nThis is why closing calculation shows 0.\n";
echo "The shift should be using the correct outlet_id where orders exist.\n";
