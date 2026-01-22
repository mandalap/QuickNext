<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class FilamentAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminEmail = 'admin@filament.com';

        // Check if admin already exists
        $existingAdmin = User::where('email', $adminEmail)->first();

        if ($existingAdmin) {
            $this->command->warn("⚠️  Admin user already exists:");
            $this->command->info("   Email: {$existingAdmin->email}");
            $this->command->info("   Name: {$existingAdmin->name}");
            $this->command->info("   Role: {$existingAdmin->role}");
            return;
        }

        // Create Filament admin user
        $admin = User::create([
            'name' => 'Filament Admin',
            'email' => $adminEmail,
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'email_verified_at' => now(),
            'phone' => '6282197060927',
            'is_active' => true, // ✅ FIX: Ensure admin is active
        ]);

        $this->command->info("✅ Filament Admin User created successfully!");
        $this->command->info("📧 Login Credentials:");
        $this->command->info("   Email: {$admin->email}");
        $this->command->info("   Password: password");
        $this->command->info("   Role: {$admin->role}");
        $this->command->info("🌐 Access Filament Admin Panel at: http://localhost:8000/admin");
        $this->command->warn("⚠️  IMPORTANT: Change the password after first login!");
    }
}

