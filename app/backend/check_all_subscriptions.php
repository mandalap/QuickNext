<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;
use App\Models\SubscriptionPlan;
use Carbon\Carbon;

// Check all subscriptions for user
function checkAllSubscriptions() {
    echo "🔍 CHECKING ALL SUBSCRIPTIONS\n";
    echo "=============================\n\n";

    // Get user 1
    $user = User::find(1);
    if (!$user) {
        echo "❌ User not found\n";
        return;
    }

    echo "👤 USER: " . $user->name . " (ID: " . $user->id . ")\n\n";

    // Get all subscriptions (including cancelled)
    $allSubscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get();

    echo "📊 ALL SUBSCRIPTIONS:\n";
    foreach ($allSubscriptions as $sub) {
        $planName = $sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A';
        $daysRemaining = $sub->daysRemaining();
        $isActive = $sub->isActive();

        echo "  ID: " . $sub->id . "\n";
        echo "  Plan: " . $planName . "\n";
        echo "  Status: " . $sub->status . "\n";
        echo "  Is Trial: " . ($sub->is_trial ? 'Yes' : 'No') . "\n";
        echo "  Starts: " . $sub->starts_at . "\n";
        echo "  Ends: " . $sub->ends_at . "\n";
        echo "  Days Remaining: " . $daysRemaining . "\n";
        echo "  Is Active: " . ($isActive ? 'Yes' : 'No') . "\n";
        echo "  Notes: " . ($sub->notes ?? 'None') . "\n";
        echo "  ---\n";
    }

    // Get active subscriptions only
    $activeSubscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->get();

    echo "\n✅ ACTIVE SUBSCRIPTIONS:\n";
    if ($activeSubscriptions->count() > 0) {
        foreach ($activeSubscriptions as $sub) {
            $planName = $sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A';
            $daysRemaining = $sub->daysRemaining();
            echo "  ID: " . $sub->id . " | Plan: " . $planName . " | Days: " . $daysRemaining . "\n";
        }
    } else {
        echo "  ❌ No active subscriptions found\n";
    }

    // Check business data
    $business = Business::where('owner_id', $user->id)->first();
    if ($business) {
        echo "\n🏢 BUSINESS DATA:\n";
        echo "  ID: " . $business->id . "\n";
        echo "  Name: " . $business->name . "\n";
        echo "  Current Subscription ID: " . $business->current_subscription_id . "\n";

        if ($business->currentSubscription) {
            $sub = $business->currentSubscription;
            echo "  Current Subscription Plan: " . ($sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A') . "\n";
            echo "  Current Subscription Status: " . $sub->status . "\n";
            echo "  Current Subscription Is Trial: " . ($sub->is_trial ? 'Yes' : 'No') . "\n";
            echo "  Current Subscription Days Remaining: " . $sub->daysRemaining() . "\n";
        } else {
            echo "  ❌ No current subscription found\n";
        }
    }

    // Check if there are any Basic subscriptions
    $basicSubscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->whereHas('subscriptionPlan', function($query) {
            $query->where('name', 'like', '%Basic%');
        })
        ->get();

    if ($basicSubscriptions->count() > 0) {
        echo "\n🔍 BASIC SUBSCRIPTIONS FOUND:\n";
        foreach ($basicSubscriptions as $sub) {
            $planName = $sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A';
            echo "  ID: " . $sub->id . " | Plan: " . $planName . " | Status: " . $sub->status . "\n";
        }
    }

    echo "\n🎯 SUMMARY:\n";
    echo "  Total Subscriptions: " . $allSubscriptions->count() . "\n";
    echo "  Active Subscriptions: " . $activeSubscriptions->count() . "\n";
    echo "  Business Current Subscription: " . ($business ? $business->current_subscription_id : 'N/A') . "\n";

    if ($activeSubscriptions->count() > 1) {
        echo "  ⚠️  WARNING: Multiple active subscriptions found!\n";
    }

    echo "\n✅ CHECK COMPLETED!\n";
}

// Run the check
checkAllSubscriptions();

?>












































































