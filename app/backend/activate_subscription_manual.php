<?php

/**
 * Manual Subscription Activation Script
 * 
 * This script manually activates a pending_payment subscription
 * Use this when payment was completed in Midtrans but webhook wasn't received
 * (common in local development where Midtrans can't reach localhost)
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

// Get subscription code from command line argument
$subscriptionCode = $argv[1] ?? null;

if (!$subscriptionCode) {
    echo "❌ Error: Please provide subscription code\n";
    echo "Usage: php activate_subscription_manual.php SUB-XXXXX\n";
    exit(1);
}

echo "🔍 Looking for subscription: {$subscriptionCode}\n\n";

// Find subscription
$subscription = DB::table('user_subscriptions')
    ->where('subscription_code', $subscriptionCode)
    ->first();

if (!$subscription) {
    echo "❌ Subscription not found: {$subscriptionCode}\n";
    exit(1);
}

echo "📋 Subscription Details:\n";
echo "   ID: {$subscription->id}\n";
echo "   User ID: {$subscription->user_id}\n";
echo "   Status: {$subscription->status}\n";
echo "   Amount: Rp " . number_format($subscription->amount_paid, 0, ',', '.') . "\n";
echo "   Created: {$subscription->created_at}\n";
echo "\n";

if ($subscription->status !== 'pending_payment') {
    echo "⚠️  Warning: Subscription status is '{$subscription->status}', not 'pending_payment'\n";
    echo "Do you still want to activate it? (yes/no): ";
    $confirm = trim(fgets(STDIN));
    if (strtolower($confirm) !== 'yes') {
        echo "❌ Activation cancelled\n";
        exit(0);
    }
}

echo "⚠️  This will activate the subscription manually.\n";
echo "Only do this if you have confirmed the payment was successful in Midtrans.\n";
echo "Continue? (yes/no): ";
$confirm = trim(fgets(STDIN));

if (strtolower($confirm) !== 'yes') {
    echo "❌ Activation cancelled\n";
    exit(0);
}

DB::beginTransaction();
try {
    // Update subscription status to active
    DB::table('user_subscriptions')
        ->where('id', $subscription->id)
        ->update([
            'status' => 'active',
            'notes' => ($subscription->notes ?? '') . ' | Manually activated via script on ' . now(),
            'updated_at' => now(),
        ]);

    // Create or update payment record
    $payment = DB::table('subscription_payments')
        ->where('user_subscription_id', $subscription->id)
        ->where('payment_code', $subscriptionCode)
        ->first();

    if ($payment) {
        // Update existing payment
        DB::table('subscription_payments')
            ->where('id', $payment->id)
            ->update([
                'status' => 'paid',
                'paid_at' => now(),
                'updated_at' => now(),
            ]);
        echo "✅ Updated existing payment record (ID: {$payment->id})\n";
    } else {
        // Create new payment record
        DB::table('subscription_payments')->insert([
            'user_subscription_id' => $subscription->id,
            'payment_code' => $subscriptionCode,
            'payment_method' => 'manual_activation',
            'payment_gateway' => 'midtrans',
            'gateway_payment_id' => $subscriptionCode,
            'amount' => $subscription->amount_paid,
            'status' => 'paid',
            'paid_at' => now(),
            'payment_data' => json_encode([
                'note' => 'Manually activated - payment confirmed in Midtrans but webhook not received',
                'activated_at' => now(),
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        echo "✅ Created new payment record\n";
    }

    DB::commit();

    echo "\n";
    echo "✅ Subscription activated successfully!\n";
    echo "   Subscription Code: {$subscriptionCode}\n";
    echo "   Status: active\n";
    echo "   Ends At: {$subscription->ends_at}\n";
    echo "\n";
    echo "You can now create your business at: http://localhost:3000/business-setup\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "\n❌ Error activating subscription: " . $e->getMessage() . "\n";
    exit(1);
}
