<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\UserSubscription;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionPlanPrice;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

// Create test users for different roles
function createTestUsers() {
    echo "👥 CREATING TEST USERS FOR DIFFERENT ROLES\n";
    echo "==========================================\n\n";

    // Get trial plan for subscriptions
    $trialPlan = SubscriptionPlan::where('name', 'Trial 7 Hari')->first();
    if (!$trialPlan) {
        echo "❌ Trial plan not found\n";
        return;
    }

    $trialPrice = SubscriptionPlanPrice::where('subscription_plan_id', $trialPlan->id)
        ->where('final_price', 0)
        ->first();

    if (!$trialPrice) {
        echo "❌ Trial price not found\n";
        return;
    }

    $testUsers = [
        [
            'name' => 'Admin Test',
            'email' => 'admin@test.com',
            'password' => 'password123',
            'role' => 'admin'
        ],
        [
            'name' => 'Waiter Test',
            'email' => 'waiter@test.com',
            'password' => 'password123',
            'role' => 'waiter'
        ],
        [
            'name' => 'Super Admin Test',
            'email' => 'superadmin@test.com',
            'password' => 'password123',
            'role' => 'super_admin'
        ]
    ];

    foreach ($testUsers as $userData) {
        // Check if user already exists
        $existingUser = User::where('email', $userData['email'])->first();

        if ($existingUser) {
            echo "👤 User already exists: " . $userData['name'] . " (" . $userData['email'] . ")\n";
            echo "  Role: " . $existingUser->role . "\n";
            continue;
        }

        // Create user
        $user = User::create([
            'name' => $userData['name'],
            'email' => $userData['email'],
            'password' => Hash::make($userData['password']),
            'role' => $userData['role'],
            'email_verified_at' => Carbon::now(),
        ]);

        // Create trial subscription
        $subscription = UserSubscription::create([
            'user_id' => $user->id,
            'subscription_plan_id' => $trialPlan->id,
            'subscription_plan_price_id' => $trialPrice->id,
            'subscription_code' => 'TRIAL-' . strtoupper(uniqid()),
            'status' => 'active',
            'amount_paid' => 0,
            'starts_at' => Carbon::now(),
            'ends_at' => Carbon::now()->addDays(7),
            'trial_ends_at' => Carbon::now()->addDays(7),
            'is_trial' => true,
            'plan_features' => $trialPlan->features,
            'notes' => 'Test user trial subscription',
        ]);

        echo "✅ Created user: " . $user->name . " (" . $user->email . ")\n";
        echo "  Role: " . $user->role . "\n";
        echo "  Subscription: " . $subscription->subscriptionPlan->name . "\n";
        echo "  ---\n";
    }

    echo "\n📊 ALL USERS SUMMARY:\n";
    $allUsers = User::all();
    foreach ($allUsers as $user) {
        $subscription = UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        echo "  " . $user->name . " (" . $user->email . ") - Role: " . $user->role;
        if ($subscription) {
            echo " - Subscription: " . $subscription->subscriptionPlan->name;
        }
        echo "\n";
    }

    echo "\n🎯 LOGIN CREDENTIALS:\n";
    echo "  Admin: admin@test.com / password123\n";
    echo "  Waiter: waiter@test.com / password123\n";
    echo "  Super Admin: superadmin@test.com / password123\n";
    echo "  Kasir 1: kasir1@gmail.com / password123\n";
    echo "  Kasir 2 (Kitchen): kasir2@gmail.com / password123\n";

    echo "\n✅ TEST USERS CREATED!\n";
}

// Run the function
createTestUsers();

?>












































































