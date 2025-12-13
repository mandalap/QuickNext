<?php
/**
 * Simple debug script untuk memeriksa data shift
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

echo "🔍 Debug Shift Data\n";
echo "==================\n\n";

// 1. Cek semua shift
echo "1. 📊 Semua Shift:\n";
$shifts = CashierShift::all();
echo "   Total shifts: " . $shifts->count() . "\n";

foreach ($shifts as $shift) {
    echo "   - ID: {$shift->id}, Nama: {$shift->shift_name}, Status: {$shift->status}\n";
    echo "     Opening: {$shift->opening_balance}, Expected Cash: {$shift->expected_cash}\n";
    echo "     Total Trans: {$shift->total_transactions}, Orders: " . $shift->orders()->count() . "\n";
}
echo "\n";

// 2. Cek shift aktif
echo "2. 🔄 Shift Aktif:\n";
$activeShifts = CashierShift::where('status', 'open')->get();
echo "   Total active shifts: " . $activeShifts->count() . "\n";

foreach ($activeShifts as $shift) {
    echo "   - ID: {$shift->id}, Nama: {$shift->shift_name}\n";
    echo "     Opening: {$shift->opening_balance}, Expected Cash: {$shift->expected_cash}\n";
    echo "     Total Trans: {$shift->total_transactions}\n";

    // Cek orders
    $orders = $shift->orders()->get();
    echo "     Orders: " . $orders->count() . "\n";

    foreach ($orders as $order) {
        echo "       * Order {$order->id}: Total {$order->total}, Status {$order->status}\n";
    }
}
echo "\n";

// 3. Cek orders tanpa shift
echo "3. 📋 Orders tanpa Shift ID:\n";
$ordersWithoutShift = Order::whereNull('shift_id')->count();
echo "   Orders tanpa shift_id: " . $ordersWithoutShift . "\n";

// 4. Cek orders dengan shift
echo "4. 🔗 Orders dengan Shift ID:\n";
$ordersWithShift = Order::whereNotNull('shift_id')->count();
echo "   Orders dengan shift_id: " . $ordersWithShift . "\n";

// 5. Test recalculate
echo "5. 🔄 Test Recalculate:\n";
if ($activeShifts->count() > 0) {
    $shift = $activeShifts->first();
    echo "   Recalculating shift ID: {$shift->id}\n";

    $beforeExpectedCash = $shift->expected_cash;
    $beforeTotalTransactions = $shift->total_transactions;

    $shift->calculateExpectedTotals();

    echo "   Before - Expected Cash: {$beforeExpectedCash}, Total Trans: {$beforeTotalTransactions}\n";
    echo "   After  - Expected Cash: {$shift->expected_cash}, Total Trans: {$shift->total_transactions}\n";
} else {
    echo "   ❌ Tidak ada shift aktif\n";
}

echo "\n✅ Debug selesai!\n";
?>


























































