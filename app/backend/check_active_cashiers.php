<?php

require 'vendor/autoload.php';
require 'bootstrap/app.php';

use App\Models\CashierShift;
use App\Models\Employee;
use App\Models\User;

echo "=== CHECK KASIR AKTIF ===" . PHP_EOL;

// Check active shifts
$activeShifts = CashierShift::where('status', 'open')
    ->with(['employee.user', 'user'])
    ->get();

echo "Jumlah shift aktif: " . $activeShifts->count() . PHP_EOL . PHP_EOL;

foreach ($activeShifts as $shift) {
    echo "Shift ID: " . $shift->id . PHP_EOL;
    echo "User ID: " . $shift->user_id . PHP_EOL;
    echo "Employee ID: " . ($shift->employee_id ?? 'NULL') . PHP_EOL;
    echo "Status: " . $shift->status . PHP_EOL;
    echo "Opened At: " . $shift->opened_at . PHP_EOL;

    if ($shift->employee && $shift->employee->user) {
        echo "Employee Name: " . $shift->employee->user->name . PHP_EOL;
        echo "Employee Email: " . $shift->employee->user->email . PHP_EOL;
    } else {
        echo "Employee: NULL" . PHP_EOL;
    }

    if ($shift->user) {
        echo "User Name: " . $shift->user->name . PHP_EOL;
        echo "User Email: " . $shift->user->email . PHP_EOL;
    }

    echo "---" . PHP_EOL;
}

echo PHP_EOL . "=== CHECK PELANGGAN DI ORDERS ===" . PHP_EOL;

// Check recent orders with customer data
$recentOrders = \App\Models\Order::with(['customer', 'employee.user'])
    ->where('status', 'completed')
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get();

echo "Jumlah orders terbaru: " . $recentOrders->count() . PHP_EOL . PHP_EOL;

foreach ($recentOrders as $order) {
    echo "Order ID: " . $order->id . PHP_EOL;
    echo "Order Number: " . $order->order_number . PHP_EOL;
    echo "Customer ID: " . ($order->customer_id ?? 'NULL') . PHP_EOL;

    if ($order->customer) {
        echo "Customer Name: " . $order->customer->name . PHP_EOL;
        echo "Customer Phone: " . $order->customer->phone . PHP_EOL;
        echo "Customer Email: " . $order->customer->email . PHP_EOL;
    } else {
        echo "Customer: NULL" . PHP_EOL;
    }

    if ($order->employee && $order->employee->user) {
        echo "Employee Name: " . $order->employee->user->name . PHP_EOL;
    } else {
        echo "Employee: NULL" . PHP_EOL;
    }

    echo "Total: " . $order->total . PHP_EOL;
    echo "Created At: " . $order->created_at . PHP_EOL;
    echo "---" . PHP_EOL;
}
