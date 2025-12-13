<?php
/**
 * Script untuk memperbaiki semua shift aktif agar memiliki data yang konsisten
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use Illuminate\Support\Facades\DB;

echo "🔧 Fix All Active Shifts\n";
echo "========================\n\n";

// 1. Cek semua shift aktif
echo "1. 🔄 Semua Shift Aktif:\n";
$activeShifts = CashierShift::where('status', 'open')->get();
echo "   Total active shifts: " . $activeShifts->count() . "\n\n";

$fixedCount = 0;
$errorCount = 0;

foreach ($activeShifts as $shift) {
    echo "   Processing Shift ID: {$shift->id}\n";
    echo "     Nama: {$shift->shift_name}\n";
    echo "     Opening Balance: {$shift->opening_balance}\n";
    echo "     Expected Cash: {$shift->expected_cash}\n";
    echo "     Total Transactions: {$shift->total_transactions}\n";

    // Cek orders
    $orders = $shift->orders()->get();
    echo "     Orders Count: " . $orders->count() . "\n";

    if ($orders->count() > 0) {
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

        // Cek apakah perlu di-fix
        $needsFix = false;
        if ($shift->total_transactions != $transactionsFromOrders) {
            echo "     ❌ NEEDS FIX: total_transactions ({$shift->total_transactions}) != calculated ({$transactionsFromOrders})\n";
            $needsFix = true;
        }

        if ($shift->expected_cash != $cashFromOrders) {
            echo "     ❌ NEEDS FIX: expected_cash ({$shift->expected_cash}) != calculated ({$cashFromOrders})\n";
            $needsFix = true;
        }

        if ($needsFix) {
            try {
                echo "     🔄 Recalculating...\n";
                $shift->calculateExpectedTotals();
                echo "     ✅ Fixed successfully\n";
                $fixedCount++;
            } catch (Exception $e) {
                echo "     ❌ Error fixing: " . $e->getMessage() . "\n";
                $errorCount++;
            }
        } else {
            echo "     ✅ Data sudah konsisten\n";
        }
    } else {
        echo "     ℹ️ No orders, data is consistent\n";
    }

    echo "\n";
}

echo "2. 📊 Summary:\n";
echo "   Total shifts processed: " . $activeShifts->count() . "\n";
echo "   Shifts fixed: {$fixedCount}\n";
echo "   Errors: {$errorCount}\n";
echo "   Already consistent: " . ($activeShifts->count() - $fixedCount - $errorCount) . "\n\n";

// 3. Cek shift yang masih bermasalah
echo "3. 🔍 Final Check - Shifts with Issues:\n";
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
        echo "     ❌ STILL PROBLEMATIC\n";
    }
}

echo "\n✅ Fix selesai!\n";
?>


























































