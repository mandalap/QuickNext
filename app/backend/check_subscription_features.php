<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\UserSubscription;
use App\Models\SubscriptionPlan;

$email = 'julimandala@gmail.com';

echo "=== Checking Subscription for $email ===\n\n";

$user = User::where('email', $email)->first();

if (!$user) {
    echo "❌ User not found!\n";
    exit(1);
}

echo "✅ User found:\n";
echo "   ID: {$user->id}\n";
echo "   Name: {$user->name}\n";
echo "   Role: {$user->role}\n\n";

// Get all subscriptions
$allSubscriptions = UserSubscription::where('user_id', $user->id)
    ->with('subscriptionPlan')
    ->orderBy('created_at', 'desc')
    ->get();

echo "📋 Total subscriptions: " . $allSubscriptions->count() . "\n\n";

foreach ($allSubscriptions as $index => $sub) {
    echo "--- Subscription #" . ($index + 1) . " ---\n";
    echo "   ID: {$sub->id}\n";
    echo "   Code: {$sub->subscription_code}\n";
    echo "   Status: {$sub->status}\n";
    echo "   Starts At: {$sub->starts_at}\n";
    echo "   Ends At: {$sub->ends_at}\n";
    echo "   Plan ID: {$sub->subscription_plan_id}\n";
    
    if ($sub->subscriptionPlan) {
        $plan = $sub->subscriptionPlan;
        echo "   Plan Name: {$plan->name}\n";
        echo "   Plan Features:\n";
        echo "      - has_advanced_reports: " . ($plan->has_advanced_reports ? 'YES' : 'NO') . "\n";
        echo "      - has_reports_access: " . ($plan->has_reports_access ?? 'NULL') . "\n";
        echo "      - has_kitchen_access: " . ($plan->has_kitchen_access ? 'YES' : 'NO') . "\n";
        echo "      - has_tables_access: " . ($plan->has_tables_access ? 'YES' : 'NO') . "\n";
        echo "      - has_attendance_access: " . ($plan->has_attendance_access ? 'YES' : 'NO') . "\n";
        echo "      - has_inventory_access: " . ($plan->has_inventory_access ? 'YES' : 'NO') . "\n";
        echo "      - has_promo_access: " . ($plan->has_promo_access ? 'YES' : 'NO') . "\n";
        echo "      - has_stock_transfer_access: " . ($plan->has_stock_transfer_access ? 'YES' : 'NO') . "\n";
        echo "      - has_self_service_access: " . ($plan->has_self_service_access ? 'YES' : 'NO') . "\n";
        echo "      - has_online_integration: " . ($plan->has_online_integration ? 'YES' : 'NO') . "\n";
        echo "      - has_api_access: " . ($plan->has_api_access ? 'YES' : 'NO') . "\n";
        echo "      - has_multi_location: " . ($plan->has_multi_location ? 'YES' : 'NO') . "\n";
        echo "      - max_businesses: " . ($plan->max_businesses ?? 'NULL') . "\n";
        echo "      - max_outlets: " . ($plan->max_outlets ?? 'NULL') . "\n";
        echo "      - max_products: " . ($plan->max_products ?? 'NULL') . "\n";
        echo "      - max_employees: " . ($plan->max_employees ?? 'NULL') . "\n";
    } else {
        echo "   ❌ Plan not found!\n";
    }
    echo "\n";
}

// Get active subscription
$activeSubscription = UserSubscription::where('user_id', $user->id)
    ->where('status', 'active')
    ->where('ends_at', '>', now())
    ->with('subscriptionPlan')
    ->latest()
    ->first();

echo "\n=== ACTIVE SUBSCRIPTION ===\n";
if ($activeSubscription) {
    echo "✅ Active subscription found:\n";
    echo "   ID: {$activeSubscription->id}\n";
    echo "   Plan: {$activeSubscription->subscriptionPlan->name}\n";
    echo "   Status: {$activeSubscription->status}\n";
    echo "   Ends At: {$activeSubscription->ends_at}\n";
} else {
    echo "❌ No active subscription found!\n";
    
    // Check for pending payment
    $pending = UserSubscription::where('user_id', $user->id)
        ->where('status', 'pending_payment')
        ->latest()
        ->first();
    
    if ($pending) {
        echo "⚠️  Found pending payment subscription:\n";
        echo "   ID: {$pending->id}\n";
        echo "   Code: {$pending->subscription_code}\n";
        echo "   Plan ID: {$pending->subscription_plan_id}\n";
    }
}

echo "\n=== ALL SUBSCRIPTION PLANS ===\n";
$plans = SubscriptionPlan::all();
foreach ($plans as $plan) {
    echo "Plan: {$plan->name} (ID: {$plan->id})\n";
    echo "   has_advanced_reports: " . ($plan->has_advanced_reports ? 'YES' : 'NO') . "\n";
    echo "   has_kitchen_access: " . ($plan->has_kitchen_access ? 'YES' : 'NO') . "\n";
    echo "   has_tables_access: " . ($plan->has_tables_access ? 'YES' : 'NO') . "\n";
    echo "   has_inventory_access: " . ($plan->has_inventory_access ? 'YES' : 'NO') . "\n";
    echo "\n";
}
