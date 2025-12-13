<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Business;
use App\Models\Outlet;

class CreateTestOutlet extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'outlet:create-test';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create test outlets for development';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Get the test user and business
        $user = User::where('email', 'admin@test.com')->first();
        $business = Business::where('owner_id', $user->id)->first();

        if (!$user || !$business) {
            $this->error('Test user or business not found. Please run user:create-test and business:create-test first.');
            return 1;
        }

        // Create outlets
        $outlets = [
            [
                'name' => 'Outlet Pusat',
                'address' => 'Jl. Sudirman No. 123, Jakarta Pusat',
                'phone' => '021-1234567',
                'email' => 'pusat@testbusiness.com',
                'is_active' => true,
            ],
            [
                'name' => 'Outlet Cabang 1',
                'address' => 'Jl. Thamrin No. 456, Jakarta Selatan',
                'phone' => '021-2345678',
                'email' => 'cabang1@testbusiness.com',
                'is_active' => true,
            ],
            [
                'name' => 'Outlet Cabang 2',
                'address' => 'Jl. Gatot Subroto No. 789, Jakarta Barat',
                'phone' => '021-3456789',
                'email' => 'cabang2@testbusiness.com',
                'is_active' => true,
            ],
        ];

        foreach ($outlets as $index => $outletData) {
            $code = 'OUT' . str_pad($index + 1, 3, '0', STR_PAD_LEFT);
            $outlet = Outlet::firstOrCreate([
                'name' => $outletData['name'],
                'business_id' => $business->id,
            ], array_merge($outletData, ['code' => $code]));

            $this->info("Outlet created: {$outlet->name} - {$outlet->address}");
        }

        $this->info("Test outlets created successfully!");
        $this->info("Outlets: " . Outlet::where('business_id', $business->id)->count());

        return 0;
    }
}
