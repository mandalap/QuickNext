<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;
use Carbon\Carbon;

// Test subscription API endpoint
function testSubscriptionApiEndpoint() {
    echo "🧪 TESTING SUBSCRIPTION API ENDPOINT\n";
    echo "====================================\n\n";

    // Get user 1
    $user = User::find(1);
    if (!$user) {
        echo "❌ User not found\n";
        return;
    }

    echo "👤 USER: " . $user->name . " (ID: " . $user->id . ")\n\n";

    // Simulate the getCurrentSubscription method
    $subscription = UserSubscription::with(['subscriptionPlan', 'subscriptionPlanPrice'])
        ->where('user_id', $user->id)
        ->whereIn('status', ['active', 'pending_payment'])
        ->latest()
        ->first();

    if (!$subscription) {
        echo "❌ No active subscription found\n";
        return;
    }

    echo "📊 SUBSCRIPTION FOUND:\n";
    echo "  ID: " . $subscription->id . "\n";
    echo "  Plan: " . ($subscription->subscriptionPlan ? $subscription->subscriptionPlan->name : 'N/A') . "\n";
    echo "  Status: " . $subscription->status . "\n";
    echo "  Is Trial: " . ($subscription->is_trial ? 'Yes' : 'No') . "\n";
    echo "  Starts: " . $subscription->starts_at . "\n";
    echo "  Ends: " . $subscription->ends_at . "\n\n";

    // Check if subscription is still active (not expired)
    $isActive = $subscription->isActive();
    $daysRemaining = $subscription->daysRemaining();

    echo "🔍 SUBSCRIPTION STATUS:\n";
    echo "  Is Active: " . ($isActive ? 'Yes' : 'No') . "\n";
    echo "  Days Remaining: " . $daysRemaining . "\n\n";

    // Simulate API response
    $apiResponse = [
        'success' => true,
        'data' => $subscription->load(['subscriptionPlan', 'subscriptionPlanPrice']),
        'has_subscription' => true,
        'is_active' => $isActive,
        'days_remaining' => $daysRemaining,
        'is_trial' => $subscription->is_trial,
        'trial_ended' => $subscription->isTrialEnded(),
    ];

    echo "🌐 API RESPONSE:\n";
    echo json_encode($apiResponse, JSON_PRETTY_PRINT) . "\n\n";

    // Check if there are any other active subscriptions
    $allActiveSubscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->get();

    echo "📋 ALL ACTIVE SUBSCRIPTIONS:\n";
    foreach ($allActiveSubscriptions as $sub) {
        $planName = $sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A';
        echo "  ID: " . $sub->id . " | Plan: " . $planName . " | Is Trial: " . ($sub->is_trial ? 'Yes' : 'No') . "\n";
    }

    // Check business data
    $business = Business::where('owner_id', $user->id)->first();
    if ($business) {
        echo "\n🏢 BUSINESS DATA:\n";
        echo "  Current Subscription ID: " . $business->current_subscription_id . "\n";

        if ($business->currentSubscription) {
            $sub = $business->currentSubscription;
            echo "  Business Subscription Plan: " . ($sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A') . "\n";
            echo "  Business Subscription Status: " . $sub->status . "\n";
        }
    }

    echo "\n✅ TEST COMPLETED!\n";
}

// Run the test
testSubscriptionApiEndpoint();

?>












































































