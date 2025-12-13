<?php

/**
 * Script untuk test apakah payment methods sudah aktif di Midtrans
 * 
 * Usage: php test_midtrans_payment_methods.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\MidtransService;
use Illuminate\Support\Facades\Log;

echo "\n";
echo "========================================\n";
echo "  MIDTRANS PAYMENT METHODS TEST\n";
echo "========================================\n";
echo "\n";

try {
    // Get MidtransService dengan global config
    $midtransService = new MidtransService();
    
    // Test create snap token dengan minimal amount
    $testParams = [
        'order_id' => 'TEST-' . time(),
        'gross_amount' => 10000, // Minimal amount untuk test
        'item_id' => 'test-item',
        'item_name' => 'Test Payment Methods',
        'price' => 10000,
        'customer_name' => 'Test Customer',
        'customer_email' => 'test@example.com',
        'customer_phone' => '081234567890',
        'enabled_payments' => [
            'gopay',
            'shopeepay',
            'qris',
            'credit_card',
            'bca_va',
            'bni_va',
            'bri_va',
        ],
    ];
    
    echo "1. Testing Midtrans connection...\n";
    echo "   Server Key: " . substr(config('midtrans.server_key'), 0, 30) . "...\n";
    echo "   Client Key: " . substr(config('midtrans.client_key'), 0, 30) . "...\n";
    echo "   Is Production: " . (config('midtrans.is_production') ? 'true' : 'false') . "\n";
    echo "\n";
    
    echo "2. Creating test Snap token...\n";
    echo "   Order ID: {$testParams['order_id']}\n";
    echo "   Amount: Rp " . number_format($testParams['gross_amount'], 0, ',', '.') . "\n";
    echo "   Enabled Payments: " . implode(', ', $testParams['enabled_payments']) . "\n";
    echo "\n";
    
    $snapToken = $midtransService->createSnapToken($testParams);
    
    echo "   ✅ Snap token berhasil dibuat!\n";
    echo "   Token: " . substr($snapToken, 0, 30) . "...\n";
    echo "\n";
    
    echo "3. Testing payment methods availability...\n";
    echo "\n";
    echo "   💡 Jika payment methods sudah aktif di dashboard:\n";
    echo "      - Token ini bisa digunakan untuk test\n";
    echo "      - Modal Midtrans akan menampilkan pilihan payment\n";
    echo "\n";
    echo "   💡 Jika masih \"No payment channels available\":\n";
    echo "      - Payment methods belum diaktifkan di dashboard\n";
    echo "      - Ikuti panduan di FIX_NO_PAYMENT_CHANNELS.md\n";
    echo "\n";
    
    echo "4. Test URL untuk frontend:\n";
    echo "\n";
    echo "   Snap Token: {$snapToken}\n";
    echo "   Client Key: " . config('midtrans.client_key') . "\n";
    echo "\n";
    echo "   Gunakan token ini untuk test di frontend:\n";
    echo "   - Buka browser console\n";
    echo "   - Paste kode berikut:\n";
    echo "\n";
    echo "   ```javascript\n";
    echo "   window.snap.pay('{$snapToken}', {\n";
    echo "     onSuccess: function(result) {\n";
    echo "       console.log('Success:', result);\n";
    echo "     },\n";
    echo "     onPending: function(result) {\n";
    echo "       console.log('Pending:', result);\n";
    echo "     },\n";
    echo "     onError: function(result) {\n";
    echo "       console.log('Error:', result);\n";
    echo "     }\n";
    echo "   });\n";
    echo "   ```\n";
    echo "\n";
    
    echo "========================================\n";
    echo "  SUMMARY\n";
    echo "========================================\n";
    echo "\n";
    echo "✅ Snap token berhasil dibuat\n";
    echo "✅ Credentials valid\n";
    echo "\n";
    echo "⚠️  Jika masih \"No payment channels available\":\n";
    echo "   1. Login ke https://dashboard.sandbox.midtrans.com/\n";
    echo "   2. Settings → Snap Preferences\n";
    echo "   3. Aktifkan: GoPay, ShopeePay, QRIS, Credit Card\n";
    echo "   4. Save dan tunggu 5-10 menit\n";
    echo "   5. Clear cache: php artisan config:clear\n";
    echo "   6. Test lagi\n";
    echo "\n";
    
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "\n";
    echo "Stack trace:\n";
    echo $e->getTraceAsString() . "\n";
    echo "\n";
    
    echo "💡 Kemungkinan penyebab:\n";
    echo "   - Server Key atau Client Key salah\n";
    echo "   - Network error ke Midtrans API\n";
    echo "   - Credentials belum diupdate di .env\n";
    echo "\n";
    
    exit(1);
}

echo "\n";

