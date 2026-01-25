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
    protected $description = 'Fix users with multiple active subscriptions (prioritize paid over trial, mark others as upgraded)';

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
            // ✅ CRITICAL FIX: Prioritize PAID subscription (is_trial = false) over TRIAL subscription (is_trial = true)
            $activeSubscriptions = UserSubscription::with('subscriptionPlan')
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->where('ends_at', '>', now()) // Only non-expired
                ->orderBy('is_trial', 'asc') // Paid subscriptions (is_trial = false) first
                ->orderBy('created_at', 'desc') // Then by newest
                ->get();

            if ($activeSubscriptions->count() > 1) {
                $affectedUsers++;
                
                $this->warn("👤 User ID: {$user->id} ({$user->email})");
                $this->line("   Found {$activeSubscriptions->count()} active subscriptions:");
                
                // ✅ CRITICAL FIX: Keep the PAID subscription (is_trial = false), mark others as upgraded
                // If no paid subscription, keep the newest
                $paidSubscription = $activeSubscriptions->where('is_trial', false)->first();
                $subscriptionToKeep = $paidSubscription ?? $activeSubscriptions->first();
                
                $this->info("   ✅ KEEP: Subscription ID {$subscriptionToKeep->id} ({$subscriptionToKeep->subscription_code})");
                $this->line("      Plan: " . ($subscriptionToKeep->subscriptionPlan->name ?? 'N/A'));
                $this->line("      Is Trial: " . ($subscriptionToKeep->is_trial ? 'Yes' : 'No'));
                $this->line("      Created: {$subscriptionToKeep->created_at}");
                
                foreach ($activeSubscriptions as $oldSub) {
                    if ($oldSub->id === $subscriptionToKeep->id) {
                        continue; // Skip the one we're keeping
                    }
                    
                    $fixedSubscriptions++;
                    $this->error("   ❌ MARK AS UPGRADED: Subscription ID {$oldSub->id} ({$oldSub->subscription_code})");
                    $this->line("      Plan: " . ($oldSub->subscriptionPlan->name ?? 'N/A'));
                    $this->line("      Is Trial: " . ($oldSub->is_trial ? 'Yes' : 'No'));
                    $this->line("      Created: {$oldSub->created_at}");
                    
                    if (!$isDryRun) {
                        $oldSub->update([
                            'status' => 'upgraded',
                            'notes' => ($oldSub->notes ?? '') . ' | Auto-upgraded (cleanup fix - prioritize paid) at ' . Carbon::now(),
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
