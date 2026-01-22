<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$email = 'julimandala@gmail.com';

echo "🔧 Fixing user admin access: {$email}\n";
echo "================================\n\n";

$user = User::where('email', $email)->first();

if (!$user) {
    echo "❌ User NOT found in database\n";
    exit(1);
}

echo "📋 Current user info:\n";
echo "   ID: {$user->id}\n";
echo "   Name: {$user->name}\n";
echo "   Email: {$user->email}\n";
echo "   Current Role: {$user->role}\n";
echo "   Is Active: " . ($user->is_active ? 'Yes' : 'No') . "\n";
echo "   Email Verified: " . ($user->email_verified_at ? 'Yes' : 'No') . "\n\n";

// Update role to super_admin
$user->role = 'super_admin';
$user->email_verified_at = now(); // Verify email
$user->is_active = true; // Ensure active
$user->save();

echo "✅ User updated successfully!\n";
echo "   New Role: {$user->role}\n";
echo "   Email Verified: " . ($user->email_verified_at ? 'Yes' : 'No') . "\n";
echo "   Is Active: " . ($user->is_active ? 'Yes' : 'No') . "\n\n";

echo "🎉 User can now access Filament admin panel!\n";
echo "   URL: http://localhost:8000/admin\n";
echo "   Email: {$email}\n";
echo "   Password: (your current password)\n";
