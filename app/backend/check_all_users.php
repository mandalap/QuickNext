<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Business;
use App\Models\UserSubscription;

// Check all users and their roles
function checkAllUsers() {
    echo "👥 CHECKING ALL USERS AND ROLES\n";
    echo "===============================\n\n";

    $users = User::all();

    if ($users->isEmpty()) {
        echo "❌ No users found in database\n";
        return;
    }

    foreach ($users as $user) {
        echo "👤 USER ID: " . $user->id . "\n";
        echo "  Name: " . $user->name . "\n";
        echo "  Email: " . $user->email . "\n";
        echo "  Role: " . ($user->role ?? 'No role set') . "\n";
        echo "  Created: " . $user->created_at . "\n";

        // Check if user has subscription
        $subscription = UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($subscription) {
            echo "  Active Subscription: " . $subscription->subscriptionPlan->name . "\n";
        } else {
            echo "  Active Subscription: None\n";
        }

        // Check if user owns business
        $business = Business::where('owner_id', $user->id)->first();
        if ($business) {
            echo "  Owns Business: " . $business->name . " (ID: " . $business->id . ")\n";
        } else {
            echo "  Owns Business: None\n";
        }

        echo "  ---\n";
    }

    echo "\n📊 ROLE SUMMARY:\n";
    $roleCounts = $users->groupBy('role');
    foreach ($roleCounts as $role => $usersWithRole) {
        echo "  " . ($role ?? 'No role') . ": " . $usersWithRole->count() . " users\n";
    }

    echo "\n✅ USER CHECK COMPLETED!\n";
}

// Run the check
checkAllUsers();

?>












































































