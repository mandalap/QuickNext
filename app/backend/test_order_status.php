<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Test order status endpoint
$orderNumber = 'SS-19941729';

$order = \App\Models\Order::with(['orderItems.product', 'table', 'outlet', 'discount'])
    ->where('order_number', $orderNumber)
    ->first();

if ($order) {
    echo "Order found!\n";
    echo "Order Number: {$order->order_number}\n";
    echo "Type: {$order->type}\n";
    echo "Status: {$order->status}\n";
    echo "Subtotal: {$order->subtotal}\n";
    echo "Tax: {$order->tax_amount}\n";
    echo "Discount: {$order->discount_amount}\n";
    echo "Total: {$order->total}\n";

    if ($order->table) {
        echo "\nTable Info:\n";
        echo "  Name: {$order->table->name}\n";
        echo "  QR: {$order->table->qr_code}\n";
    }

    if ($order->outlet) {
        echo "\nOutlet Info:\n";
        echo "  Name: {$order->outlet->name}\n";
        echo "  Address: {$order->outlet->address}\n";
        echo "  Phone: {$order->outlet->phone}\n";
    }

    echo "\nItems:\n";
    foreach ($order->orderItems as $item) {
        echo "  - {$item->product_name} x{$item->quantity} @ {$item->price} = {$item->subtotal}\n";
    }

    echo "\n\nJSON Response:\n";
    echo json_encode([
        'success' => true,
        'data' => [
            'order_number' => $order->order_number,
            'type' => $order->type,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'customer_name' => $order->customer_data['name'] ?? null,
            'customer_phone' => $order->customer_data['phone'] ?? null,
            'customer_email' => $order->customer_data['email'] ?? null,
            'items' => $order->orderItems,
            'subtotal' => $order->subtotal,
            'tax_amount' => $order->tax_amount,
            'discount_amount' => $order->discount_amount,
            'discount_code' => $order->coupon_code,
            'total' => $order->total,
            'notes' => $order->notes,
            'table' => $order->table ? [
                'id' => $order->table->id,
                'name' => $order->table->name,
                'qr_code' => $order->table->qr_code,
            ] : null,
            'outlet' => $order->outlet ? [
                'id' => $order->outlet->id,
                'name' => $order->outlet->name,
                'address' => $order->outlet->address,
                'phone' => $order->outlet->phone,
            ] : null,
            'created_at' => $order->created_at,
        ]
    ], JSON_PRETTY_PRINT);
} else {
    echo "Order not found: {$orderNumber}\n";
}
