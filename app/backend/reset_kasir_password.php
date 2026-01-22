<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Reset password for kasir
$user = \App\Models\User::where('email', 'kasir1@gmail.com')->first();

if ($user) {
    $user->password = \Illuminate\Support\Facades\Hash::make('123456');
    $user->save();

    echo "✅ Password reset successful!\n";
    echo "-----------------------------------\n";
    echo "Email: " . $user->email . "\n";
    echo "Password: 123456\n";
    echo "Role: " . $user->role . "\n";
    echo "-----------------------------------\n";

    // Get employee info
    $employee = \App\Models\Employee::where('user_id', $user->id)->with('business')->first();
    if ($employee) {
        echo "Employee Name: " . $employee->name . "\n";
        echo "Business: " . ($employee->business ? $employee->business->name : 'NULL') . "\n";
    }

    echo "-----------------------------------\n";
    echo "You can now login with these credentials.\n";
} else {
    echo "❌ User not found.\n";
}
