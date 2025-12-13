<?php

/**
 * Script untuk test sales API endpoint
 * Simulasi request dari frontend sebagai kasir
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

echo "===========================================\n";
echo "  TEST SALES API ENDPOINT  \n";
echo "===========================================\n\n";

// Login as kasir Salim
$kasir = User::find(22);
if (!$kasir) {
    echo "❌ ERROR: Kasir not found\n";
    exit(1);
}

echo "Testing as: {$kasir->name} (ID: {$kasir->id})\n";
echo "Role: {$kasir->role}\n\n";

// Set auth user
Auth::login($kasir);

// Create request simulation
$request = Request::create('/api/v1/sales/orders', 'GET', [
    'date_range' => 'today',
    'limit' => 5,
    'page' => 1,
]);

// Add headers
$request->headers->set('X-Business-Id', '1');
$request->headers->set('X-Outlet-Id', '1');
$request->headers->set('Authorization', 'Bearer fake-token-for-testing');

echo "Request Details:\n";
echo "================\n";
echo "Endpoint: GET /api/v1/sales/orders\n";
echo "Headers:\n";
echo "  X-Business-Id: " . $request->header('X-Business-Id') . "\n";
echo "  X-Outlet-Id: " . $request->header('X-Outlet-Id') . "\n";
echo "Parameters:\n";
echo "  date_range: today\n";
echo "  limit: 5\n";
echo "  page: 1\n\n";

// Call the controller
$controller = new \App\Http\Controllers\Api\SalesController();

try {
    // Set the request for the application
    app()->instance('request', $request);

    $response = $controller->getOrders($request);
    $responseData = json_decode($response->getContent(), true);

    echo "Response Status: " . $response->getStatusCode() . "\n";
    echo "=====================================\n\n";

    if ($responseData['success']) {
        $orders = $responseData['data']['orders'] ?? [];
        $pagination = $responseData['data'];

        echo "✅ SUCCESS!\n\n";
        echo "Orders Found: " . count($orders) . "\n";
        echo "Total Orders: " . ($pagination['total'] ?? 0) . "\n";
        echo "Current Page: " . ($pagination['current_page'] ?? 1) . "\n";
        echo "Last Page: " . ($pagination['last_page'] ?? 1) . "\n";
        echo "Per Page: " . ($pagination['per_page'] ?? 5) . "\n\n";

        if (count($orders) > 0) {
            echo "Orders List:\n";
            echo "============\n";
            foreach ($orders as $order) {
                echo "#{$order['order_number']}\n";
                echo "  ID: {$order['id']}\n";
                echo "  Customer: {$order['customer']}\n";
                echo "  Total: Rp " . number_format($order['total'], 0, ',', '.') . "\n";
                echo "  Status: {$order['status']}\n";
                echo "  Cashier: {$order['cashier']}\n";
                echo "  Time: {$order['created_at']}\n";
                echo "  Items: " . count($order['items']) . "\n";
                foreach ($order['items'] as $item) {
                    echo "    - {$item['qty']}x {$item['name']}\n";
                }
                echo "\n";
            }
        } else {
            echo "⚠️  NO ORDERS FOUND\n";
            echo "This means the filter is working but no orders match the criteria.\n";
        }
    } else {
        echo "❌ API ERROR:\n";
        echo $responseData['message'] ?? 'Unknown error';
        echo "\n";
    }

} catch (\Exception $e) {
    echo "❌ EXCEPTION:\n";
    echo $e->getMessage() . "\n\n";
    echo "Stack trace:\n";
    echo $e->getTraceAsString() . "\n";
}

// Now test the stats endpoint
echo "\n===========================================\n";
echo "  TEST STATS ENDPOINT  \n";
echo "===========================================\n\n";

$statsRequest = Request::create('/api/v1/sales/stats', 'GET', [
    'date_range' => 'today',
]);

$statsRequest->headers->set('X-Business-Id', '1');
$statsRequest->headers->set('X-Outlet-Id', '1');

try {
    app()->instance('request', $statsRequest);

    $statsResponse = $controller->getStats($statsRequest);
    $statsData = json_decode($statsResponse->getContent(), true);

    if ($statsData['success']) {
        $stats = $statsData['data'];

        echo "✅ Stats Retrieved:\n";
        echo "===================\n";
        echo "Total Orders: {$stats['total_orders']}\n";
        echo "Total Revenue: Rp " . number_format($stats['total_revenue'], 0, ',', '.') . "\n";
        echo "Avg Order Value: Rp " . number_format($stats['avg_order_value'], 0, ',', '.') . "\n";
        echo "Active Customers: {$stats['active_customers']}\n";
        echo "\n";
    } else {
        echo "❌ Stats API ERROR:\n";
        echo $statsData['message'] ?? 'Unknown error';
        echo "\n";
    }

} catch (\Exception $e) {
    echo "❌ STATS EXCEPTION:\n";
    echo $e->getMessage() . "\n";
}

echo "\n===========================================\n";
echo "  END OF TEST\n";
echo "===========================================\n";
