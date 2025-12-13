<?php
/**
 * Test script untuk memeriksa API getShiftDetail dengan shift ID 54
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use Illuminate\Support\Facades\DB;

echo "🧪 Test Shift Detail API (ID 54)\n";
echo "=================================\n\n";

// 1. Cek shift ID 54
echo "1. 🔍 Shift ID 54:\n";
$shift = CashierShift::with(['user', 'outlet', 'orders.payments', 'orders.customer'])->find(54);

if (!$shift) {
    echo "   ❌ Shift ID 54 tidak ditemukan!\n";
    exit;
}

echo "   - ID: {$shift->id}\n";
echo "   - Nama: {$shift->shift_name}\n";
echo "   - Status: {$shift->status}\n";
echo "   - User: {$shift->user->name} ({$shift->user->email})\n";
echo "   - Opening Balance: {$shift->opening_balance}\n";
echo "   - Expected Cash: {$shift->expected_cash}\n";
echo "   - Total Transactions: {$shift->total_transactions}\n";
echo "   - Orders Count: " . $shift->orders->count() . "\n";

// 2. Recalculate shift data
echo "\n2. 🔄 Recalculating shift data...\n";
$beforeExpectedCash = $shift->expected_cash;
$beforeTotalTransactions = $shift->total_transactions;

$shift->calculateExpectedTotals();

echo "   Before - Expected Cash: {$beforeExpectedCash}, Total Trans: {$beforeTotalTransactions}\n";
echo "   After  - Expected Cash: {$shift->expected_cash}, Total Trans: {$shift->total_transactions}\n";

// 3. Hitung payment breakdown
echo "\n3. 💰 Payment Breakdown:\n";
$paymentBreakdown = [
    'cash' => ['expected' => 0, 'transactions' => 0],
    'card' => ['amount' => 0, 'transactions' => 0],
    'transfer' => ['amount' => 0, 'transactions' => 0],
    'qris' => ['amount' => 0, 'transactions' => 0]
];

foreach ($shift->orders as $order) {
    foreach ($order->payments as $payment) {
        switch ($payment->payment_method) {
            case 'cash':
                $paymentBreakdown['cash']['expected'] += $payment->amount;
                $paymentBreakdown['cash']['transactions']++;
                break;
            case 'card':
                $paymentBreakdown['card']['amount'] += $payment->amount;
                $paymentBreakdown['card']['transactions']++;
                break;
            case 'transfer':
                $paymentBreakdown['transfer']['amount'] += $payment->amount;
                $paymentBreakdown['transfer']['transactions']++;
                break;
            case 'qris':
                $paymentBreakdown['qris']['amount'] += $payment->amount;
                $paymentBreakdown['qris']['transactions']++;
                break;
        }
    }
}

echo "   - Cash: {$paymentBreakdown['cash']['expected']} ({$paymentBreakdown['cash']['transactions']}x)\n";
echo "   - Card: {$paymentBreakdown['card']['amount']} ({$paymentBreakdown['card']['transactions']}x)\n";
echo "   - Transfer: {$paymentBreakdown['transfer']['amount']} ({$paymentBreakdown['transfer']['transactions']}x)\n";
echo "   - QRIS: {$paymentBreakdown['qris']['amount']} ({$paymentBreakdown['qris']['transactions']}x)\n";

// 4. Simulasi API response getShiftDetail
echo "\n4. 📊 API Response getShiftDetail:\n";
$apiResponse = [
    'success' => true,
    'data' => [
        'shift' => [
            'id' => $shift->id,
            'shift_name' => $shift->shift_name,
            'opened_at' => $shift->opened_at,
            'total_transactions' => $shift->total_transactions,
            'opening_balance' => $shift->opening_balance,
            'expected_cash' => $shift->expected_cash,
            'status' => $shift->status
        ],
        'payment_breakdown' => $paymentBreakdown,
        'summary' => [
            'total_sales' => $paymentBreakdown['cash']['expected'] + $paymentBreakdown['card']['amount'] + $paymentBreakdown['transfer']['amount'] + $paymentBreakdown['qris']['amount'],
            'total_transactions' => $shift->total_transactions
        ],
        'orders' => $shift->orders->map(function($order) {
            return [
                'id' => $order->id,
                'total' => $order->total,
                'status' => $order->status,
                'customer' => $order->customer ? $order->customer->name : 'Walk-in Customer'
            ];
        })->toArray()
    ]
];

echo json_encode($apiResponse, JSON_PRETTY_PRINT);

// 5. Cek konsistensi
echo "\n5. 🔍 Consistency Check:\n";
$totalTransactionsFromBreakdown = $paymentBreakdown['cash']['transactions'] + $paymentBreakdown['card']['transactions'] + $paymentBreakdown['transfer']['transactions'] + $paymentBreakdown['qris']['transactions'];

echo "   - Total Transactions: {$shift->total_transactions} vs {$totalTransactionsFromBreakdown} (dari breakdown)\n";
echo "   - Expected Cash: {$shift->expected_cash} vs {$paymentBreakdown['cash']['expected']} (dari breakdown)\n";
echo "   - Opening Balance: {$shift->opening_balance} (harus > 0)\n";
echo "   - Shift Name: '{$shift->shift_name}' (bukan 'Shift Tidak Diketahui')\n";

if ($shift->total_transactions == $totalTransactionsFromBreakdown && 
    $shift->expected_cash == $paymentBreakdown['cash']['expected'] && 
    $shift->opening_balance > 0) {
    echo "   ✅ Data konsisten!\n";
} else {
    echo "   ❌ Data tidak konsisten!\n";
}

echo "\n✅ Test selesai!\n";
?>


























































