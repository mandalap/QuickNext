<?php

/**
 * Check cashier closing data
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CashierShift;
use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;

echo "===========================================\n";
echo "  CASHIER CLOSING INVESTIGATION\n";
echo "===========================================\n\n";

$userId = 8; // Kasir 1 Senayan
$user = User::find($userId);

echo "User: {$user->name} (ID: {$userId})\n\n";

// Get active shift
$shift = CashierShift::where('user_id', $userId)
    ->where('status', 'open')
    ->first();

if (!$shift) {
    echo "❌ No active shift found!\n";
    exit(1);
}

echo "ACTIVE SHIFT INFO\n";
echo "=================\n";
echo "Shift ID: {$shift->id}\n";
echo "Outlet ID: {$shift->outlet_id}\n";
echo "Business ID: {$shift->business_id}\n";
echo "Employee ID: " . ($shift->employee_id ?? 'NULL') . "\n";
echo "Opening Cash: Rp " . number_format($shift->opening_cash, 0, ',', '.') . "\n";
echo "Opened At: {$shift->opened_at}\n";
echo "Status: {$shift->status}\n\n";

// Get employee ID for filtering
$employeeId = null;
if ($shift->employee_id) {
    $employeeId = $shift->employee_id;
} else {
    $employee = \App\Models\Employee::where('user_id', $userId)->first();
    $employeeId = $employee?->id;
}

echo "Employee ID for filtering: " . ($employeeId ?? 'NULL') . "\n\n";

// Get orders for today
$startDate = Carbon::today();
$endDate = Carbon::now();

echo "ORDERS TODAY ({$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d H:i:s')})\n";
echo "=========================================\n";

$ordersQuery = Order::where('business_id', $shift->business_id)
    ->where('outlet_id', $shift->outlet_id)
    ->whereBetween('created_at', [$startDate, $endDate]);

if ($employeeId) {
    $ordersQuery->where('employee_id', $employeeId);
}

$orders = $ordersQuery->orderBy('created_at', 'desc')->get();

echo "Total Orders: {$orders->count()}\n\n";

// Group by payment status and calculate totals
$totalPenjualan = 0;
$totalPenjualanTunai = 0;
$paymentBreakdown = [
    'cash' => ['count' => 0, 'total' => 0],
    'card' => ['count' => 0, 'total' => 0],
    'transfer' => ['count' => 0, 'total' => 0],
    'qris' => ['count' => 0, 'total' => 0],
];

echo "Orders Details:\n";
echo "---------------\n";

foreach ($orders as $order) {
    echo "#{$order->order_number}\n";
    echo "  Status: {$order->status}\n";
    echo "  Payment Status: {$order->payment_status}\n";
    echo "  Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
    echo "  Created: {$order->created_at}\n";

    // Only count completed/paid orders
    if (in_array($order->status, ['completed', 'confirmed', 'preparing', 'ready'])) {
        $totalPenjualan += $order->total;
        echo "  ✅ Counted in total penjualan\n";

        // Get payment method from payments table or default to cash
        $payments = $order->payments;
        if ($payments->count() > 0) {
            foreach ($payments as $payment) {
                $method = strtolower($payment->payment_method ?? 'cash');
                echo "  Payment: {$method} - Rp " . number_format($payment->amount, 0, ',', '.') . "\n";

                if (isset($paymentBreakdown[$method])) {
                    $paymentBreakdown[$method]['count']++;
                    $paymentBreakdown[$method]['total'] += $payment->amount;
                } else {
                    // Default to cash if unknown
                    $paymentBreakdown['cash']['count']++;
                    $paymentBreakdown['cash']['total'] += $payment->amount;
                }
            }
        } else {
            // No payment record, default to cash
            echo "  Payment: cash (default) - Rp " . number_format($order->total, 0, ',', '.') . "\n";
            $paymentBreakdown['cash']['count']++;
            $paymentBreakdown['cash']['total'] += $order->total;
        }
    } else {
        echo "  ⏭️  Skipped (status: {$order->status})\n";
    }
    echo "\n";
}

echo "\n";
echo "PAYMENT BREAKDOWN\n";
echo "=================\n";
echo "Tunai: Rp " . number_format($paymentBreakdown['cash']['total'], 0, ',', '.') . " ({$paymentBreakdown['cash']['count']}x)\n";
echo "Kartu: Rp " . number_format($paymentBreakdown['card']['total'], 0, ',', '.') . " ({$paymentBreakdown['card']['count']}x)\n";
echo "Transfer: Rp " . number_format($paymentBreakdown['transfer']['total'], 0, ',', '.') . " ({$paymentBreakdown['transfer']['count']}x)\n";
echo "QRIS: Rp " . number_format($paymentBreakdown['qris']['total'], 0, ',', '.') . " ({$paymentBreakdown['qris']['count']}x)\n";
echo "\n";
echo "Total Penjualan: Rp " . number_format($totalPenjualan, 0, ',', '.') . "\n";
echo "Penjualan Tunai: Rp " . number_format($paymentBreakdown['cash']['total'], 0, ',', '.') . "\n";
echo "\n";

echo "PERHITUNGAN KAS\n";
echo "===============\n";
echo "Modal Awal: Rp " . number_format($shift->opening_cash, 0, ',', '.') . "\n";
echo "Penjualan Tunai: Rp " . number_format($paymentBreakdown['cash']['total'], 0, ',', '.') . "\n";
echo "Expected Cash: Rp " . number_format($shift->opening_cash + $paymentBreakdown['cash']['total'], 0, ',', '.') . "\n";
echo "\n";

// Compare with dashboard stats
echo "COMPARISON\n";
echo "==========\n";
echo "Dashboard Stats (from stats API): Rp 323.400\n";
echo "Calculated Total: Rp " . number_format($totalPenjualan, 0, ',', '.') . "\n";
echo "Difference: Rp " . number_format(abs(323400 - $totalPenjualan), 0, ',', '.') . "\n";
echo "\n";

if ($totalPenjualan != 323400) {
    echo "⚠️  MISMATCH DETECTED!\n";
    echo "Investigating reasons...\n\n";

    // Check orders from different times
    $allOrders = Order::where('business_id', $shift->business_id)
        ->where('outlet_id', $shift->outlet_id)
        ->whereDate('created_at', today())
        ->get();

    echo "All orders today (without employee filter): {$allOrders->count()}\n";
    echo "Orders with employee filter: {$orders->count()}\n";
}

echo "\n===========================================\n";
echo "  END OF INVESTIGATION\n";
echo "===========================================\n";
