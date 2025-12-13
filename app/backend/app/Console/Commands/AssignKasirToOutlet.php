<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Business;
use App\Models\Outlet;
use App\Models\EmployeeOutlet;

class AssignKasirToOutlet extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'kasir:assign-outlet';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign kasir to outlets';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Get the test business, kasir, and outlets
        $business = Business::where('name', 'Test Business')->first();
        $kasir = User::where('email', 'kasir@test.com')->first();
        $outlets = Outlet::where('business_id', $business->id)->get();

        if (!$business || !$kasir || $outlets->isEmpty()) {
            $this->error('Test business, kasir, or outlets not found.');
            return 1;
        }

        // Remove existing assignments
        EmployeeOutlet::where('user_id', $kasir->id)
            ->where('business_id', $business->id)
            ->delete();

        // Assign kasir to all outlets (for testing)
        foreach ($outlets as $index => $outlet) {
            EmployeeOutlet::create([
                'user_id' => $kasir->id,
                'outlet_id' => $outlet->id,
                'business_id' => $business->id,
                'is_primary' => $index === 0, // First outlet is primary
            ]);

            $this->info("Assigned kasir to: {$outlet->name}");
        }

        $this->info("Kasir assigned to outlets successfully!");
        $this->info("Kasir: {$kasir->name} ({$kasir->email})");
        $this->info("Business: {$business->name}");
        $this->info("Primary outlet: {$outlets->first()->name}");
        $this->info("Total outlets assigned: {$outlets->count()}");

        return 0;
    }
}
