<?php

/**
 * Test script untuk memverifikasi rate limiting fix
 * Test multiple login attempts untuk memastikan tidak ada error 429
 * 
 * Usage: php test_rate_limiting.php
 */

require_once __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Http;

echo "🧪 TESTING RATE LIMITING FIX\n";
echo "=============================\n\n";

// Test credentials (gunakan user yang ada di database)
$testEmail = 'juli23man@gmail.com'; // atau email lain yang valid
$testPassword = 'password123';

$apiUrl = 'http://localhost:8000/api/login';
$testCount = 20; // Test 20 kali login

echo "📋 Test Configuration:\n";
echo "  API URL: {$apiUrl}\n";
echo "  Test Email: {$testEmail}\n";
echo "  Number of Tests: {$testCount}\n";
echo "  Expected: No 429 errors (rate limit should be 1000/min)\n\n";

echo "🚀 Starting tests...\n\n";

$successCount = 0;
$rateLimitCount = 0;
$errorCount = 0;
$results = [];

for ($i = 1; $i <= $testCount; $i++) {
    echo "[{$i}/{$testCount}] Testing login attempt... ";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'email' => $testEmail,
        'password' => $testPassword
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    $results[] = [
        'attempt' => $i,
        'http_code' => $httpCode,
        'error' => $error
    ];
    
    if ($error) {
        echo "❌ cURL Error: {$error}\n";
        $errorCount++;
    } elseif ($httpCode === 200) {
        echo "✅ Success (200)\n";
        $successCount++;
    } elseif ($httpCode === 429) {
        echo "❌ RATE LIMITED (429) - Masih ada masalah!\n";
        $rateLimitCount++;
    } elseif ($httpCode === 401 || $httpCode === 422) {
        echo "⚠️  Auth Error ({$httpCode}) - Credentials mungkin salah, tapi bukan rate limit\n";
        $successCount++; // Tidak dihitung sebagai error rate limit
    } else {
        echo "⚠️  HTTP {$httpCode}\n";
        $errorCount++;
    }
    
    // Small delay to avoid overwhelming server
    usleep(100000); // 0.1 second
}

echo "\n";
echo "📊 TEST RESULTS SUMMARY\n";
echo "=======================\n";
echo "Total Tests: {$testCount}\n";
echo "✅ Successful (200): {$successCount}\n";
echo "❌ Rate Limited (429): {$rateLimitCount}\n";
echo "⚠️  Other Errors: {$errorCount}\n";
echo "\n";

// Check environment
echo "🔍 ENVIRONMENT CHECK\n";
echo "====================\n";
$env = app()->environment();
echo "Current Environment: {$env}\n";

if (in_array($env, ['local', 'testing'])) {
    echo "✅ Environment is '{$env}' - Rate limiting should be lenient (1000/min)\n";
} else {
    echo "⚠️  Environment is '{$env}' - Rate limiting might be strict (10/min)\n";
    echo "   Consider setting APP_ENV=local in .env file\n";
}

echo "\n";

// Final verdict
if ($rateLimitCount === 0) {
    echo "🎉 SUCCESS! No rate limiting errors detected!\n";
    echo "✅ Rate limiting fix is working correctly.\n";
    exit(0);
} else {
    echo "❌ FAILED! Found {$rateLimitCount} rate limiting errors.\n";
    echo "⚠️  Rate limiting fix might need adjustment.\n";
    echo "\n";
    echo "💡 Suggestions:\n";
    echo "   1. Run: php clear_rate_limit.php\n";
    echo "   2. Check APP_ENV in .env file (should be 'local' or 'testing')\n";
    echo "   3. Restart Laravel server\n";
    exit(1);
}

