<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$userId = $argv[1] ?? 35;

echo "Checking business for user ID: {$userId}\n\n";

$business = App\Models\Business::where('owner_id', $userId)
    ->latest()
    ->first();

if (!$business) {
    echo "❌ No business found for user {$userId}\n";
    exit(1);
}

echo "✅ Business Found:\n";
echo "   ID: {$business->id}\n";
echo "   Name: {$business->name}\n";
echo "   Current Subscription ID: {$business->current_subscription_id}\n\n";

$subscription = App\Models\UserSubscription::find($business->current_subscription_id);

if ($subscription) {
    echo "📋 Business Subscription:\n";
    echo "   ID: {$subscription->id}\n";
    echo "   Code: {$subscription->subscription_code}\n";
    echo "   Status: {$subscription->status}\n";
    echo "   Is Trial: " . ($subscription->is_trial ? 'Yes' : 'No') . "\n";
    echo "   Plan: " . ($subscription->subscriptionPlan->name ?? 'N/A') . "\n";
    echo "   Ends At: {$subscription->ends_at}\n\n";
} else {
    echo "❌ Subscription not found!\n\n";
}

// Check all subscriptions for this user
echo "📋 All Subscriptions for User {$userId}:\n";
$allSubs = App\Models\UserSubscription::where('user_id', $userId)
    ->orderBy('created_at', 'desc')
    ->get();

foreach ($allSubs as $sub) {
    $icon = $sub->status === 'active' ? '✅' : '⏳';
    echo "{$icon} ID: {$sub->id} | Code: {$sub->subscription_code} | Status: {$sub->status} | Trial: " . ($sub->is_trial ? 'Yes' : 'No') . "\n";
}
