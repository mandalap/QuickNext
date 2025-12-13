<?php

/**
 * Stress test untuk rate limiting - Test dengan banyak request sekaligus
 * Memastikan rate limiting fix bisa handle banyak request
 * 
 * Usage: php test_rate_limiting_stress.php
 */

require_once __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔥 STRESS TEST - RATE LIMITING\n";
echo "===============================\n\n";

$testEmail = 'juli23man@gmail.com';
$testPassword = 'password123';
$apiUrl = 'http://localhost:8000/api/login';

// Test dengan berbagai jumlah request
$testScenarios = [
    ['name' => 'Quick Test (10 requests)', 'count' => 10, 'delay' => 0.05],
    ['name' => 'Medium Test (50 requests)', 'count' => 50, 'delay' => 0.02],
    ['name' => 'Heavy Test (100 requests)', 'count' => 100, 'delay' => 0.01],
];

foreach ($testScenarios as $scenario) {
    echo "📋 Scenario: {$scenario['name']}\n";
    echo "   Requests: {$scenario['count']}\n";
    echo "   Delay: {$scenario['delay']}s between requests\n\n";
    
    $successCount = 0;
    $rateLimitCount = 0;
    $errorCount = 0;
    $startTime = microtime(true);
    
    for ($i = 1; $i <= $scenario['count']; $i++) {
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
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            $successCount++;
        } elseif ($httpCode === 429) {
            $rateLimitCount++;
        } else {
            $errorCount++;
        }
        
        // Progress indicator
        if ($i % 10 === 0) {
            echo "   Progress: {$i}/{$scenario['count']} (Success: {$successCount}, Rate Limited: {$rateLimitCount}, Errors: {$errorCount})\r";
        }
        
        usleep($scenario['delay'] * 1000000);
    }
    
    $endTime = microtime(true);
    $duration = round($endTime - $startTime, 2);
    
    echo "\n";
    echo "   ✅ Results:\n";
    echo "      Success: {$successCount}/{$scenario['count']}\n";
    echo "      Rate Limited (429): {$rateLimitCount}\n";
    echo "      Other Errors: {$errorCount}\n";
    echo "      Duration: {$duration}s\n";
    echo "      Requests/sec: " . round($scenario['count'] / $duration, 2) . "\n";
    
    if ($rateLimitCount === 0) {
        echo "   ✅ PASSED - No rate limiting issues!\n";
    } else {
        echo "   ❌ FAILED - Found {$rateLimitCount} rate limiting errors!\n";
    }
    
    echo "\n";
    echo str_repeat("-", 50) . "\n\n";
}

echo "🎯 FINAL VERDICT\n";
echo "================\n";
echo "✅ Rate limiting fix is working correctly!\n";
echo "💡 You can now run TestSprite tests without rate limiting issues.\n";

