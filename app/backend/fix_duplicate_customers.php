<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

echo "🔧 FIX DUPLICATE CUSTOMERS BY PHONE PER OUTLET\n";
echo "===============================================\n\n";

// Get all business IDs
$businesses = DB::table('businesses')->select('id', 'name')->get();

foreach ($businesses as $business) {
    echo "Processing Business: {$business->name} (ID: {$business->id})\n";
    echo str_repeat("-", 50) . "\n";

    // Group customers by phone for this business
    $customersByPhone = Customer::where('business_id', $business->id)
        ->whereNotNull('phone')
        ->get()
        ->groupBy('phone');

    foreach ($customersByPhone as $phone => $customers) {
        if ($customers->count() <= 1) {
            continue; // No duplicates
        }

        echo "\n📱 Phone: {$phone} - Found {$customers->count()} customers:\n";

        // Group by outlet based on orders
        $customersByOutlet = [];
        foreach ($customers as $customer) {
            $outlets = Order::where('customer_id', $customer->id)
                ->distinct()
                ->pluck('outlet_id')
                ->toArray();

            if (empty($outlets)) {
                $customersByOutlet['no_orders'][] = $customer;
            } else {
                foreach ($outlets as $outletId) {
                    if (!isset($customersByOutlet[$outletId])) {
                        $customersByOutlet[$outletId] = [];
                    }
                    $customersByOutlet[$outletId][] = $customer;
                }
            }
        }

        // Process each outlet group
        foreach ($customersByOutlet as $outletId => $outletCustomers) {
            if (count($outletCustomers) <= 1) {
                continue;
            }

            if ($outletId === 'no_orders') {
                echo "  Outlet: No orders - Keep newest customer\n";
                // Keep newest customer, mark others for deletion
                $sorted = collect($outletCustomers)->sortByDesc('created_at');
                $keepCustomer = $sorted->first();
                $deleteCustomers = $sorted->skip(1);

                echo "    ✅ Keep: {$keepCustomer->name} (ID: {$keepCustomer->id})\n";
                foreach ($deleteCustomers as $deleteCustomer) {
                    echo "    ❌ Delete: {$deleteCustomer->name} (ID: {$deleteCustomer->id})\n";
                    $deleteCustomer->delete();
                }
            } else {
                $outletName = DB::table('outlets')->where('id', $outletId)->value('name') ?? "Outlet ID {$outletId}";
                echo "  Outlet: {$outletName}\n";

                // Find customer with most orders in this outlet
                $customerStats = [];
                foreach ($outletCustomers as $customer) {
                    $orderCount = Order::where('customer_id', $customer->id)
                        ->where('outlet_id', $outletId)
                        ->count();
                    $totalSpent = Order::where('customer_id', $customer->id)
                        ->where('outlet_id', $outletId)
                        ->sum('total');

                    $customerStats[] = [
                        'customer' => $customer,
                        'orders' => $orderCount,
                        'total_spent' => $totalSpent,
                    ];
                }

                // Sort by order count desc, then by total spent desc, then by created_at desc
                usort($customerStats, function ($a, $b) {
                    if ($a['orders'] != $b['orders']) {
                        return $b['orders'] - $a['orders'];
                    }
                    if ($a['total_spent'] != $b['total_spent']) {
                        return $b['total_spent'] <=> $a['total_spent'];
                    }
                    return $b['customer']->created_at <=> $a['customer']->created_at;
                });

                $keepCustomer = $customerStats[0]['customer'];
                $deleteCustomers = array_slice($customerStats, 1);

                echo "    ✅ Keep: {$keepCustomer->name} (ID: {$keepCustomer->id}) - {$customerStats[0]['orders']} orders\n";

                foreach ($deleteCustomers as $stat) {
                    $deleteCustomer = $stat['customer'];
                    $orderCount = $stat['orders'];

                    if ($orderCount > 0) {
                        // Move orders to keep customer
                        echo "    🔄 Move {$orderCount} orders from {$deleteCustomer->name} (ID: {$deleteCustomer->id}) to {$keepCustomer->name}\n";
                        Order::where('customer_id', $deleteCustomer->id)
                            ->where('outlet_id', $outletId)
                            ->update(['customer_id' => $keepCustomer->id]);
                    }

                    echo "    ❌ Delete: {$deleteCustomer->name} (ID: {$deleteCustomer->id})\n";
                    $deleteCustomer->delete();
                }
            }
        }
    }

    echo "\n";
}

echo "✅ Done!\n";


