<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Order;
use App\Models\CashierShift;
use Carbon\Carbon;

echo "TESTING CLOSING FOR TODAY ONLY\n";
echo "===============================\n\n";

$shift = CashierShift::find(22);
$employeeId = 6; // User 8's employee ID
$outletId = 4; // Cabang Senayan (from frontend)

$today = Carbon::today();

echo "Shift Info:\n";
echo "  ID: {$shift->id}\n";
echo "  User ID: {$shift->user_id}\n";
echo "  Employee ID: {$employeeId}\n";
echo "  Outlet (shift): {$shift->outlet_id}\n";
echo "  Outlet (frontend): {$outletId}\n";
echo "  Opening Balance: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";
echo "  Opened At: {$shift->opened_at}\n";
echo "\n";

// Get orders for TODAY only
$ordersToday = Order::where('business_id', $shift->business_id)
    ->where('outlet_id', $outletId)
    ->where('employee_id', $employeeId)
    ->where('payment_status', 'paid')
    ->whereDate('created_at', $today)
    ->with('payments')
    ->get();

echo "Orders TODAY (outlet {$outletId}, employee {$employeeId}):\n";
echo "==========================================================\n";
echo "Count: {$ordersToday->count()}\n";
echo "Total: Rp " . number_format($ordersToday->sum('total'), 0, ',', '.') . "\n";
echo "\n";

$cashSales = 0;
$cardSales = 0;
$transferSales = 0;
$qrisSales = 0;

$cashCount = 0;
$cardCount = 0;
$transferCount = 0;
$qrisCount = 0;

foreach ($ordersToday as $order) {
    echo "Order #{$order->order_number}\n";
    echo "  Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
    echo "  Status: {$order->status} / {$order->payment_status}\n";

    if ($order->payments->count() > 0) {
        foreach ($order->payments as $payment) {
            echo "  Payment: {$payment->payment_method} - Rp " . number_format($payment->amount, 0, ',', '.') . "\n";

            switch ($payment->payment_method) {
                case 'cash':
                    $cashSales += $payment->amount;
                    $cashCount++;
                    break;
                case 'card':
                    $cardSales += $payment->amount;
                    $cardCount++;
                    break;
                case 'transfer':
                    $transferSales += $payment->amount;
                    $transferCount++;
                    break;
                case 'qris':
                    $qrisSales += $payment->amount;
                    $qrisCount++;
                    break;
            }
        }
    } else {
        echo "  Payment: cash (default) - Rp " . number_format($order->total, 0, ',', '.') . "\n";
        $cashSales += $order->total;
        $cashCount++;
    }
    echo "\n";
}

echo "SUMMARY FOR TODAY:\n";
echo "==================\n";
echo "Payment Breakdown:\n";
echo "  Tunai: Rp " . number_format($cashSales, 0, ',', '.') . " ({$cashCount}x)\n";
echo "  Kartu: Rp " . number_format($cardSales, 0, ',', '.') . " ({$cardCount}x)\n";
echo "  Transfer: Rp " . number_format($transferSales, 0, ',', '.') . " ({$transferCount}x)\n";
echo "  QRIS: Rp " . number_format($qrisSales, 0, ',', '.') . " ({$qrisCount}x)\n";
echo "\n";
echo "Total Penjualan: Rp " . number_format($ordersToday->sum('total'), 0, ',', '.') . "\n";
echo "\n";

echo "Perhitungan Kas:\n";
echo "  Modal Awal: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";
echo "  Penjualan Tunai: Rp " . number_format($cashSales, 0, ',', '.') . "\n";
echo "  Expected Cash: Rp " . number_format($shift->opening_balance + $cashSales, 0, ',', '.') . "\n";
echo "\n";

echo "COMPARISON WITH DASHBOARD:\n";
echo "==========================\n";
echo "Dashboard: Rp 323.400\n";
echo "Calculated: Rp " . number_format($ordersToday->sum('total'), 0, ',', '.') . "\n";
echo "Match: " . ($ordersToday->sum('total') == 323400 ? '✅ YES!' : '❌ NO') . "\n";
