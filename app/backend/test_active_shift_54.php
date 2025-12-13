<?php
/**
 * Test script untuk memeriksa API getActiveShift mengembalikan Shift ID 54
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use Illuminate\Support\Facades\DB;

echo "🧪 Test Active Shift API (Should return Shift ID 54)\n";
echo "====================================================\n\n";

// 1. Simulasi API getActiveShift untuk User ID 1 (Owner)
echo "1. 🔍 Simulasi API getActiveShift untuk User ID 1 (Owner):\n";

$businessId = 1; // Asumsi business ID 1
$outletId = 1;   // Asumsi outlet ID 1
$userId = 1;     // Owner

$activeShift = CashierShift::open()
    ->where('user_id', $userId)
    ->where('business_id', $businessId)
    ->where('outlet_id', $outletId)
    ->with(['user', 'outlet'])
    ->first();

if (!$activeShift) {
    echo "   ❌ No active shift found\n";
    exit;
}

echo "   - ID: {$activeShift->id}\n";
echo "   - Nama: {$activeShift->shift_name}\n";
echo "   - Status: {$activeShift->status}\n";
echo "   - Opening Balance: {$activeShift->opening_balance}\n";
echo "   - Expected Cash: {$activeShift->expected_cash}\n";
echo "   - Total Transactions: {$activeShift->total_transactions}\n";

// 2. Recalculate shift data
echo "\n2. 🔄 Recalculating shift data...\n";
$beforeExpectedCash = $activeShift->expected_cash;
$beforeTotalTransactions = $activeShift->total_transactions;

$activeShift->calculateExpectedTotals();

echo "   Before - Expected Cash: {$beforeExpectedCash}, Total Trans: {$beforeTotalTransactions}\n";
echo "   After  - Expected Cash: {$activeShift->expected_cash}, Total Trans: {$activeShift->total_transactions}\n";

// 3. Simulasi API response
echo "\n3. 📊 API Response:\n";
$apiResponse = [
    'success' => true,
    'has_active_shift' => true,
    'data' => $activeShift
];

echo json_encode($apiResponse, JSON_PRETTY_PRINT);

// 4. Cek konsistensi
echo "\n4. 🔍 Consistency Check:\n";
$orders = $activeShift->orders()->get();
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

echo "   - Orders Count: " . $orders->count() . "\n";
echo "   - Total from Orders: {$totalFromOrders}\n";
echo "   - Cash from Orders: {$cashFromOrders}\n";
echo "   - Transactions from Orders: {$transactionsFromOrders}\n";
echo "   - Expected Cash: {$activeShift->expected_cash}\n";
echo "   - Total Transactions: {$activeShift->total_transactions}\n";

if ($activeShift->total_transactions == $transactionsFromOrders && 
    $activeShift->expected_cash == $cashFromOrders && 
    $activeShift->opening_balance > 0) {
    echo "   ✅ Data konsisten!\n";
} else {
    echo "   ❌ Data tidak konsisten!\n";
}

// 5. Cek apakah ini Shift ID 54
echo "\n5. 🎯 Shift ID Check:\n";
if ($activeShift->id == 54) {
    echo "   ✅ API mengembalikan Shift ID 54 (yang benar)!\n";
} else {
    echo "   ❌ API mengembalikan Shift ID {$activeShift->id} (bukan 54)!\n";
}

echo "\n✅ Test selesai!\n";
?>


























































