<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

echo "Starting migration of orders to payments...\n\n";

// Get all completed orders that don't have payments
$orders = Order::whereIn('status', ['completed', 'paid'])
    ->where('payment_status', 'paid')
    ->whereDoesntHave('payments')
    ->get();

echo "Found " . $orders->count() . " orders without payment records\n\n";

$created = 0;
$failed = 0;

foreach ($orders as $order) {
    try {
        // Determine payment method based on order type or default to cash
        $paymentMethod = 'cash'; // Default

        // You can add logic here to determine payment method
        // For now, we'll create cash payments for all orders

        Payment::create([
            'order_id' => $order->id,
            'payment_method' => $paymentMethod,
            'amount' => $order->total > 0 ? $order->total : 0,
            'status' => 'success',
            'paid_at' => $order->created_at,
            'created_at' => $order->created_at,
            'updated_at' => $order->updated_at,
        ]);

        $created++;

        if ($created % 50 == 0) {
            echo "Created $created payments...\n";
        }

    } catch (\Exception $e) {
        $failed++;
        echo "Failed for order {$order->id}: " . $e->getMessage() . "\n";
    }
}

echo "\n✅ Migration complete!\n";
echo "Created: $created payments\n";
echo "Failed: $failed payments\n";

// Show summary by payment method
$summary = Payment::select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total'))
    ->groupBy('payment_method')
    ->get();

echo "\n📊 Payment Summary:\n";
foreach ($summary as $item) {
    echo "  - {$item->payment_method}: {$item->count} transactions, Total: Rp " . number_format($item->total, 0, ',', '.') . "\n";
}
