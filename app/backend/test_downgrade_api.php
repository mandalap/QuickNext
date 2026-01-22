<?php

require_once 'vendor/autoload.php';

// Test downgrade API endpoint
function testDowngradeAPI() {
    echo "🧪 TESTING DOWNGRADE API ENDPOINT\n";
    echo "==================================\n\n";

    $apiUrl = 'http://localhost:8000/api/v1/subscriptions/downgrade-to-trial';

    // Test data
    $testData = [
        'test' => true
    ];

    echo "📡 API ENDPOINT:\n";
    echo "  URL: " . $apiUrl . "\n";
    echo "  Method: POST\n";
    echo "  Headers: Authorization: Bearer {token}\n";
    echo "  Body: " . json_encode($testData) . "\n\n";

    // Test with cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer test-token'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    echo "🔄 Sending request...\n";
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    echo "📊 RESPONSE:\n";
    echo "  HTTP Code: " . $httpCode . "\n";

    if ($error) {
        echo "  Error: " . $error . "\n";
    } else {
        echo "  Response: " . $response . "\n";
    }

    echo "\n";

    // Expected responses
    echo "📋 EXPECTED RESPONSES:\n";
    echo "  ✅ Success (200): {\n";
    echo "    \"success\": true,\n";
    echo "    \"message\": \"Berhasil downgrade ke paket trial 7 hari\",\n";
    echo "    \"data\": { ... }\n";
    echo "  }\n\n";

    echo "  ❌ Unauthorized (401): {\n";
    echo "    \"message\": \"Unauthenticated.\"\n";
    echo "  }\n\n";

    echo "  ❌ No Subscription (404): {\n";
    echo "    \"success\": false,\n";
    echo "    \"message\": \"No active subscription found\"\n";
    echo "  }\n\n";

    echo "  ❌ Already Trial (400): {\n";
    echo "    \"success\": false,\n";
    echo "    \"message\": \"Anda sudah menggunakan paket trial\"\n";
    echo "  }\n\n";

    echo "✅ API TEST COMPLETED!\n";
    echo "======================\n";
}

// Run the test
testDowngradeAPI();

?>












































































