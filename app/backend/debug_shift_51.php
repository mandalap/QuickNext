<?php
/**
 * Debug script untuk memeriksa shift ID 51
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

echo "🔍 Debug Shift ID 51\n";
echo "===================\n\n";

// 1. Cek shift ID 51
echo "1. 🔍 Shift ID 51:\n";
$shift = CashierShift::find(51);
if ($shift) {
    echo "   - ID: {$shift->id}\n";
    echo "   - Nama: {$shift->shift_name}\n";
    echo "   - Status: {$shift->status}\n";
    echo "   - User ID: {$shift->user_id}\n";
    echo "   - Opening Balance: {$shift->opening_balance}\n";
    echo "   - Expected Cash: {$shift->expected_cash}\n";
    echo "   - Total Transactions: {$shift->total_transactions}\n";
    echo "   - Orders Count: " . $shift->orders()->count() . "\n";
    
    // Cek orders yang ter-link
    $orders = $shift->orders()->get();
    echo "   - Orders ter-link:\n";
    foreach ($orders as $order) {
        echo "     Order ID: {$order->id}, Total: {$order->total}, Status: {$order->status}\n";
        foreach ($order->payments as $payment) {
            echo "       Payment: {$payment->payment_method}, Amount: {$payment->amount}\n";
        }
    }
} else {
    echo "   ❌ Shift ID 51 tidak ditemukan!\n";
}

// 2. Cek orders dengan shift_id = 51
echo "\n2. 🔍 Orders dengan shift_id = 51:\n";
$ordersWithShift51 = Order::where('shift_id', 51)->get();
echo "   - Total orders: " . $ordersWithShift51->count() . "\n";
foreach ($ordersWithShift51 as $order) {
    echo "     Order ID: {$order->id}, Total: {$order->total}, Status: {$order->status}\n";
    foreach ($order->payments as $payment) {
        echo "       Payment: {$payment->payment_method}, Amount: {$payment->amount}\n";
    }
}

// 3. Cek orders yang dibuat hari ini
echo "\n3. 🔍 Orders yang dibuat hari ini:\n";
$todayOrders = Order::whereDate('created_at', today())->get();
echo "   - Total orders hari ini: " . $todayOrders->count() . "\n";
foreach ($todayOrders as $order) {
    echo "     Order ID: {$order->id}, Shift ID: {$order->shift_id}, Total: {$order->total}\n";
}

// 4. Cek shift ID 54 (yang terbaru)
echo "\n4. 🔍 Shift ID 54 (yang terbaru):\n";
$shift54 = CashierShift::find(54);
if ($shift54) {
    echo "   - ID: {$shift54->id}\n";
    echo "   - Nama: {$shift54->shift_name}\n";
    echo "   - Status: {$shift54->status}\n";
    echo "   - User ID: {$shift54->user_id}\n";
    echo "   - Opening Balance: {$shift54->opening_balance}\n";
    echo "   - Expected Cash: {$shift54->expected_cash}\n";
    echo "   - Total Transactions: {$shift54->total_transactions}\n";
    echo "   - Orders Count: " . $shift54->orders()->count() . "\n";
    
    // Cek orders yang ter-link
    $orders = $shift54->orders()->get();
    echo "   - Orders ter-link:\n";
    foreach ($orders as $order) {
        echo "     Order ID: {$order->id}, Total: {$order->total}, Status: {$order->status}\n";
        foreach ($order->payments as $payment) {
            echo "       Payment: {$payment->payment_method}, Amount: {$payment->amount}\n";
        }
    }
} else {
    echo "   ❌ Shift ID 54 tidak ditemukan!\n";
}

echo "\n✅ Debug selesai!\n";
?>


























































