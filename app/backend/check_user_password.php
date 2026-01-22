<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$email = 'julimandala@gmail.com';
$password = 'Mandala@123';

echo "🔍 Checking user: {$email}\n";
echo "================================\n\n";

$user = User::where('email', $email)->first();

if (!$user) {
    echo "❌ User NOT found in database\n";
    exit(1);
}

echo "✅ User found:\n";
echo "   ID: {$user->id}\n";
echo "   Name: {$user->name}\n";
echo "   Email: {$user->email}\n";
echo "   Role: {$user->role}\n";
echo "   Is Active: " . ($user->is_active ? 'Yes' : 'No') . "\n";
echo "   Email Verified: " . ($user->email_verified_at ? 'Yes' : 'No') . "\n";
echo "   Password Hash: " . substr($user->password, 0, 30) . "...\n\n";

echo "🔐 Testing password: {$password}\n";
$passwordValid = Hash::check($password, $user->password);
echo "   Password valid: " . ($passwordValid ? '✅ YES' : '❌ NO') . "\n\n";

if (!$passwordValid) {
    echo "🔧 Attempting to reset password...\n";
    $user->password = Hash::make($password);
    $user->save();
    
    echo "✅ Password updated!\n";
    echo "🔐 Testing new password...\n";
    $newPasswordValid = Hash::check($password, $user->password);
    echo "   Password valid: " . ($newPasswordValid ? '✅ YES' : '❌ NO') . "\n";
    
    if ($newPasswordValid) {
        echo "\n✅ Password has been reset successfully!\n";
        echo "   You can now login with:\n";
        echo "   Email: {$email}\n";
        echo "   Password: {$password}\n";
    }
}
