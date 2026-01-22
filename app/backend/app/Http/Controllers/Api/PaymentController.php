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
            // Get notification (temporary - will get business-specific after finding subscription)
            $tempNotification = new \Midtrans\Notification();
            $orderId = $tempNotification->order_id;
            $subscriptionCode = $orderId;

            // ✅ FIX: Extract subscription code from order_id
            // Format bisa: SUB-XXXXX atau SUB-XXXXX-TIMESTAMP atau SUB-XXXXX-TIMESTAMP-RANDOM
            if (strpos($orderId, '-') !== false) {
                $parts = explode('-', $orderId);
                // Subscription code selalu format: SUB-XXXXX (2 bagian pertama)
                // Jika ada timestamp/random di akhir, ambil hanya 2 bagian pertama
                if (count($parts) >= 2) {
                    // Always use first 2 parts (SUB-XXXXX) as subscription code
                    $subscriptionCode = $parts[0] . '-' . $parts[1];
                } else {
                    $subscriptionCode = $orderId;
                }
            }

            Log::info('Extracting subscription code from order_id', [
                'order_id' => $orderId,
                'extracted_subscription_code' => $subscriptionCode,
            ]);

            // Find subscription by subscription_code
            $subscription = UserSubscription::with('user.ownedBusinesses')
                ->where('subscription_code', $subscriptionCode)
                ->first();

            if (!$subscription) {
                Log::error('Subscription not found for notification', [
                    'order_id' => $orderId,
                    'subscription_code' => $subscriptionCode,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Subscription not found',
                ], 404);
            }

            // ✅ FIX: Get business from user (prefer owned business, fallback to first business)
            // Business is optional - user might not have created business yet
            $business = $subscription->user->ownedBusinesses()->first() 
                ?? $subscription->user->businesses()->first();

            // ✅ FIX: Business is not required for webhook processing
            // User can have active subscription without business (they'll create it later)
            if (!$business) {
                Log::info('No business found for subscription in webhook, using default Midtrans config', [
                    'subscription_id' => $subscription->id,
                    'user_id' => $subscription->user_id,
                    'subscription_code' => $subscriptionCode,
                ]);
                // Use default MidtransService (no business-specific config)
                $midtransService = new MidtransService();
            } else {
                // ✅ Get MidtransService dengan business config
                $midtransService = MidtransService::forBusiness($business);
            }

            // Get notification data dengan config yang benar
            $notification = $midtransService->handleNotification();

            Log::info('Processing Midtrans notification', [
                'order_id' => $notification['order_id'],
                'payment_status' => $notification['payment_status'],
            ]);

            DB::beginTransaction();
            try {
                // Update or create payment record
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
                        'status' => $notification['payment_status'] === 'success' ? 'paid' : ($notification['payment_status'] === 'failed' ? 'failed' : 'pending'),
                        'paid_at' => $notification['payment_status'] === 'success' ? Carbon::parse($notification['transaction_time']) : null,
                        'payment_data' => json_encode($notification['raw_notification']),
                    ]
                );

                // Update subscription status based on payment status
                if ($notification['payment_status'] === 'success') {
                    $subscription->update([
                        'status' => 'active',
                        'notes' => ($subscription->notes ?? '') . ' | Payment confirmed via ' . $notification['payment_type'],
                    ]);

                    // ✅ FIX: Update business to use new subscription (for upgrade scenario)
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

                    Log::info('Subscription activated', [
                        'subscription_id' => $subscription->id,
                        'subscription_code' => $subscription->subscription_code,
                    ]);

                    // Fire SubscriptionPaid event
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
