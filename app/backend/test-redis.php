#!/usr/bin/env php
<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    $result = Illuminate\Support\Facades\Redis::ping();
    echo "✅ Redis Connected Successfully!\n";
    echo "Response: " . ($result ? 'PONG' : 'No response') . "\n";
    
    // Test set/get
    Illuminate\Support\Facades\Redis::set('test_key', 'Hello from QuickKasir!');
    $value = Illuminate\Support\Facades\Redis::get('test_key');
    echo "✅ Test Set/Get: " . $value . "\n";
    
    exit(0);
} catch (Exception $e) {
    echo "❌ Redis Connection Failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
