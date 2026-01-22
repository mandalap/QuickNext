<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;

// Test final API response
function testFinalApiResponse() {
    echo "🧪 TESTING FINAL API RESPONSE\n";
    echo "=============================\n\n";

    // Get user 1
    $user = User::find(1);
    if (!$user) {
        echo "❌ User not found\n";
        return;
    }

    echo "👤 USER: " . $user->name . " (ID: " . $user->id . ")\n\n";

    // Test /v1/subscriptions/current endpoint
    $subscription = UserSubscription::with(['subscriptionPlan', 'subscriptionPlanPrice'])
        ->where('user_id', $user->id)
        ->whereIn('status', ['active', 'pending_payment'])
        ->latest()
        ->first();

    if (!$subscription) {
        echo "❌ No active subscription found\n";
        return;
    }

    $isActive = $subscription->isActive();
    $daysRemaining = $subscription->daysRemaining();

    $apiResponse = [
        'success' => true,
        'data' => $subscription->load(['subscriptionPlan', 'subscriptionPlanPrice']),
        'has_subscription' => true,
        'is_active' => $isActive,
        'days_remaining' => $daysRemaining,
        'is_trial' => $subscription->is_trial,
        'trial_ended' => $subscription->isTrialEnded(),
    ];

    echo "🌐 /v1/subscriptions/current API RESPONSE:\n";
    echo "  Plan Name: " . $subscription->subscriptionPlan->name . "\n";
    echo "  Status: " . $subscription->status . "\n";
    echo "  Is Trial: " . ($subscription->is_trial ? 'Yes' : 'No') . "\n";
    echo "  Days Remaining: " . $daysRemaining . "\n\n";

    // Test business data
    $business = Business::where('owner_id', $user->id)->first();
    if ($business) {
        echo "🏢 BUSINESS DATA:\n";
        echo "  Current Subscription ID: " . $business->current_subscription_id . "\n";

        if ($business->subscription_info) {
            echo "  Subscription Info:\n";
            echo "    Plan Name: " . $business->subscription_info['plan_name'] . "\n";
            echo "    Status: " . $business->subscription_info['status'] . "\n";
            echo "    Is Trial: " . ($business->subscription_info['is_trial'] ? 'Yes' : 'No') . "\n";
            echo "    Days Remaining: " . $business->subscription_info['days_remaining'] . "\n";
        }
    }

    // Test what frontend should display
    echo "\n🎯 FRONTEND SHOULD DISPLAY:\n";
    echo "  Navbar: \"Trial " . $daysRemaining . " hari tersisa\"\n";
    echo "  Subscription Settings: \"" . $subscription->subscriptionPlan->name . " ACTIVE\"\n";
    echo "  Days Remaining: \"" . $daysRemaining . " hari tersisa\"\n\n";

    // Check for any inconsistencies
    if ($business && $business->subscription_info) {
        $businessPlanName = $business->subscription_info['plan_name'];
        $apiPlanName = $subscription->subscriptionPlan->name;

        if ($businessPlanName !== $apiPlanName) {
            echo "⚠️  INCONSISTENCY DETECTED:\n";
            echo "  Business Plan: " . $businessPlanName . "\n";
            echo "  API Plan: " . $apiPlanName . "\n";
        } else {
            echo "✅ DATA CONSISTENT: Both show \"" . $apiPlanName . "\"\n";
        }
    }

    echo "\n✅ TEST COMPLETED!\n";
}

// Run the test
testFinalApiResponse();

?>












































































