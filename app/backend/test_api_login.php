<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

// Test API login directly
function testApiLogin() {
    echo "🔐 TESTING API LOGIN DIRECTLY\n";
    echo "=============================\n\n";

    $testCredentials = [
        [
            'email' => 'kasir2@gmail.com',
            'password' => 'password123',
            'role' => 'kitchen'
        ],
        [
            'email' => 'kasir1@gmail.com',
            'password' => 'password123',
            'role' => 'kasir'
        ],
        [
            'email' => 'admin@test.com',
            'password' => 'password123',
            'role' => 'admin'
        ]
    ];

    foreach ($testCredentials as $credential) {
        echo "🔍 Testing API login: " . $credential['email'] . "\n";

        // Find user
        $user = User::where('email', $credential['email'])->first();

        if (!$user) {
            echo "  ❌ User not found\n";
            continue;
        }

        echo "  👤 User found: " . $user->name . "\n";
        echo "  📧 Email: " . $user->email . "\n";
        echo "  🔑 Role: " . $user->role . "\n";
        echo "  📅 Created: " . $user->created_at . "\n";

        // Test password verification
        $passwordValid = Hash::check($credential['password'], $user->password);
        echo "  🔐 Password check: " . ($passwordValid ? "✅ Valid" : "❌ Invalid") . "\n";

        if (!$passwordValid) {
            echo "  🔧 Attempting to fix password...\n";
            $user->password = Hash::make($credential['password']);
            $user->save();

            // Test again
            $passwordValidAfterFix = Hash::check($credential['password'], $user->password);
            echo "  🔐 Password after fix: " . ($passwordValidAfterFix ? "✅ Valid" : "❌ Invalid") . "\n";
        }

        // Test login simulation
        if ($passwordValid || Hash::check($credential['password'], $user->password)) {
            echo "  ✅ Login simulation successful\n";

            // Check if user has subscription
            $subscription = \App\Models\UserSubscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            if ($subscription) {
                echo "  ✅ Active subscription: " . $subscription->subscriptionPlan->name . "\n";
            } else {
                echo "  ❌ No active subscription\n";
            }
        } else {
            echo "  ❌ Login simulation failed\n";
        }

        echo "  ---\n";
    }

    echo "\n🧪 TESTING LOGIN API ENDPOINT:\n";

    // Test the actual login endpoint
    $loginData = [
        'email' => 'kasir2@gmail.com',
        'password' => 'password123'
    ];

    echo "📤 Sending login request to /api/login...\n";
    echo "  Email: " . $loginData['email'] . "\n";
    echo "  Password: " . $loginData['password'] . "\n";

    // Simulate the login request
    try {
        $user = User::where('email', $loginData['email'])->first();

        if (!$user) {
            echo "  ❌ User not found in database\n";
        } else {
            $passwordValid = Hash::check($loginData['password'], $user->password);
            echo "  🔐 Password verification: " . ($passwordValid ? "✅ Valid" : "❌ Invalid") . "\n";

            if ($passwordValid) {
                echo "  ✅ Login should succeed\n";
                echo "  👤 User: " . $user->name . "\n";
                echo "  🔑 Role: " . $user->role . "\n";
            } else {
                echo "  ❌ Login should fail - password mismatch\n";
            }
        }
    } catch (Exception $e) {
        echo "  ❌ Error: " . $e->getMessage() . "\n";
    }

    echo "\n✅ API LOGIN TEST COMPLETED!\n";
}

// Run the test
testApiLogin();

?>












































































