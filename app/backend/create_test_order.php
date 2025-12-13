<?php

/**
 * Script untuk membuat order testing untuk hari ini
 *
 * Cara penggunaan:
 * php create_test_order.php [employee_id] [outlet_id] [business_id]
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Employee;
use App\Models\Business;
use App\Models\Outlet;
use Illuminate\Support\Str;
use Carbon\Carbon;

echo "===========================================\n";
echo "  CREATE TEST ORDER FOR TODAY  \n";
echo "===========================================\n\n";

// Get parameters
$employeeId = $argv[1] ?? 25; // Default: Kasir Salim
$outletId = $argv[2] ?? 1;
$businessId = $argv[3] ?? 1;

// Verify employee exists
$employee = Employee::find($employeeId);
if (!$employee) {
    echo "❌ ERROR: Employee ID {$employeeId} not found\n";
    exit(1);
}

// Verify outlet exists
$outlet = Outlet::find($outletId);
if (!$outlet) {
    echo "❌ ERROR: Outlet ID {$outletId} not found\n";
    exit(1);
}

// Verify business exists
$business = Business::find($businessId);
if (!$business) {
    echo "❌ ERROR: Business ID {$businessId} not found\n";
    exit(1);
}

echo "Creating order with:\n";
echo "  Employee ID : {$employeeId} ({$employee->user->name})\n";
echo "  Outlet ID   : {$outletId} ({$outlet->name})\n";
echo "  Business ID : {$businessId} ({$business->name})\n\n";

// Get some products
$products = Product::where('business_id', $businessId)
    ->where('is_active', 1)
    ->limit(3)
    ->get();

if ($products->count() === 0) {
    echo "❌ ERROR: No active products found for business ID {$businessId}\n";
    exit(1);
}

echo "Using products:\n";
foreach ($products as $product) {
    echo "  - {$product->name} (Rp " . number_format($product->price, 0, ',', '.') . ")\n";
}
echo "\n";

try {
    DB::beginTransaction();

    // Create order
    $orderNumber = 'ORD-TEST-' . time() . '-' . rand(100, 999);

    $subtotal = 0;
    foreach ($products as $product) {
        $subtotal += $product->price * 1; // 1 qty each
    }

    $taxAmount = $subtotal * 0.1; // 10% tax
    $total = $subtotal + $taxAmount;

    $order = Order::create([
        'order_number' => $orderNumber,
        'business_id' => $businessId,
        'outlet_id' => $outletId,
        'employee_id' => $employeeId,
        'customer_id' => null,
        'table_id' => null,
        'type' => 'takeaway',
        'status' => 'completed',
        'subtotal' => $subtotal,
        'tax_amount' => $taxAmount,
        'discount_amount' => 0,
        'service_charge' => 0,
        'delivery_fee' => 0,
        'total' => $total,
        'paid_amount' => $total,
        'change_amount' => 0,
        'payment_status' => 'paid',
        'notes' => 'Test order created for today - ' . now()->toDateTimeString(),
        'ordered_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    echo "✅ Order created: {$order->order_number}\n";
    echo "   Order ID: {$order->id}\n";
    echo "   Status: {$order->status}\n";
    echo "   Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
    echo "   Created at: {$order->created_at}\n\n";

    // Create order items
    echo "Creating order items:\n";
    foreach ($products as $product) {
        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 1,
            'price' => $product->price,
            'subtotal' => $product->price,
        ]);

        echo "  ✅ {$orderItem->product_name} x{$orderItem->quantity} = Rp " . number_format($orderItem->subtotal, 0, ',', '.') . "\n";
    }

    DB::commit();

    echo "\n✅ SUCCESS! Test order created successfully.\n";
    echo "\nOrder Details:\n";
    echo "==============\n";
    echo "Order Number : {$order->order_number}\n";
    echo "Order ID     : {$order->id}\n";
    echo "Employee     : {$employee->user->name} (ID: {$employeeId})\n";
    echo "Outlet       : {$outlet->name} (ID: {$outletId})\n";
    echo "Business     : {$business->name} (ID: {$businessId})\n";
    echo "Status       : {$order->status}\n";
    echo "Subtotal     : Rp " . number_format($order->subtotal, 0, ',', '.') . "\n";
    echo "Tax (10%)    : Rp " . number_format($order->tax_amount, 0, ',', '.') . "\n";
    echo "Total        : Rp " . number_format($order->total, 0, ',', '.') . "\n";
    echo "Items        : {$products->count()}\n";
    echo "Created At   : {$order->created_at}\n";
    echo "\nYou can now check the frontend to see if this order appears.\n";

} catch (\Exception $e) {
    DB::rollback();
    echo "\n❌ ERROR creating order:\n";
    echo $e->getMessage() . "\n";
    echo "\nStack trace:\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
