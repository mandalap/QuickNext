<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserSubscription;
use App\Models\SubscriptionPayment;
use App\Services\MidtransService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PaymentController extends Controller
{
    // Removed default constructor injection to support per-business config
    // Use MidtransService::forBusiness() instead

    /**
     * Handle Midtrans notification webhook
     */
    public function handleMidtransNotification(Request $request)
    {
        try {
            // 1) Ambil order_id langsung dari payload (jangan panggil Midtrans\Notification dulu)
            $orderId = $request->input('order_id');

            if (!$orderId) {
                Log::error('Midtrans notification missing order_id', [
                    'payload' => $request->all(),
                ]);

                // Sebaiknya 200 agar Midtrans tidak retry terus-menerus untuk payload invalid
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid payload: order_id missing',
                ], 200);
            }

            $subscriptionCode = $orderId;

            // ✅ Extract subscription code from order_id
            // Format bisa: SUB-XXXXX atau SUB-XXXXX-TIMESTAMP atau SUB-XXXXX-TIMESTAMP-RANDOM
            if (strpos($orderId, '-') !== false) {
                $parts = explode('-', $orderId);

                // Subscription code selalu format: SUB-XXXXX (2 bagian pertama)
                if (count($parts) >= 2) {
                    $subscriptionCode = $parts[0] . '-' . $parts[1];
                }
            }

            Log::info('Extracting subscription code from order_id', [
                'order_id' => $orderId,
                'extracted_subscription_code' => $subscriptionCode,
            ]);

            // 2) Find subscription
            $subscription = UserSubscription::with('user.ownedBusinesses')
                ->where('subscription_code', $subscriptionCode)
                ->first();

            if (!$subscription) {
                Log::error('Subscription not found for notification', [
                    'order_id' => $orderId,
                    'subscription_code' => $subscriptionCode,
                ]);

                // ✅ CRITICAL FIX: Try to find subscription by order_id pattern or create from Midtrans data
                // This handles case where user paid manually via link but subscription not in DB
                // Try to get transaction status from Midtrans to verify payment
                try {
                    // Use global config as fallback
                    $midtransService = new MidtransService();
                    $transactionStatus = $midtransService->getTransactionStatus($orderId);
                    
                    if ($transactionStatus && in_array($transactionStatus->transaction_status, ['settlement', 'capture'])) {
                        Log::warning('Payment already settled but subscription not found in DB', [
                            'order_id' => $orderId,
                            'transaction_status' => $transactionStatus->transaction_status,
                            'gross_amount' => $transactionStatus->gross_amount ?? null,
                        ]);
                        
                        // Return 200 to prevent Midtrans retry, but log for manual handling
                        return response()->json([
                            'success' => false,
                            'message' => 'Subscription not found but payment already settled. Please contact support.',
                            'order_id' => $orderId,
                            'transaction_status' => $transactionStatus->transaction_status,
                        ], 200);
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to check Midtrans transaction status for missing subscription', [
                        'order_id' => $orderId,
                        'error' => $e->getMessage(),
                    ]);
                }

                // Rekomendasi: 200 supaya Midtrans tidak spam retry (opsional)
                return response()->json([
                    'success' => false,
                    'message' => 'Subscription not found',
                ], 200);
            }

            // 3) Cari business (optional)
            $business = $subscription->user->ownedBusinesses()->first()
                ?? $subscription->user->businesses()->first();

            // 4) Buat MidtransService (ini yang akan set Midtrans\Config::$serverKey)
            // ✅ CRITICAL FIX: Handle ServerKey null with fallback
            $midtransService = null;
            $serverKeyError = null;
            
            try {
                if (!$business) {
                    Log::info('No business found for subscription in webhook, using default Midtrans config', [
                        'subscription_id' => $subscription->id,
                        'user_id' => $subscription->user_id,
                        'subscription_code' => $subscriptionCode,
                    ]);

                    $midtransService = new MidtransService();
                } else {
                    $midtransService = MidtransService::forBusiness($business);
                }
            } catch (\Exception $e) {
                // If ServerKey is null, try fallback to global config
                if (strpos($e->getMessage(), 'ServerKey') !== false) {
                    Log::warning('ServerKey null in business config, trying global config fallback', [
                        'subscription_id' => $subscription->id,
                        'business_id' => $business->id ?? null,
                        'error' => $e->getMessage(),
                    ]);
                    
                    try {
                        // Force use global config
                        $midtransService = new MidtransService();
                        $serverKeyError = 'Business config ServerKey is null, using global config';
                    } catch (\Exception $e2) {
                        Log::error('Both business and global ServerKey are null', [
                            'subscription_id' => $subscription->id,
                            'error' => $e2->getMessage(),
                        ]);
                        
                        return response()->json([
                            'success' => false,
                            'message' => 'Midtrans ServerKey is not configured. Please configure MIDTRANS_SERVER_KEY in .env file.',
                            'error' => $e2->getMessage(),
                        ], 500);
                    }
                } else {
                    throw $e;
                }
            }

            // 5) Baru proses notifikasi via SDK (sekarang serverKey sudah ke-set)
            try {
                $notification = $midtransService->handleNotification();
            } catch (\Exception $e) {
                // If notification fails due to ServerKey, try to get transaction status directly
                if (strpos($e->getMessage(), 'ServerKey') !== false || strpos($e->getMessage(), '401') !== false) {
                    Log::error('Webhook notification failed due to ServerKey issue, trying direct transaction status check', [
                        'order_id' => $orderId,
                        'error' => $e->getMessage(),
                    ]);
                    
                    // Try to get transaction status directly from Midtrans API
                    try {
                        $transactionStatus = $midtransService->getTransactionStatus($orderId);
                        
                        if ($transactionStatus && in_array($transactionStatus->transaction_status, ['settlement', 'capture'])) {
                            // Payment is already settled, process it manually
                            Log::info('Payment already settled, processing manually from transaction status', [
                                'order_id' => $orderId,
                                'transaction_status' => $transactionStatus->transaction_status,
                            ]);
                            
                            // Create notification array from transaction status
                            $notification = [
                                'order_id' => $orderId,
                                'payment_status' => 'success',
                                'payment_type' => $transactionStatus->payment_type ?? 'unknown',
                                'gross_amount' => $transactionStatus->gross_amount ?? 0,
                                'transaction_time' => $transactionStatus->transaction_time ?? now()->toDateTimeString(),
                                'raw_notification' => $transactionStatus,
                            ];
                        } else {
                            throw new \Exception('Transaction status is not settlement/capture: ' . ($transactionStatus->transaction_status ?? 'unknown'));
                        }
                    } catch (\Exception $e2) {
                        Log::error('Failed to get transaction status as fallback', [
                            'order_id' => $orderId,
                            'error' => $e2->getMessage(),
                        ]);
                        
                        return response()->json([
                            'success' => false,
                            'message' => 'Failed to process notification: ' . $e->getMessage(),
                        ], 500);
                    }
                } else {
                    throw $e;
                }
            }

            Log::info('Processing Midtrans notification', [
                'order_id' => $notification['order_id'],
                'payment_status' => $notification['payment_status'],
            ]);

            DB::beginTransaction();
            try {
                $payment = SubscriptionPayment::updateOrCreate(
                    [
                        'user_subscription_id' => $subscription->id,
                        'payment_code' => $notification['order_id'],
                    ],
                    [
                        'payment_method' => $notification['payment_type'],
                        'payment_gateway' => 'midtrans',
                        'gateway_payment_id' => $notification['raw_notification']->transaction_id ?? $notification['order_id'],
                        'amount' => $notification['gross_amount'],
                        'status' => $notification['payment_status'] === 'success'
                            ? 'paid'
                            : ($notification['payment_status'] === 'failed' ? 'failed' : 'pending'),
                        'paid_at' => $notification['payment_status'] === 'success'
                            ? Carbon::parse($notification['transaction_time'])
                            : null,
                        'payment_data' => json_encode($notification['raw_notification']),
                    ]
                );

                if ($notification['payment_status'] === 'success') {
                    // ✅ SMART LOGIC: Check if this is a RENEWAL (same plan) or UPGRADE (different plan)
                    $oldActiveSubscriptions = UserSubscription::where('user_id', $subscription->user_id)
                        ->where('id', '!=', $subscription->id)
                        ->where('status', 'active')
                        ->with('subscriptionPlan')
                        ->get();

                    $isRenewal = false;
                    $oldSubscriptionToExtend = null;

                    foreach ($oldActiveSubscriptions as $oldSub) {
                        // Check if same plan (renewal scenario)
                        if ($oldSub->subscription_plan_id === $subscription->subscription_plan_id) {
                            $isRenewal = true;
                            $oldSubscriptionToExtend = $oldSub;
                            break;
                        }
                    }

                    if ($isRenewal && $oldSubscriptionToExtend) {
                        // ✅ RENEWAL SCENARIO: Extend old subscription instead of creating new one
                        $oldEndsAt = Carbon::parse($oldSubscriptionToExtend->ends_at);
                        $newEndsAt = Carbon::parse($subscription->ends_at);
                        
                        // Calculate how many months/days were added
                        $addedDays = $oldEndsAt->diffInDays($newEndsAt);
                        
                        // Extend the old subscription
                        $oldSubscriptionToExtend->update([
                            'ends_at' => $newEndsAt,
                            'notes' => ($oldSubscriptionToExtend->notes ?? '') . ' | Extended by ' . $addedDays . ' days (renewal payment) at ' . Carbon::now(),
                        ]);

                        // Cancel the new subscription (it was just for payment tracking)
                        $subscription->update([
                            'status' => 'completed',
                            'notes' => ($subscription->notes ?? '') . ' | Renewal payment completed. Extended subscription ID: ' . $oldSubscriptionToExtend->id,
                        ]);

                        Log::info('Renewal processed: Extended existing subscription', [
                            'extended_subscription_id' => $oldSubscriptionToExtend->id,
                            'old_ends_at' => $oldEndsAt->toDateTimeString(),
                            'new_ends_at' => $newEndsAt->toDateTimeString(),
                            'added_days' => $addedDays,
                            'payment_subscription_id' => $subscription->id,
                        ]);

                        // Update business to keep using the extended subscription
                        if ($business) {
                            $business->update([
                                'current_subscription_id' => $oldSubscriptionToExtend->id,
                                'subscription_expires_at' => $newEndsAt,
                            ]);

                            Log::info('Business updated with extended subscription', [
                                'business_id' => $business->id,
                                'subscription_id' => $oldSubscriptionToExtend->id,
                                'new_expires_at' => $newEndsAt->toDateTimeString(),
                            ]);
                        }
                    } else {
                        // ✅ UPGRADE SCENARIO: Mark old subscriptions as 'upgraded' and activate new one
                        foreach ($oldActiveSubscriptions as $oldSub) {
                            $oldSub->update([
                                'status' => 'upgraded',
                                'notes' => ($oldSub->notes ?? '') . ' | Upgraded to new subscription (ID: ' . $subscription->id . ') at ' . Carbon::now(),
                            ]);

                            Log::info('Marked old subscription as upgraded', [
                                'old_subscription_id' => $oldSub->id,
                                'old_subscription_code' => $oldSub->subscription_code,
                                'new_subscription_id' => $subscription->id,
                                'new_subscription_code' => $subscription->subscription_code,
                            ]);
                        }

                        // Now activate the new subscription
                        $subscription->update([
                            'status' => 'active',
                            'notes' => ($subscription->notes ?? '') . ' | Payment confirmed via ' . $notification['payment_type'],
                        ]);

                        if ($business) {
                            $business->update([
                                'current_subscription_id' => $subscription->id,
                                'subscription_expires_at' => $subscription->ends_at,
                            ]);

                            Log::info('Business updated with new subscription', [
                                'business_id' => $business->id,
                                'subscription_id' => $subscription->id,
                            ]);
                        }

                        Log::info('Subscription activated (upgrade)', [
                            'subscription_id' => $subscription->id,
                            'subscription_code' => $subscription->subscription_code,
                        ]);
                    }

                    event(new \App\Events\SubscriptionPaid($payment));
                } elseif ($notification['payment_status'] === 'failed') {
                    $subscription->update([
                        'status' => 'cancelled',
                        'notes' => ($subscription->notes ?? '') . ' | Payment failed',
                    ]);

                    Log::info('Subscription cancelled due to failed payment', [
                        'subscription_id' => $subscription->id,
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
            Log::error('Failed to process Midtrans notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Untuk webhook, sering lebih aman balikin 200 agar tidak retry brutal.
            // Tapi kalau kamu mau strict monitoring, biarkan 500.
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
    public function checkPaymentStatus($subscriptionCode)
    {
        try {
            // ✅ OPTIMIZATION: Cache payment status check (30 detik) untuk mengurangi Midtrans API calls
            $cacheKey = "payment_status:{$subscriptionCode}";
            $cached = Cache::get($cacheKey);
            
            if ($cached) {
                Log::info('Payment status from cache', [
                    'subscription_code' => $subscriptionCode,
                ]);
                return response()->json($cached);
            }

            // ✅ FIX: Get subscription by code, don't filter by user_id (allow checking from any authenticated user)
            $subscription = UserSubscription::where('subscription_code', $subscriptionCode)
                ->with(['subscriptionPlan', 'subscriptionPlanPrice', 'user'])
                ->first();

            if (!$subscription) {
                // ✅ FIX: Try to find by partial match (in case order_id has timestamp)
                // Midtrans might send order_id with timestamp: SUB-XXXXX-TIMESTAMP
                $subscription = UserSubscription::where('subscription_code', 'like', $subscriptionCode . '%')
                    ->with(['subscriptionPlan', 'subscriptionPlanPrice', 'user'])
                    ->first();
                
                if (!$subscription) {
                    // ✅ FIX: Log more details for debugging
                    $user = Auth::user();
                    $allUserSubscriptions = UserSubscription::where('user_id', $user->id)
                        ->pluck('subscription_code')
                        ->toArray();
                    
                    Log::warning('Subscription not found for payment status check', [
                        'subscription_code' => $subscriptionCode,
                        'user_id' => $user->id,
                        'user_email' => $user->email,
                        'user_subscriptions' => $allUserSubscriptions,
                        'recent_subscriptions' => UserSubscription::orderBy('created_at', 'desc')
                            ->limit(5)
                            ->pluck('subscription_code')
                            ->toArray(),
                    ]);
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'Subscription not found',
                        'debug' => [
                            'requested_code' => $subscriptionCode,
                            'user_subscriptions' => $allUserSubscriptions,
                        ],
                    ], 404);
                }
                
                // Update subscription code if it was found by partial match
                Log::info('Subscription found by partial match', [
                    'requested_code' => $subscriptionCode,
                    'found_code' => $subscription->subscription_code,
                ]);
            }

            // ✅ FIX: Verify user has access to this subscription
            $user = Auth::user();
            if ($subscription->user_id !== $user->id && !in_array($user->role, ['super_admin', 'admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to subscription',
                ], 403);
            }

            // ✅ FIX: Get business from user (prefer owned business, fallback to first business)
            // Business is optional - user might not have created business yet
            $business = $subscription->user->ownedBusinesses()->first() 
                ?? $subscription->user->businesses()->first();

            // ✅ FIX: Business is not required for payment status check
            // User can check payment status even if they haven't created business yet
            // We'll use default Midtrans config if no business found
            if (!$business) {
                Log::info('No business found for subscription in status check, using default Midtrans config', [
                    'subscription_code' => $subscriptionCode,
                    'user_id' => $subscription->user_id,
                ]);
                // Use default MidtransService (no business-specific config)
                $midtransService = new MidtransService();
            } else {
                // ✅ Get MidtransService dengan business config
                $midtransService = MidtransService::forBusiness($business);
            }

            // ✅ Get MidtransService dengan business config
            $midtransService = MidtransService::forBusiness($business);

            // ✅ FIX: Try to get transaction status from Midtrans using subscription code
            // If that fails, try with order_id format (SUB-XXXXX-TIMESTAMP)
            try {
                $transactionStatus = null;
                try {
                    $transactionStatus = $midtransService->getTransactionStatus($subscriptionCode);
                } catch (\Exception $e1) {
                    // If direct check fails, try with timestamp format
                    Log::info('Direct transaction check failed, trying with timestamp format', [
                        'subscription_code' => $subscriptionCode,
                        'error' => $e1->getMessage(),
                    ]);
                    
                    // Try to find payment record with this subscription code
                    $payment = \App\Models\SubscriptionPayment::where('user_subscription_id', $subscription->id)
                        ->where('payment_code', 'like', $subscriptionCode . '%')
                        ->orderBy('created_at', 'desc')
                        ->first();
                    
                    if ($payment && $payment->payment_code !== $subscriptionCode) {
                        // Try with payment_code (which might have timestamp)
                        try {
                            $transactionStatus = $midtransService->getTransactionStatus($payment->payment_code);
                            Log::info('Found transaction with payment_code', [
                                'payment_code' => $payment->payment_code,
                            ]);
                        } catch (\Exception $e2) {
                            throw $e1; // Throw original error
                        }
                    } else {
                        throw $e1; // Throw original error
                    }
                }

                Log::info('Payment status checked', [
                    'subscription_code' => $subscriptionCode,
                    'transaction_status' => $transactionStatus->transaction_status,
                ]);

                $responseData = [
                    'success' => true,
                    'data' => [
                        'subscription' => $subscription,
                        'transaction_status' => $transactionStatus->transaction_status,
                        'payment_type' => $transactionStatus->payment_type ?? null,
                        'transaction_time' => $transactionStatus->transaction_time ?? null,
                        'fraud_status' => $transactionStatus->fraud_status ?? null,
                    ],
                ];

                // ✅ OPTIMIZATION: Cache response untuk 30 detik
                Cache::put($cacheKey, $responseData, 30);

                return response()->json($responseData);

            } catch (\Exception $e) {
                // If transaction not found in Midtrans, return current subscription status
                Log::info('Midtrans transaction not found, returning subscription status', [
                    'subscription_code' => $subscriptionCode,
                    'subscription_status' => $subscription->status,
                    'error' => $e->getMessage(),
                ]);
                
                $responseData = [
                    'success' => true,
                    'data' => [
                        'subscription' => $subscription,
                        'transaction_status' => $subscription->status,
                    ],
                ];
                
                // Cache this response too
                Cache::put($cacheKey, $responseData, 30);
                
                return response()->json($responseData);
            }

        } catch (\Exception $e) {
            Log::error('Failed to check payment status', [
                'subscription_code' => $subscriptionCode,
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
     * Get Midtrans client key for frontend
     */
    public function getClientKey(Request $request)
    {
        $user = $request->user();
        
        // Get business from user (prefer owned business, fallback to first business)
        $business = $user->ownedBusinesses()->first() 
            ?? $user->businesses()->first();

        if ($business) {
            // ✅ Get MidtransService dengan business config
            $midtransService = MidtransService::forBusiness($business);
            return response()->json([
                'success' => true,
                'client_key' => $midtransService->getClientKey(),
            ]);
        }

        // Fallback ke global config
        return response()->json([
            'success' => true,
            'client_key' => config('midtrans.client_key'),
        ]);
    }
}
