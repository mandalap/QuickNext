<?php
/**
 * Script untuk memperbaiki orders yang tidak terhubung dengan shift
 */

require_once 'vendor/autoload.php';

// Load Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\CashierShift;
use App\Models\Order;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

echo "🔧 Fix Shift Orders\n";
echo "==================\n\n";

// 1. Cek orders yang tidak memiliki shift_id
echo "1. 📋 Orders tanpa Shift ID:\n";
$ordersWithoutShift = Order::whereNull('shift_id')->get();
echo "   Total orders tanpa shift_id: " . $ordersWithoutShift->count() . "\n\n";

// 2. Cek shift aktif
echo "2. 🔄 Shift Aktif:\n";
$activeShifts = CashierShift::where('status', 'open')->get();
echo "   Total active shifts: " . $activeShifts->count() . "\n\n";

// 3. Cek employees
echo "3. 👥 Employees:\n";
$employees = Employee::with('user')->get();
echo "   Total employees: " . $employees->count() . "\n";
foreach ($employees as $employee) {
    echo "   - ID: {$employee->id}, User: {$employee->user->name}, Business: {$employee->business_id}\n";
}
echo "\n";

// 4. Cek orders dengan employee_id
echo "4. 📊 Orders dengan Employee ID:\n";
$ordersWithEmployee = Order::whereNotNull('employee_id')->get();
echo "   Total orders dengan employee_id: " . $ordersWithEmployee->count() . "\n";

$ordersWithoutEmployee = Order::whereNull('employee_id')->get();
echo "   Total orders tanpa employee_id: " . $ordersWithoutEmployee->count() . "\n\n";

// 5. Coba hubungkan orders dengan shift
echo "5. 🔗 Menghubungkan Orders dengan Shift:\n";

$connectedCount = 0;
$notConnectedCount = 0;

foreach ($ordersWithoutShift as $order) {
    echo "   Processing Order ID: {$order->id}\n";
    echo "     Employee ID: " . ($order->employee_id ? $order->employee_id : 'null') . "\n";
    echo "     Business ID: {$order->business_id}\n";
    echo "     Outlet ID: {$order->outlet_id}\n";
    echo "     Created At: {$order->created_at}\n";

    // Cari shift aktif yang sesuai
    $matchingShift = null;

    if ($order->employee_id) {
        // Cari shift berdasarkan employee_id
        $matchingShift = CashierShift::where('status', 'open')
            ->where('employee_id', $order->employee_id)
            ->where('business_id', $order->business_id)
            ->where('outlet_id', $order->outlet_id)
            ->first();
    }

    if (!$matchingShift) {
        // Cari shift berdasarkan user_id (jika employee tidak ada)
        $employee = Employee::find($order->employee_id);
        if ($employee) {
            $matchingShift = CashierShift::where('status', 'open')
                ->where('user_id', $employee->user_id)
                ->where('business_id', $order->business_id)
                ->where('outlet_id', $order->outlet_id)
                ->first();
        }
    }

    if ($matchingShift) {
        echo "     ✅ Found matching shift: {$matchingShift->id}\n";

        // Update order dengan shift_id
        $order->shift_id = $matchingShift->id;
        $order->save();

        $connectedCount++;
    } else {
        echo "     ❌ No matching shift found\n";
        $notConnectedCount++;
    }

    echo "\n";
}

echo "6. 📊 Hasil:\n";
echo "   Orders yang berhasil dihubungkan: {$connectedCount}\n";
echo "   Orders yang tidak bisa dihubungkan: {$notConnectedCount}\n\n";

// 7. Recalculate semua shift aktif
echo "7. 🔄 Recalculating Active Shifts:\n";
foreach ($activeShifts as $shift) {
    echo "   Recalculating shift ID: {$shift->id}\n";

    $beforeExpectedCash = $shift->expected_cash;
    $beforeTotalTransactions = $shift->total_transactions;

    $shift->calculateExpectedTotals();

    echo "   Before - Expected Cash: {$beforeExpectedCash}, Total Trans: {$beforeTotalTransactions}\n";
    echo "   After  - Expected Cash: {$shift->expected_cash}, Total Trans: {$shift->total_transactions}\n\n";
}

echo "✅ Fix selesai!\n";
?>


























































