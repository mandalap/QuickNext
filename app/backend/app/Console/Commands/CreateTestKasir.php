<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Business;
use App\Models\Outlet;
use App\Models\Employee;
use Illuminate\Support\Facades\Hash;

class CreateTestKasir extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'kasir:create-test';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create test kasir user for development';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Get the test business and outlet
        $business = Business::where('name', 'Test Business')->first();
        $outlet = Outlet::where('name', 'Outlet Pusat')->first();

        if (!$business || !$outlet) {
            $this->error('Test business or outlet not found. Please run business:create-test and outlet:create-test first.');
            return 1;
        }

        // Create kasir user
        $kasir = User::create([
            'name' => 'Kasir Test',
            'email' => 'kasir@test.com',
            'password' => Hash::make('password'),
            'role' => 'kasir',
            'email_verified_at' => now(),
        ]);

        // Create employee record
        $employee = Employee::create([
            'user_id' => $kasir->id,
            'business_id' => $business->id,
            'employee_code' => 'EMP001',
            'employee_id' => 'EMP001',
            'position' => 'Kasir',
            'salary' => 5000000,
            'hire_date' => now(),
            'is_active' => true,
        ]);

        $this->info("Test kasir created successfully!");
        $this->info("Email: kasir@test.com");
        $this->info("Password: password");
        $this->info("Role: kasir");
        $this->info("Business: {$business->name}");
        $this->info("Outlet: {$outlet->name}");

        return 0;
    }
}
