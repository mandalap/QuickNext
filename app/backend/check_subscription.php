<?php

/**
 * Script to check and fix subscription issues
 * 
 * Usage: php check_subscription.php SUB-HWXB3JXDVS
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\UserSubscription;
use App\Models\SubscriptionPayment;

$subscriptionCode = $argv[1] ?? 'SUB-HWXB3JXDVS';

echo "🔍 Checking subscription: {$subscriptionCode}\n\n";

// 1. Check exact match
$subscription = UserSubscription::where('subscription_code', $subscriptionCode)
    ->with(['subscriptionPlan', 'subscriptionPlanPrice', 'user'])
    ->first();

if ($subscription) {
    echo "✅ Subscription ditemukan (exact match):\n";
    echo "   ID: {$subscription->id}\n";
    echo "   Code: {$subscription->subscription_code}\n";
    echo "   Status: {$subscription->status}\n";
    echo "   User ID: {$subscription->user_id}\n";
    echo "   User Email: " . ($subscription->user->email ?? 'N/A') . "\n";
    echo "   Amount: Rp " . number_format($subscription->amount_paid, 0, ',', '.') . "\n";
    echo "   Starts At: {$subscription->starts_at}\n";
    echo "   Ends At: {$subscription->ends_at}\n";
    echo "   Plan: " . ($subscription->subscriptionPlan->name ?? 'N/A') . "\n";
    echo "\n";
    
    // Check payment records
    $payments = SubscriptionPayment::where('user_subscription_id', $subscription->id)->get();
    echo "📋 Payment Records: " . $payments->count() . "\n";
    foreach ($payments as $payment) {
        echo "   - Payment Code: {$payment->payment_code}\n";
        echo "     Status: {$payment->status}\n";
        echo "     Amount: Rp " . number_format($payment->amount, 0, ',', '.') . "\n";
        echo "     Paid At: " . ($payment->paid_at ?? 'N/A') . "\n";
    }
    
    // Check if status should be updated
    if ($subscription->status === 'pending_payment') {
        echo "\n⚠️  Status masih 'pending_payment'\n";
        echo "   Apakah pembayaran sudah berhasil di Midtrans? (y/n): ";
        $handle = fopen("php://stdin", "r");
        $line = fgets($handle);
        if (trim($line) === 'y') {
            $subscription->update(['status' => 'active']);
            echo "✅ Status updated to 'active'\n";
            
            // Update business
            $business = $subscription->user->ownedBusinesses()->first();
            if ($business) {
                $business->update([
                    'current_subscription_id' => $subscription->id,
                    'subscription_expires_at' => $subscription->ends_at,
                ]);
                echo "✅ Business updated\n";
            }
        }
        fclose($handle);
    }
} else {
    echo "❌ Subscription tidak ditemukan dengan exact match\n\n";
    
    // 2. Check partial match
    echo "🔍 Mencari dengan partial match...\n";
    $partialSubscriptions = UserSubscription::where('subscription_code', 'like', $subscriptionCode . '%')
        ->with(['subscriptionPlan', 'user'])
        ->get();
    
    if ($partialSubscriptions->count() > 0) {
        echo "✅ Ditemukan " . $partialSubscriptions->count() . " subscription dengan code serupa:\n\n";
        foreach ($partialSubscriptions as $sub) {
            echo "   Code: {$sub->subscription_code}\n";
            echo "   Status: {$sub->status}\n";
            echo "   User: " . ($sub->user->email ?? 'N/A') . "\n";
            echo "   ---\n";
        }
    } else {
        echo "❌ Tidak ada subscription dengan code serupa\n\n";
        
        // 3. List all recent subscriptions
        echo "📋 Recent subscriptions (last 10):\n";
        $recentSubscriptions = UserSubscription::orderBy('created_at', 'desc')
            ->limit(10)
            ->with(['subscriptionPlan', 'user'])
            ->get();
        
        foreach ($recentSubscriptions as $sub) {
            echo "   Code: {$sub->subscription_code} | Status: {$sub->status} | User: " . ($sub->user->email ?? 'N/A') . "\n";
        }
    }
}

echo "\n✅ Check selesai!\n";

