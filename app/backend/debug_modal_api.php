<?php
/**
 * Debug script untuk memeriksa API response yang digunakan modal
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use Illuminate\Support\Facades\DB;

echo "🔍 Debug Modal API Response\n";
echo "===========================\n\n";

// 1. Cek shift ID 49 (yang terlihat di gambar)
echo "1. 🔍 Shift ID 49 (yang terlihat di gambar):\n";
$shift49 = CashierShift::with(['user', 'outlet', 'orders.payments'])->find(49);

if ($shift49) {
    echo "   - ID: {$shift49->id}\n";
    echo "   - Nama: {$shift49->shift_name}\n";
    echo "   - Status: {$shift49->status}\n";
    echo "   - Opening Balance: {$shift49->opening_balance}\n";
    echo "   - Expected Cash: {$shift49->expected_cash}\n";
    echo "   - Total Transactions: {$shift49->total_transactions}\n";
    echo "   - Orders Count: " . $shift49->orders->count() . "\n";

    // Hitung payment breakdown
    $paymentBreakdown = [
        'cash' => ['expected' => 0, 'transactions' => 0],
        'card' => ['amount' => 0, 'transactions' => 0],
        'transfer' => ['amount' => 0, 'transactions' => 0],
        'qris' => ['amount' => 0, 'transactions' => 0]
    ];

    foreach ($shift49->orders as $order) {
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

    echo "   - Payment Breakdown:\n";
    echo "     * Cash: {$paymentBreakdown['cash']['expected']} ({$paymentBreakdown['cash']['transactions']}x)\n";
    echo "     * Card: {$paymentBreakdown['card']['amount']} ({$paymentBreakdown['card']['transactions']}x)\n";
    echo "     * Transfer: {$paymentBreakdown['transfer']['amount']} ({$paymentBreakdown['transfer']['transactions']}x)\n";
    echo "     * QRIS: {$paymentBreakdown['qris']['amount']} ({$paymentBreakdown['qris']['transactions']}x)\n";

    // Simulasi API response yang seharusnya dikirim ke frontend
    $apiResponse = [
        'success' => true,
        'data' => [
            'shift' => [
                'id' => $shift49->id,
                'shift_name' => $shift49->shift_name,
                'opened_at' => $shift49->opened_at,
                'total_transactions' => $shift49->total_transactions,
                'opening_balance' => $shift49->opening_balance,
                'expected_cash' => $shift49->expected_cash,
                'status' => $shift49->status
            ],
            'payment_breakdown' => $paymentBreakdown,
            'summary' => [
                'total_sales' => $paymentBreakdown['cash']['expected'] + $paymentBreakdown['card']['amount'] + $paymentBreakdown['transfer']['amount'] + $paymentBreakdown['qris']['amount'],
                'total_transactions' => $shift49->total_transactions
            ],
            'orders' => $shift49->orders->map(function($order) {
                return [
                    'id' => $order->id,
                    'total' => $order->total,
                    'status' => $order->status
                ];
            })->toArray()
        ]
    ];

    echo "\n2. 📊 API Response yang seharusnya dikirim:\n";
    echo json_encode($apiResponse, JSON_PRETTY_PRINT);

    // Cek konsistensi
    echo "\n3. 🔍 Konsistensi Check:\n";
    $totalTransactionsFromBreakdown = $paymentBreakdown['cash']['transactions'] + $paymentBreakdown['card']['transactions'] + $paymentBreakdown['transfer']['transactions'] + $paymentBreakdown['qris']['transactions'];

    echo "   - Total Transactions: {$shift49->total_transactions} vs {$totalTransactionsFromBreakdown} (dari breakdown)\n";
    echo "   - Expected Cash: {$shift49->expected_cash} vs {$paymentBreakdown['cash']['expected']} (dari breakdown)\n";
    echo "   - Opening Balance: {$shift49->opening_balance} (harus > 0)\n";
    echo "   - Shift Name: '{$shift49->shift_name}' (bukan 'Shift Tidak Diketahui')\n";

    if ($shift49->total_transactions == $totalTransactionsFromBreakdown &&
        $shift49->expected_cash == $paymentBreakdown['cash']['expected'] &&
        $shift49->opening_balance > 0) {
        echo "   ✅ Data konsisten!\n";
    } else {
        echo "   ❌ Data tidak konsisten!\n";
    }

} else {
    echo "   ❌ Shift ID 49 tidak ditemukan!\n";
}

echo "\n✅ Debug selesai!\n";
?>


























































