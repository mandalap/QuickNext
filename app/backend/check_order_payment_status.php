<?php

/**
 * Script untuk cek status payment dan order
 * 
 * Usage: php check_order_payment_status.php SS-C7AECFEF
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$orderNumber = $argv[1] ?? 'SS-C7AECFEF';

echo "\n";
echo "========================================\n";
echo "  CHECK ORDER PAYMENT STATUS\n";
echo "========================================\n";
echo "\n";

echo "Order Number: {$orderNumber}\n";
echo "\n";

try {
    // Find order
    $order = \App\Models\Order::where('order_number', $orderNumber)->first();
    
    if (!$order) {
        echo "❌ Order tidak ditemukan!\n";
        exit(1);
    }
    
    echo "✅ Order ditemukan:\n";
    echo "   ID: {$order->id}\n";
    echo "   Order Number: {$order->order_number}\n";
    echo "   Status: {$order->status}\n";
    echo "   Payment Status: {$order->payment_status}\n";
    echo "   Total: Rp " . number_format($order->total, 0, ',', '.') . "\n";
    echo "   Created At: {$order->created_at}\n";
    echo "\n";
    
    // Find payments
    $payments = \App\Models\Payment::where('order_id', $order->id)
        ->where('payment_method', 'qris')
        ->orderBy('created_at', 'desc')
        ->get();
    
    if ($payments->isEmpty()) {
        echo "❌ Tidak ada payment QRIS ditemukan untuk order ini!\n";
        exit(1);
    }
    
    echo "📋 Payments ditemukan: {$payments->count()}\n";
    echo "\n";
    
    foreach ($payments as $index => $payment) {
        echo "--- Payment #" . ($index + 1) . " ---\n";
        echo "   ID: {$payment->id}\n";
        echo "   Reference Number: {$payment->reference_number}\n";
        echo "   Status: {$payment->status}\n";
        echo "   Amount: Rp " . number_format($payment->amount, 0, ',', '.') . "\n";
        echo "   Paid At: " . ($payment->paid_at ? $payment->paid_at : 'Belum dibayar') . "\n";
        echo "   Created At: {$payment->created_at}\n";
        
        // Check Midtrans transaction status
        if ($payment->reference_number) {
            echo "\n   🔍 Checking Midtrans transaction status...\n";
            try {
                $order->load('outlet');
                $midtransService = \App\Services\MidtransService::forOutlet($order->outlet);
                
                $transactionStatus = $midtransService->getTransactionStatus($payment->reference_number);
                
                echo "   ✅ Midtrans Status:\n";
                echo "      Transaction Status: {$transactionStatus->transaction_status}\n";
                echo "      Payment Type: " . ($transactionStatus->payment_type ?? 'N/A') . "\n";
                echo "      Transaction Time: " . ($transactionStatus->transaction_time ?? 'N/A') . "\n";
                echo "      Gross Amount: Rp " . number_format($transactionStatus->gross_amount ?? 0, 0, ',', '.') . "\n";
                
                // Check if status mismatch
                $midtransSettled = in_array($transactionStatus->transaction_status, ['settlement', 'capture']);
                $localPaid = $payment->status === 'success';
                $orderPaid = $order->payment_status === 'paid';
                
                if ($midtransSettled && (!$localPaid || !$orderPaid)) {
                    echo "\n   ⚠️  STATUS MISMATCH DITEMUKAN!\n";
                    echo "      Midtrans: SETTLED/SUCCESS\n";
                    echo "      Payment Status: " . ($localPaid ? 'SUCCESS' : 'PENDING') . "\n";
                    echo "      Order Payment Status: " . ($orderPaid ? 'PAID' : 'UNPAID') . "\n";
                    echo "\n   💡 Perlu sync payment status!\n";
                } elseif ($midtransSettled && $localPaid && $orderPaid) {
                    echo "\n   ✅ Status sudah sinkron!\n";
                } else {
                    echo "\n   ℹ️  Payment masih pending di Midtrans\n";
                }
                
            } catch (\Exception $e) {
                echo "   ❌ Error checking Midtrans: " . $e->getMessage() . "\n";
            }
        }
        
        echo "\n";
    }
    
    // Summary
    echo "========================================\n";
    echo "  SUMMARY\n";
    echo "========================================\n";
    echo "\n";
    
    $latestPayment = $payments->first();
    $order->load('outlet');
    $midtransService = \App\Services\MidtransService::forOutlet($order->outlet);
    
    try {
        $transactionStatus = $midtransService->getTransactionStatus($latestPayment->reference_number);
        $midtransSettled = in_array($transactionStatus->transaction_status, ['settlement', 'capture']);
        
        if ($midtransSettled && $order->payment_status !== 'paid') {
            echo "❌ MASALAH: Payment sudah SETTLED di Midtrans tapi order masih UNPAID!\n";
            echo "\n";
            echo "💡 SOLUSI:\n";
            echo "   1. Jalankan sync payment status:\n";
            echo "      php artisan tinker\n";
            echo "      >>> \$order = \\App\\Models\\Order::where('order_number', '{$orderNumber}')->first();\n";
            echo "      >>> \$order->syncPaymentStatus();\n";
            echo "\n";
            echo "   2. Atau klik tombol 'Sync Payment' di frontend\n";
            echo "\n";
            echo "   3. Atau jalankan script sync:\n";
            echo "      php sync_order_payment.php {$orderNumber}\n";
        } else {
            echo "✅ Status sudah sinkron atau payment masih pending\n";
        }
    } catch (\Exception $e) {
        echo "⚠️  Tidak bisa check Midtrans status: " . $e->getMessage() . "\n";
    }
    
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "\n";
    echo "Stack trace:\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n";

