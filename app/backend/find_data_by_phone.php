<?php

/**
 * Script untuk mencari semua data terkait dengan phone tertentu
 * 
 * Usage: php find_data_by_phone.php <phone>
 * Example: php find_data_by_phone.php 085652373501
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$phone = $argv[1] ?? null;

if (!$phone) {
    echo "❌ Usage: php find_data_by_phone.php <phone>\n";
    echo "Example: php find_data_by_phone.php 085652373501\n";
    exit(1);
}

// Normalize phone number
$phone = preg_replace('/[^0-9]/', '', $phone);
if (substr($phone, 0, 1) === '0') {
    $phone = '62' . substr($phone, 1);
}
if (substr($phone, 0, 2) !== '62') {
    $phone = '62' . $phone;
}

echo "🔍 Mencari semua data terkait dengan phone: {$phone}\n";
echo str_repeat("=", 60) . "\n\n";

// Find all users with this phone (including soft deleted)
$users = DB::table('users')
    ->where('phone', $phone)
    ->orWhere('phone', '0' . substr($phone, 2))
    ->orWhere('phone', substr($phone, 2))
    ->get();

echo "👤 Users dengan phone ini:\n";
if ($users->count() === 0) {
    echo "   ❌ Tidak ada user dengan phone ini\n";
} else {
    foreach ($users as $user) {
        $status = $user->deleted_at ? "DELETED (soft delete)" : "ACTIVE";
        echo "   - ID: {$user->id}, Name: {$user->name}, Email: {$user->email}, Status: {$status}\n";
        if ($user->deleted_at) {
            echo "     Deleted At: {$user->deleted_at}\n";
        }
    }
}
echo "\n";

// Check customers by phone
echo "👤 Customers dengan phone ini:\n";
$customers = DB::table('customers')
    ->where('phone', $phone)
    ->orWhere('phone', '0' . substr($phone, 2))
    ->orWhere('phone', substr($phone, 2))
    ->get(['id', 'name', 'email', 'phone', 'business_id', 'created_at']);

if ($customers->count() > 0) {
    echo "   ⚠️  Found {$customers->count()} customers:\n";
    foreach ($customers as $customer) {
        echo "      - Customer ID: {$customer->id}, Name: {$customer->name}, Business ID: {$customer->business_id}, Created: {$customer->created_at}\n";
    }
} else {
    echo "   ✅ Tidak ada customers\n";
}
echo "\n";

// Check orders by customer phone (from customer_data JSON or customer table)
echo "📦 Orders yang mungkin terkait (via customer):\n";

// First, get customer IDs with this phone
$customerIds = DB::table('customers')
    ->where(function($q) use ($phone) {
        $q->where('phone', $phone)
          ->orWhere('phone', '0' . substr($phone, 2))
          ->orWhere('phone', substr($phone, 2));
    })
    ->pluck('id')
    ->toArray();

$ordersByCustomer = [];
if (count($customerIds) > 0) {
    $ordersByCustomer = DB::table('orders')
        ->whereIn('customer_id', $customerIds)
        ->get(['id', 'order_number', 'customer_id', 'business_id', 'created_at']);
}

// Alternative: check customer_data JSON field
$ordersByData = DB::table('orders')
    ->whereNotNull('customer_data')
    ->get(['id', 'order_number', 'customer_data', 'customer_id', 'business_id', 'created_at']);

$relatedOrders = [];
foreach ($ordersByData as $order) {
    $customerData = json_decode($order->customer_data, true);
    if ($customerData && isset($customerData['phone'])) {
        $orderPhone = preg_replace('/[^0-9]/', '', $customerData['phone']);
        if (substr($orderPhone, 0, 1) === '0') {
            $orderPhone = '62' . substr($orderPhone, 1);
        }
        if (substr($orderPhone, 0, 2) !== '62') {
            $orderPhone = '62' . $orderPhone;
        }
        if ($orderPhone === $phone || substr($orderPhone, 2) === substr($phone, 2)) {
            $relatedOrders[] = $order;
        }
    }
}

// Merge orders
$allRelatedOrders = array_merge($ordersByCustomer, $relatedOrders);

if (count($allRelatedOrders) > 0) {
    echo "   ⚠️  Found " . count($allRelatedOrders) . " orders dengan customer phone ini:\n";
    foreach (array_slice($allRelatedOrders, 0, 10) as $order) {
        $orderObj = is_array($order) ? (object)$order : $order;
        echo "      - Order #{$orderObj->order_number}, Business ID: {$orderObj->business_id}, Created: {$orderObj->created_at}\n";
    }
    if (count($allRelatedOrders) > 10) {
        echo "      ... and " . (count($allRelatedOrders) - 10) . " more orders\n";
    }
} else {
    echo "   ✅ Tidak ada orders terkait\n";
}
echo "\n";

echo str_repeat("=", 60) . "\n";
echo "💡 KESIMPULAN:\n";
echo "   Data yang terkait dengan phone ini mungkin ada di:\n";
echo "   - Customers table (berdasarkan phone)\n";
echo "   - Orders table (berdasarkan customer phone di customer_data JSON)\n";
echo "\n";
echo "   Data ini TIDAK otomatis terhapus ketika user dihapus karena\n";
echo "   tidak ada foreign key relationship langsung dengan users table.\n";

