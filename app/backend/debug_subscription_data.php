<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;

// Debug subscription data
function debugSubscriptionData() {
    echo "🔍 DEBUGGING SUBSCRIPTION DATA\n";
    echo "==============================\n\n";

    // Get user by email or ID
    $user = User::where('email', 'test@example.com')->first();
    if (!$user) {
        echo "❌ User not found\n";
        return;
    }

    // Also check user ID 2 (MR RAFA)
    $user2 = User::find(2);
    if ($user2) {
        echo "\n👤 USER 2 INFO (MR RAFA):\n";
        echo "  ID: " . $user2->id . "\n";
        echo "  Name: " . $user2->name . "\n";
        echo "  Email: " . $user2->email . "\n\n";

        // Get business for user 2
        $business2 = Business::where('owner_id', $user2->id)->first();
        if ($business2) {
            echo "🏢 USER 2 BUSINESS:\n";
            echo "  ID: " . $business2->id . "\n";
            echo "  Name: " . $business2->name . "\n";
            echo "  Current Subscription ID: " . $business2->current_subscription_id . "\n";
            echo "  Subscription Info: " . json_encode($business2->subscription_info, JSON_PRETTY_PRINT) . "\n\n";

            // Get subscription for user 2
            $subscription2 = UserSubscription::with('subscriptionPlan')
                ->where('id', $business2->current_subscription_id)
                ->first();

            if ($subscription2) {
                echo "📊 USER 2 SUBSCRIPTION:\n";
                echo "  ID: " . $subscription2->id . "\n";
                echo "  Plan: " . ($subscription2->subscriptionPlan ? $subscription2->subscriptionPlan->name : 'N/A') . "\n";
                echo "  Status: " . $subscription2->status . "\n";
                echo "  Is Trial: " . ($subscription2->is_trial ? 'Yes' : 'No') . "\n";
                echo "  Starts: " . $subscription2->starts_at . "\n";
                echo "  Ends: " . $subscription2->ends_at . "\n";
            }
        }
    }

    echo "👤 USER INFO:\n";
    echo "  ID: " . $user->id . "\n";
    echo "  Name: " . $user->name . "\n";
    echo "  Email: " . $user->email . "\n\n";

    // Get all subscriptions for this user
    $subscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get();

    echo "📊 ALL SUBSCRIPTIONS:\n";
    foreach ($subscriptions as $sub) {
        echo "  ID: " . $sub->id . "\n";
        echo "  Plan: " . ($sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A') . "\n";
        echo "  Status: " . $sub->status . "\n";
        echo "  Is Trial: " . ($sub->is_trial ? 'Yes' : 'No') . "\n";
        echo "  Starts: " . $sub->starts_at . "\n";
        echo "  Ends: " . $sub->ends_at . "\n";
        echo "  Created: " . $sub->created_at . "\n";
        echo "  Notes: " . ($sub->notes ?? 'None') . "\n";
        echo "  ---\n";
    }

    // Get active subscription
    $activeSubscription = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->first();

    echo "\n✅ ACTIVE SUBSCRIPTION:\n";
    if ($activeSubscription) {
        echo "  ID: " . $activeSubscription->id . "\n";
        echo "  Plan: " . ($activeSubscription->subscriptionPlan ? $activeSubscription->subscriptionPlan->name : 'N/A') . "\n";
        echo "  Status: " . $activeSubscription->status . "\n";
        echo "  Is Trial: " . ($activeSubscription->is_trial ? 'Yes' : 'No') . "\n";
        echo "  Starts: " . $activeSubscription->starts_at . "\n";
        echo "  Ends: " . $activeSubscription->ends_at . "\n";
    } else {
        echo "  ❌ No active subscription found\n";
    }

    // Get business data
    $business = Business::where('owner_id', $user->id)->first();
    echo "\n🏢 BUSINESS DATA:\n";
    if ($business) {
        echo "  ID: " . $business->id . "\n";
        echo "  Name: " . $business->name . "\n";
        echo "  Current Subscription ID: " . $business->current_subscription_id . "\n";
        echo "  Subscription Info: " . json_encode($business->subscription_info, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "  ❌ No business found for user ID: " . $user->id . "\n";

        // Check all businesses
        $allBusinesses = Business::all();
        echo "\n📋 ALL BUSINESSES:\n";
        foreach ($allBusinesses as $biz) {
            echo "  ID: " . $biz->id . " | Owner ID: " . $biz->owner_id . " | Name: " . $biz->name . "\n";
        }
    }

    // Check if there's a mismatch
    if ($activeSubscription && $business) {
        if ($activeSubscription->id != $business->current_subscription_id) {
            echo "\n⚠️  MISMATCH DETECTED:\n";
            echo "  Active Subscription ID: " . $activeSubscription->id . "\n";
            echo "  Business Current Subscription ID: " . $business->current_subscription_id . "\n";
        } else {
            echo "\n✅ DATA CONSISTENT: Active subscription matches business current subscription\n";
        }
    }

    echo "\n🔍 DEBUG COMPLETED!\n";
}

// Run the debug
debugSubscriptionData();

?>
