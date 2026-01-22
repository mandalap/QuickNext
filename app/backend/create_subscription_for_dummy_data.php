<?php

require_once 'vendor/autoload.php';

use App\Models\Business;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\SubscriptionPlan;
use Carbon\Carbon;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Creating subscription for dummy data...\n";

// Get the first business
$business = Business::first();
if (!$business) {
    echo "No business found. Please run the seeder first.\n";
    exit(1);
}

echo "Found business: {$business->name}\n";

// Get or create a subscription plan
$plan = SubscriptionPlan::first();
if (!$plan) {
    echo "No subscription plan found. Creating a basic plan...\n";
    $plan = SubscriptionPlan::create([
        'name' => 'Basic Plan',
        'description' => 'Basic subscription plan for testing',
        'max_outlets' => 3,
        'max_products' => 100,
        'max_employees' => 10,
        'price' => 100000,
        'billing_cycle' => 'monthly',
        'is_active' => true,
    ]);
}

echo "Using plan: {$plan->name}\n";

// Get the business owner (first user with owner role)
$owner = User::where('role', 'owner')->first();
if (!$owner) {
    echo "No owner found. Creating owner...\n";
    $owner = User::create([
        'name' => 'Business Owner',
        'email' => 'owner@bintanglima.com',
        'password' => bcrypt('password123'),
        'role' => 'owner',
        'email_verified_at' => now(),
    ]);
}

echo "Using owner: {$owner->name} ({$owner->email})\n";

// Update business owner
$business->update(['owner_id' => $owner->id]);

// Create subscription for the owner
$subscription = UserSubscription::create([
    'user_id' => $owner->id,
    'subscription_plan_id' => $plan->id,
    'status' => 'active',
    'starts_at' => Carbon::now()->subMonths(6),
    'ends_at' => Carbon::now()->addMonths(6),
    'amount_paid' => $plan->price,
    'is_trial' => false,
    'notes' => 'Dummy subscription for testing',
]);

echo "Created subscription: ID {$subscription->id}\n";

// Update business current subscription
$business->update(['current_subscription_id' => $subscription->id]);

echo "Updated business current subscription\n";

echo "✅ Subscription created successfully!\n";
echo "Owner: {$owner->email} / password123\n";
echo "Subscription expires: {$subscription->ends_at}\n";











































































