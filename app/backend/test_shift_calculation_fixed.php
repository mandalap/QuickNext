<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CashierShift;

echo "TEST FIXED SHIFT CALCULATION\n";
echo "=============================\n\n";

$shift = CashierShift::find(56);

echo "Shift ID: {$shift->id}\n";
echo "Opening Balance: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n\n";

echo "Recalculating...\n\n";

$shift->calculateExpectedTotals();

echo "RESULTS:\n";
echo "========\n";
echo "Total Transactions: {$shift->total_transactions}\n";
echo "Expected Total (order total): Rp " . number_format($shift->expected_total, 0, ',', '.') . "\n";
echo "Expected Cash: Rp " . number_format($shift->expected_cash, 0, ',', '.') . "\n\n";

echo "BREAKDOWN:\n";
echo "==========\n";
echo "Modal Awal: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";
echo "Net Cash Sales: Rp " . number_format($shift->expected_cash - $shift->opening_balance, 0, ',', '.') . "\n";
echo "Expected Cash: Rp " . number_format($shift->expected_cash, 0, ',', '.') . "\n\n";

echo "VERIFICATION:\n";
echo "=============\n";
echo "Order 326: Total Rp 82.500, Paid Rp 100.000, Change Rp 17.500\n";
echo "Order 327: Total Rp 154.000, Paid Rp 200.000, Change Rp 46.000\n";
echo "Total Order: Rp 236.500\n";
echo "Total Paid: Rp 300.000\n";
echo "Total Change: Rp 63.500\n";
echo "Net Cash: Rp 236.500 (300.000 - 63.500)\n";
echo "\n";
echo "Expected Cash = Modal + Net Cash\n";
echo "Expected Cash = Rp 200.000 + Rp 236.500 = Rp 436.500\n";
echo "\n";
echo "Result: Rp " . number_format($shift->expected_cash, 0, ',', '.') . "\n";
echo "Match: " . ($shift->expected_cash == 436500 ? '✅ YES!' : '❌ NO') . "\n";
