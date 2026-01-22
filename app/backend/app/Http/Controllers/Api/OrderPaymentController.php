<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\MidtransService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class OrderPaymentController extends Controller
{
    // Removed default constructor injection to support per-business config
    // Use MidtransService::forBusiness() instead

    /**
     * Create QRIS payment for order
     */
    public function createQrisPayment(Request $request)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
        ]);

        try {
            Log::info('Creating QRIS payment', ['order_id' => $request->order_id]);

            $order = Order::with(['customer', 'business', 'outlet'])->findOrFail($request->order_id);

            Log::info('Order found', [
                'order_id' => $order->id,
                'payment_status' => $order->payment_status,
                'total' => $order->total,
                'has_customer' => !is_null($order->customer),
            ]);

            // Check if order is already paid
            if ($order->payment_status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order sudah dibayar',
                ], 400);
            }

            // Generate unique payment reference
            $paymentReference = 'ORD-' . $order->id . '-' . time();

            // Create or update payment record
            $payment = Payment::updateOrCreate(
                [
                    'order_id' => $order->id,
                    'payment_method' => 'qris',
                ],
                [
                    'amount' => $order->total,
                    'reference_number' => $paymentReference,
                    'status' => 'pending',
                ]
            );

            // Prepare Midtrans parameters
            $params = [
                'order_id' => $paymentReference,
                'gross_amount' => (int) $order->total,
                'item_id' => 'order-' . $order->id,
                'item_name' => 'Order #' . $order->order_number,
                'price' => (int) $order->total,
                'customer_name' => $order->customer->name ?? 'Guest',
                'customer_email' => $order->customer->email ?? 'guest@example.com',
                'customer_phone' => $order->customer->phone ?? '',
                // Enable QRIS + common payment methods as fallback
                'enabled_payments' => [
                    'gopay',
                    'shopeepay',
                    'qris',
                    'credit_card',
                    'bca_va',
                    'bni_va',
                    'bri_va',
                    'permata_va',
                    'other_va',
                ],
            ];

            Log::info('Midtrans params', ['params' => $params]);

            // ✅ Get MidtransService dengan outlet config (fallback ke business lalu global)
            $midtransService = MidtransService::forOutlet($order->outlet);
            
            // Log outlet info for debugging
            Log::info('Using Midtrans config for outlet', [
                'outlet_id' => $order->outlet->id,
                'outlet_name' => $order->outlet->name,
                'has_custom_config' => $order->outlet->hasCustomMidtransConfig(),
                'client_key' => $midtransService->getClientKey(),
            ]);

            // Create Snap token
            $snapToken = $midtransService->createSnapToken($params);

            // Update payment with snap token
            $payment->update([
                'payment_data' => [
                    'snap_token' => $snapToken,
                    'created_at' => now()->toIso8601String(),
                ],
            ]);

            // Update order payment status to pending
            $order->update([
                'payment_status' => 'pending',
            ]);

            Log::info('QRIS payment created', [
                'order_id' => $order->id,
                'payment_reference' => $paymentReference,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'payment_id' => $payment->id,
                    'snap_token' => $snapToken,
                    'payment_reference' => $paymentReference,
                    'amount' => $order->total,
                    'client_key' => $midtransService->getClientKey(), // ✅ Pakai client key dari business
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create QRIS payment', [
                'order_id' => $request->order_id ?? 'N/A',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat pembayaran QRIS: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Handle Midtrans notification webhook for orders
     */
    public function handleNotification(Request $request)
    {
        try {
            // Log raw request for debugging
            Log::info('Midtrans webhook received', [
                'raw_request' => $request->all(),
                'headers' => $request->headers->all(),
            ]);

            // Get notification (temporary - will get business-specific after finding payment)
            $tempNotification = new \Midtrans\Notification();
            $orderId = $tempNotification->order_id;

            // Find payment first to get business
            $payment = Payment::where('reference_number', $orderId)->first();

            if (!$payment) {
                // ✅ FIX: Try to find by order_id pattern (SS-{order_id}-{timestamp} for self-service)
                if (preg_match('/^SS-(\d+)-/', $orderId, $matches)) {
                    $orderIdPattern = $matches[1];
                    $payment = Payment::where('order_id', $orderIdPattern)
                        ->where('payment_method', 'qris')
                        ->orderBy('created_at', 'desc')
                        ->first();
                }
                // ✅ FIX: Try to find by order_id pattern (ORD-{order_id}-{timestamp} for POS/cashier)
                elseif (preg_match('/^ORD-(\d+)-/', $orderId, $matches)) {
                    $orderIdPattern = $matches[1];
                    $payment = Payment::where('order_id', $orderIdPattern)
                        ->where('payment_method', 'qris')
                        ->orderBy('created_at', 'desc')
                        ->first();
                    
                    Log::info('OrderPaymentController: Found payment by ORD pattern', [
                        'notification_order_id' => $orderId,
                        'order_id' => $orderIdPattern,
                        'payment_id' => $payment ? $payment->id : null,
                    ]);
                }
            }

            if (!$payment) {
                Log::error('Payment not found for notification', [
                    'order_id' => $orderId,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found',
                ], 404);
            }

            $order = $payment->order;

            // ✅ Get MidtransService dengan outlet config (fallback ke business lalu global)
            $midtransService = MidtransService::forOutlet($order->outlet);

            // Get notification data dengan config yang benar
            $notification = $midtransService->handleNotification();

            Log::info('Processing Midtrans notification for order', [
                'order_id' => $notification['order_id'],
                'payment_status' => $notification['payment_status'],
                'transaction_status' => $notification['transaction_status'],
                'payment_type' => $notification['payment_type'],
            ]);

            DB::beginTransaction();
            try {
                // Update payment status
                $paymentStatus = $notification['payment_status'] === 'success' ? 'success' :
                                ($notification['payment_status'] === 'failed' ? 'failed' : 'pending');

                $payment->update([
                    'status' => $paymentStatus,
                    'paid_at' => $notification['payment_status'] === 'success' ? Carbon::parse($notification['transaction_time']) : null,
                    'payment_data' => array_merge(
                        $payment->payment_data ?? [],
                        [
                            'transaction_id' => $notification['raw_notification']->transaction_id ?? null,
                            'transaction_status' => $notification['transaction_status'],
                            'payment_type' => $notification['payment_type'],
                            'transaction_time' => $notification['transaction_time'],
                        ]
                    ),
                ]);

                // Update order status based on payment status
                if ($notification['payment_status'] === 'success') {
                    // ✅ FIX: Update employee_id order dengan kasir yang memproses pembayaran QRIS
                    // Jika payment sudah punya processed_by_employee_id, gunakan itu
                    if ($payment->processed_by_employee_id && $payment->processed_by_employee_id != $order->employee_id) {
                        $order->employee_id = $payment->processed_by_employee_id;
                        Log::info('OrderPaymentController: Updating order employee_id from QRIS payment (webhook)', [
                            'order_id' => $order->id,
                            'payment_id' => $payment->id,
                            'employee_id' => $payment->processed_by_employee_id,
                            'reason' => 'QRIS payment confirmed via webhook'
                        ]);
                    }

                    // ✅ NEW: Assign shift_id untuk order self-service yang sudah dibayar via Midtrans
                    // Ini memastikan order muncul di transaksi kasir
                    if ($order->type === 'self_service' && !$order->shift_id) {
                        // Cari shift aktif di outlet yang sama
                        $activeShift = \App\Models\CashierShift::where('outlet_id', $order->outlet_id)
                            ->where('status', 'open')
                            ->orderBy('opened_at', 'desc')
                            ->first();

                        if ($activeShift) {
                            $order->shift_id = $activeShift->id;
                            Log::info('OrderPaymentController: Assigning shift_id to self-service order (webhook)', [
                                'order_id' => $order->id,
                                'shift_id' => $activeShift->id,
                                'outlet_id' => $order->outlet_id,
                                'reason' => 'Self-service order paid via Midtrans, assigned to active shift'
                            ]);
                        } else {
                            Log::info('OrderPaymentController: No active shift found for self-service order (webhook)', [
                                'order_id' => $order->id,
                                'outlet_id' => $order->outlet_id,
                                'note' => 'Order will appear as Self-Service Payment without shift'
                            ]);
                        }
                    }

                    // ✅ NEW: Cek setting auto-confirm dari business
                    $business = $order->business;
                    $settings = $business->settings ?? [];
                    $autoConfirm = $settings['kitchen_auto_confirm'] ?? true; // Default: true (auto-confirm)

                    $newStatus = $order->status;
                    if ($order->status === 'pending') {
                        // Jika auto-confirm enabled, langsung jadi 'confirmed'
                        // Jika tidak, tetap 'pending' (akan muncul di Kitchen Dashboard untuk manual confirm)
                        $newStatus = $autoConfirm ? 'confirmed' : 'pending';
                    }

                    $order->update([
                        'payment_status' => 'paid',
                        'status' => $newStatus,
                    ]);
                    
                    // ✅ Generate receipt token when payment is confirmed
                    $order->generateReceiptToken();

                    // ✅ SECURITY: Send notification when order payment is confirmed
                    try {
                        \App\Models\AppNotification::create([
                            'business_id' => $order->business_id,
                            'outlet_id' => $order->outlet_id,
                            'user_id' => null,
                            'role_targets' => ['kasir', 'kitchen', 'owner', 'admin'], // Payment confirmed - notify relevant roles
                            'type' => 'order.paid',
                            'title' => 'Pembayaran Dikonfirmasi: ' . $order->order_number,
                            'message' => "Order #{$order->order_number} telah dibayar via {$notification['payment_type']}. Status: " . ($newStatus === 'confirmed' ? 'Dikonfirmasi' : 'Pending Konfirmasi'),
                            'severity' => 'success',
                            'resource_type' => 'order',
                            'resource_id' => $order->id,
                            'meta' => [
                                'order_number' => $order->order_number,
                                'payment_status' => 'paid',
                                'status' => $newStatus,
                                'payment_type' => $notification['payment_type'],
                            ],
                        ]);
                    } catch (\Exception $e) {
                        Log::warning('OrderPaymentController: Failed to create payment notification', ['error' => $e->getMessage()]);
                    }

                    Log::info('Order payment confirmed', [
                        'order_id' => $order->id,
                        'payment_method' => $notification['payment_type'],
                        'auto_confirm' => $autoConfirm,
                        'new_status' => $newStatus,
                    ]);

                    // ✅ Send WhatsApp notification if payment is confirmed and outlet setting is enabled
                    $order->load(['orderItems.product', 'customer', 'business', 'outlet', 'payments']);
                    
                    // Check if outlet has enabled sending receipt via WA
                    if ($order->outlet && $order->outlet->isSendReceiptViaWAEnabled()) {
                        try {
                            // Pass outlet to WhatsAppService to use outlet-specific API key
                            $whatsappService = new \App\Services\WhatsAppService($order->outlet);
                            $whatsappService->sendPaymentReceipt($order);
                            Log::info('OrderPaymentController: WhatsApp receipt sent', [
                                'order_id' => $order->id,
                                'outlet_id' => $order->outlet->id
                            ]);
                        } catch (\Exception $e) {
                            Log::warning('OrderPaymentController: Failed to send WhatsApp notification', [
                                'order_id' => $order->id,
                                'error' => $e->getMessage()
                            ]);
                            // Don't fail the payment if WhatsApp fails
                        }
                    } else {
                        Log::info('OrderPaymentController: WhatsApp receipt not sent - setting disabled', [
                            'order_id' => $order->id,
                            'outlet_id' => $order->outlet->id ?? null,
                            'setting_enabled' => $order->outlet ? $order->outlet->isSendReceiptViaWAEnabled() : false
                        ]);
                    }

                    // ✅ NEW: Send invoice email if payment is confirmed and customer has email
                    try {
                        $order->load(['orderItems.product', 'customer', 'business', 'outlet', 'payments']);
                        
                        // Get customer email (from customer or order)
                        $customerEmail = null;
                        $customerName = null;
                        
                        if ($order->customer && $order->customer->email) {
                            $customerEmail = $order->customer->email;
                            $customerName = $order->customer->name;
                        } elseif ($order->customer_email) {
                            $customerEmail = $order->customer_email;
                            $customerName = $order->customer->name ?? 'Pelanggan';
                        }

                        if ($customerEmail) {
                            // Try to find user first, if not found, send directly via Mail
                            $user = null;
                            if ($order->customer && $order->customer->user_id) {
                                $user = \App\Models\User::find($order->customer->user_id);
                            }

                            if ($user) {
                                // User exists, use notification
                                $user->notify(new \App\Notifications\InvoiceEmailNotification($order));
                            } else {
                                // No user, send directly via Mail facade
                                \Illuminate\Support\Facades\Mail::to($customerEmail)->send(
                                    new \App\Mail\InvoiceMail($order, $customerName)
                                );
                            }
                            
                            Log::info('Invoice email sent successfully', [
                                'order_id' => $order->id,
                                'email' => $customerEmail
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::warning('OrderPaymentController: Failed to send invoice email', [
                            'order_id' => $order->id,
                            'error' => $e->getMessage()
                        ]);
                        // Don't fail the payment if email fails
                    }

                } elseif ($notification['payment_status'] === 'failed') {
                    $order->update([
                        'payment_status' => 'failed',
                    ]);

                    Log::info('Order payment failed', [
                        'order_id' => $order->id,
                    ]);
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Notification processed successfully',
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Failed to process Midtrans notification for order', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process notification',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check payment status
     */
    public function checkPaymentStatus($paymentId)
    {
        try {
            $payment = Payment::with('order')->findOrFail($paymentId);

            // ✅ Get MidtransService dengan business config
            $order = $payment->order;
            $midtransService = MidtransService::forOutlet($order->outlet);

            // Get transaction status from Midtrans
            try {
                $transactionStatus = $midtransService->getTransactionStatus($payment->reference_number);

                Log::info('Payment status checked', [
                    'payment_id' => $paymentId,
                    'transaction_status' => $transactionStatus->transaction_status,
                ]);

                // Update local status if needed
                $midtransStatus = $transactionStatus->transaction_status;
                $localStatus = $payment->status;

                // ✅ FIX: Handle both 'settlement' and 'capture' status
                $isSettled = in_array($midtransStatus, ['settlement', 'capture']);
                
                if ($isSettled && $localStatus !== 'success') {
                    DB::beginTransaction();
                    try {
                        $payment->update([
                            'status' => 'success',
                            'paid_at' => now(),
                        ]);

                        // ✅ FIX: Update employee_id order dengan kasir yang memproses pembayaran QRIS
                        // Jika payment sudah punya processed_by_employee_id, gunakan itu
                        if ($payment->processed_by_employee_id && $payment->processed_by_employee_id != $payment->order->employee_id) {
                            $payment->order->employee_id = $payment->processed_by_employee_id;
                            Log::info('OrderPaymentController: Updating order employee_id from QRIS payment (checkStatus)', [
                                'order_id' => $payment->order->id,
                                'payment_id' => $payment->id,
                                'employee_id' => $payment->processed_by_employee_id,
                                'reason' => 'QRIS payment confirmed via status check'
                            ]);
                        }

                        // ✅ NEW: Assign shift_id untuk order self-service yang sudah dibayar via Midtrans
                        // Ini memastikan order muncul di transaksi kasir
                        if ($payment->order->type === 'self_service' && !$payment->order->shift_id) {
                            // Cari shift aktif di outlet yang sama
                            $activeShift = \App\Models\CashierShift::where('outlet_id', $payment->order->outlet_id)
                                ->where('status', 'open')
                                ->orderBy('opened_at', 'desc')
                                ->first();

                            if ($activeShift) {
                                $payment->order->shift_id = $activeShift->id;
                                Log::info('OrderPaymentController: Assigning shift_id to self-service order (checkStatus)', [
                                    'order_id' => $payment->order->id,
                                    'shift_id' => $activeShift->id,
                                    'outlet_id' => $payment->order->outlet_id,
                                    'reason' => 'Self-service order paid via Midtrans, assigned to active shift'
                                ]);
                            } else {
                                Log::info('OrderPaymentController: No active shift found for self-service order (checkStatus)', [
                                    'order_id' => $payment->order->id,
                                    'outlet_id' => $payment->order->outlet_id,
                                    'note' => 'Order will appear as Self-Service Payment without shift'
                                ]);
                            }
                        }

                        // ✅ NEW: Cek setting auto-confirm dari business
                        $business = $payment->order->business;
                        $settings = $business->settings ?? [];
                        $autoConfirm = $settings['kitchen_auto_confirm'] ?? true; // Default: true (auto-confirm)

                        $newStatus = $payment->order->status;
                        if ($payment->order->status === 'pending') {
                            // Jika auto-confirm enabled, langsung jadi 'confirmed'
                            // Jika tidak, tetap 'pending' (akan muncul di Kitchen Dashboard untuk manual confirm)
                            $newStatus = $autoConfirm ? 'confirmed' : 'pending';
                        }

                        $payment->order->update([
                            'payment_status' => 'paid',
                            'status' => $newStatus,
                        ]);
                        
                        // ✅ Generate receipt token when payment is confirmed
                        $payment->order->generateReceiptToken();

                        DB::commit();
                        
                        // ✅ FIX: Refresh payment and order data after update
                        $payment->refresh();
                        $payment->load('order');
                    } catch (\Exception $e) {
                        DB::rollBack();
                        throw $e;
                    }
                } else {
                    // ✅ FIX: Refresh payment data even if not updated
                    $payment->refresh();
                    $payment->load('order');
                }

                return response()->json([
                    'success' => true,
                    'data' => [
                        'payment' => $payment->fresh(['order']), // ✅ FIX: Return fresh data
                        'order' => $payment->order ? [
                            'id' => $payment->order->id,
                            'order_number' => $payment->order->order_number,
                            'status' => $payment->order->status,
                            'payment_status' => $payment->order->payment_status,
                        ] : null,
                        'transaction_status' => $transactionStatus->transaction_status,
                        'payment_type' => $transactionStatus->payment_type ?? null,
                        'transaction_time' => $transactionStatus->transaction_time ?? null,
                        'was_updated' => $isSettled && $localStatus !== 'success', // ✅ FIX: Indicate if status was updated
                    ],
                ]);

            } catch (\Exception $e) {
                // If transaction not found in Midtrans, return current payment status
                return response()->json([
                    'success' => true,
                    'data' => [
                        'payment' => $payment,
                        'transaction_status' => $payment->status,
                    ],
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Failed to check payment status', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to check payment status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel pending payment
     */
    public function cancelPayment($paymentId)
    {
        try {
            $payment = Payment::with('order')->findOrFail($paymentId);

            if ($payment->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya pembayaran pending yang bisa dibatalkan',
                ], 400);
            }

            DB::beginTransaction();
            try {
                // ✅ Get MidtransService dengan business config
                $order = $payment->order;
                $midtransService = MidtransService::forOutlet($order->outlet);

                // Try to cancel in Midtrans
                try {
                    $midtransService->cancelTransaction($payment->reference_number);
                } catch (\Exception $e) {
                    // Ignore if transaction not found in Midtrans
                    Log::warning('Failed to cancel in Midtrans, continuing local cancellation', [
                        'payment_id' => $paymentId,
                        'error' => $e->getMessage(),
                    ]);
                }

                // Update local status
                $payment->update([
                    'status' => 'cancelled',
                ]);

                $payment->order->update([
                    'payment_status' => 'unpaid',
                ]);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Pembayaran berhasil dibatalkan',
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Failed to cancel payment', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membatalkan pembayaran',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
