<?php

/**
 * Script untuk mengecek konfigurasi Midtrans
 * 
 * Usage: php check_midtrans_config.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "\n";
echo "========================================\n";
echo "  MIDTRANS CONFIGURATION CHECKER\n";
echo "========================================\n";
echo "\n";

// 1. Check .env file
echo "1. Checking .env file...\n";
$envPath = __DIR__ . '/.env';
if (!file_exists($envPath)) {
    echo "   ❌ File .env tidak ditemukan!\n";
    echo "   💡 Buat file .env dari .env.example\n";
} else {
    echo "   ✅ File .env ditemukan\n";
    
    // Read .env file
    $envContent = file_get_contents($envPath);
    
    // Check for Midtrans variables
    $serverKey = null;
    $clientKey = null;
    $isProduction = null;
    
    if (preg_match('/MIDTRANS_SERVER_KEY=(.+)/', $envContent, $matches)) {
        $serverKey = trim($matches[1]);
    }
    
    if (preg_match('/MIDTRANS_CLIENT_KEY=(.+)/', $envContent, $matches)) {
        $clientKey = trim($matches[1]);
    }
    
    if (preg_match('/MIDTRANS_IS_PRODUCTION=(.+)/', $envContent, $matches)) {
        $isProduction = trim($matches[1]);
    }
    
    echo "\n   📋 Current Configuration:\n";
    
    if (empty($serverKey) || $serverKey === 'YOUR_SERVER_KEY_HERE' || $serverKey === 'SB-Mid-server-YOUR_SERVER_KEY_HERE') {
        echo "   ❌ MIDTRANS_SERVER_KEY: BELUM DIUBAH (masih placeholder)\n";
    } elseif (strpos($serverKey, 'SB-Mid-server-XP2IB1DkWmIjbe96wcZamzFQ') !== false) {
        echo "   ⚠️  MIDTRANS_SERVER_KEY: MASIH MENGGUNAKAN CONTOH/OLD KEY\n";
        echo "      Value: " . substr($serverKey, 0, 30) . "...\n";
    } else {
        echo "   ✅ MIDTRANS_SERVER_KEY: Sudah di-set\n";
        echo "      Prefix: " . substr($serverKey, 0, 20) . "...\n";
    }
    
    if (empty($clientKey) || $clientKey === 'YOUR_CLIENT_KEY_HERE' || $clientKey === 'SB-Mid-client-YOUR_CLIENT_KEY_HERE') {
        echo "   ❌ MIDTRANS_CLIENT_KEY: BELUM DIUBAH (masih placeholder)\n";
    } elseif (strpos($clientKey, 'SB-Mid-client-P79Jkq4SfPTT5-kY') !== false) {
        echo "   ⚠️  MIDTRANS_CLIENT_KEY: MASIH MENGGUNAKAN CONTOH/OLD KEY\n";
        echo "      Value: " . substr($clientKey, 0, 30) . "...\n";
    } else {
        echo "   ✅ MIDTRANS_CLIENT_KEY: Sudah di-set\n";
        echo "      Prefix: " . substr($clientKey, 0, 20) . "...\n";
    }
    
    if ($isProduction === null) {
        echo "   ⚠️  MIDTRANS_IS_PRODUCTION: Tidak ditemukan (default: false)\n";
    } else {
        echo "   ✅ MIDTRANS_IS_PRODUCTION: " . ($isProduction === 'true' ? 'true (Production)' : 'false (Sandbox)') . "\n";
    }
}

// 2. Check config file
echo "\n2. Checking config/midtrans.php...\n";
$configPath = __DIR__ . '/config/midtrans.php';
if (file_exists($configPath)) {
    echo "   ✅ Config file ditemukan\n";
} else {
    echo "   ❌ Config file tidak ditemukan!\n";
}

// 3. Check loaded config values
echo "\n3. Checking loaded configuration...\n";
try {
    $loadedServerKey = config('midtrans.server_key');
    $loadedClientKey = config('midtrans.client_key');
    $loadedIsProduction = config('midtrans.is_production', false);
    
    if (empty($loadedServerKey)) {
        echo "   ❌ Server Key: KOSONG atau tidak ter-load\n";
    } else {
        echo "   ✅ Server Key: Ter-load\n";
        echo "      Prefix: " . substr($loadedServerKey, 0, 20) . "...\n";
        
        // Check if it's example/old key
        if (strpos($loadedServerKey, 'XP2IB1DkWmIjbe96wcZamzFQ') !== false) {
            echo "      ⚠️  WARNING: Masih menggunakan contoh/old key!\n";
        }
    }
    
    if (empty($loadedClientKey)) {
        echo "   ❌ Client Key: KOSONG atau tidak ter-load\n";
    } else {
        echo "   ✅ Client Key: Ter-load\n";
        echo "      Prefix: " . substr($loadedClientKey, 0, 20) . "...\n";
        
        // Check if it's example/old key
        if (strpos($loadedClientKey, 'P79Jkq4SfPTT5-kY') !== false) {
            echo "      ⚠️  WARNING: Masih menggunakan contoh/old key!\n";
        }
    }
    
    echo "   ✅ Is Production: " . ($loadedIsProduction ? 'true' : 'false') . "\n";
    
} catch (\Exception $e) {
    echo "   ❌ Error loading config: " . $e->getMessage() . "\n";
}

// 4. Check database (business configs)
echo "\n4. Checking database configurations...\n";
try {
    $businesses = \App\Models\Business::whereNotNull('midtrans_config')->get();
    
    if ($businesses->isEmpty()) {
        echo "   ℹ️  Tidak ada business dengan custom Midtrans config\n";
        echo "      (Menggunakan global config dari .env)\n";
    } else {
        echo "   📋 Found " . $businesses->count() . " business(es) with custom config:\n";
        foreach ($businesses as $business) {
            $config = $business->midtrans_config;
            echo "\n   Business ID: {$business->id} - {$business->name}\n";
            
            if (!empty($config['server_key'])) {
                $serverKeyPrefix = substr($config['server_key'], 0, 20);
                echo "      Server Key: {$serverKeyPrefix}...\n";
                
                if (strpos($config['server_key'], 'XP2IB1DkWmIjbe96wcZamzFQ') !== false) {
                    echo "      ⚠️  WARNING: Masih menggunakan contoh/old key!\n";
                }
            }
            
            if (!empty($config['client_key'])) {
                $clientKeyPrefix = substr($config['client_key'], 0, 20);
                echo "      Client Key: {$clientKeyPrefix}...\n";
                
                if (strpos($config['client_key'], 'P79Jkq4SfPTT5-kY') !== false) {
                    echo "      ⚠️  WARNING: Masih menggunakan contoh/old key!\n";
                }
            }
        }
    }
} catch (\Exception $e) {
    echo "   ⚠️  Error checking database: " . $e->getMessage() . "\n";
}

// 5. Test Midtrans connection (optional)
echo "\n5. Testing Midtrans connection...\n";
try {
    $serverKey = config('midtrans.server_key');
    $isProduction = config('midtrans.is_production', false);
    
    if (empty($serverKey)) {
        echo "   ❌ Tidak bisa test: Server Key kosong\n";
    } else {
        // Just check if key format is valid
        if (strpos($serverKey, 'SB-Mid-server-') === 0 || strpos($serverKey, 'Mid-server-') === 0) {
            echo "   ✅ Server Key format valid\n";
        } else {
            echo "   ⚠️  Server Key format tidak standar\n";
        }
        
        if (strpos($serverKey, 'SB-Mid-server-') === 0 && $isProduction) {
            echo "   ⚠️  WARNING: Sandbox key tapi is_production = true\n";
        }
        
        if (strpos($serverKey, 'Mid-server-') === 0 && !$isProduction) {
            echo "   ⚠️  WARNING: Production key tapi is_production = false\n";
        }
    }
} catch (\Exception $e) {
    echo "   ⚠️  Error testing: " . $e->getMessage() . "\n";
}

// Summary
echo "\n";
echo "========================================\n";
echo "  SUMMARY & RECOMMENDATIONS\n";
echo "========================================\n";
echo "\n";

$hasIssues = false;

if (empty($loadedServerKey) || strpos($loadedServerKey, 'XP2IB1DkWmIjbe96wcZamzFQ') !== false) {
    echo "❌ MASALAH DITEMUKAN:\n";
    echo "   - Server Key belum diubah atau masih menggunakan contoh/old key\n";
    $hasIssues = true;
}

if (empty($loadedClientKey) || strpos($loadedClientKey, 'P79Jkq4SfPTT5-kY') !== false) {
    echo "❌ MASALAH DITEMUKAN:\n";
    echo "   - Client Key belum diubah atau masih menggunakan contoh/old key\n";
    $hasIssues = true;
}

if ($hasIssues) {
    echo "\n";
    echo "💡 CARA MEMPERBAIKI:\n";
    echo "\n";
    echo "1. Login ke Midtrans Dashboard:\n";
    echo "   - Sandbox: https://dashboard.sandbox.midtrans.com/\n";
    echo "   - Production: https://dashboard.midtrans.com/\n";
    echo "\n";
    echo "2. Ambil credentials:\n";
    echo "   - Settings > Access Keys\n";
    echo "   - Copy Server Key dan Client Key\n";
    echo "\n";
    echo "3. Update file .env di backend:\n";
    echo "   MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_ACTUAL_KEY\n";
    echo "   MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_ACTUAL_KEY\n";
    echo "   MIDTRANS_IS_PRODUCTION=false\n";
    echo "\n";
    echo "4. Clear cache:\n";
    echo "   php artisan config:clear\n";
    echo "   php artisan cache:clear\n";
    echo "\n";
    echo "5. Jalankan script ini lagi untuk verifikasi\n";
} else {
    echo "✅ Konfigurasi Midtrans terlihat baik!\n";
    echo "\n";
    echo "💡 Jika pembayaran masih gagal, cek:\n";
    echo "   - Payment methods sudah diaktifkan di Midtrans Dashboard\n";
    echo "   - Webhook URL sudah dikonfigurasi\n";
    echo "   - Log error di storage/logs/laravel.log\n";
}

echo "\n";

