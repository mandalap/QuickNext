<?php
/**
 * Debug script untuk memeriksa konsistensi data shift
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

echo "🔍 Debug Shift Data Consistency\n";
echo "================================\n\n";

// 1. Cek shift aktif dengan data yang tidak konsisten
echo "1. 🔄 Shift Aktif dengan Data Tidak Konsisten:\n";
$activeShifts = CashierShift::where('status', 'open')->get();

foreach ($activeShifts as $shift) {
    echo "   - Shift ID: {$shift->id}\n";
    echo "     Nama: {$shift->shift_name}\n";
    echo "     Opening Balance: {$shift->opening_balance}\n";
    echo "     Expected Cash: {$shift->expected_cash}\n";
    echo "     Total Transactions: {$shift->total_transactions}\n";

    // Cek orders yang terkait
    $orders = $shift->orders()->get();
    echo "     Orders Count: " . $orders->count() . "\n";

    // Hitung ulang dari orders
    $totalFromOrders = 0;
    $cashFromOrders = 0;
    $transactionsFromOrders = 0;

    foreach ($orders as $order) {
        $totalFromOrders += $order->total;
        $transactionsFromOrders++;

        foreach ($order->payments as $payment) {
            if ($payment->payment_method === 'cash') {
                $cashFromOrders += $payment->amount;
            }
        }
    }

    echo "     Calculated from Orders:\n";
    echo "       - Total Sales: {$totalFromOrders}\n";
    echo "       - Cash Sales: {$cashFromOrders}\n";
    echo "       - Transactions: {$transactionsFromOrders}\n";

    // Cek konsistensi
    $isConsistent = true;
    if ($shift->total_transactions != $transactionsFromOrders) {
        echo "     ❌ INCONSISTENT: total_transactions ({$shift->total_transactions}) != calculated ({$transactionsFromOrders})\n";
        $isConsistent = false;
    }

    if ($shift->expected_cash != $cashFromOrders) {
        echo "     ❌ INCONSISTENT: expected_cash ({$shift->expected_cash}) != calculated ({$cashFromOrders})\n";
        $isConsistent = false;
    }

    if ($isConsistent) {
        echo "     ✅ Data konsisten\n";
    }

    echo "\n";
}

// 2. Cek shift yang memiliki data 0 tapi ada orders
echo "2. 🔍 Shift dengan Data 0 tapi Ada Orders:\n";
$problematicShifts = CashierShift::where('status', 'open')
    ->where(function($query) {
        $query->where('expected_cash', 0)
              ->orWhere('total_transactions', 0);
    })
    ->get();

foreach ($problematicShifts as $shift) {
    $ordersCount = $shift->orders()->count();
    if ($ordersCount > 0) {
        echo "   - Shift ID: {$shift->id}\n";
        echo "     Nama: {$shift->shift_name}\n";
        echo "     Expected Cash: {$shift->expected_cash}\n";
        echo "     Total Transactions: {$shift->total_transactions}\n";
        echo "     Orders Count: {$ordersCount}\n";
        echo "     ❌ PROBLEM: Data 0 tapi ada orders\n\n";
    }
}

// 3. Recalculate semua shift yang bermasalah
echo "3. 🔄 Recalculating Problematic Shifts:\n";
foreach ($problematicShifts as $shift) {
    $ordersCount = $shift->orders()->count();
    if ($ordersCount > 0) {
        echo "   Recalculating shift ID: {$shift->id}\n";

        $beforeExpectedCash = $shift->expected_cash;
        $beforeTotalTransactions = $shift->total_transactions;

        $shift->calculateExpectedTotals();

        echo "   Before - Expected Cash: {$beforeExpectedCash}, Total Trans: {$beforeTotalTransactions}\n";
        echo "   After  - Expected Cash: {$shift->expected_cash}, Total Trans: {$shift->total_transactions}\n\n";
    }
}

// 4. Cek shift yang memiliki opening_balance 0
echo "4. 💰 Shift dengan Opening Balance 0:\n";
$zeroOpeningShifts = CashierShift::where('status', 'open')
    ->where('opening_balance', 0)
    ->get();

foreach ($zeroOpeningShifts as $shift) {
    echo "   - Shift ID: {$shift->id}\n";
    echo "     Nama: {$shift->shift_name}\n";
    echo "     Opening Balance: {$shift->opening_balance}\n";
    echo "     ❌ PROBLEM: Opening balance 0\n";
}

echo "\n✅ Debug selesai!\n";
?>


























































