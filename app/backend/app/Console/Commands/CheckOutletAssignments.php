<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\EmployeeOutlet;
use App\Models\User;

class CheckOutletAssignments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'outlet:check-assignments';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check employee outlet assignments';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Employee Outlet Assignments:');
        $this->line('');

        $assignments = EmployeeOutlet::with(['user', 'outlet'])->get();

        if ($assignments->isEmpty()) {
            $this->warn('No assignments found.');
            return 0;
        }

        foreach ($assignments as $assignment) {
            $this->line("User: {$assignment->user->name} ({$assignment->user->email})");
            $this->line("Role: {$assignment->user->role}");
            $this->line("Outlet: {$assignment->outlet->name}");
            $this->line("Primary: " . ($assignment->is_primary ? 'Yes' : 'No'));
            $this->line('---');
        }

        // Check kasir specifically
        $kasir = User::where('email', 'kasir@test.com')->first();
        if ($kasir) {
            $this->line('');
            $this->info("Kasir assignments for {$kasir->name}:");
            $kasirAssignments = EmployeeOutlet::with('outlet')
                ->where('user_id', $kasir->id)
                ->get();

            foreach ($kasirAssignments as $assignment) {
                $this->line("- {$assignment->outlet->name} (Primary: " . ($assignment->is_primary ? 'Yes' : 'No') . ")");
            }
        }

        return 0;
    }
}
