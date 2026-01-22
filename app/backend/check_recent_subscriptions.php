<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;
use Carbon\Carbon;

// Check recent subscriptions
function checkRecentSubscriptions() {
    echo "🔍 CHECKING RECENT SUBSCRIPTIONS\n";
    echo "=================================\n\n";

    // Get user 1
    $user = User::find(1);
    if (!$user) {
        echo "❌ User not found\n";
        return;
    }

    echo "👤 USER: " . $user->name . " (ID: " . $user->id . ")\n\n";

    // Get all subscriptions ordered by created_at desc
    $allSubscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get();

    echo "📊 ALL SUBSCRIPTIONS (Latest First):\n";
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
        echo "  Created: " . $sub->created_at . "\n";
        echo "  Notes: " . ($sub->notes ?? 'None') . "\n";
        echo "  ---\n";
    }

    // Check for recent subscriptions (last 1 hour)
    $recentSubscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('created_at', '>=', Carbon::now()->subHour())
        ->get();

    echo "\n🕐 RECENT SUBSCRIPTIONS (Last 1 Hour):\n";
    if ($recentSubscriptions->count() > 0) {
        foreach ($recentSubscriptions as $sub) {
            $planName = $sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A';
            echo "  ID: " . $sub->id . " | Plan: " . $planName . " | Status: " . $sub->status . " | Created: " . $sub->created_at . "\n";
        }
    } else {
        echo "  ❌ No recent subscriptions found\n";
    }

    // Check business data
    $business = Business::where('owner_id', $user->id)->first();
    if ($business) {
        echo "\n🏢 BUSINESS DATA:\n";
        echo "  Current Subscription ID: " . $business->current_subscription_id . "\n";
        
        if ($business->currentSubscription) {
            $sub = $business->currentSubscription;
            echo "  Current Subscription Plan: " . ($sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A') . "\n";
            echo "  Current Subscription Status: " . $sub->status . "\n";
            echo "  Current Subscription Is Trial: " . ($sub->is_trial ? 'Yes' : 'No') . "\n";
            echo "  Current Subscription Days Remaining: " . $sub->daysRemaining() . "\n";
        }
    }

    // Check for any paid subscriptions
    $paidSubscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('is_trial', false)
        ->get();

    echo "\n💰 PAID SUBSCRIPTIONS:\n";
    if ($paidSubscriptions->count() > 0) {
        foreach ($paidSubscriptions as $sub) {
            $planName = $sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A';
            echo "  ID: " . $sub->id . " | Plan: " . $planName . " | Status: " . $sub->status . " | Amount: " . $sub->amount_paid . "\n";
        }
    } else {
        echo "  ❌ No paid subscriptions found\n";
    }

    echo "\n✅ CHECK COMPLETED!\n";
}

// Run the check
checkRecentSubscriptions();

?>












































































