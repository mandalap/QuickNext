<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;
use Carbon\Carbon;

// Fix trial duration issue
function fixTrialDuration() {
    echo "🔧 FIXING TRIAL DURATION ISSUE\n";
    echo "==============================\n\n";

    // Get user 1
    $user = User::find(1);
    if (!$user) {
        echo "❌ User not found\n";
        return;
    }

    // Get all active subscriptions for user
    $subscriptions = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->get();

    echo "📊 ACTIVE SUBSCRIPTIONS:\n";
    foreach ($subscriptions as $sub) {
        echo "  ID: " . $sub->id . "\n";
        echo "  Plan: " . ($sub->subscriptionPlan ? $sub->subscriptionPlan->name : 'N/A') . "\n";
        echo "  Starts: " . $sub->starts_at . "\n";
        echo "  Ends: " . $sub->ends_at . "\n";
        echo "  Is Trial: " . ($sub->is_trial ? 'Yes' : 'No') . "\n";

        // Calculate days remaining
        $daysRemaining = Carbon::now()->diffInDays(Carbon::parse($sub->ends_at), false);
        echo "  Days Remaining: " . $daysRemaining . "\n";
        echo "  ---\n";
    }

    // Find the correct trial subscription (should be 7 days)
    $correctTrial = $subscriptions->where('is_trial', true)
        ->where('ends_at', '<=', Carbon::now()->addDays(10)) // Should end within 10 days
        ->first();

    if (!$correctTrial) {
        echo "❌ No correct trial subscription found\n";
        return;
    }

    echo "\n✅ CORRECT TRIAL SUBSCRIPTION:\n";
    echo "  ID: " . $correctTrial->id . "\n";
    echo "  Ends: " . $correctTrial->ends_at . "\n";
    echo "  Days Remaining: " . Carbon::now()->diffInDays(Carbon::parse($correctTrial->ends_at), false) . "\n";

    // Cancel all other active subscriptions
    $otherSubscriptions = $subscriptions->where('id', '!=', $correctTrial->id);
    echo "\n🔧 CANCELLING OTHER SUBSCRIPTIONS:\n";
    foreach ($otherSubscriptions as $sub) {
        $sub->update([
            'status' => 'cancelled',
            'notes' => ($sub->notes ?? '') . ' | Cancelled due to duplicate trial at ' . Carbon::now(),
        ]);
        echo "  ✅ Cancelled subscription ID: " . $sub->id . "\n";
    }

    // Update business to use correct subscription
    $business = Business::where('owner_id', $user->id)->first();
    if ($business) {
        $business->update([
            'current_subscription_id' => $correctTrial->id,
            'subscription_info' => [
                'plan_name' => $correctTrial->subscriptionPlan->name,
                'plan_type' => 'trial',
                'is_trial' => true,
                'trial_ends_at' => $correctTrial->trial_ends_at,
                'features' => $correctTrial->plan_features,
                'status' => 'active',
                'days_remaining' => Carbon::now()->diffInDays(Carbon::parse($correctTrial->ends_at), false),
            ],
        ]);
        echo "\n✅ Updated business to use correct subscription\n";
    }

    // Verify the fix
    echo "\n✅ VERIFICATION:\n";
    $updatedBusiness = Business::find($business->id);
    $activeSubscription = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->first();

    echo "  Business Current Subscription ID: " . $updatedBusiness->current_subscription_id . "\n";
    echo "  Active Subscription ID: " . $activeSubscription->id . "\n";
    echo "  Days Remaining: " . Carbon::now()->diffInDays(Carbon::parse($activeSubscription->ends_at), false) . "\n";

    if ($updatedBusiness->current_subscription_id == $activeSubscription->id) {
        echo "  ✅ Data is now consistent!\n";
    } else {
        echo "  ❌ Data is still inconsistent\n";
    }

    echo "\n🎉 FIX COMPLETED!\n";
}

// Run the fix
fixTrialDuration();

?>












































































