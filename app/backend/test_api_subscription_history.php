<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Log;

$email = 'julimandala@gmail.com';

echo "=== Testing Subscription History API Endpoint ===\n\n";

$user = User::where('email', $email)->first();

if (!$user) {
    echo "❌ User not found!\n";
    exit(1);
}

echo "✅ User found: {$user->name} (ID: {$user->id})\n";
echo "   Role: {$user->role}\n\n";

// Create a token for testing
$token = $user->createToken('test-token')->plainTextToken;
echo "✅ Test token created: {$token}\n\n";

// Test the API endpoint using curl
$url = 'http://localhost:8000/api/v1/subscriptions/history';
echo "Testing endpoint: {$url}\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'Accept: application/json',
    'Content-Type: application/json',
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: {$httpCode}\n";
echo "Response:\n";
echo $response . "\n\n";

if ($httpCode === 200) {
    $data = json_decode($response, true);
    if ($data && isset($data['success']) && $data['success']) {
        echo "✅ SUCCESS! History loaded successfully\n";
        echo "Total subscriptions: " . ($data['total'] ?? 0) . "\n";
    } else {
        echo "❌ FAILED: Response indicates failure\n";
        echo "Message: " . ($data['message'] ?? 'Unknown error') . "\n";
    }
} else {
    echo "❌ FAILED: HTTP {$httpCode}\n";
    $data = json_decode($response, true);
    if ($data) {
        echo "Error message: " . ($data['message'] ?? 'Unknown error') . "\n";
        if (isset($data['subscription_required'])) {
            echo "⚠️  Subscription required flag: " . ($data['subscription_required'] ? 'true' : 'false') . "\n";
        }
    }
}

// Clean up token
$user->tokens()->where('name', 'test-token')->delete();
echo "\n✅ Test token cleaned up\n";
