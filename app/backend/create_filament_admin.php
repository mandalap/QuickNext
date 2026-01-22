<?php

/**
 * Script to create Filament admin user
 * 
 * This script creates a user that can access Filament admin panel
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

echo "🔐 Creating Filament Admin User...\n\n";

// Check if admin already exists
$adminEmail = 'admin@filament.com';
$existingAdmin = User::where('email', $adminEmail)->first();

if ($existingAdmin) {
    echo "⚠️  Admin user already exists:\n";
    echo "   Email: {$existingAdmin->email}\n";
    echo "   Name: {$existingAdmin->name}\n";
    echo "   Role: {$existingAdmin->role}\n";
    echo "\n";
    echo "To reset password, delete the user first or update manually.\n";
    exit(0);
}

// Create Filament admin user
$admin = User::create([
    'name' => 'Filament Admin',
    'email' => $adminEmail,
    'password' => Hash::make('password'),
    'role' => 'super_admin',
    'email_verified_at' => now(),
    'phone' => '081234567890',
    'address' => 'Admin Address',
]);

echo "✅ Filament Admin User created successfully!\n\n";
echo "📧 Login Credentials:\n";
echo "   Email: {$admin->email}\n";
echo "   Password: password\n";
echo "   Role: {$admin->role}\n";
echo "\n";
echo "🌐 Access Filament Admin Panel at:\n";
echo "   http://localhost:8000/admin\n";
echo "\n";
echo "⚠️  IMPORTANT: Change the password after first login!\n";

