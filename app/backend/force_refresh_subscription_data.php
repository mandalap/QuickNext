<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;
use Carbon\Carbon;

// Force refresh subscription data
function forceRefreshSubscriptionData() {
    echo "🔄 FORCE REFRESHING SUBSCRIPTION DATA\n";
    echo "=====================================\n\n";

    // Get user 1
    $user = User::find(1);
    if (!$user) {
        echo "❌ User not found\n";
        return;
    }

    echo "👤 USER: " . $user->name . " (ID: " . $user->id . ")\n\n";

    // Get business
    $business = Business::where('owner_id', $user->id)->first();
    if (!$business) {
        echo "❌ No business found\n";
        return;
    }

    echo "🏢 BUSINESS: " . $business->name . " (ID: " . $business->id . ")\n";
    echo "  Current Subscription ID: " . $business->current_subscription_id . "\n\n";

    // Get current subscription
    $currentSubscription = UserSubscription::with('subscriptionPlan')
        ->where('id', $business->current_subscription_id)
        ->first();

    if (!$currentSubscription) {
        echo "❌ No current subscription found\n";
        return;
    }

    echo "📊 CURRENT SUBSCRIPTION:\n";
    echo "  ID: " . $currentSubscription->id . "\n";
    echo "  Plan: " . ($currentSubscription->subscriptionPlan ? $currentSubscription->subscriptionPlan->name : 'N/A') . "\n";
    echo "  Status: " . $currentSubscription->status . "\n";
    echo "  Is Trial: " . ($currentSubscription->is_trial ? 'Yes' : 'No') . "\n";
    echo "  Days Remaining: " . $currentSubscription->daysRemaining() . "\n\n";

    // Update business subscription_info to ensure it's correct
    $subscriptionInfo = [
        'plan_name' => $currentSubscription->subscriptionPlan->name,
        'plan_type' => $currentSubscription->is_trial ? 'trial' : 'paid',
        'is_trial' => $currentSubscription->is_trial,
        'trial_ends_at' => $currentSubscription->trial_ends_at,
        'features' => $currentSubscription->plan_features,
        'status' => $currentSubscription->status,
        'days_remaining' => $currentSubscription->daysRemaining(),
    ];

    $business->update([
        'subscription_info' => $subscriptionInfo,
    ]);

    echo "✅ UPDATED BUSINESS SUBSCRIPTION INFO:\n";
    echo json_encode($subscriptionInfo, JSON_PRETTY_PRINT) . "\n\n";

    // Verify the update
    $updatedBusiness = Business::find($business->id);
    echo "🔍 VERIFICATION:\n";
    echo "  Business Subscription Info: " . json_encode($updatedBusiness->subscription_info, JSON_PRETTY_PRINT) . "\n\n";

    // Check if there are any other active subscriptions that might be causing confusion
    $allActiveSubscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->get();

    echo "📋 ALL ACTIVE SUBSCRIPTIONS:\n";
    foreach ($allActiveSubscriptions as $sub) {
        $planName = $sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A';
        echo "  ID: " . $sub->id . " | Plan: " . $planName . " | Is Trial: " . ($sub->is_trial ? 'Yes' : 'No') . "\n";
    }

    // If there are multiple active subscriptions, cancel the wrong ones
    if ($allActiveSubscriptions->count() > 1) {
        echo "\n⚠️  MULTIPLE ACTIVE SUBSCRIPTIONS FOUND!\n";
        echo "  Cancelling wrong subscriptions...\n";

        foreach ($allActiveSubscriptions as $sub) {
            if ($sub->id != $currentSubscription->id) {
                $sub->update([
                    'status' => 'cancelled',
                    'notes' => ($sub->notes ?? '') . ' | Cancelled due to multiple active subscriptions at ' . Carbon::now(),
                ]);
                echo "  ✅ Cancelled subscription ID: " . $sub->id . "\n";
            }
        }
    }

    echo "\n🎯 INSTRUCTIONS FOR FRONTEND:\n";
    echo "  1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)\n";
    echo "  2. Clear localStorage: localStorage.clear()\n";
    echo "  3. Refresh the page\n";
    echo "  4. Check if data is now consistent\n\n";

    echo "✅ FORCE REFRESH COMPLETED!\n";
}

// Run the force refresh
forceRefreshSubscriptionData();

?>












































































