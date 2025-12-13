<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\SubscriptionPayment;
use Carbon\Carbon;

class FixInvalidSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscription:fix-invalid {--email=} {--force}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix invalid subscriptions (paid subscriptions without payment verification)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->option('email');
        $force = $this->option('force');

        if ($email) {
            $user = User::where('email', $email)->first();
            if (!$user) {
                $this->error("User with email {$email} not found.");
                return 1;
            }
            $users = collect([$user]);
        } else {
            $users = User::all();
        }

        $fixedCount = 0;
        $deletedCount = 0;

        foreach ($users as $user) {
            $this->info("Checking user: {$user->email} (ID: {$user->id})");

            // Get all active paid subscriptions (non-trial)
            $invalidSubscriptions = UserSubscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->where('is_trial', false)
                ->get();

            foreach ($invalidSubscriptions as $subscription) {
                // Check if there's a verified payment for this subscription
                $hasValidPayment = SubscriptionPayment::where('user_subscription_id', $subscription->id)
                    ->where('status', 'paid')
                    ->whereNotNull('paid_at')
                    ->exists();

                // Check if subscription was auto-activated (has auto_activation in payment method)
                $hasAutoActivation = SubscriptionPayment::where('user_subscription_id', $subscription->id)
                    ->where('payment_method', 'auto_activation')
                    ->exists();

                if (!$hasValidPayment || $hasAutoActivation) {
                    $this->warn("  ❌ Found invalid subscription:");
                    $this->warn("     Subscription ID: {$subscription->id}");
                    $this->warn("     Code: {$subscription->subscription_code}");
                    $planName = $subscription->subscriptionPlan->name ?? 'Unknown';
                    $this->warn("     Plan: {$planName}");
                    $this->warn("     Status: {$subscription->status}");
                    $this->warn("     Amount Paid: {$subscription->amount_paid}");
                    $this->warn("     Has Valid Payment: " . ($hasValidPayment ? 'Yes' : 'No'));
                    $this->warn("     Has Auto-Activation: " . ($hasAutoActivation ? 'Yes' : 'No'));

                    if ($force) {
                        // Delete invalid subscription
                        $subscription->delete();
                        $this->info("     ✅ Deleted invalid subscription");
                        $deletedCount++;
                    } else {
                        // Deactivate subscription
                        $subscription->update([
                            'status' => 'cancelled',
                            'notes' => ($subscription->notes ?? '') . ' | Cancelled: Invalid subscription without verified payment',
                        ]);
                        $this->info("     ✅ Deactivated invalid subscription (use --force to delete)");
                        $fixedCount++;
                    }
                }
            }
        }

        $this->info("\n📊 Summary:");
        $this->info("   Fixed (deactivated): {$fixedCount}");
        $this->info("   Deleted: {$deletedCount}");

        if ($fixedCount > 0 || $deletedCount > 0) {
            $this->info("\n✅ Invalid subscriptions have been fixed!");
            $this->warn("⚠️  Users affected should create a new trial subscription or complete payment.");
        } else {
            $this->info("\n✅ No invalid subscriptions found!");
        }

        return 0;
    }
}

