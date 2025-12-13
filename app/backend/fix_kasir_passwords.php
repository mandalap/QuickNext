<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

// Fix kasir passwords
function fixKasirPasswords() {
    echo "🔧 FIXING KASIR PASSWORDS\n";
    echo "=========================\n\n";

    $kasirUsers = [
        [
            'email' => 'kasir1@gmail.com',
            'name' => 'Kasir 1',
            'role' => 'kasir'
        ],
        [
            'email' => 'kasir2@gmail.com',
            'name' => 'Kasir 2',
            'role' => 'kitchen'
        ]
    ];

    foreach ($kasirUsers as $kasirData) {
        $user = User::where('email', $kasirData['email'])->first();

        if (!$user) {
            echo "❌ User not found: " . $kasirData['email'] . "\n";
            continue;
        }

        // Update password
        $user->password = Hash::make('password123');
        $user->save();

        echo "✅ Updated password for: " . $kasirData['name'] . " (" . $kasirData['email'] . ")\n";
        echo "  Role: " . $user->role . "\n";
        echo "  New password: password123\n";
        echo "  ---\n";
    }

    echo "\n🎯 UPDATED LOGIN CREDENTIALS:\n";
    echo "  Kasir 1: kasir1@gmail.com / password123\n";
    echo "  Kasir 2 (Kitchen): kasir2@gmail.com / password123\n";

    echo "\n✅ KASIR PASSWORDS FIXED!\n";
}

// Run the function
fixKasirPasswords();

?>












































































