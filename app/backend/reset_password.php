<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Reset password user pertama ke '123456'
$user = \App\Models\User::first();

if ($user) {
    $user->password = \Illuminate\Support\Facades\Hash::make('123456');
    $user->save();

    echo "✅ Password reset successful!\n";
    echo "-----------------------------------\n";
    echo "Email: " . $user->email . "\n";
    echo "Password: 123456\n";
    echo "Role: " . $user->role . "\n";
    echo "-----------------------------------\n";
    echo "You can now login with these credentials.\n";
} else {
    echo "❌ No users found in database.\n";
}
