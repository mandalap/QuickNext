<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class FilamentAdminSeeder extends Seeder
{
    public function run(): void
    {
        $adminEmail = 'admin@filament.com';

        // 🔒 PAKSA super_admin
        $admin = User::updateOrCreate(
            ['email' => $adminEmail],
            [
                'name' => 'Filament Super Admin',
                'password' => Hash::make('password'),
                'role' => 'super_admin', // ✅ FIX PENTING
                'email_verified_at' => now(),
                'phone' => '6282197060927',
                'is_active' => true,
                'deleted_at' => null, // pastikan tidak soft-deleted
            ]
        );

        $this->command->info('✅ Filament Super Admin ready');
        $this->command->info("📧 Email    : {$admin->email}");
        $this->command->info("🔐 Password : password");
        $this->command->info("🛡 Role     : {$admin->role}");
        $this->command->warn('⚠️  Ganti password setelah login pertama');
    }
}
