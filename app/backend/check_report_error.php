<?php
/**
 * Script untuk check error di ReportController
 * 
 * Usage: php check_report_error.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

echo "\n";
echo "========================================\n";
echo "  CHECK REPORT ERROR\n";
echo "========================================\n";
echo "\n";

// 1. Check log file
$logPath = storage_path('logs/laravel.log');
if (file_exists($logPath)) {
    echo "📋 Reading log file: {$logPath}\n";
    echo "   Last 50 lines:\n";
    echo "   " . str_repeat("-", 50) . "\n";
    
    $lines = file($logPath);
    $lastLines = array_slice($lines, -50);
    foreach ($lastLines as $line) {
        if (stripos($line, 'ReportController') !== false || 
            stripos($line, 'getSalesSummary') !== false ||
            stripos($line, 'error') !== false) {
            echo "   " . trim($line) . "\n";
        }
    }
    echo "\n";
} else {
    echo "⚠️  Log file not found: {$logPath}\n\n";
}

// 2. Test database connection
echo "🔍 Testing database connection...\n";
try {
    DB::connection()->getPdo();
    echo "   ✅ Database connected\n";
} catch (\Exception $e) {
    echo "   ❌ Database error: " . $e->getMessage() . "\n";
}
echo "\n";

// 3. Test orders table
echo "🔍 Checking orders table...\n";
try {
    $orderCount = DB::table('orders')->count();
    $paidOrders = DB::table('orders')->where('payment_status', 'paid')->count();
    echo "   Total orders: {$orderCount}\n";
    echo "   Paid orders: {$paidOrders}\n";
} catch (\Exception $e) {
    echo "   ❌ Error: " . $e->getMessage() . "\n";
}
echo "\n";

// 4. Test date range calculation
echo "🔍 Testing date range calculation...\n";
try {
    $now = \Carbon\Carbon::now('Asia/Jakarta');
    $todayStart = $now->copy()->startOfDay();
    $todayEnd = $now->copy()->endOfDay();
    
    echo "   Today start: {$todayStart->toDateTimeString()}\n";
    echo "   Today end: {$todayEnd->toDateTimeString()}\n";
    echo "   ✅ Date range calculation OK\n";
} catch (\Exception $e) {
    echo "   ❌ Error: " . $e->getMessage() . "\n";
}
echo "\n";

// 5. Test query
echo "🔍 Testing sales summary query...\n";
try {
    $now = \Carbon\Carbon::now('Asia/Jakarta');
    $startDate = $now->copy()->startOfDay()->toDateTimeString();
    $endDate = $now->copy()->endOfDay()->toDateTimeString();
    
    $query = DB::table('orders')
        ->whereBetween('created_at', [$startDate, $endDate])
        ->where('payment_status', 'paid')
        ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
    
    $count = $query->count();
    $total = $query->sum('total');
    
    echo "   Orders found: {$count}\n";
    echo "   Total sales: " . number_format($total, 0, ',', '.') . "\n";
    echo "   ✅ Query OK\n";
} catch (\Exception $e) {
    echo "   ❌ Query error: " . $e->getMessage() . "\n";
    echo "   Stack trace:\n";
    echo "   " . str_replace("\n", "\n   ", $e->getTraceAsString()) . "\n";
}
echo "\n";

echo "========================================\n";
echo "  DONE\n";
echo "========================================\n";
echo "\n";
echo "💡 Tips:\n";
echo "   1. Check log file: tail -f storage/logs/laravel.log\n";
echo "   2. Check browser console for frontend errors\n";
echo "   3. Check network tab in browser DevTools\n";
echo "\n";

