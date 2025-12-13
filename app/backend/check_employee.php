<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Checking Employees:\n";
echo str_repeat('-', 80) . "\n";

$employees = \App\Models\Employee::with(['user', 'business'])->get();

if ($employees->count() > 0) {
    foreach ($employees as $employee) {
        echo "Employee: {$employee->name}\n";
        echo "  Email: {$employee->email}\n";
        echo "  User ID: {$employee->user_id}\n";
        echo "  User Role: " . ($employee->user ? $employee->user->role : 'NULL') . "\n";
        echo "  Business ID: {$employee->business_id}\n";
        echo "  Business Name: " . ($employee->business ? $employee->business->name : 'NULL') . "\n";
        echo str_repeat('-', 80) . "\n";
    }
    echo "Total employees: " . $employees->count() . "\n";
} else {
    echo "No employees found in database.\n";
}
