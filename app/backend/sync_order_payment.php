<?php

/**
 * Script untuk sync payment status order dari Midtrans
 * 
 * Usage: php sync_order_payment.php SS-C7AECFEF
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$orderNumber = $argv[1] ?? null;

if (!$orderNumber) {
    echo "Usage: php sync_order_payment.php <order_number>\n";
    echo "Example: php sync_order_payment.php SS-C7AECFEF\n";
    exit(1);
}

echo "\n";
echo "========================================\n";
echo "  SYNC ORDER PAYMENT STATUS\n";
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
    
    echo "✅ Order ditemukan: ID {$order->id}\n";
    echo "   Current Status: {$order->status}\n";
    echo "   Current Payment Status: {$order->payment_status}\n";
    echo "\n";
    
    // Find payment with reference_number first (most likely to have Midtrans transaction)
    $payment = \App\Models\Payment::where('order_id', $order->id)
        ->where('payment_method', 'qris')
        ->whereNotNull('reference_number')
        ->where('reference_number', '!=', '')
        ->orderBy('created_at', 'desc')
        ->first();
    
    // If no payment with reference_number, try pending payment
    if (!$payment) {
        $payment = \App\Models\Payment::where('order_id', $order->id)
            ->where('payment_method', 'qris')
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->first();
    }
    
    if (!$payment) {
        echo "❌ Tidak ada payment ditemukan!\n";
        exit(1);
    }
    
    if (!$payment->reference_number) {
        echo "❌ Payment tidak punya reference_number!\n";
        echo "   Payment ID: {$payment->id}\n";
        echo "   Status: {$payment->status}\n";
        echo "\n";
        echo "💡 Coba cari payment lain yang punya reference_number...\n";
        
        $paymentWithRef = \App\Models\Payment::where('order_id', $order->id)
            ->where('payment_method', 'qris')
            ->whereNotNull('reference_number')
            ->where('reference_number', '!=', '')
            ->orderBy('created_at', 'desc')
            ->first();
        
        if ($paymentWithRef) {
            echo "✅ Ditemukan payment dengan reference_number: ID {$paymentWithRef->id}\n";
            $payment = $paymentWithRef;
        } else {
            echo "❌ Tidak ada payment dengan reference_number ditemukan!\n";
            exit(1);
        }
    }
    
    echo "✅ Payment ditemukan: ID {$payment->id}\n";
    echo "   Reference Number: {$payment->reference_number}\n";
    echo "   Current Status: {$payment->status}\n";
    echo "\n";
    
    // Get Midtrans transaction status
    $order->load('outlet', 'business');
    $midtransService = \App\Services\MidtransService::forOutlet($order->outlet);
    
    echo "🔍 Checking Midtrans transaction status...\n";
    $transactionStatus = $midtransService->getTransactionStatus($payment->reference_number);
    
    echo "   Transaction Status: {$transactionStatus->transaction_status}\n";
    echo "   Payment Type: " . ($transactionStatus->payment_type ?? 'N/A') . "\n";
    echo "\n";
    
    // Update if settled
    if (in_array($transactionStatus->transaction_status, ['settlement', 'capture'])) {
        echo "✅ Payment sudah SETTLED di Midtrans!\n";
        echo "   Updating payment and order status...\n";
        
        \DB::beginTransaction();
        try {
            // Update payment
            $payment->update([
                'status' => 'success',
                'paid_at' => \Carbon\Carbon::parse($transactionStatus->transaction_time ?? now()),
                'payment_data' => array_merge(
                    $payment->payment_data ?? [],
                    [
                        'transaction_id' => $transactionStatus->transaction_id ?? null,
                        'transaction_status' => $transactionStatus->transaction_status,
                        'payment_type' => $transactionStatus->payment_type ?? null,
                        'transaction_time' => $transactionStatus->transaction_time ?? null,
                    ]
                ),
            ]);
            
            echo "   ✅ Payment status updated to SUCCESS\n";
            
            // Update order
            $business = $order->business;
            $settings = $business->settings ?? [];
            $autoConfirm = $settings['kitchen_auto_confirm'] ?? true;
            
            $newStatus = $order->status;
            if ($order->status === 'pending') {
                $newStatus = $autoConfirm ? 'confirmed' : 'pending';
            }
            
            $order->update([
                'payment_status' => 'paid',
                'status' => $newStatus,
            ]);
            
            echo "   ✅ Order payment_status updated to PAID\n";
            echo "   ✅ Order status updated to {$newStatus}\n";
            
            \DB::commit();
            
            echo "\n";
            echo "✅ SYNC BERHASIL!\n";
            echo "   Order sekarang: {$order->status} / {$order->payment_status}\n";
            echo "   Payment sekarang: {$payment->status}\n";
            
        } catch (\Exception $e) {
            \DB::rollBack();
            throw $e;
        }
        
    } else {
        echo "ℹ️  Payment masih pending di Midtrans\n";
        echo "   Transaction Status: {$transactionStatus->transaction_status}\n";
        echo "   Tidak ada yang perlu diupdate.\n";
    }
    
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "\n";
    echo "Stack trace:\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n";

