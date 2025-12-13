<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Order;

echo "CHECK ORDER 326 & 327\n";
echo "=====================\n\n";

foreach ([326, 327] as $orderId) {
    $order = Order::with('payments')->find($orderId);

    if (!$order) {
        echo "Order $orderId not found\n\n";
        continue;
    }

    echo "Order #{$order->order_number} (ID: $orderId)\n";
    echo "  Total Order: Rp " . number_format($order->total, 0, ',', '.') . "\n";
    echo "  Paid Amount: Rp " . number_format($order->paid_amount, 0, ',', '.') . "\n";
    echo "  Change: Rp " . number_format($order->change_amount, 0, ',', '.') . "\n";
    echo "  Status: {$order->status} / {$order->payment_status}\n";

    echo "  Payments:\n";
    foreach ($order->payments as $payment) {
        echo "    - Method: {$payment->payment_method}\n";
        echo "      Amount: Rp " . number_format($payment->amount, 0, ',', '.') . "\n";
    }
    echo "\n";
}

echo "ANALYSIS:\n";
echo "=========\n";
echo "Jika customer bayar lebih (ada kembalian),\n";
echo "maka payment->amount akan lebih besar dari order->total.\n";
echo "\n";
echo "Untuk tutup kasir:\n";
echo "  - Gunakan payment->amount = uang yang diterima kasir\n";
echo "  - BUKAN order->total\n";
echo "\n";
echo "Karena kasir harus count uang fisik yang ada di laci.\n";
