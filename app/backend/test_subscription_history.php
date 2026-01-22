<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\UserSubscription;

$email = 'julimandala@gmail.com';

echo "=== Testing Subscription History Endpoint ===\n\n";

$user = User::where('email', $email)->first();

if (!$user) {
    echo "❌ User not found!\n";
    exit(1);
}

echo "✅ User found: {$user->name} (ID: {$user->id})\n\n";

try {
    echo "Fetching subscriptions...\n";
    
    $subscriptions = UserSubscription::where('user_id', $user->id)
        ->with([
            'subscriptionPlan' => function ($query) {
                $query->whereNull('deleted_at');
            }
        ])
        ->orderBy('created_at', 'desc')
        ->get();
    
    echo "✅ Found {$subscriptions->count()} subscriptions\n\n";
    
    foreach ($subscriptions as $index => $subscription) {
        echo "--- Subscription #" . ($index + 1) . " ---\n";
        echo "ID: {$subscription->id}\n";
        echo "Code: {$subscription->subscription_code}\n";
        echo "Status: {$subscription->status}\n";
        
        try {
            // Test formatting like in getHistory()
            $formatted = [
                'id' => $subscription->id,
                'subscription_code' => $subscription->subscription_code,
                'subscription_plan' => $subscription->subscriptionPlan ? [
                    'id' => $subscription->subscriptionPlan->id,
                    'name' => $subscription->subscriptionPlan->name,
                    'slug' => $subscription->subscriptionPlan->slug,
                ] : null,
                'status' => $subscription->status,
                'amount_paid' => $subscription->amount_paid,
                'starts_at' => $subscription->starts_at?->toIso8601String(),
                'ends_at' => $subscription->ends_at?->toIso8601String(),
                'days_remaining' => $subscription->daysRemaining(),
                'is_trial' => $subscription->is_trial,
                'created_at' => $subscription->created_at?->toIso8601String(),
                'updated_at' => $subscription->updated_at?->toIso8601String(),
            ];
            
            echo "✅ Formatted successfully\n";
            echo "   Plan: " . ($formatted['subscription_plan']['name'] ?? 'NULL') . "\n";
            echo "   Days Remaining: " . $formatted['days_remaining'] . "\n";
            
        } catch (\Exception $e) {
            echo "❌ Error formatting: " . $e->getMessage() . "\n";
            echo "   Stack trace:\n";
            echo "   " . $e->getTraceAsString() . "\n";
        }
        
        echo "\n";
    }
    
    echo "\n=== Testing Complete Response ===\n";
    
    $formattedSubscriptions = $subscriptions->map(function ($subscription) {
        try {
            return [
                'id' => $subscription->id,
                'subscription_code' => $subscription->subscription_code,
                'subscription_plan' => $subscription->subscriptionPlan ? [
                    'id' => $subscription->subscriptionPlan->id,
                    'name' => $subscription->subscriptionPlan->name,
                    'slug' => $subscription->subscriptionPlan->slug,
                ] : null,
                'status' => $subscription->status,
                'amount_paid' => $subscription->amount_paid,
                'starts_at' => $subscription->starts_at?->toIso8601String(),
                'ends_at' => $subscription->ends_at?->toIso8601String(),
                'days_remaining' => $subscription->daysRemaining(),
                'is_trial' => $subscription->is_trial,
                'created_at' => $subscription->created_at?->toIso8601String(),
                'updated_at' => $subscription->updated_at?->toIso8601String(),
            ];
        } catch (\Exception $e) {
            echo "❌ Error in map: " . $e->getMessage() . "\n";
            return null;
        }
    });
    
    $response = [
        'success' => true,
        'data' => $formattedSubscriptions,
        'total' => $formattedSubscriptions->count(),
    ];
    
    echo "✅ Response created successfully\n";
    echo "Total subscriptions in response: " . $response['total'] . "\n";
    
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "\nStack Trace:\n";
    echo $e->getTraceAsString() . "\n";
}
