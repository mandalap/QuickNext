<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UserSubscription;
use Carbon\Carbon;

class FixMultipleActiveSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscription:fix-multiple-active 
                            {--dry-run : Run without making changes}
                            {--user= : Fix specific user ID only}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix users with multiple active subscriptions (keep newest, mark others as upgraded)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $isDryRun = $this->option('dry-run');
        $specificUserId = $this->option('user');

        $this->info('🔍 Scanning for users with multiple active subscriptions...');
        $this->newLine();

        if ($isDryRun) {
            $this->warn('⚠️  DRY RUN MODE - No changes will be made');
            $this->newLine();
        }

        // Get users query
        $usersQuery = User::query();
        if ($specificUserId) {
            $usersQuery->where('id', $specificUserId);
        }

        $users = $usersQuery->get();
        $totalUsers = $users->count();
        $affectedUsers = 0;
        $fixedSubscriptions = 0;

        $this->info("Checking {$totalUsers} users...");
        $this->newLine();

        foreach ($users as $user) {
            // Get all active subscriptions for this user
            $activeSubscriptions = UserSubscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->orderBy('created_at', 'desc')
                ->get();

            if ($activeSubscriptions->count() > 1) {
                $affectedUsers++;
                
                $this->warn("👤 User ID: {$user->id} ({$user->email})");
                $this->line("   Found {$activeSubscriptions->count()} active subscriptions:");
                
                // Keep the newest, mark others as upgraded
                $newest = $activeSubscriptions->first();
                $this->info("   ✅ KEEP: Subscription ID {$newest->id} ({$newest->subscription_code}) - Created: {$newest->created_at}");
                
                foreach ($activeSubscriptions->skip(1) as $oldSub) {
                    $fixedSubscriptions++;
                    $this->error("   ❌ MARK AS UPGRADED: Subscription ID {$oldSub->id} ({$oldSub->subscription_code}) - Created: {$oldSub->created_at}");
                    
                    if (!$isDryRun) {
                        $oldSub->update([
                            'status' => 'upgraded',
                            'notes' => ($oldSub->notes ?? '') . ' | Auto-upgraded (cleanup fix) at ' . Carbon::now(),
                        ]);
                        $this->line("      → Updated to 'upgraded' status");
                    }
                }
                
                $this->newLine();
            }
        }

        $this->newLine();
        $this->info('═══════════════════════════════════════════════════════');
        $this->info('📊 Summary:');
        $this->info('═══════════════════════════════════════════════════════');
        $this->line("Total users checked: {$totalUsers}");
        $this->line("Users with multiple active subscriptions: {$affectedUsers}");
        $this->line("Subscriptions marked as upgraded: {$fixedSubscriptions}");
        
        if ($isDryRun) {
            $this->newLine();
            $this->warn('⚠️  This was a DRY RUN - No changes were made');
            $this->info('Run without --dry-run to apply changes');
        } else {
            $this->newLine();
            $this->info('✅ Cleanup completed successfully!');
        }

        return Command::SUCCESS;
    }
}
