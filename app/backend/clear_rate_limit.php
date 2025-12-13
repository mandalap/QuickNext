<?php

/**
 * Script to clear rate limiting cache
 * Run this script to reset rate limiting when testing
 * 
 * Usage: 
 *   php clear_rate_limit.php          - Clear rate limit cache
 *   php clear_rate_limit.php --all   - Clear all cache
 */

require_once __DIR__ . '/vendor/autoload.php';

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;

echo "🔄 Clearing Rate Limit Cache...\n";
echo "================================\n\n";

try {
    $cleared = 0;
    
    // Method 1: Clear using RateLimiter facade (if available)
    // Laravel's throttle middleware uses keys like: throttle:login:127.0.0.1
    // We need to clear by IP pattern
    
    // Get all possible IPs from cache (for local testing, usually 127.0.0.1)
    $testIPs = ['127.0.0.1', '::1', 'localhost'];
    
    foreach ($testIPs as $ip) {
        $keys = [
            "throttle:login:{$ip}",
            "throttle:register:{$ip}",
            "throttle:api:{$ip}",
        ];
        
        foreach ($keys as $key) {
            try {
                RateLimiter::clear($key);
                $cleared++;
                echo "✅ Cleared: {$key}\n";
            } catch (\Exception $e) {
                // Key might not exist, continue
            }
        }
    }
    
    // Method 2: Clear cache directory (for file cache)
    $cacheDirectory = storage_path('framework/cache/data');
    
    if (is_dir($cacheDirectory)) {
        $files = glob($cacheDirectory . '/*');
        $fileCleared = 0;
        
        foreach ($files as $file) {
            if (is_file($file)) {
                // Laravel cache files are hashed, so we clear all
                // This is safe for development
                unlink($file);
                $fileCleared++;
            }
        }
        
        if ($fileCleared > 0) {
            echo "✅ Cleared {$fileCleared} cache files\n";
            $cleared += $fileCleared;
        }
    }
    
    // Method 3: Clear all cache if --all flag is set
    if (isset($_SERVER['argv'][1]) && $_SERVER['argv'][1] === '--all') {
        Cache::flush();
        echo "✅ Cleared all application cache\n";
    }
    
    if ($cleared > 0) {
        echo "\n✅ Rate limit cache cleared successfully! ({$cleared} items)\n";
        echo "💡 You can now test login without rate limiting issues.\n";
    } else {
        echo "\n⚠️  No rate limit cache found to clear.\n";
        echo "💡 This might mean rate limiting is already cleared or using different cache driver.\n";
    }
    
} catch (\Exception $e) {
    echo "❌ Error clearing rate limit cache: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

