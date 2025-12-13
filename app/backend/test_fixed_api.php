<?php

/**
 * Test fixed API for user 8
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Employee;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

echo "===========================================\n";
echo "  TEST FIXED API FOR USER 8\n";
echo "===========================================\n\n";

$user = User::find(8);
echo "User: {$user->name} (ID: {$user->id})\n";
echo "Role: {$user->role}\n\n";

$employee = Employee::where('user_id', $user->id)->first();
echo "Employee ID: {$employee->id}\n";
echo "Business ID: {$employee->business_id}\n\n";

$ordersToday = Order::where('employee_id', $employee->id)
    ->whereDate('created_at', today())
    ->get();

echo "Orders today for employee {$employee->id}: {$ordersToday->count()}\n\n";

if ($ordersToday->count() > 0) {
    echo "Orders:\n";
    foreach ($ordersToday as $order) {
        echo "  #{$order->order_number} | {$order->status} | Rp " . number_format($order->total, 0, ',', '.') . " | {$order->created_at}\n";
    }
}

echo "\n";
echo "Now testing the API endpoint...\n";
echo "================================\n\n";

// Login as user 8
Auth::login($user);

// Create request
$request = Request::create('/api/v1/sales/orders', 'GET', [
    'date_range' => 'today',
    'limit' => 5,
    'page' => 1,
]);

$request->headers->set('X-Business-Id', '1');
$request->headers->set('X-Outlet-Id', '4');

app()->instance('request', $request);

$controller = new \App\Http\Controllers\Api\SalesController();

try {
    $response = $controller->getOrders($request);
    $data = json_decode($response->getContent(), true);

    echo "API Response:\n";
    echo "=============\n";
    echo "Success: " . ($data['success'] ? 'YES' : 'NO') . "\n";
    echo "Orders Found: " . count($data['data']['orders'] ?? []) . "\n";
    echo "Total: " . ($data['data']['total'] ?? 0) . "\n\n";

    if (count($data['data']['orders'] ?? []) > 0) {
        echo "✅ FIXED! Orders are now showing:\n";
        foreach ($data['data']['orders'] as $order) {
            echo "  #{$order['order_number']} | {$order['status']} | Rp " . number_format($order['total'], 0, ',', '.') . "\n";
        }
    } else {
        echo "❌ Still no orders showing. Checking why...\n";
    }

} catch (\Exception $e) {
    echo "❌ ERROR: {$e->getMessage()}\n";
}

echo "\n===========================================\n";
echo "  END OF TEST\n";
echo "===========================================\n";
