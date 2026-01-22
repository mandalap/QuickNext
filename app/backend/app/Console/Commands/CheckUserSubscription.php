<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UserSubscription;

class CheckUserSubscription extends Command
{
    protected $signature = 'user:check-subscription {email}';
    protected $description = 'Check user subscription details';

    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email {$email} not found.");
            return 1;
        }

        $this->info("User: {$user->name} ({$user->email})");
        $this->info("User ID: {$user->id}");
        $this->info("");

        $subscriptions = UserSubscription::where('user_id', $user->id)->get();

        if ($subscriptions->isEmpty()) {
            $this->warn("No subscriptions found for this user.");
            return 0;
        }

        foreach ($subscriptions as $sub) {
            $planName = $sub->subscriptionPlan->name ?? 'Unknown';
            $this->info("Subscription ID: {$sub->id}");
            $this->info("  Code: {$sub->subscription_code}");
            $this->info("  Plan: {$planName}");
            $this->info("  Status: {$sub->status}");
            $this->info("  Is Trial: " . ($sub->is_trial ? 'Yes' : 'No'));
            $this->info("  Amount Paid: {$sub->amount_paid}");
            $this->info("  Starts At: {$sub->starts_at}");
            $this->info("  Ends At: {$sub->ends_at}");
            $this->info("  Days Remaining: " . ($sub->ends_at ? $sub->ends_at->diffInDays(now()) : 'N/A'));
            $this->info("  Notes: " . ($sub->notes ?? 'N/A'));
            $this->info("  Created At: {$sub->created_at}");
            $this->info("---");
        }

        // Check businesses and their subscriptions
        $this->info("");
        $this->info("Businesses owned by this user:");
        $businesses = \App\Models\Business::where('owner_id', $user->id)->get();
        
        if ($businesses->isEmpty()) {
            $this->warn("No businesses found.");
        } else {
            foreach ($businesses as $biz) {
                $this->info("Business: {$biz->name} (ID: {$biz->id})");
                if ($biz->currentSubscription) {
                    $sub = $biz->currentSubscription;
                    $planName = $sub->subscriptionPlan->name ?? 'Unknown';
                    $this->info("  Current Subscription:");
                    $this->info("    ID: {$sub->id}");
                    $this->info("    Plan: {$planName}");
                    $this->info("    Status: {$sub->status}");
                    $this->info("    Is Trial: " . ($sub->is_trial ? 'Yes' : 'No'));
                    $this->info("    Ends At: {$sub->ends_at}");
                    $this->info("    Days Remaining: " . ($sub->ends_at ? $sub->ends_at->diffInDays(now()) : 'N/A'));
                } else {
                    $this->warn("  No current subscription");
                }
                $this->info("---");
            }
        }

        return 0;
    }
}

