<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\UserSubscription;
use Illuminate\Console\Command;

class CheckUserSubscriptions extends Command
{
    protected $signature = 'check:user-subscriptions {email}';
    protected $description = 'Check user subscriptions status';

    public function handle()
    {
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("User with email {$email} not found.");
            return 1;
        }

        $this->info("=== USER SUBSCRIPTIONS CHECK ===");
        $this->info("User: {$user->name} ({$user->email})");
        $this->info("Role: {$user->role}");

        $subscriptions = UserSubscription::where('user_id', $user->id)
            ->with('subscriptionPlan')
            ->orderBy('created_at', 'desc')
            ->get();

        $this->info("\n=== ALL SUBSCRIPTIONS ===");
        foreach ($subscriptions as $sub) {
            $this->info("ID: {$sub->id}");
            $this->info("  Plan: {$sub->subscriptionPlan->name}");
            $this->info("  Status: {$sub->status}");
            $this->info("  Is Trial: " . ($sub->is_trial ? 'Yes' : 'No'));
            $this->info("  Starts: {$sub->starts_at}");
            $this->info("  Ends: {$sub->ends_at}");
            $this->info("  Days Remaining: {$sub->daysRemaining()}");
            $this->info("  Is Active: " . ($sub->isActive() ? 'Yes' : 'No'));
            $this->info("  ---");
        }

        // Test the same query as getCurrentSubscription
        $this->info("\n=== GET CURRENT SUBSCRIPTION QUERY TEST ===");
        $currentSub = UserSubscription::with(['subscriptionPlan', 'subscriptionPlanPrice'])
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'pending_payment'])
            ->latest()
            ->first();

        if ($currentSub) {
            $this->info("✅ Current subscription found:");
            $this->info("  ID: {$currentSub->id}");
            $this->info("  Plan: {$currentSub->subscriptionPlan->name}");
            $this->info("  Status: {$currentSub->status}");
            $this->info("  Is Active: " . ($currentSub->isActive() ? 'Yes' : 'No'));
        } else {
            $this->error("❌ No current subscription found with status 'active' or 'pending_payment'");
        }

        return 0;
    }
}
