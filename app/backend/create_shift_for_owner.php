<?php
/**
 * Script untuk membuat shift baru untuk Owner dengan data yang benar
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use App\Models\User;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

echo "🔧 Create Shift for Owner\n";
echo "=========================\n\n";

// 1. Cek shift ID 49 (yang benar)
echo "1. 🔍 Shift ID 49 (yang benar):\n";
$shift49 = CashierShift::with(['orders.payments'])->find(49);
if ($shift49) {
    echo "   - ID: {$shift49->id}\n";
    echo "   - Nama: {$shift49->shift_name}\n";
    echo "   - User ID: {$shift49->user_id}\n";
    echo "   - Opening Balance: {$shift49->opening_balance}\n";
    echo "   - Expected Cash: {$shift49->expected_cash}\n";
    echo "   - Total Transactions: {$shift49->total_transactions}\n";
    echo "   - Orders Count: " . $shift49->orders->count() . "\n";

    // Cek orders dan payments
    foreach ($shift49->orders as $order) {
        echo "     Order ID: {$order->id}, Total: {$order->total}, Status: {$order->status}\n";
        foreach ($order->payments as $payment) {
            echo "       Payment: {$payment->payment_method}, Amount: {$payment->amount}\n";
        }
    }
} else {
    echo "   ❌ Shift ID 49 tidak ditemukan!\n";
    exit;
}

// 2. Tutup shift ID 50 (yang salah) untuk Owner
echo "\n2. 🔒 Closing shift ID 50 (yang salah) untuk Owner:\n";
$shift50 = CashierShift::find(50);
if ($shift50) {
    $shift50->status = 'closed';
    $shift50->closed_at = now();
    $shift50->closed_by_user_id = 1;
    $shift50->save();
    echo "   ✅ Shift ID 50 ditutup\n";
} else {
    echo "   ❌ Shift ID 50 tidak ditemukan!\n";
}

// 3. Buat shift baru untuk Owner dengan data yang sama seperti Shift ID 49
echo "\n3. 🆕 Creating new shift for Owner:\n";
$newShift = new CashierShift();
$newShift->business_id = 1;
$newShift->outlet_id = 1;
$newShift->user_id = 1; // Owner
$newShift->employee_id = null;
$newShift->shift_name = "Shift 20 Oct 2025 21:08 (Owner)";
$newShift->status = 'open';
$newShift->opened_at = now();
$newShift->opening_balance = 100000.00;
$newShift->expected_cash = 205000.00;
$newShift->expected_card = 0.00;
$newShift->expected_transfer = 0.00;
$newShift->expected_qris = 0.00;
$newShift->expected_total = 157300.00;
$newShift->total_transactions = 3;
$newShift->cash_transactions = 3;
$newShift->card_transactions = 0;
$newShift->transfer_transactions = 0;
$newShift->qris_transactions = 0;
$newShift->opening_notes = "Shift dibuat untuk Owner dengan data yang sama seperti Shift ID 49";
$newShift->save();

echo "   ✅ New shift created with ID: {$newShift->id}\n";
echo "   - Nama: {$newShift->shift_name}\n";
echo "   - User ID: {$newShift->user_id}\n";
echo "   - Opening Balance: {$newShift->opening_balance}\n";
echo "   - Expected Cash: {$newShift->expected_cash}\n";
echo "   - Total Transactions: {$newShift->total_transactions}\n";

// 4. Buat orders dan payments yang sama seperti Shift ID 49
echo "\n4. 📦 Creating orders and payments:\n";
$orders = [
    ['id' => 308, 'total' => 55000.00, 'status' => 'completed'],
    ['id' => 309, 'total' => 63800.00, 'status' => 'completed'],
    ['id' => 310, 'total' => 38500.00, 'status' => 'completed']
];

foreach ($orders as $orderData) {
    // Buat order baru
    $newOrder = new Order();
    $newOrder->business_id = 1;
    $newOrder->outlet_id = 1;
    $newOrder->employee_id = null;
    $newOrder->shift_id = $newShift->id; // Link ke shift baru
    $newOrder->customer_id = null;
    $newOrder->order_number = 'ORD-' . time() . '-' . $orderData['id'];
    $newOrder->subtotal = $orderData['total'];
    $newOrder->tax_amount = 0;
    $newOrder->discount_amount = 0;
    $newOrder->service_charge = 0;
    $newOrder->delivery_fee = 0;
    $newOrder->total = $orderData['total'];
    $newOrder->paid_amount = $orderData['total'];
    $newOrder->change_amount = 0;
    $newOrder->payment_status = 'paid';
    $newOrder->status = $orderData['status'];
    $newOrder->type = 'dine_in';
    $newOrder->notes = "Order untuk shift Owner";
    $newOrder->ordered_at = now();
    $newOrder->save();

    echo "   ✅ Order created: ID {$newOrder->id}, Total: {$newOrder->total}\n";

    // Buat payment untuk order ini
    $newPayment = new Payment();
    $newPayment->order_id = $newOrder->id;
    $newPayment->payment_method = 'cash';
    $newPayment->amount = $orderData['total'];
    $newPayment->status = 'success';
    $newPayment->paid_at = now();
    $newPayment->save();

    echo "     ✅ Payment created: {$newPayment->payment_method}, Amount: {$newPayment->amount}\n";
}

// 5. Recalculate shift
echo "\n5. 🔄 Recalculating shift:\n";
$newShift->calculateExpectedTotals();
echo "   - Expected Cash: {$newShift->expected_cash}\n";
echo "   - Total Transactions: {$newShift->total_transactions}\n";

// 6. Test getActiveShift untuk Owner
echo "\n6. 🧪 Testing getActiveShift for Owner:\n";
$ownerActiveShift = CashierShift::open()
    ->where('user_id', 1)
    ->where('business_id', 1)
    ->where('outlet_id', 1)
    ->with(['user', 'outlet'])
    ->first();

if ($ownerActiveShift) {
    echo "   ✅ Active shift found: ID {$ownerActiveShift->id}\n";
    echo "   - Nama: {$ownerActiveShift->shift_name}\n";
    echo "   - Opening Balance: {$ownerActiveShift->opening_balance}\n";
    echo "   - Expected Cash: {$ownerActiveShift->expected_cash}\n";
    echo "   - Total Transactions: {$ownerActiveShift->total_transactions}\n";
    echo "   - Orders Count: " . $ownerActiveShift->orders()->count() . "\n";
} else {
    echo "   ❌ No active shift found for Owner\n";
}

echo "\n✅ Script selesai!\n";
?>
