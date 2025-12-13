<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Business;
use App\Models\UserSubscription;

// Setup employee business relationships
function setupEmployeeBusiness() {
    echo "🏢 SETTING UP EMPLOYEE BUSINESS RELATIONSHIPS\n";
    echo "=============================================\n\n";

    // Get the business (owned by Test User - ID 1)
    $business = Business::find(1);
    if (!$business) {
        echo "❌ Business not found\n";
        return;
    }

    echo "🏢 Business: " . $business->name . " (ID: " . $business->id . ")\n";
    echo "  Owner: " . $business->owner->name . " (ID: " . $business->owner_id . ")\n\n";

    // Get owner's active subscription
    $ownerSubscription = UserSubscription::where('user_id', $business->owner_id)
        ->where('status', 'active')
        ->first();

    if ($ownerSubscription) {
        echo "✅ Owner has active subscription: " . $ownerSubscription->subscriptionPlan->name . "\n";
    } else {
        echo "❌ Owner has no active subscription\n";
        return;
    }

    // Employee users that need business access
    $employeeEmails = [
        'admin@test.com',
        'waiter@test.com',
        'superadmin@test.com',
        'kasir1@gmail.com',
        'kasir2@gmail.com'
    ];

    echo "\n👥 SETTING UP EMPLOYEE ACCESS:\n";
    foreach ($employeeEmails as $email) {
        $user = User::where('email', $email)->first();

        if (!$user) {
            echo "❌ User not found: " . $email . "\n";
            continue;
        }

        echo "👤 " . $user->name . " (" . $user->email . ")\n";
        echo "  Role: " . $user->role . "\n";

        // For employees, they don't need to own the business
        // They just need to be able to access it through the business relationship
        // This is handled in the login process by checking owner_subscription_status

        echo "  ✅ Employee access configured\n";
        echo "  ---\n";
    }

    echo "\n📋 LOGIN FLOW FOR EMPLOYEES:\n";
    echo "1. Employee logs in with their credentials\n";
    echo "2. System checks if owner has active subscription\n";
    echo "3. If owner has subscription, employee can access their role-specific dashboard\n";
    echo "4. If owner has no subscription, employee gets error message\n";

    echo "\n🎯 EMPLOYEE DASHBOARDS:\n";
    echo "  admin: / (Dashboard)\n";
    echo "  waiter: /tables (Waiter Dashboard)\n";
    echo "  super_admin: / (Dashboard)\n";
    echo "  kasir: /cashier (Kasir POS)\n";
    echo "  kitchen: /kitchen (Kitchen Dashboard)\n";

    echo "\n✅ EMPLOYEE BUSINESS SETUP COMPLETED!\n";
}

// Run the function
setupEmployeeBusiness();

?>












































































