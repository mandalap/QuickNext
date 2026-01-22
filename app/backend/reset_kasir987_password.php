<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Reset password for kasir987@hayastore.local
$user = \App\Models\User::where('email', 'kasir987@hayastore.local')->first();

if ($user) {
    // Reset password to 'password123' (default password)
    $newPassword = 'password123';
    $user->password = \Illuminate\Support\Facades\Hash::make($newPassword);
    $user->save();

    echo "✅ Password reset successful!\n";
    echo "-----------------------------------\n";
    echo "Email: " . $user->email . "\n";
    echo "Name: " . $user->name . "\n";
    echo "Password: " . $newPassword . "\n";
    echo "Role: " . $user->role . "\n";
    echo "Active: " . ($user->is_active ? 'Yes' : 'No') . "\n";
    echo "-----------------------------------\n";
    echo "You can now login with these credentials.\n";
    
    // Get employee info if exists
    $employee = \App\Models\Employee::where('user_id', $user->id)->with('business')->first();
    if ($employee) {
        echo "\nEmployee Info:\n";
        echo "Employee Name: " . $employee->name . "\n";
        echo "Business: " . ($employee->business ? $employee->business->name : 'NULL') . "\n";
    }
} else {
    echo "❌ User not found with email: kasir987@hayastore.local\n";
}

