<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Business;
use App\Models\UserSubscription;
use Illuminate\Support\Facades\Hash;

// Test login for different roles
function testLoginRoles() {
    echo "🔐 TESTING LOGIN FOR DIFFERENT ROLES\n";
    echo "====================================\n\n";

    $testCredentials = [
        [
            'email' => 'admin@test.com',
            'password' => 'password123',
            'role' => 'admin'
        ],
        [
            'email' => 'waiter@test.com',
            'password' => 'password123',
            'role' => 'waiter'
        ],
        [
            'email' => 'superadmin@test.com',
            'password' => 'password123',
            'role' => 'super_admin'
        ],
        [
            'email' => 'kasir1@gmail.com',
            'password' => 'password123',
            'role' => 'kasir'
        ],
        [
            'email' => 'kasir2@gmail.com',
            'password' => 'password123',
            'role' => 'kitchen'
        ]
    ];

    foreach ($testCredentials as $credential) {
        echo "🔍 Testing: " . $credential['email'] . " (Role: " . $credential['role'] . ")\n";

        // Find user
        $user = User::where('email', $credential['email'])->first();

        if (!$user) {
            echo "  ❌ User not found\n";
            continue;
        }

        // Check password
        $passwordValid = Hash::check($credential['password'], $user->password);
        if (!$passwordValid) {
            echo "  ❌ Invalid password\n";
            continue;
        }

        // Check role
        if ($user->role !== $credential['role']) {
            echo "  ⚠️  Role mismatch: Expected " . $credential['role'] . ", got " . $user->role . "\n";
        } else {
            echo "  ✅ Role correct\n";
        }

        // Check subscription
        $subscription = UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($subscription) {
            echo "  ✅ Active subscription: " . $subscription->subscriptionPlan->name . "\n";
        } else {
            echo "  ❌ No active subscription\n";
        }

        // Check business access
        $business = Business::where('owner_id', $user->id)->first();
        if ($business) {
            echo "  ✅ Owns business: " . $business->name . "\n";
        } else {
            echo "  ℹ️  No business owned (employee role)\n";
        }

        // Determine expected home path
        $expectedPath = getExpectedHomePath($user->role);
        echo "  🏠 Expected home path: " . $expectedPath . "\n";

        echo "  ---\n";
    }

    echo "\n📋 ROLE-BASED ROUTES SUMMARY:\n";
    echo "  super_admin: / (Dashboard)\n";
    echo "  owner: / (Dashboard)\n";
    echo "  admin: / (Dashboard)\n";
    echo "  kasir: /cashier (Kasir POS)\n";
    echo "  kitchen: /kitchen (Kitchen Dashboard)\n";
    echo "  waiter: /tables (Waiter Dashboard)\n";
    echo "  member: /customer-portal (Customer Portal)\n";

    echo "\n✅ LOGIN TEST COMPLETED!\n";
}

function getExpectedHomePath($role) {
    switch ($role) {
        case 'super_admin':
        case 'owner':
        case 'admin':
            return '/';
        case 'kasir':
            return '/cashier';
        case 'kitchen':
            return '/kitchen';
        case 'waiter':
            return '/tables';
        case 'member':
            return '/customer-portal';
        default:
            return '/';
    }
}

// Run the test
testLoginRoles();

?>












































































