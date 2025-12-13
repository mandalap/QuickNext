<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Manual Subscription Activation ===\n\n";

// Get the latest pending subscription
$subscription = \App\Models\UserSubscription::where('status', 'pending_payment')
    ->orderBy('created_at', 'desc')
    ->first();

if (!$subscription) {
    echo "No pending subscription found!\n";
    exit(1);
}

echo "Found pending subscription:\n";
echo "Code: " . $subscription->subscription_code . "\n";
echo "User ID: " . $subscription->user_id . "\n";
echo "Plan: " . $subscription->subscriptionPlan->name . "\n";
echo "Amount: Rp " . number_format($subscription->amount_paid, 0, ',', '.') . "\n\n";

echo "Activating subscription...\n";

\Illuminate\Support\Facades\DB::beginTransaction();
try {
    // Update subscription to active
    $subscription->update([
        'status' => 'active',
        'notes' => ($subscription->notes ?? '') . ' | Manually activated for testing (VA payment successful) at ' . now(),
    ]);

    // Create payment record
    \App\Models\SubscriptionPayment::create([
        'user_subscription_id' => $subscription->id,
        'payment_code' => 'PAY-' . strtoupper(\Illuminate\Support\Str::random(10)),
        'payment_method' => 'bank_transfer',
        'amount' => $subscription->amount_paid,
        'transaction_id' => $subscription->subscription_code,
        'payment_status' => 'success',
        'paid_at' => now(),
        'payment_data' => json_encode([
            'note' => 'Manual activation - VA payment successful',
            'activated_at' => now()->toDateTimeString()
        ]),
    ]);

    \Illuminate\Support\Facades\DB::commit();

    echo "\n✅ SUCCESS! Subscription activated!\n\n";
    echo "Subscription Details:\n";
    echo "Status: " . $subscription->fresh()->status . "\n";
    echo "Active until: " . $subscription->ends_at . "\n";
    echo "\nYou can now create business and use the system!\n";

} catch (\Exception $e) {
    \Illuminate\Support\Facades\DB::rollBack();
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
