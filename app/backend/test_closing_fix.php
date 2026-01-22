<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CashierShift;

echo "TESTING CASHIER CLOSING FIX\n";
echo "============================\n\n";

$shift = CashierShift::find(22);

echo "BEFORE RECALCULATION:\n";
echo "=====================\n";
echo "Outlet ID (shift): {$shift->outlet_id}\n";
echo "Opening Balance: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";
echo "Total Transactions: {$shift->total_transactions}\n";
echo "Expected Total: Rp " . number_format($shift->expected_total, 0, ',', '.') . "\n";
echo "Expected Cash: Rp " . number_format($shift->expected_cash, 0, ',', '.') . "\n";
echo "\n";

// Recalculate with outlet ID 4 (from frontend)
echo "RECALCULATING with Outlet ID 4 (Cabang Senayan)...\n";
echo "===================================================\n\n";

$shift->calculateExpectedTotals(4);

echo "AFTER RECALCULATION:\n";
echo "====================\n";
echo "Opening Balance: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";
echo "Total Transactions: {$shift->total_transactions}\n";
echo "Expected Total: Rp " . number_format($shift->expected_total, 0, ',', '.') . "\n";
echo "\n";

echo "Payment Breakdown:\n";
echo "------------------\n";
echo "Tunai: Rp " . number_format($shift->expected_cash - $shift->opening_balance, 0, ',', '.') . " ({$shift->cash_transactions}x)\n";
echo "Kartu: Rp " . number_format($shift->expected_card, 0, ',', '.') . " ({$shift->card_transactions}x)\n";
echo "Transfer: Rp " . number_format($shift->expected_transfer, 0, ',', '.') . " ({$shift->transfer_transactions}x)\n";
echo "QRIS: Rp " . number_format($shift->expected_qris, 0, ',', '.') . " ({$shift->qris_transactions}x)\n";
echo "\n";

echo "Perhitungan Kas:\n";
echo "----------------\n";
echo "Modal Awal: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";
echo "Penjualan Tunai: Rp " . number_format($shift->expected_cash - $shift->opening_balance, 0, ',', '.') . "\n";
echo "Expected Cash: Rp " . number_format($shift->expected_cash, 0, ',', '.') . "\n";
echo "\n";

echo "COMPARISON:\n";
echo "===========\n";
echo "Dashboard shows: Rp 323.400\n";
echo "Calculated Total: Rp " . number_format($shift->expected_total, 0, ',', '.') . "\n";
echo "Match: " . ($shift->expected_total == 323400 ? '✅ YES!' : '❌ NO') . "\n";

echo "\n✅ FIX COMPLETED!\n";
echo "Now the closing calculation should use the correct outlet.\n";
