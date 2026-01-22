<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\EmployeeOutlet;

class TestEmployeeOutletAPI extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:employee-outlet-api';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test employee outlet API endpoint';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $kasir = User::where('email', 'kasir@test.com')->first();

        if (!$kasir) {
            $this->error('Kasir not found');
            return 1;
        }

        $this->info("Testing API for user: {$kasir->name} (ID: {$kasir->id})");

        // Simulate the API call
        $assignments = EmployeeOutlet::with('outlet')
            ->where('user_id', $kasir->id)
            ->where('business_id', 3)
            ->get();

        $this->info("Found {$assignments->count()} assignments:");

        foreach ($assignments as $assignment) {
            $this->line("- Outlet: {$assignment->outlet->name} (ID: {$assignment->outlet->id})");
            $this->line("  Primary: " . ($assignment->is_primary ? 'Yes' : 'No'));
            $this->line("  Business ID: {$assignment->business_id}");
        }

        // Test the response format
        $response = [
            'success' => true,
            'data' => $assignments->map(function ($assignment) {
                return [
                    'id' => $assignment->id,
                    'user_id' => $assignment->user_id,
                    'outlet_id' => $assignment->outlet_id,
                    'business_id' => $assignment->business_id,
                    'is_primary' => $assignment->is_primary,
                    'outlet' => [
                        'id' => $assignment->outlet->id,
                        'name' => $assignment->outlet->name,
                        'address' => $assignment->outlet->address,
                        'phone' => $assignment->outlet->phone,
                        'email' => $assignment->outlet->email,
                        'code' => $assignment->outlet->code,
                        'is_active' => $assignment->outlet->is_active,
                    ]
                ];
            })
        ];

        $this->info("API Response format:");
        $this->line(json_encode($response, JSON_PRETTY_PRINT));

        return 0;
    }
}
