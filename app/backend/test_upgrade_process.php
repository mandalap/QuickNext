<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionPlanPrice;
use Carbon\Carbon;
use Illuminate\Support\Str;

// Test upgrade process
function testUpgradeProcess() {
    echo "🧪 TESTING UPGRADE PROCESS\n";
    echo "==========================\n\n";

    // Get user 1
    $user = User::find(1);
    if (!$user) {
        echo "❌ User not found\n";
        return;
    }

    echo "👤 USER: " . $user->name . " (ID: " . $user->id . ")\n\n";

    // Get current subscription
    $currentSubscription = UserSubscription::with('subscriptionPlan')
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->first();

    if (!$currentSubscription) {
        echo "❌ No active subscription found\n";
        return;
    }

    echo "📊 CURRENT SUBSCRIPTION:\n";
    echo "  ID: " . $currentSubscription->id . "\n";
    echo "  Plan: " . ($currentSubscription->subscriptionPlan ? $currentSubscription->subscriptionPlan->name : 'N/A') . "\n";
    echo "  Status: " . $currentSubscription->status . "\n";
    echo "  Is Trial: " . ($currentSubscription->is_trial ? 'Yes' : 'No') . "\n";
    echo "  Days Remaining: " . $currentSubscription->daysRemaining() . "\n\n";

    // Get available plans
    $plans = SubscriptionPlan::with('prices')
        ->where('is_active', true)
        ->where('slug', '!=', 'trial-7-days')
        ->orderBy('sort_order')
        ->get();

    echo "📋 AVAILABLE PLANS:\n";
    foreach ($plans as $plan) {
        echo "  ID: " . $plan->id . " | Name: " . $plan->name . " | Slug: " . $plan->slug . "\n";
        foreach ($plan->prices as $price) {
            echo "    Price ID: " . $price->id . " | Price: " . $price->final_price . " | Duration: " . $price->duration_months . " months\n";
        }
    }

    // Test upgrade to Basic plan
    $basicPlan = SubscriptionPlan::where('slug', 'basic')->first();
    if (!$basicPlan) {
        echo "\n❌ Basic plan not found\n";
        return;
    }

    $basicPrice = SubscriptionPlanPrice::where('subscription_plan_id', $basicPlan->id)
        ->where('duration_type', 'monthly')
        ->first();

    if (!$basicPrice) {
        echo "\n❌ Basic plan price not found\n";
        return;
    }

    echo "\n🎯 TESTING UPGRADE TO BASIC:\n";
    echo "  Plan: " . $basicPlan->name . " (ID: " . $basicPlan->id . ")\n";
    echo "  Price: " . $basicPrice->final_price . " (ID: " . $basicPrice->id . ")\n";

    // Simulate upgrade process
    try {
        // Calculate upgrade options
        $now = Carbon::now();
        $currentEndsAt = $currentSubscription->ends_at;
        $remainingDays = $now->diffInDays($currentEndsAt, false);

        echo "\n📊 UPGRADE CALCULATION:\n";
        echo "  Current Ends At: " . $currentEndsAt . "\n";
        echo "  Remaining Days: " . $remainingDays . "\n";
        echo "  New Plan Price: " . $basicPrice->final_price . "\n";

        // Create new subscription
        $newSubscription = UserSubscription::create([
            'user_id' => $user->id,
            'subscription_plan_id' => $basicPlan->id,
            'subscription_plan_price_id' => $basicPrice->id,
            'subscription_code' => 'SUB-' . strtoupper(Str::random(10)),
            'status' => 'active',
            'amount_paid' => $basicPrice->final_price,
            'starts_at' => $now,
            'ends_at' => $now->copy()->addMonths($basicPrice->duration_months),
            'trial_ends_at' => null,
            'is_trial' => false,
            'plan_features' => $basicPlan->features,
            'notes' => 'Upgraded from ' . $currentSubscription->subscriptionPlan->name,
        ]);

        echo "\n✅ NEW SUBSCRIPTION CREATED:\n";
        echo "  ID: " . $newSubscription->id . "\n";
        echo "  Plan: " . $basicPlan->name . "\n";
        echo "  Status: " . $newSubscription->status . "\n";
        echo "  Is Trial: " . ($newSubscription->is_trial ? 'Yes' : 'No') . "\n";
        echo "  Starts: " . $newSubscription->starts_at . "\n";
        echo "  Ends: " . $newSubscription->ends_at . "\n";
        echo "  Days Remaining: " . $newSubscription->daysRemaining() . "\n";

        // Cancel old subscription
        $currentSubscription->update([
            'status' => 'upgraded',
            'notes' => ($currentSubscription->notes ?? '') . ' | Upgraded to ' . $basicPlan->name . ' at ' . $now,
        ]);

        echo "\n✅ OLD SUBSCRIPTION CANCELLED:\n";
        echo "  ID: " . $currentSubscription->id . "\n";
        echo "  Status: " . $currentSubscription->status . "\n";

        // Update business
        $business = Business::where('owner_id', $user->id)->first();
        if ($business) {
            $business->update([
                'current_subscription_id' => $newSubscription->id,
                'subscription_info' => [
                    'plan_name' => $basicPlan->name,
                    'plan_type' => 'paid',
                    'is_trial' => false,
                    'trial_ends_at' => null,
                    'features' => $basicPlan->features,
                    'status' => 'active',
                    'days_remaining' => $newSubscription->daysRemaining(),
                ],
            ]);

            echo "\n✅ BUSINESS UPDATED:\n";
            echo "  Current Subscription ID: " . $business->current_subscription_id . "\n";
        }

        echo "\n🎉 UPGRADE COMPLETED SUCCESSFULLY!\n";

    } catch (Exception $e) {
        echo "\n❌ UPGRADE FAILED:\n";
        echo "  Error: " . $e->getMessage() . "\n";
        echo "  File: " . $e->getFile() . "\n";
        echo "  Line: " . $e->getLine() . "\n";
    }

    echo "\n✅ TEST COMPLETED!\n";
}

// Run the test
testUpgradeProcess();

?>





























