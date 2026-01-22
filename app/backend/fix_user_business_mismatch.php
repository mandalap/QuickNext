<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\UserSubscription;
use App\Models\Business;
use App\Models\User;

// Fix user business mismatch
function fixUserBusinessMismatch() {
    echo "🔧 FIXING USER BUSINESS MISMATCH\n";
    echo "================================\n\n";

    // Get user 1 (Test User)
    $user1 = User::find(1);
    $user2 = User::find(2);

    if (!$user1 || !$user2) {
        echo "❌ Users not found\n";
        return;
    }

    echo "👤 USER 1 (Test User):\n";
    echo "  ID: " . $user1->id . "\n";
    echo "  Name: " . $user1->name . "\n";
    echo "  Email: " . $user1->email . "\n\n";

    echo "👤 USER 2 (MR RAFA):\n";
    echo "  ID: " . $user2->id . "\n";
    echo "  Name: " . $user2->name . "\n";
    echo "  Email: " . $user2->email . "\n\n";

    // Get business owned by user 2
    $business = Business::where('owner_id', $user2->id)->first();
    if (!$business) {
        echo "❌ No business found for user 2\n";
        return;
    }

    echo "🏢 BUSINESS:\n";
    echo "  ID: " . $business->id . "\n";
    echo "  Name: " . $business->name . "\n";
    echo "  Owner ID: " . $business->owner_id . "\n";
    echo "  Current Subscription ID: " . $business->current_subscription_id . "\n\n";

    // Get subscription for business
    $businessSubscription = UserSubscription::with('subscriptionPlan')
        ->where('id', $business->current_subscription_id)
        ->first();

    if (!$businessSubscription) {
        echo "❌ No subscription found for business\n";
        return;
    }

    echo "📊 BUSINESS SUBSCRIPTION:\n";
    echo "  ID: " . $businessSubscription->id . "\n";
    echo "  Plan: " . ($businessSubscription->subscriptionPlan ? $businessSubscription->subscriptionPlan->name : 'N/A') . "\n";
    echo "  Status: " . $businessSubscription->status . "\n";
    echo "  Is Trial: " . ($businessSubscription->is_trial ? 'Yes' : 'No') . "\n";
    echo "  User ID: " . $businessSubscription->user_id . "\n\n";

    // Check if subscription belongs to user 1 or user 2
    if ($businessSubscription->user_id == $user1->id) {
        echo "✅ Subscription belongs to User 1 - No fix needed\n";
    } else if ($businessSubscription->user_id == $user2->id) {
        echo "⚠️  Subscription belongs to User 2, but business is owned by User 2\n";
        echo "   This is actually correct - business owner should have the subscription\n";
    } else {
        echo "❌ Subscription belongs to different user: " . $businessSubscription->user_id . "\n";
    }

    // Option 1: Transfer business to user 1
    echo "\n🔧 OPTION 1: Transfer business to User 1\n";
    echo "  This will make User 1 the owner of the business\n";

    $business->update([
        'owner_id' => $user1->id,
    ]);

    echo "  ✅ Business transferred to User 1\n";

    // Option 2: Transfer subscription to user 1
    echo "\n🔧 OPTION 2: Transfer subscription to User 1\n";
    echo "  This will make User 1 the owner of the subscription\n";

    $businessSubscription->update([
        'user_id' => $user1->id,
    ]);

    echo "  ✅ Subscription transferred to User 1\n";

    // Verify the fix
    echo "\n✅ VERIFICATION:\n";
    $updatedBusiness = Business::find($business->id);
    $updatedSubscription = UserSubscription::find($businessSubscription->id);

    echo "  Business Owner ID: " . $updatedBusiness->owner_id . "\n";
    echo "  Subscription User ID: " . $updatedSubscription->user_id . "\n";

    if ($updatedBusiness->owner_id == $updatedSubscription->user_id) {
        echo "  ✅ Data is now consistent!\n";
    } else {
        echo "  ❌ Data is still inconsistent\n";
    }

    echo "\n🎉 FIX COMPLETED!\n";
}

// Run the fix
fixUserBusinessMismatch();

?>












































































