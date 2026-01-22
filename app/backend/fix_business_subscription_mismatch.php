<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;

// Fix business subscription mismatch
function fixBusinessSubscriptionMismatch() {
    echo "🔧 FIXING BUSINESS SUBSCRIPTION MISMATCH\n";
    echo "=======================================\n\n";

    // Get user 1
    $user = User::find(1);
    if (!$user) {
        echo "❌ User not found\n";
        return;
    }

    // Get business
    $business = Business::where('owner_id', $user->id)->first();
    if (!$business) {
        echo "❌ No business found\n";
        return;
    }

    echo "🏢 BUSINESS:\n";
    echo "  ID: " . $business->id . "\n";
    echo "  Name: " . $business->name . "\n";
    echo "  Current Subscription ID: " . $business->current_subscription_id . "\n\n";

    // Get active subscription for user
    $activeSubscription = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->first();

    if (!$activeSubscription) {
        echo "❌ No active subscription found\n";
        return;
    }

    echo "📊 ACTIVE SUBSCRIPTION:\n";
    echo "  ID: " . $activeSubscription->id . "\n";
    echo "  Plan: " . ($activeSubscription->subscriptionPlan ? $activeSubscription->subscriptionPlan->name : 'N/A') . "\n";
    echo "  Status: " . $activeSubscription->status . "\n";
    echo "  Is Trial: " . ($activeSubscription->is_trial ? 'Yes' : 'No') . "\n\n";

    // Update business to use active subscription
    echo "🔧 UPDATING BUSINESS SUBSCRIPTION:\n";
    $business->update([
        'current_subscription_id' => $activeSubscription->id,
        'subscription_info' => [
            'plan_name' => $activeSubscription->subscriptionPlan->name,
            'plan_type' => $activeSubscription->is_trial ? 'trial' : 'paid',
            'is_trial' => $activeSubscription->is_trial,
            'trial_ends_at' => $activeSubscription->trial_ends_at,
            'features' => $activeSubscription->plan_features,
            'status' => $activeSubscription->status,
        ],
    ]);

    echo "  ✅ Business updated to use subscription ID: " . $activeSubscription->id . "\n";

    // Verify the fix
    echo "\n✅ VERIFICATION:\n";
    $updatedBusiness = Business::find($business->id);
    echo "  Business Current Subscription ID: " . $updatedBusiness->current_subscription_id . "\n";
    echo "  Active Subscription ID: " . $activeSubscription->id . "\n";

    if ($updatedBusiness->current_subscription_id == $activeSubscription->id) {
        echo "  ✅ Data is now consistent!\n";
    } else {
        echo "  ❌ Data is still inconsistent\n";
    }

    // Show subscription info
    echo "\n📋 SUBSCRIPTION INFO:\n";
    echo "  " . json_encode($updatedBusiness->subscription_info, JSON_PRETTY_PRINT) . "\n";

    echo "\n🎉 FIX COMPLETED!\n";
}

// Run the fix
fixBusinessSubscriptionMismatch();

?>












































































