<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Business;
use App\Models\UserSubscription;
use App\Models\SubscriptionPlan;
use Carbon\Carbon;

class CreateTestBusiness extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'business:create-test';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a test business with subscription for development';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Get the test user
        $user = User::where('email', 'admin@test.com')->first();

        if (!$user) {
            $this->error('Test user not found. Please run user:create-test first.');
            return 1;
        }

        // Create business
        $business = Business::create([
            'name' => 'Test Business',
            'slug' => 'test-business',
            'description' => 'Test business for development',
            'address' => 'Test Address',
            'phone' => '08123456789',
            'email' => 'business@test.com',
            'owner_id' => $user->id,
            'is_active' => true,
        ]);

        // Get trial plan
        $trialPlan = SubscriptionPlan::where('slug', 'trial-7-days')->first();

        if ($trialPlan) {
            // Get the first price for this plan
            $planPrice = $trialPlan->prices()->first();

            if ($planPrice) {
                // Create subscription
                UserSubscription::create([
                    'user_id' => $user->id,
                    'subscription_plan_id' => $trialPlan->id,
                    'subscription_plan_price_id' => $planPrice->id,
                    'status' => 'active',
                    'starts_at' => now(),
                    'ends_at' => now()->addDays(7),
                    'is_trial' => true,
                ]);
            }
        }

        $this->info("Test business created successfully!");
        $this->info("Business ID: {$business->id}");
        $this->info("Business Name: {$business->name}");
        $this->info("Owner: {$user->name} ({$user->email})");

        return 0;
    }
}
