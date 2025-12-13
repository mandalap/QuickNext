<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;
use Carbon\Carbon;

// Test subscription API
function testSubscriptionApi() {
    echo "🧪 TESTING SUBSCRIPTION API\n";
    echo "===========================\n\n";

    // Get user 1
    $user = User::find(1);
    if (!$user) {
        echo "❌ User not found\n";
        return;
    }

    // Get active subscription
    $subscription = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->first();

    if (!$subscription) {
        echo "❌ No active subscription found\n";
        return;
    }

    echo "📊 SUBSCRIPTION DATA:\n";
    echo "  ID: " . $subscription->id . "\n";
    echo "  Plan: " . ($subscription->subscriptionPlan ? $subscription->subscriptionPlan->name : 'N/A') . "\n";
    echo "  Starts: " . $subscription->starts_at . "\n";
    echo "  Ends: " . $subscription->ends_at . "\n";
    echo "  Is Trial: " . ($subscription->is_trial ? 'Yes' : 'No') . "\n\n";

    // Test daysRemaining method
    echo "🔢 DAYS REMAINING CALCULATION:\n";
    $daysRemaining = $subscription->daysRemaining();
    echo "  Method result: " . $daysRemaining . "\n";
    echo "  Type: " . gettype($daysRemaining) . "\n";

    // Manual calculation
    $now = Carbon::now();
    $endsAt = Carbon::parse($subscription->ends_at);
    $manualDays = $now->diffInDays($endsAt, false);
    echo "  Manual calculation: " . $manualDays . "\n";
    echo "  Manual rounded: " . round($manualDays, 1) . "\n\n";

    // Test business subscription info
    $business = Business::where('owner_id', $user->id)->first();
    if ($business) {
        echo "🏢 BUSINESS SUBSCRIPTION INFO:\n";
        echo "  Current Subscription ID: " . $business->current_subscription_id . "\n";

        if ($business->currentSubscription) {
            $businessDaysRemaining = $business->currentSubscription->daysRemaining();
            echo "  Days Remaining: " . $businessDaysRemaining . "\n";
            echo "  Type: " . gettype($businessDaysRemaining) . "\n";
        }
    }

    // Test API endpoint simulation
    echo "\n🌐 API ENDPOINT SIMULATION:\n";
    $isActive = $subscription->isActive();
    $daysRemainingApi = $subscription->daysRemaining();
    $isTrial = $subscription->is_trial;
    $trialEnded = $subscription->isTrialEnded();

    echo "  isActive: " . ($isActive ? 'true' : 'false') . "\n";
    echo "  days_remaining: " . $daysRemainingApi . "\n";
    echo "  is_trial: " . ($isTrial ? 'true' : 'false') . "\n";
    echo "  trial_ended: " . ($trialEnded ? 'true' : 'false') . "\n";

    // Test upgrade options calculation
    echo "\n🔄 UPGRADE OPTIONS TEST:\n";
    $now = Carbon::now();
    $currentEndsAt = Carbon::parse($subscription->ends_at);
    $remainingDays = $now->diffInDays($currentEndsAt, false);
    $remainingDaysRounded = round($remainingDays, 1);

    echo "  Raw remaining days: " . $remainingDays . "\n";
    echo "  Rounded remaining days: " . $remainingDaysRounded . "\n";

    echo "\n✅ TEST COMPLETED!\n";
}

// Run the test
testSubscriptionApi();

?>












































































