<?php

// Test login API using curl
function testCurlLogin() {
    echo "🌐 TESTING LOGIN API WITH CURL\n";
    echo "==============================\n\n";

    $testCredentials = [
        [
            'email' => 'kasir2@gmail.com',
            'password' => 'password123',
            'role' => 'kitchen'
        ],
        [
            'email' => 'admin@test.com',
            'password' => 'password123',
            'role' => 'admin'
        ]
    ];

    foreach ($testCredentials as $credential) {
        echo "🔍 Testing: " . $credential['email'] . " (Role: " . $credential['role'] . ")\n";

        $loginData = [
            'email' => $credential['email'],
            'password' => $credential['password']
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost:8000/api/login');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($loginData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        echo "  HTTP Code: " . $httpCode . "\n";

        if ($error) {
            echo "  ❌ cURL Error: " . $error . "\n";
        } else {
            $data = json_decode($response, true);

            if ($httpCode === 200) {
                echo "  ✅ Login successful\n";
                echo "  👤 User: " . ($data['user']['name'] ?? 'N/A') . "\n";
                echo "  🔑 Role: " . ($data['user']['role'] ?? 'N/A') . "\n";
                echo "  🏢 Employee Business: " . ($data['employee_business'] ? 'Yes' : 'No') . "\n";
                echo "  💳 Owner Subscription: " . ($data['owner_subscription_status']['has_active_subscription'] ? 'Active' : 'Inactive') . "\n";
            } else {
                echo "  ❌ Login failed\n";
                echo "  📝 Response: " . $response . "\n";
            }
        }

        echo "  ---\n";
    }

    echo "\n✅ CURL LOGIN TEST COMPLETED!\n";
}

// Run the test
testCurlLogin();

?>












































































