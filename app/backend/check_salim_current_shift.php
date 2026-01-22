<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CashierShift;
use App\Models\Order;
use App\Models\User;
use App\Models\Employee;

echo "CHECK KASIR SALIM CURRENT SHIFT\n";
echo "================================\n\n";

$user = User::where('email', 'kasirsalim@gmail.com')->first();
if (!$user) {
    echo "❌ User not found\n";
    exit;
}

echo "User: {$user->name} (ID: {$user->id})\n\n";

// Get employee
$employee = Employee::where('user_id', $user->id)->first();
echo "Employee ID: " . ($employee?->id ?? 'NULL') . "\n\n";

// Get ALL shifts for this user (baru dibuka)
$allShifts = CashierShift::where('user_id', $user->id)
    ->orderBy('opened_at', 'desc')
    ->get();

echo "Total Shifts: {$allShifts->count()}\n\n";

foreach ($allShifts as $shift) {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "SHIFT ID: {$shift->id}\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "Nama Shift: {$shift->shift_name}\n";
    echo "Status: {$shift->status}\n";
    echo "Outlet ID: {$shift->outlet_id}\n";
    echo "Employee ID: " . ($shift->employee_id ?? 'NULL') . "\n";
    echo "Opening Balance: Rp " . number_format($shift->opening_balance, 0, ',', '.') . "\n";
    echo "Opened At: {$shift->opened_at}\n";
    echo "Closed At: " . ($shift->closed_at ?? 'NULL') . "\n\n";

    // Recalculate
    echo "RECALCULATING...\n";
    $shift->calculateExpectedTotals();
    $shift->refresh();

    echo "\nRESULTS AFTER RECALCULATION:\n";
    echo "Total Transactions: {$shift->total_transactions}\n";
    echo "Expected Total: Rp " . number_format($shift->expected_total, 0, ',', '.') . "\n";
    echo "Expected Cash: Rp " . number_format($shift->expected_cash, 0, ',', '.') . "\n";
    echo "Cash Transactions: {$shift->cash_transactions}\n\n";

    // Check orders dengan shift_id
    $ordersViaShiftId = Order::where('shift_id', $shift->id)->get();
    echo "Orders (via shift_id): {$ordersViaShiftId->count()}\n";
    
    if ($ordersViaShiftId->count() > 0) {
        foreach ($ordersViaShiftId as $order) {
            echo "  - Order #{$order->order_number} (ID: {$order->id})\n";
            echo "    Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
            echo "    Created: {$order->created_at}\n";
            
            // Show payments
            $payments = $order->payments;
            foreach ($payments as $payment) {
                echo "    Payment: {$payment->payment_method} = Rp " . number_format($payment->amount, 0, ',', '.') . "\n";
            }
            echo "    Change: Rp " . number_format($order->change_amount ?? 0, 0, ',', '.') . "\n";
        }
    }
    echo "\n";

    // Check orders tanpa shift_id tapi dari employee ini di outlet yang sama
    if ($employee) {
        echo "Orders (employee {$employee->id}, outlet {$shift->outlet_id}, tanpa shift_id, sejak shift dibuka):\n";
        $ordersWithoutShift = Order::where('employee_id', $employee->id)
            ->where('outlet_id', $shift->outlet_id)
            ->whereNull('shift_id')
            ->where('created_at', '>=', $shift->opened_at)
            ->get();
        
        echo "Found: {$ordersWithoutShift->count()}\n";
        foreach ($ordersWithoutShift as $order) {
            echo "  - Order #{$order->order_number} (ID: {$order->id})\n";
            echo "    Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
            echo "    Created: {$order->created_at}\n";
        }
    }
    
    echo "\n";
}

// Check all orders today untuk employee ini
if ($employee) {
    echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "ALL ORDERS TODAY FOR EMPLOYEE {$employee->id}\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    
    $todayOrders = Order::where('employee_id', $employee->id)
        ->whereDate('created_at', today())
        ->with('payments')
        ->get();
    
    echo "Total: {$todayOrders->count()} orders\n\n";
    
    foreach ($todayOrders as $order) {
        echo "Order #{$order->order_number} (ID: {$order->id})\n";
        echo "  shift_id: " . ($order->shift_id ?? 'NULL') . "\n";
        echo "  outlet_id: {$order->outlet_id}\n";
        echo "  Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
        echo "  Created: {$order->created_at}\n";
        
        foreach ($order->payments as $payment) {
            echo "  Payment: {$payment->payment_method} = Rp " . number_format($payment->amount, 0, ',', '.') . "\n";
        }
        echo "  Change: Rp " . number_format($order->change_amount ?? 0, 0, ',', '.') . "\n";
        echo "\n";
    }
}
