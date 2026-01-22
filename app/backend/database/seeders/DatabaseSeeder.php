<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed subscription plans first
        $this->call([
            BusinessTypeSeeder::class,
            SubscriptionPlanSeeder::class,
            OutletSeeder::class,
            // ⚠️ DummyDataSeeder: Hanya untuk data test, tidak akan menghapus user yang sudah terdaftar
            DummyDataSeeder::class, // Add comprehensive dummy data for testing
            FilamentAdminSeeder::class, // Create Filament admin user
        ]);

        // User::factory(10)->create();

        // ⚠️ Test user - hanya untuk development
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }
}
