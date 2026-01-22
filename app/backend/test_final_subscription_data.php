<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;

// Test final subscription data
function testFinalSubscriptionData() {
    echo "🧪 TESTING FINAL SUBSCRIPTION DATA\n";
    echo "==================================\n\n";

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

    echo "🌐 /v1/subscriptions/current API RESPONSE:\n";
    echo "  Plan Name: " . $subscription->subscriptionPlan->name . "\n";
    echo "  Status: " . $subscription->status . "\n";
    echo "  Is Trial: " . ($subscription->is_trial ? 'Yes' : 'No') . "\n";
    echo "  Days Remaining: " . $daysRemaining . "\n";
    echo "  Starts: " . $subscription->starts_at . "\n";
    echo "  Ends: " . $subscription->ends_at . "\n\n";

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
            echo "    Plan Type: " . $business->subscription_info['plan_type'] . "\n";
        }
    }

    // Test what frontend should display
    echo "\n🎯 FRONTEND SHOULD DISPLAY:\n";
    echo "  Navbar: \"" . $subscription->subscriptionPlan->name . " " . $daysRemaining . " hari tersisa\"\n";
    echo "  Subscription Settings: \"" . $subscription->subscriptionPlan->name . " ACTIVE\"\n";
    echo "  Days Remaining: \"" . $daysRemaining . " hari tersisa\"\n\n";

    // Check for any inconsistencies
    if ($business && $business->subscription_info) {
        $businessPlanName = $business->subscription_info['plan_name'];
        $apiPlanName = $subscription->subscriptionPlan->name;
        $businessDaysRemaining = $business->subscription_info['days_remaining'];
        $apiDaysRemaining = $daysRemaining;

        if ($businessPlanName !== $apiPlanName) {
            echo "⚠️  PLAN INCONSISTENCY DETECTED:\n";
            echo "  Business Plan: " . $businessPlanName . "\n";
            echo "  API Plan: " . $apiPlanName . "\n";
        } else {
            echo "✅ PLAN CONSISTENT: Both show \"" . $apiPlanName . "\"\n";
        }

        if ($businessDaysRemaining != $apiDaysRemaining) {
            echo "⚠️  DAYS INCONSISTENCY DETECTED:\n";
            echo "  Business Days: " . $businessDaysRemaining . "\n";
            echo "  API Days: " . $apiDaysRemaining . "\n";
        } else {
            echo "✅ DAYS CONSISTENT: Both show \"" . $apiDaysRemaining . "\"\n";
        }
    }

    // Test all active subscriptions
    $allActiveSubscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->get();

    echo "\n📋 ALL ACTIVE SUBSCRIPTIONS:\n";
    foreach ($allActiveSubscriptions as $sub) {
        $planName = $sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A';
        echo "  ID: " . $sub->id . " | Plan: " . $planName . " | Is Trial: " . ($sub->is_trial ? 'Yes' : 'No') . " | Days: " . $sub->daysRemaining() . "\n";
    }

    echo "\n✅ TEST COMPLETED!\n";
}

// Run the test
testFinalSubscriptionData();

?>












































































