<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\SubscriptionPlan;

class AddSubscriptionToUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:add-subscription {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Add subscription to user';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email {$email} not found.");
            return 1;
        }

        // Get trial plan
        $trialPlan = SubscriptionPlan::where('slug', 'trial-7-days')->first();

        if (!$trialPlan) {
            $this->error('Trial plan not found.');
            return 1;
        }

        // Get the first price for this plan
        $planPrice = $trialPlan->prices()->first();

        if (!$planPrice) {
            $this->error('Plan price not found.');
            return 1;
        }

        // Check if user already has subscription
        $existingSubscription = UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($existingSubscription) {
            $this->info("User already has active subscription.");
            return 0;
        }

        // Create subscription
        UserSubscription::create([
            'user_id' => $user->id,
            'subscription_plan_id' => $trialPlan->id,
            'subscription_plan_price_id' => $planPrice->id,
            'subscription_code' => 'TRIAL-' . strtoupper(uniqid()),
            'amount_paid' => 0, // Trial is free
            'status' => 'active',
            'starts_at' => now(),
            'ends_at' => now()->addDays(7),
            'is_trial' => true,
        ]);

        $this->info("Subscription added successfully to {$user->name} ({$user->email})");

        return 0;
    }
}
