<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Checking Recent Subscriptions ===\n\n";

$subscriptions = \App\Models\UserSubscription::with(['subscriptionPlan', 'user'])
    ->orderBy('created_at', 'desc')
    ->limit(5)
    ->get();

foreach ($subscriptions as $sub) {
    echo "----------------------------------------\n";
    echo "ID: " . $sub->id . "\n";
    echo "User: " . ($sub->user->name ?? 'N/A') . " (ID: " . $sub->user_id . ")\n";
    echo "Email: " . ($sub->user->email ?? 'N/A') . "\n";
    echo "Subscription Code: " . $sub->subscription_code . "\n";
    echo "Plan: " . ($sub->subscriptionPlan->name ?? 'N/A') . "\n";
    echo "Status: " . $sub->status . "\n";
    echo "Amount: Rp " . number_format($sub->amount_paid, 0, ',', '.') . "\n";
    echo "Created: " . $sub->created_at . "\n";
    echo "Ends At: " . $sub->ends_at . "\n";
    echo "Is Active: " . ($sub->status === 'active' && $sub->ends_at > now() ? 'YES' : 'NO') . "\n";
    echo "----------------------------------------\n\n";
}

// Check for pending payments
echo "\n=== Pending Payment Subscriptions ===\n\n";
$pending = \App\Models\UserSubscription::where('status', 'pending_payment')
    ->with(['user', 'subscriptionPlan'])
    ->get();

if ($pending->count() > 0) {
    foreach ($pending as $sub) {
        echo "User: " . ($sub->user->name ?? 'N/A') . " | Code: " . $sub->subscription_code . " | Plan: " . ($sub->subscriptionPlan->name ?? 'N/A') . "\n";
    }
} else {
    echo "No pending subscriptions found.\n";
}
