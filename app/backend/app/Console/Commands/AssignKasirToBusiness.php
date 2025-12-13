<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Business;
use App\Models\Employee;

class AssignKasirToBusiness extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'kasir:assign-business';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign existing kasir to business';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Get the test business and kasir
        $business = Business::where('name', 'Test Business')->first();
        $kasir = User::where('email', 'kasir@test.com')->first();

        if (!$business || !$kasir) {
            $this->error('Test business or kasir not found.');
            return 1;
        }

        // Check if employee record already exists
        $existingEmployee = Employee::where('user_id', $kasir->id)->first();

        if ($existingEmployee) {
            $this->info("Kasir already assigned to business: {$existingEmployee->business->name}");
            return 0;
        }

        // Create employee record
        $employee = Employee::create([
            'user_id' => $kasir->id,
            'business_id' => $business->id,
            'name' => $kasir->name,
            'email' => $kasir->email,
            'employee_code' => 'EMP001',
            'employee_id' => 'EMP001',
            'position' => 'Kasir',
            'salary' => 5000000,
            'hire_date' => now(),
            'is_active' => true,
        ]);

        $this->info("Kasir assigned to business successfully!");
        $this->info("Kasir: {$kasir->name} ({$kasir->email})");
        $this->info("Business: {$business->name}");
        $this->info("Position: {$employee->position}");

        return 0;
    }
}
