<?php
/**
 * Debug script to check subscription status
 * Run with: php check_subscription_debug.php
 */

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "============================================\n";
echo "  SUBSCRIPTION DEBUG CHECKER\n";
echo "============================================\n\n";

// Get recent subscriptions
echo "📋 Recent User Subscriptions:\n";
echo str_repeat("-", 80) . "\n";

$subscriptions = DB::table('user_subscriptions')
    ->join('users', 'user_subscriptions.user_id', '=', 'users.id')
    ->leftJoin('subscription_plans', 'user_subscriptions.subscription_plan_id', '=', 'subscription_plans.id')
    ->select(
        'user_subscriptions.id',
        'user_subscriptions.subscription_code',
        'users.name as user_name',
        'users.email as user_email',
        'user_subscriptions.status',
        'subscription_plans.name as plan_name',
        'user_subscriptions.is_trial',
        'user_subscriptions.amount_paid',
        'user_subscriptions.starts_at',
        'user_subscriptions.ends_at',
        'user_subscriptions.created_at'
    )
    ->orderBy('user_subscriptions.created_at', 'desc')
    ->limit(10)
    ->get();

foreach ($subscriptions as $sub) {
    $status_icon = match($sub->status) {
        'active' => '✅',
        'pending_payment' => '⏳',
        'cancelled' => '❌',
        'upgraded' => '⬆️',
        default => '❓'
    };

    echo "\n";
    echo "ID: {$sub->id} {$status_icon}\n";
    echo "User: {$sub->user_name} ({$sub->user_email})\n";
    echo "Code: {$sub->subscription_code}\n";
    echo "Status: {$sub->status}\n";
    echo "Plan: {$sub->plan_name}\n";
    echo "Trial: " . ($sub->is_trial ? 'Yes' : 'No') . "\n";
    echo "Amount: Rp " . number_format($sub->amount_paid, 0, ',', '.') . "\n";
    echo "Period: {$sub->starts_at} → {$sub->ends_at}\n";
    echo "Created: {$sub->created_at}\n";
    echo str_repeat("-", 80) . "\n";
}

// Check subscription payments
echo "\n💰 Recent Subscription Payments:\n";
echo str_repeat("-", 80) . "\n";

$payments = DB::table('subscription_payments')
    ->join('user_subscriptions', 'subscription_payments.user_subscription_id', '=', 'user_subscriptions.id')
    ->select(
        'subscription_payments.id',
        'user_subscriptions.subscription_code',
        'subscription_payments.payment_method',
        'subscription_payments.payment_gateway',
        'subscription_payments.gateway_payment_id',
        'subscription_payments.amount',
        'subscription_payments.status',
        'subscription_payments.paid_at',
        'subscription_payments.created_at'
    )
    ->orderBy('subscription_payments.created_at', 'desc')
    ->limit(10)
    ->get();

if ($payments->isEmpty()) {
    echo "❌ No payment records found!\n";
    echo "This might indicate webhook is not working!\n";
} else {
    foreach ($payments as $payment) {
        $status_icon = match($payment->status) {
            'success', 'completed', 'paid' => '✅',
            'pending' => '⏳',
            'failed' => '❌',
            default => '❓'
        };

        echo "\n";
        echo "Payment ID: {$payment->id} {$status_icon}\n";
        echo "Subscription: {$payment->subscription_code}\n";
        echo "Method: {$payment->payment_method}\n";
        echo "Gateway: {$payment->payment_gateway}\n";
        echo "Gateway Payment ID: {$payment->gateway_payment_id}\n";
        echo "Amount: Rp " . number_format($payment->amount, 0, ',', '.') . "\n";
        echo "Status: {$payment->status}\n";
        echo "Paid At: {$payment->paid_at}\n";
        echo "Created: {$payment->created_at}\n";
        echo str_repeat("-", 80) . "\n";
    }
}

// Check for pending_payment subscriptions
echo "\n⚠️  Pending Payment Subscriptions:\n";
echo str_repeat("-", 80) . "\n";

$pending = DB::table('user_subscriptions')
    ->join('users', 'user_subscriptions.user_id', '=', 'users.id')
    ->where('user_subscriptions.status', 'pending_payment')
    ->select(
        'user_subscriptions.id',
        'user_subscriptions.subscription_code',
        'users.name as user_name',
        'users.email as user_email',
        'user_subscriptions.created_at'
    )
    ->orderBy('user_subscriptions.created_at', 'desc')
    ->get();

if ($pending->isEmpty()) {
    echo "✅ No pending subscriptions found!\n";
} else {
    echo "⚠️  Found " . count($pending) . " pending subscription(s):\n\n";
    foreach ($pending as $p) {
        echo "ID: {$p->id}\n";
        echo "Code: {$p->subscription_code}\n";
        echo "User: {$p->user_name} ({$p->user_email})\n";
        echo "Created: {$p->created_at}\n";
        echo "\n🔍 Check if payment succeeded in Midtrans for: {$p->subscription_code}\n";
        echo str_repeat("-", 80) . "\n";
    }
}

// Check businesses
echo "\n🏢 Recent Businesses:\n";
echo str_repeat("-", 80) . "\n";

$businesses = DB::table('businesses')
    ->join('users', 'businesses.owner_id', '=', 'users.id')
    ->leftJoin('user_subscriptions', 'businesses.current_subscription_id', '=', 'user_subscriptions.id')
    ->select(
        'businesses.id',
        'businesses.name as business_name',
        'users.name as owner_name',
        'users.email as owner_email',
        'user_subscriptions.status as subscription_status',
        'user_subscriptions.subscription_code',
        'businesses.created_at'
    )
    ->orderBy('businesses.created_at', 'desc')
    ->limit(5)
    ->get();

if ($businesses->isEmpty()) {
    echo "❌ No businesses found!\n";
} else {
    foreach ($businesses as $biz) {
        echo "\n";
        echo "Business: {$biz->business_name}\n";
        echo "Owner: {$biz->owner_name} ({$biz->owner_email})\n";
        echo "Subscription Status: {$biz->subscription_status}\n";
        echo "Subscription Code: {$biz->subscription_code}\n";
        echo "Created: {$biz->created_at}\n";
        echo str_repeat("-", 80) . "\n";
    }
}

echo "\n\n";
echo "============================================\n";
echo "  DEBUG COMPLETE\n";
echo "============================================\n";
