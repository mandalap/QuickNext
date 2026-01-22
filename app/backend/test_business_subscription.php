<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Business;
use App\Models\User;

echo "TEST BUSINESS SUBSCRIPTION API\n";
echo "===============================\n\n";

// Get owner user (change email as needed)
$user = User::where('email', 'owner@example.com')->first();

if (!$user) {
    echo "❌ User not found. Update email in script.\n";
    exit;
}

echo "User: {$user->name} (ID: {$user->id})\n";
echo "Role: {$user->role}\n\n";

// Get businesses for this user
$businesses = Business::where('owner_id', $user->id)
    ->orWhereHas('users', function($query) use ($user) {
        $query->where('business_users.user_id', $user->id)
              ->where('business_users.is_active', true);
    })
    ->with(['owner', 'outlets', 'currentSubscription.subscriptionPlan'])
    ->get();

echo "Found {$businesses->count()} businesses\n\n";

foreach ($businesses as $business) {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "Business: {$business->name} (ID: {$business->id})\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "Current Subscription ID: " . ($business->current_subscription_id ?? 'NULL') . "\n\n";
    
    if ($business->currentSubscription) {
        echo "✅ HAS SUBSCRIPTION:\n";
        echo "  Subscription ID: {$business->currentSubscription->id}\n";
        echo "  Status: {$business->currentSubscription->status}\n";
        echo "  Is Trial: " . ($business->currentSubscription->is_trial ? 'Yes' : 'No') . "\n";
        echo "  Plan: " . ($business->currentSubscription->subscriptionPlan->name ?? 'Unknown') . "\n";
        echo "  Days Remaining: " . $business->currentSubscription->daysRemaining() . "\n";
        echo "  Starts At: {$business->currentSubscription->starts_at}\n";
        echo "  Ends At: {$business->currentSubscription->ends_at}\n";
        
        // Transform to subscription_info
        $subscription_info = [
            'status' => $business->currentSubscription->status,
            'is_trial' => $business->currentSubscription->is_trial,
            'days_remaining' => $business->currentSubscription->daysRemaining(),
            'plan_name' => $business->currentSubscription->subscriptionPlan->name ?? 'Unknown',
            'ends_at' => $business->currentSubscription->ends_at,
        ];
        
        echo "\nAPI Response subscription_info:\n";
        echo json_encode($subscription_info, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "❌ NO SUBSCRIPTION\n";
    }
    echo "\n";
}
