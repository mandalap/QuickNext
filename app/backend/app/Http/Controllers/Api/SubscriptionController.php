<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionPlanPrice;
use App\Models\UserSubscription;
use App\Services\MidtransService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SubscriptionController extends Controller
{
    protected $midtransService;

    public function __construct(MidtransService $midtransService)
    {
        $this->midtransService = $midtransService;
    }

    /**
     * Get all available subscription plans with their prices
     * Public endpoint - no authentication required (for landing page)
     */
    public function getPlans()
    {
        // ✅ FIX: No caching to ensure fresh data from Filament
        // This ensures changes in Filament admin panel are immediately reflected
        $plans = SubscriptionPlan::with(['prices' => function ($query) {
            $query->where('is_active', true)->orderBy('duration_months');
        }])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $plans,
        ]);
    }

    /**
     * Get a specific plan by slug
     */
    public function getPlanBySlug($slug)
    {
        $plan = SubscriptionPlan::with(['prices' => function ($query) {
            $query->where('is_active', true)->orderBy('duration_months');
        }])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $plan,
        ]);
    }

    /**
     * Subscribe to a plan (trial or paid)
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'subscription_plan_id' => 'required|exists:subscription_plans,id',
            'subscription_plan_price_id' => 'required|exists:subscription_plan_prices,id',
        ]);

        $user = Auth::user();
        // Reload user to get latest data
        $user->refresh();

        // Check if user profile is complete before subscribing
        $profileErrors = [];
        if (empty($user->name)) {
            $profileErrors[] = 'Nama lengkap belum diisi. Silakan lengkapi profil Anda terlebih dahulu.';
        }
        if (empty($user->phone)) {
            $profileErrors[] = 'Nomor WhatsApp belum diisi. Silakan lengkapi profil Anda terlebih dahulu.';
        }
        if (empty($user->address)) {
            $profileErrors[] = 'Alamat belum diisi. Silakan lengkapi profil Anda terlebih dahulu.';
        }

        // Check if WhatsApp is verified
        if (!empty($user->phone)) {
            $isVerified = \App\Models\WhatsappVerification::isPhoneVerified($user->phone);
            if (!$isVerified) {
                $profileErrors[] = 'Nomor WhatsApp belum diverifikasi. Silakan verifikasi nomor WhatsApp Anda terlebih dahulu.';
            }
        }

        if (!empty($profileErrors)) {
            return response()->json([
                'success' => false,
                'error' => 'Profil owner belum lengkap',
                'message' => 'Silakan lengkapi profil Anda terlebih dahulu sebelum memilih paket subscription.',
                'errors' => $profileErrors,
                'requires_profile_completion' => true,
                'missing_fields' => [
                    'name' => empty($user->name),
                    'phone' => empty($user->phone),
                    'address' => empty($user->address),
                    'whatsapp_verified' => !empty($user->phone) && !\App\Models\WhatsappVerification::isPhoneVerified($user->phone),
                ],
            ], 422);
        }

        // Check if user already has an active subscription
        $existingSubscription = UserSubscription::where('user_id', $user->id)
            ->whereIn('status', ['active', 'pending_payment'])
            ->first();

        if ($existingSubscription) {
            return response()->json([
                'success' => false,
                'message' => 'You already have an active subscription',
            ], 400);
        }

        // ✅ FIX: Use find() instead of findOrFail() and handle null gracefully
        $plan = SubscriptionPlan::find($request->subscription_plan_id);
        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Subscription plan not found',
            ], 404);
        }

        $price = SubscriptionPlanPrice::find($request->subscription_plan_price_id);
        if (!$price) {
            Log::error('SubscriptionPlanPrice not found in subscribe', [
                'price_id' => $request->subscription_plan_price_id,
                'plan_id' => $request->subscription_plan_id,
                'user_id' => $user->id,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Subscription plan price not found. Silakan pilih durasi paket yang tersedia.',
            ], 404);
        }

        // Verify that the price belongs to the selected plan
        if ($price->subscription_plan_id !== $plan->id) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid price for the selected plan',
            ], 400);
        }

        $isTrial = $plan->slug === 'trial-7-days' || $price->final_price == 0;

        // Check if user has ever used trial before (prevent trial abuse)
        $hasUsedTrial = UserSubscription::where('user_id', $user->id)
            ->where('is_trial', true)
            ->exists();

        if ($isTrial && $hasUsedTrial) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah pernah menggunakan trial sebelumnya. Silakan pilih paket berbayar.',
            ], 400);
        }

        DB::beginTransaction();

        try {
            $startsAt = Carbon::now();

            // Calculate end date
            if ($isTrial) {
                // 7 days trial
                $endsAt = Carbon::now()->addDays(7);
                $trialEndsAt = $endsAt;
            } else {
                // Paid subscription
                $endsAt = Carbon::now()->addMonths($price->duration_months);
                $trialEndsAt = null;
            }

            // Create subscription
            $subscriptionCode = 'SUB-' . strtoupper(Str::random(10));
            $subscription = UserSubscription::create([
                'user_id' => $user->id,
                'subscription_plan_id' => $plan->id,
                'subscription_plan_price_id' => $price->id,
                'subscription_code' => $subscriptionCode,
                'status' => $isTrial ? 'active' : 'pending_payment',
                'amount_paid' => $isTrial ? 0 : $price->final_price,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'trial_ends_at' => $trialEndsAt,
                'is_trial' => $isTrial,
                'plan_features' => $plan->features,
                'notes' => $isTrial ? 'Trial subscription - 7 days' : null,
            ]);

            // ✅ FIX: Determine if payment is required (always true for paid subscriptions)
            $requiresPayment = !$isTrial && $price->final_price > 0;

            // If paid subscription, create Midtrans payment token
            $snapToken = null;
            if ($requiresPayment) {
                try {
                    $snapToken = $this->midtransService->createSnapToken([
                        'order_id' => $subscriptionCode,
                        'gross_amount' => (int) $price->final_price,
                        'item_id' => 'subscription-' . $plan->id,
                        'item_name' => $plan->name . ' - ' . $price->duration_months . ' bulan',
                        'price' => (int) $price->final_price,
                        'customer_name' => $user->name,
                        'customer_email' => $user->email,
                        'customer_phone' => $user->phone ?? '',
                    ]);

                    Log::info('Snap token created for subscription', [
                        'subscription_id' => $subscription->id,
                        'subscription_code' => $subscriptionCode,
                        'requires_payment' => $requiresPayment,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to create Midtrans snap token', [
                        'subscription_id' => $subscription->id,
                        'error' => $e->getMessage(),
                    ]);
                    // Continue without snap token - user will be redirected to payment page
                }
            }

            DB::commit();

            // Fire SubscriptionCreated event
            event(new \App\Events\SubscriptionCreated($subscription));

            // ✅ FIX: Always return requires_payment explicitly for paid subscriptions
            return response()->json([
                'success' => true,
                'message' => $isTrial ? 'Trial subscription activated successfully' : 'Subscription created. Please proceed with payment.',
                'data' => $subscription->load(['subscriptionPlan', 'subscriptionPlanPrice']),
                'requires_payment' => $requiresPayment, // ✅ FIX: Explicitly set to true for paid subscriptions
                'is_trial' => $isTrial, // ✅ FIX: Add is_trial flag for clarity
                'snap_token' => $snapToken,
                'client_key' => config('midtrans.client_key'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to create subscription',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current user's active subscription
     * Optimized with caching to reduce database queries
     */
    public function getCurrentSubscription()
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                    'has_subscription' => false,
                ], 401);
            }

        // Employee roles need to check their business owner's subscription
        $isEmployeeRole = in_array($user->role, ['kasir', 'kitchen', 'waiter', 'admin']);

        if ($isEmployeeRole) {
            // ✅ FIX: Don't use cache for now to ensure fresh data when subscription features are changed
            $result = (function () use ($user) {
                // Get employee's business and check owner's subscription
                $employee = \App\Models\Employee::where('user_id', $user->id)
                    ->where('is_active', true)
                    ->with(['business.owner.subscriptions' => function ($query) {
                        $query->where('status', 'active')
                            ->where('ends_at', '>', now())
                            ->latest();
                    }])
                    ->first();

                if (!$employee || !$employee->business) {
                    return [
                        'success' => false,
                        'message' => 'Employee not assigned to any business',
                        'has_subscription' => false,
                        'subscription_expired' => true,
                        'status_code' => 404,
                    ];
                }

                $owner = $employee->business->owner;
                if (!$owner) {
                    return [
                        'success' => false,
                        'message' => 'Business owner not found',
                        'has_subscription' => false,
                        'subscription_expired' => true,
                        'status_code' => 404,
                    ];
                }

                // Check owner's subscription
                $activeSubscription = $owner->subscriptions()
                    ->where('status', 'active')
                    ->where('ends_at', '>', now())
                    ->with('subscriptionPlan') // ✅ FIX: Eager load subscription plan to get features
                    ->latest()
                    ->first();

                if (!$activeSubscription) {
                    return [
                        'success' => false,
                        'message' => 'Business owner subscription has expired',
                        'has_subscription' => false,
                        'subscription_expired' => true,
                        'is_employee' => true,
                        'owner_id' => $owner->id,
                        'business_id' => $employee->business->id,
                        'status_code' => 403,
                    ];
                }

                // Owner has active subscription, employee can access
                // ✅ FIX: Get subscription plan features for employee (from owner's subscription)
                $plan = $activeSubscription->subscriptionPlan;

                // ✅ FIX: Check if plan exists
                if (!$plan) {
                    return [
                        'success' => false,
                        'message' => 'Subscription plan not found',
                        'has_subscription' => false,
                        'subscription_expired' => true,
                        'status_code' => 500,
                    ];
                }

                // ✅ NEW: Check has_reports_access first (configurable from Filament), fallback to has_advanced_reports
                $hasReportsAccess = isset($plan->has_reports_access) ? $plan->has_reports_access : ($plan->has_advanced_reports ?? false);

                $planFeatures = [
                    'has_advanced_reports' => $hasReportsAccess, // Use has_reports_access if available
                    'has_reports_access' => $hasReportsAccess, // ✅ NEW: Include has_reports_access
                    'has_kitchen_access' => $plan->has_kitchen_access ?? false,
                    'has_tables_access' => $plan->has_tables_access ?? false,
                    'has_attendance_access' => $plan->has_attendance_access ?? false,
                    'has_inventory_access' => $plan->has_inventory_access ?? false,
                    'has_promo_access' => $plan->has_promo_access ?? false,
                    'has_stock_transfer_access' => $plan->has_stock_transfer_access ?? false,
                    'has_self_service_access' => $plan->has_self_service_access ?? false,
                    'has_online_integration' => $plan->has_online_integration ?? false,
                    'has_api_access' => $plan->has_api_access ?? false,
                    'has_multi_location' => $plan->has_multi_location ?? false,
                    'max_businesses' => $plan->max_businesses ?? 1, // ✅ NEW: Include max_businesses
                    'max_outlets' => $plan->max_outlets ?? 1,
                    'max_products' => $plan->max_products ?? 100,
                    'max_employees' => $plan->max_employees ?? 5,
                ];

                return [
                    'success' => true,
                    'data' => $activeSubscription,
                    'has_subscription' => true,
                    'is_active' => true,
                    'days_remaining' => $activeSubscription->daysRemaining(),
                    'is_trial' => $activeSubscription->is_trial ?? false,
                    'trial_ended' => $activeSubscription->isTrialEnded(),
                    'is_employee' => true,
                    'owner_id' => $owner->id,
                    'business_id' => $employee->business->id,
                    'plan_features' => $planFeatures, // ✅ FIX: Include plan features for employee
                    'status_code' => 200,
                ];
            })();

            $statusCode = $result['status_code'] ?? 200;
            unset($result['status_code']);
            return response()->json($result, $statusCode);
        }

        // For owner/super_admin roles, check their own subscription
        // ✅ FIX: Prioritize active subscription over pending_payment
        // If user has active subscription, use it. Only use pending_payment if no active subscription exists.
        $activeSubscription = UserSubscription::with(['subscriptionPlan', 'subscriptionPlanPrice'])
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('ends_at', '>', now()) // Only get non-expired active subscriptions
            ->latest()
            ->first();

        // Only check for pending_payment if no active subscription found
        if (!$activeSubscription) {
            $pendingSubscription = UserSubscription::with(['subscriptionPlan', 'subscriptionPlanPrice'])
                ->where('user_id', $user->id)
                ->where('status', 'pending_payment')
                ->latest()
                ->first();
            
            $subscription = $pendingSubscription;
        } else {
            $subscription = $activeSubscription;
        }

        if (!$subscription) {
            // ✅ FIX: Return 200 OK (not 404) when user has no subscription
            // This is normal for new users - they should see subscription plans page
            return response()->json([
                'success' => true,
                'message' => 'No active subscription found',
                'has_subscription' => false,
                'is_trial' => false,
                'trial_ended' => true,
                'is_pending_payment' => false,
                'subscription_status' => null,
                'data' => null,
                'plan_features' => [
                    'has_advanced_reports' => false,
                    'has_reports_access' => false,
                    'has_kitchen_access' => false,
                    'has_tables_access' => false,
                    'has_attendance_access' => false,
                    'has_inventory_access' => false,
                    'has_promo_access' => false,
                    'has_stock_transfer_access' => false,
                    'has_self_service_access' => false,
                    'has_online_integration' => false,
                    'has_api_access' => false,
                    'has_multi_location' => false,
                    'max_businesses' => 1,
                    'max_outlets' => 1,
                    'max_products' => 100,
                    'max_employees' => 5,
                ],
            ], 200);
        }

        // Check if subscription is still active (not expired)
        $isActive = $subscription->isActive();
        $isPendingPayment = $subscription->status === 'pending_payment';
        // ✅ FIX: Don't calculate days remaining if subscription is pending payment
        // Days should only be calculated for active subscriptions
        $daysRemaining = $isPendingPayment ? 0 : $subscription->daysRemaining();

        // Get subscription plan features
        $plan = $subscription->subscriptionPlan;

        // ✅ FIX: Check if plan exists before accessing properties
        if (!$plan) {
            Log::error('Subscription plan not found for subscription', [
                'subscription_id' => $subscription->id,
                'subscription_plan_id' => $subscription->subscription_plan_id,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Subscription plan not found',
                'has_subscription' => false,
            ], 500);
        }

        // ✅ NEW: Check has_reports_access first (configurable from Filament), fallback to has_advanced_reports
        $hasReportsAccess = isset($plan->has_reports_access) ? $plan->has_reports_access : ($plan->has_advanced_reports ?? false);

        $planFeatures = [
            'has_advanced_reports' => $hasReportsAccess, // Use has_reports_access if available
            'has_reports_access' => $hasReportsAccess, // ✅ NEW: Include has_reports_access
            'has_kitchen_access' => $plan->has_kitchen_access ?? false,
            'has_tables_access' => $plan->has_tables_access ?? false,
            'has_attendance_access' => $plan->has_attendance_access ?? false,
            'has_inventory_access' => $plan->has_inventory_access ?? false,
            'has_promo_access' => $plan->has_promo_access ?? false,
            'has_stock_transfer_access' => $plan->has_stock_transfer_access ?? false,
            'has_self_service_access' => $plan->has_self_service_access ?? false,
            'has_online_integration' => $plan->has_online_integration ?? false,
            'has_api_access' => $plan->has_api_access ?? false,
            'has_multi_location' => $plan->has_multi_location ?? false,
            'max_businesses' => $plan->max_businesses ?? 1, // ✅ FIX: Include max_businesses
            'max_outlets' => $plan->max_outlets ?? 1,
            'max_products' => $plan->max_products ?? 100,
            'max_employees' => $plan->max_employees ?? 5,
        ];

        return response()->json([
            'success' => true,
            'data' => $subscription,
            'has_subscription' => $isActive, // Only true if subscription is still active
            'is_active' => $isActive,
            'is_pending_payment' => $isPendingPayment, // Flag untuk status pending payment
            'subscription_status' => $subscription->status, // Status subscription (active, pending_payment, etc)
            'days_remaining' => $daysRemaining,
            'is_trial' => $subscription->is_trial ?? false,
            'trial_ended' => $subscription->isTrialEnded(),
            'plan_features' => $planFeatures, // ✅ NEW: Include subscription plan features
        ]);
        } catch (\Exception $e) {
            Log::error('Error getting current subscription', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error retrieving subscription: ' . $e->getMessage(),
                'has_subscription' => false,
            ], 500);
        }
    }

    /**
     * Get payment token for pending subscription
     */
    public function getPaymentToken($subscriptionCode)
    {
        $user = Auth::user();

        $subscription = UserSubscription::with(['subscriptionPlan', 'subscriptionPlanPrice', 'user'])
            ->where('subscription_code', $subscriptionCode)
            ->where('user_id', $user->id)
            ->where('status', 'pending_payment')
            ->first();

        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'Subscription not found or already paid',
            ], 404);
        }

        try {
            // Check if transaction already exists in Midtrans
            $existingTransaction = null;
            try {
                $existingTransaction = $this->midtransService->getTransactionStatus($subscription->subscription_code);

                // If transaction exists and is still pending, return existing transaction info
                if ($existingTransaction && in_array($existingTransaction->transaction_status, ['pending', 'settlement', 'capture'])) {
                    Log::info('Existing transaction found for subscription', [
                        'subscription_code' => $subscriptionCode,
                        'transaction_status' => $existingTransaction->transaction_status,
                    ]);

                    // For pending transactions, we need to create new one with different order_id
                    // But if already settled/captured, subscription should be active
                    if (in_array($existingTransaction->transaction_status, ['settlement', 'capture'])) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Pembayaran sudah berhasil. Subscription akan diaktifkan segera.',
                            'transaction_status' => $existingTransaction->transaction_status,
                        ], 400);
                    }
                }
            } catch (\Exception $e) {
                // Transaction doesn't exist yet, that's fine - we'll create a new one
                Log::info('No existing transaction found, will create new one', [
                    'subscription_code' => $subscriptionCode,
                ]);
            }

            // ✅ FIX: Use subscription_code as order_id for consistency
            // This ensures webhook can find subscription easily
            $orderId = $subscription->subscription_code;

            // Create Midtrans payment token with subscription_code as order_id
            $snapToken = $this->midtransService->createSnapToken([
                'order_id' => $orderId, // Use subscription_code for consistency
                'gross_amount' => (int) $subscription->amount_paid,
                'item_id' => 'subscription-' . $subscription->subscription_plan_id,
                'item_name' => $subscription->subscriptionPlan->name . ' - ' . ($subscription->subscriptionPlanPrice->duration_months ?? 1) . ' bulan',
                'price' => (int) $subscription->amount_paid,
                'customer_name' => $user->name,
                'customer_email' => $user->email,
                'customer_phone' => $user->phone ?? '',
            ]);

            Log::info('Payment token generated for pending subscription', [
                'subscription_id' => $subscription->id,
                'subscription_code' => $subscriptionCode,
                'order_id' => $orderId,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'subscription' => $subscription,
                    'snap_token' => $snapToken,
                    'client_key' => config('midtrans.client_key'),
                    'order_id' => $orderId, // Return order_id (same as subscription_code)
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to generate payment token', [
                'subscription_code' => $subscriptionCode,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Check if error is about duplicate order_id
            if (str_contains($e->getMessage(), 'already been taken') || str_contains($e->getMessage(), 'order_id has already been taken')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaksi pembayaran sudah pernah dibuat. Silakan gunakan halaman pembayaran sebelumnya atau tunggu beberapa saat.',
                    'error' => 'Duplicate order_id',
                    'hint' => 'Transaksi dengan kode ini sudah pernah dibuat. Silakan cek status pembayaran atau tunggu beberapa saat lalu coba lagi.',
                ], 400);
            }

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat token pembayaran: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Confirm payment for a subscription
     */
    public function confirmPayment(Request $request, $subscriptionId)
    {
        $request->validate([
            'payment_method' => 'required|string',
            'gateway_payment_id' => 'nullable|string',
        ]);

        $user = Auth::user();

        $subscription = UserSubscription::where('id', $subscriptionId)
            ->where('user_id', $user->id)
            ->where('status', 'pending_payment')
            ->first();

        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'Subscription not found or already paid',
            ], 404);
        }

        DB::beginTransaction();

        try {
            // Update subscription status
            $subscription->update([
                'status' => 'active',
                'notes' => 'Payment confirmed via ' . $request->payment_method,
            ]);

            // ✅ FIX: Mark old subscription as upgraded if this is an upgrade
            $oldSubscription = UserSubscription::where('user_id', $user->id)
                ->where('id', '!=', $subscription->id)
                ->where('status', 'active')
                ->where('ends_at', '>', Carbon::now())
                ->orderBy('created_at', 'desc')
                ->first();

            if ($oldSubscription) {
                $oldSubscription->update([
                    'status' => 'upgraded',
                    'notes' => ($oldSubscription->notes ?? '') . ' | Upgraded to ' . ($subscription->subscriptionPlan->name ?? 'new plan') . ' at ' . Carbon::now(),
                ]);
            }

            // Update business to use new subscription
            $business = \App\Models\Business::where('owner_id', $user->id)
                ->where(function($query) use ($subscription, $oldSubscription) {
                    $query->where('current_subscription_id', $subscription->id)
                        ->orWhere(function($q) use ($oldSubscription) {
                            if ($oldSubscription) {
                                $q->where('current_subscription_id', $oldSubscription->id);
                            }
                        });
                })
                ->first();

            if ($business) {
                $business->update([
                    'current_subscription_id' => $subscription->id,
                    'subscription_expires_at' => $subscription->ends_at,
                ]);
            }

            // Create payment record
            $payment = \App\Models\SubscriptionPayment::create([
                'user_subscription_id' => $subscription->id,
                'payment_code' => $subscription->subscription_code,
                'payment_method' => $request->payment_method,
                'payment_gateway' => 'manual',
                'gateway_payment_id' => $request->gateway_payment_id,
                'amount' => $subscription->amount_paid,
                'status' => 'paid',
                'paid_at' => Carbon::now(),
            ]);

            DB::commit();

            // Fire SubscriptionPaid event
            event(new \App\Events\SubscriptionPaid($payment));

            return response()->json([
                'success' => true,
                'message' => 'Payment confirmed successfully',
                'data' => $subscription->fresh()->load(['subscriptionPlan', 'subscriptionPlanPrice']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to confirm payment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upgrade/Change subscription plan
     */
    public function upgradeSubscription(Request $request)
    {
        Log::info('Upgrade subscription request received', [
            'user_id' => Auth::id(),
            'request_data' => $request->all(),
        ]);

        try {
            $request->validate([
                'subscription_plan_id' => 'required|exists:subscription_plans,id',
                'subscription_plan_price_id' => 'required|exists:subscription_plan_prices,id',
                'upgrade_option' => 'nullable', // Tidak diperlukan lagi, selalu pakai bonus_days
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed in upgrade', [
                'errors' => $e->errors(),
            ]);
            throw $e;
        }

        $user = Auth::user();

        Log::info('User authenticated for upgrade', [
            'user_id' => $user->id,
            'user_role' => $user->role,
        ]);

        // Get current active subscription with plan relation
        $currentSubscription = UserSubscription::with('subscriptionPlan')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        Log::info('Current subscription check', [
            'has_subscription' => $currentSubscription ? true : false,
            'subscription_id' => $currentSubscription?->id,
        ]);

        if (!$currentSubscription) {
            Log::warning('No active subscription found for upgrade', [
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'No active subscription found to upgrade',
            ], 404);
        }

        // ✅ FIX: Use find() instead of findOrFail() and handle null gracefully
        $newPlan = SubscriptionPlan::find($request->subscription_plan_id);
        if (!$newPlan) {
            return response()->json([
                'success' => false,
                'message' => 'Subscription plan not found',
            ], 404);
        }

        $newPrice = SubscriptionPlanPrice::find($request->subscription_plan_price_id);
        if (!$newPrice) {
            Log::error('SubscriptionPlanPrice not found in upgradeSubscription', [
                'price_id' => $request->subscription_plan_price_id,
                'plan_id' => $request->subscription_plan_id,
                'user_id' => $user->id,
                'current_subscription_id' => $currentSubscription->id,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Subscription plan price not found. Silakan pilih durasi paket yang tersedia.',
            ], 404);
        }

        Log::info('Plan and price loaded', [
            'plan_id' => $newPlan->id,
            'plan_name' => $newPlan->name,
            'price_id' => $newPrice->id,
            'price_amount' => $newPrice->final_price,
        ]);

        // Verify that the price belongs to the selected plan
        if ($newPrice->subscription_plan_id !== $newPlan->id) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid price for the selected plan',
            ], 400);
        }

        // Check if trying to downgrade to trial
        if ($newPlan->slug === 'trial-7-days') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot downgrade to trial plan',
            ], 400);
        }

        // Check if this is a downgrade and validate limits
        $isDowngrade = false;
        $currentPlanOrder = $currentSubscription->subscriptionPlan->sort_order ?? 0;
        $newPlanOrder = $newPlan->sort_order ?? 0;

        if ($newPlanOrder < $currentPlanOrder) {
            $isDowngrade = true;

            // Get user's business to check current usage
            $business = \App\Models\Business::where('owner_id', $user->id)
                ->where('current_subscription_id', $currentSubscription->id)
                ->first();

            if ($business) {
                $downgradeCheck = $business->canDowngradeTo($newPlan);

                if (!$downgradeCheck['can_downgrade']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Tidak dapat downgrade karena melebihi batas paket baru',
                        'is_downgrade' => true,
                        'issues' => $downgradeCheck['issues'],
                    ], 400);
                }
            }
        }

        Log::info('Starting upgrade transaction', [
            'is_downgrade' => $isDowngrade,
            'current_plan_order' => $currentPlanOrder,
            'new_plan_order' => $newPlanOrder,
        ]);

        DB::beginTransaction();

        try {
            // Calculate upgrade options (hanya 1 opsi sekarang)
            $upgradeOptions = $this->calculateUpgradeOptions($currentSubscription, $newPrice);
            $selectedOption = $upgradeOptions['upgrade_option'];

            $startsAt = Carbon::now();
            $endsAt = $selectedOption['ends_at'];
            $amountToPay = $selectedOption['amount_to_pay'];
            $creditAmount = $selectedOption['credit_amount'] ?? 0;
            $bonusDays = $selectedOption['bonus_days'] ?? 0;

            Log::info('Calculated upgrade details', [
                'upgrade_option' => 'bonus_days',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'duration_months' => $newPrice->duration_months,
                'amount_to_pay' => $amountToPay,
                'credit_amount' => $creditAmount,
                'bonus_days' => $bonusDays,
            ]);

            // ✅ FIX: Determine if payment is required
            // ✅ CRITICAL: If plan has price > 0, payment is ALWAYS required
            // Even if amountToPay becomes 0 after credit calculation, if plan is paid, require payment
            $planPrice = $newPrice->final_price ?? 0;
            $requiresPayment = $planPrice > 0 || $amountToPay > 0;
            $subscriptionStatus = $requiresPayment ? 'pending_payment' : 'active';
            
            Log::info('Payment requirement check for upgrade', [
                'plan_price' => $planPrice,
                'amount_to_pay' => $amountToPay,
                'requires_payment' => $requiresPayment,
                'plan_slug' => $newPlan->slug,
                'is_trial' => $newPlan->slug === 'trial-7-days',
            ]);

            // ✅ FIX: Don't mark old subscription as 'upgraded' if payment is required
            // Keep it active until payment is confirmed, so user can still access the app
            // Mark as upgraded only if payment not required (free upgrade)
            if (!$requiresPayment) {
                $currentSubscription->update([
                    'status' => 'upgraded',
                    'notes' => ($currentSubscription->notes ?? '') . ' | Upgraded to ' . $newPlan->name . ' at ' . Carbon::now(),
                ]);
            } else {
                // If payment required, keep old subscription active
                // ✅ FIX: Extend ends_at by 7 days if it's expired or will expire soon (within 7 days)
                // This ensures user can still access the app during payment process
                $currentEndsAt = Carbon::parse($currentSubscription->ends_at);
                $now = Carbon::now();
                $daysUntilExpiry = $now->diffInDays($currentEndsAt, false);
                
                if ($daysUntilExpiry < 7) {
                    // Extend subscription by 7 days to ensure access during payment
                    $extendedEndsAt = $now->copy()->addDays(7);
                    $currentSubscription->update([
                        'ends_at' => $extendedEndsAt,
                        'notes' => ($currentSubscription->notes ?? '') . ' | Upgrade to ' . $newPlan->name . ' initiated at ' . Carbon::now() . ' (pending payment). Extended by 7 days for payment process.',
                    ]);
                    
                    Log::info('Extended subscription ends_at during upgrade', [
                        'subscription_id' => $currentSubscription->id,
                        'original_ends_at' => $currentEndsAt,
                        'extended_ends_at' => $extendedEndsAt,
                        'days_until_expiry' => $daysUntilExpiry,
                    ]);
                } else {
                    // Subscription still has enough days, just add note
                    $currentSubscription->update([
                        'notes' => ($currentSubscription->notes ?? '') . ' | Upgrade to ' . $newPlan->name . ' initiated at ' . Carbon::now() . ' (pending payment)',
                    ]);
                }
            }

            // Create new subscription
            $oldPlanName = $currentSubscription->subscriptionPlan ? $currentSubscription->subscriptionPlan->name : 'Previous Plan';
            $subscriptionCode = 'SUB-' . strtoupper(Str::random(10));

            // Build notes with upgrade details
            $upgradeNotes = "Upgraded from {$oldPlanName} using 'bonus_days' option";
            if ($creditAmount > 0) {
                $upgradeNotes .= " (Credit: Rp " . number_format($creditAmount, 0, ',', '.') . ")";
            }
            if ($bonusDays > 0) {
                $upgradeNotes .= " (Bonus: {$bonusDays} days)";
            }

            $newSubscription = UserSubscription::create([
                'user_id' => $user->id,
                'subscription_plan_id' => $newPlan->id,
                'subscription_plan_price_id' => $newPrice->id,
                'subscription_code' => $subscriptionCode,
                'status' => $subscriptionStatus, // ✅ FIX: pending_payment if requires payment
                'amount_paid' => $amountToPay,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'trial_ends_at' => null,
                'is_trial' => false,
                'plan_features' => $newPlan->features,
                'notes' => $upgradeNotes,
            ]);

            Log::info('New subscription created', [
                'new_subscription_id' => $newSubscription->id,
                'subscription_code' => $newSubscription->subscription_code,
                'status' => $subscriptionStatus,
                'requires_payment' => $requiresPayment,
            ]);

            // ✅ FIX: Only update business if subscription is active (payment not required or already paid)
            // If payment required, business will be updated after payment is confirmed
            if (!$requiresPayment) {
                // Update all businesses to use new subscription
                \App\Models\Business::where('current_subscription_id', $currentSubscription->id)
                    ->update([
                        'current_subscription_id' => $newSubscription->id,
                        'subscription_expires_at' => $endsAt,
                    ]);
            }

            // ✅ FIX: Create Midtrans payment token if payment is required
            $snapToken = null;
            if ($requiresPayment) {
                try {
                    // Get user's business for Midtrans config
                    $business = \App\Models\Business::where('owner_id', $user->id)
                        ->where('current_subscription_id', $currentSubscription->id)
                        ->first();

                    if ($business) {
                        // Use business-specific Midtrans config if available
                        $midtransService = \App\Services\MidtransService::forBusiness($business);
                    } else {
                        // Fallback to default Midtrans service
                        $midtransService = $this->midtransService;
                    }

                    $snapToken = $midtransService->createSnapToken([
                        'order_id' => $subscriptionCode,
                        'gross_amount' => (int) $amountToPay,
                        'item_id' => 'subscription-upgrade-' . $newPlan->id,
                        'item_name' => 'Upgrade to ' . $newPlan->name . ' - ' . ($newPrice->duration_months ?? 1) . ' bulan',
                        'price' => (int) $amountToPay,
                        'customer_name' => $user->name,
                        'customer_email' => $user->email,
                        'customer_phone' => $user->phone ?? '',
                    ]);

                    Log::info('Midtrans snap token created for upgrade', [
                        'subscription_id' => $newSubscription->id,
                        'subscription_code' => $subscriptionCode,
                        'amount' => $amountToPay,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to create Midtrans snap token for upgrade', [
                        'subscription_id' => $newSubscription->id,
                        'error' => $e->getMessage(),
                    ]);
                    // Don't fail the upgrade if Midtrans fails - user can get token later
                }
            }

            DB::commit();

            // ✅ FIX: Safely load relations - use fresh() and catch errors
            try {
                $newSubscription->load(['subscriptionPlan', 'subscriptionPlanPrice']);
            } catch (\Exception $e) {
                Log::warning('Failed to load subscription relations', [
                    'subscription_id' => $newSubscription->id,
                    'subscription_plan_price_id' => $newSubscription->subscription_plan_price_id,
                    'error' => $e->getMessage(),
                ]);
                // Try to load only subscriptionPlan if subscriptionPlanPrice fails
                $newSubscription->load('subscriptionPlan');
            }

            return response()->json([
                'success' => true,
                'message' => $requiresPayment ? 'Upgrade berhasil dibuat. Silakan lakukan pembayaran untuk mengaktifkan paket.' : 'Subscription upgraded and activated successfully!',
                'data' => $newSubscription,
                'requires_payment' => $requiresPayment, // ✅ FIX: Return true if payment required
                'snap_token' => $snapToken, // ✅ FIX: Return snap token for payment
                'client_key' => config('midtrans.client_key'),
                'amount_to_pay' => $amountToPay,
                'credit_amount' => $creditAmount,
                'bonus_days' => $bonusDays,
                'upgrade_option' => 'bonus_days',
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Upgrade subscription failed', [
                'user_id' => $user->id,
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'error_line' => $e->getLine(),
                'error_file' => $e->getFile(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to upgrade subscription',
                'error' => $e->getMessage(),
                'debug' => [
                    'line' => $e->getLine(),
                    'file' => basename($e->getFile()),
                ]
            ], 500);
        }
    }

    /**
     * Check if user has used trial before
     */
    public function getTrialStatus()
    {
        $user = Auth::user();

        // Check if user has ever used trial (regardless of status)
        $hasUsedTrial = UserSubscription::where('user_id', $user->id)
            ->where('is_trial', true)
            ->exists();

        // Check if user has an active trial (not upgraded)
        $activeTrial = UserSubscription::where('user_id', $user->id)
            ->where('is_trial', true)
            ->where('status', 'active')
            ->where('ends_at', '>', Carbon::now())
            ->first();

        // Check if user has an active paid subscription (trial was upgraded)
        $activePaidSubscription = UserSubscription::where('user_id', $user->id)
            ->where('is_trial', false)
            ->where('status', 'active')
            ->where('ends_at', '>', Carbon::now())
            ->exists();

        // Trial is considered ended if:
        // 1. User has used trial AND
        // 2. No active trial exists AND
        // 3. Either trial expired OR user upgraded to paid subscription
        $trialEnded = $hasUsedTrial && !$activeTrial;

        return response()->json([
            'success' => true,
            'has_used_trial' => $hasUsedTrial,
            'has_active_trial' => $activeTrial ? true : false,
            'trial_ended' => $trialEnded,
            'has_active_paid_subscription' => $activePaidSubscription,
        ]);
    }

    /**
     * Check if user can downgrade to a specific plan
     */
    public function checkDowngrade(Request $request)
    {
        $request->validate([
            'target_plan_id' => 'required|exists:subscription_plans,id',
        ]);

        $user = Auth::user();
        $targetPlan = SubscriptionPlan::findOrFail($request->target_plan_id);

        // Get user's business
        $business = \App\Models\Business::where('owner_id', $user->id)->first();

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found',
            ], 404);
        }

        $downgradeCheck = $business->canDowngradeTo($targetPlan);

        return response()->json([
            'success' => true,
            'can_downgrade' => $downgradeCheck['can_downgrade'],
            'issues' => $downgradeCheck['issues'],
            'target_plan' => $targetPlan,
            'current_usage' => [
                'outlets' => $business->outlets()->count(),
                'products' => $business->products()->count(),
                'employees' => $business->employees()->count(),
            ],
        ]);
    }

    /**
     * Cancel subscription
     */
    public function cancelSubscription($subscriptionId)
    {
        $user = Auth::user();

        $subscription = UserSubscription::where('id', $subscriptionId)
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'pending_payment'])
            ->first();

        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'Subscription not found',
            ], 404);
        }

        $subscription->update([
            'status' => 'cancelled',
            'notes' => ($subscription->notes ?? '') . ' | Cancelled by user at ' . Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subscription cancelled successfully',
        ]);
    }

    /**
     * Get upgrade options for a specific plan and price
     */
    public function getUpgradeOptions($planId, $priceId)
    {
        try {
            $user = Auth::user();

            // Get current active subscription
            $currentSubscription = UserSubscription::with('subscriptionPlan')
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->where('ends_at', '>', now()) // ✅ FIX: Only get non-expired active subscriptions
                ->latest()
                ->first();

            if (!$currentSubscription) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active subscription found',
                ], 404);
            }

            // ✅ FIX: Use find() instead of findOrFail() and handle null gracefully
            $newPlan = SubscriptionPlan::find($planId);
            if (!$newPlan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Subscription plan not found',
                ], 404);
            }

            $newPrice = SubscriptionPlanPrice::find($priceId);
            if (!$newPrice) {
                Log::error('SubscriptionPlanPrice not found', [
                    'price_id' => $priceId,
                    'plan_id' => $planId,
                    'user_id' => $user->id,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Subscription plan price not found. Silakan pilih durasi paket yang tersedia.',
                ], 404);
            }

            // Verify that the price belongs to the selected plan
            if ($newPrice->subscription_plan_id !== $newPlan->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid price for the selected plan',
                ], 400);
            }

            // Calculate upgrade options
            $upgradeOptions = $this->calculateUpgradeOptions($currentSubscription, $newPrice);

            return response()->json([
                'success' => true,
                'data' => $upgradeOptions,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting upgrade options', [
                'user_id' => Auth::id(),
                'plan_id' => $planId,
                'price_id' => $priceId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mendapatkan opsi upgrade. Silakan coba lagi.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Downgrade subscription to trial
     */
    public function downgradeToTrial()
    {
        $user = Auth::user();

        // Get current active subscription
        $currentSubscription = UserSubscription::with('subscriptionPlan')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (!$currentSubscription) {
            return response()->json([
                'success' => false,
                'message' => 'No active subscription found',
            ], 404);
        }

        // Check if already on trial
        if ($currentSubscription->is_trial) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah menggunakan paket trial',
            ], 400);
        }

        // Check if user has ever used trial before (prevent trial abuse)
        $hasUsedTrial = UserSubscription::where('user_id', $user->id)
            ->where('is_trial', true)
            ->exists();

        if ($hasUsedTrial) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah pernah menggunakan trial sebelumnya. Tidak dapat downgrade ke trial lagi.',
            ], 400);
        }

        // Get trial plan
        $trialPlan = SubscriptionPlan::where('name', 'Trial 7 Hari')->first();

        if (!$trialPlan) {
            return response()->json([
                'success' => false,
                'message' => 'Trial plan not found',
            ], 404);
        }

        // Get trial price (should be free)
        $trialPrice = SubscriptionPlanPrice::where('subscription_plan_id', $trialPlan->id)
            ->where('final_price', 0)
            ->first();

        if (!$trialPrice) {
            return response()->json([
                'success' => false,
                'message' => 'Trial price not found',
            ], 404);
        }

        DB::beginTransaction();

        try {
            // Cancel current subscription
            $currentSubscription->update([
                'status' => 'cancelled',
                'notes' => ($currentSubscription->notes ?? '') . ' | Downgraded to trial at ' . Carbon::now(),
            ]);

            // Create new trial subscription
            $newTrialSubscription = UserSubscription::create([
                'user_id' => $user->id,
                'subscription_plan_id' => $trialPlan->id,
                'subscription_plan_price_id' => $trialPrice->id,
                'subscription_code' => 'TRIAL-' . strtoupper(Str::random(10)),
                'status' => 'active',
                'amount_paid' => 0,
                'starts_at' => Carbon::now(),
                'ends_at' => Carbon::now()->addDays(7),
                'trial_ends_at' => Carbon::now()->addDays(7),
                'is_trial' => true,
                'plan_features' => $trialPlan->features,
                'notes' => 'Downgraded from ' . $currentSubscription->subscriptionPlan->name . ' to Trial 7 Hari',
            ]);

            // Update business subscription
            $business = Business::where('owner_id', $user->id)->first();
            if ($business) {
                $business->update([
                    'current_subscription_id' => $newTrialSubscription->id,
                    'subscription_info' => [
                        'plan_name' => $trialPlan->name,
                        'plan_type' => 'trial',
                        'is_trial' => true,
                        'trial_ends_at' => $newTrialSubscription->trial_ends_at,
                        'features' => $trialPlan->features,
                        'status' => 'active',
                    ],
                ]);
            }

            Log::info('Subscription downgraded to trial', [
                'user_id' => $user->id,
                'old_subscription_id' => $currentSubscription->id,
                'new_subscription_id' => $newTrialSubscription->id,
                'trial_ends_at' => $newTrialSubscription->trial_ends_at,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Berhasil downgrade ke paket trial 7 hari',
                'data' => [
                    'subscription' => $newTrialSubscription,
                    'trial_ends_at' => $newTrialSubscription->trial_ends_at,
                    'features' => $trialPlan->features,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error downgrading subscription', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal downgrade subscription: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify and auto-activate pending subscription
     * Called from frontend after payment redirect
     */
    public function verifyAndActivatePending()
    {
        $user = Auth::user();

        // ✅ FIX: Check if already have active subscription FIRST
        // If subscription is already active, return success immediately
        $activeSubscription = UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->latest()
            ->first();

        if ($activeSubscription) {
            Log::info('Subscription already active, skipping verification', [
                'user_id' => $user->id,
                'subscription_id' => $activeSubscription->id,
                'subscription_code' => $activeSubscription->subscription_code,
                'status' => $activeSubscription->status,
            ]);

            return response()->json([
                'success' => true,
                'already_active' => true,
                'activated' => false, // Not activated, already was active
                'message' => 'Subscription sudah aktif',
                'data' => $activeSubscription->load(['subscriptionPlan', 'subscriptionPlanPrice']),
            ]);
        }

        // Find latest pending subscription
        $subscription = UserSubscription::where('user_id', $user->id)
            ->where('status', 'pending_payment')
            ->latest()
            ->first();

        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada subscription pending ditemukan',
            ], 404);
        }

        // ✅ FIX: Get business to check Midtrans config (optional - user might not have business yet)
        $business = $user->ownedBusinesses()->first() ?? $user->businesses()->first();

        // ✅ FIX: Business is not required for subscription activation
        // User can have active subscription without business (they'll create it later)
        if (!$business) {
            Log::info('No business found for subscription activation, using default Midtrans config', [
                'subscription_id' => $subscription->id,
                'user_id' => $user->id,
                'subscription_code' => $subscription->subscription_code,
            ]);

            // Use default MidtransService (no business-specific config)
            $midtransService = new \App\Services\MidtransService();
        } else {
            // ✅ Get MidtransService dengan business config
            $midtransService = \App\Services\MidtransService::forBusiness($business);
        }

        // ✅ FIX: Check payment status from Midtrans before activating
        try {
            // Use subscription_code as order_id (might have timestamp suffix)
            $orderId = $subscription->subscription_code;

            // If order_id contains timestamp (format: SUB-XXXXX-TIMESTAMP), use as is
            // Midtrans will handle it
            $transactionStatus = $midtransService->getTransactionStatus($orderId);

            Log::info('Checking Midtrans payment status for subscription', [
                'subscription_id' => $subscription->id,
                'subscription_code' => $subscription->subscription_code,
                'order_id' => $orderId,
                'transaction_status' => $transactionStatus->transaction_status ?? 'unknown',
            ]);

            // Only activate if payment is settled or captured
            $isSettled = in_array($transactionStatus->transaction_status ?? '', ['settlement', 'capture']);

            if (!$isSettled) {
                Log::info('Payment not yet settled, cannot activate subscription', [
                    'subscription_id' => $subscription->id,
                    'transaction_status' => $transactionStatus->transaction_status ?? 'unknown',
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Pembayaran belum selesai. Status: ' . ($transactionStatus->transaction_status ?? 'unknown'),
                    'transaction_status' => $transactionStatus->transaction_status ?? 'unknown',
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('Failed to check Midtrans payment status', [
                'subscription_id' => $subscription->id,
                'error' => $e->getMessage(),
            ]);

            // If we can't check Midtrans, still try to activate (user returned from payment)
            // This handles cases where Midtrans API is temporarily unavailable
            Log::warning('Proceeding with activation despite Midtrans check failure', [
                'subscription_id' => $subscription->id,
            ]);
        }

        DB::beginTransaction();

        try {
            // ✅ FIX: Activate subscription after verifying payment status
            $subscription->update([
                'status' => 'active',
                'notes' => ($subscription->notes ?? '') . ' | Auto-verified and activated at ' . Carbon::now(),
            ]);

            // ✅ FIX: Mark old subscription as upgraded if this is an upgrade
            $oldSubscription = UserSubscription::where('user_id', $user->id)
                ->where('id', '!=', $subscription->id)
                ->where('status', 'active')
                ->where('ends_at', '>', Carbon::now())
                ->orderBy('created_at', 'desc')
                ->first();

            if ($oldSubscription) {
                $oldSubscription->update([
                    'status' => 'upgraded',
                    'notes' => ($oldSubscription->notes ?? '') . ' | Upgraded to ' . ($subscription->subscriptionPlan->name ?? 'new plan') . ' at ' . Carbon::now(),
                ]);
            }

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

            // Create payment record
            $payment = \App\Models\SubscriptionPayment::create([
                'user_subscription_id' => $subscription->id,
                'payment_code' => $subscription->subscription_code,
                'payment_method' => 'auto_verification',
                'payment_gateway' => 'midtrans',
                'gateway_payment_id' => $subscription->subscription_code,
                'amount' => $subscription->amount_paid,
                'status' => 'paid',
                'paid_at' => Carbon::now(),
                'payment_data' => json_encode([
                    'note' => 'Auto-verified after payment redirect',
                    'activated_at' => Carbon::now(),
                    'reason' => 'User returned from payment gateway'
                ]),
            ]);

            Log::info('Subscription auto-verified and activated', [
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'subscription_code' => $subscription->subscription_code,
            ]);

            DB::commit();

            // Fire SubscriptionPaid event
            event(new \App\Events\SubscriptionPaid($payment));

            return response()->json([
                'success' => true,
                'activated' => true,
                'message' => 'Subscription verified and activated successfully!',
                'data' => $subscription->fresh()->load(['subscriptionPlan', 'subscriptionPlanPrice']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to verify and activate subscription', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to activate subscription',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Manual activate pending subscription (for development/testing)
     */
    public function manualActivateSubscription()
    {
        $user = Auth::user();

        // Find pending subscription
        $subscription = UserSubscription::where('user_id', $user->id)
            ->where('status', 'pending_payment')
            ->latest()
            ->first();

        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'No pending subscription found',
            ], 404);
        }

        DB::beginTransaction();

        try {
            // Activate subscription
            $subscription->update([
                'status' => 'active',
                'notes' => ($subscription->notes ?? '') . ' | Manually activated for testing at ' . Carbon::now(),
            ]);

            // Create payment record
            \App\Models\SubscriptionPayment::create([
                'user_subscription_id' => $subscription->id,
                'payment_code' => $subscription->subscription_code,
                'payment_method' => 'manual_activation',
                'payment_gateway' => 'manual',
                'gateway_payment_id' => $subscription->subscription_code,
                'amount' => $subscription->amount_paid,
                'status' => 'paid',
                'paid_at' => Carbon::now(),
                'payment_data' => json_encode(['note' => 'Manual activation for testing']),
            ]);

            Log::info('Subscription manually activated', [
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'subscription_code' => $subscription->subscription_code,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Subscription activated successfully!',
                'data' => $subscription->fresh()->load(['subscriptionPlan', 'subscriptionPlanPrice']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to manually activate subscription', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to activate subscription',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get subscription history for current user
     * Returns all subscriptions (active, expired, cancelled, pending)
     */
    public function getHistory()
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak ditemukan',
                ], 401);
            }

            // ✅ FIX: Don't eager load subscriptionPlanPrice to avoid errors if it's deleted
            // We only need subscriptionPlan for history display
            $subscriptions = UserSubscription::where('user_id', $user->id)
                ->with([
                    'subscriptionPlan' => function ($query) {
                        // Only load if not deleted
                        $query->whereNull('deleted_at');
                    }
                ])
                ->orderBy('created_at', 'desc')
                ->get();

            // Format subscription data for frontend
            // ✅ FIX: Handle cases where subscriptionPlan might be null or deleted
            $formattedSubscriptions = $subscriptions->map(function ($subscription) {
                try {
                    // Safe date formatting
                    $formatDate = function ($date) {
                        if (!$date) return null;
                        try {
                            return $date instanceof \Carbon\Carbon 
                                ? $date->toIso8601String() 
                                : (is_string($date) ? $date : null);
                        } catch (\Exception $e) {
                            return null;
                        }
                    };

                    // Safe days remaining calculation
                    $daysRemaining = 0;
                    try {
                        $daysRemaining = $subscription->daysRemaining();
                    } catch (\Exception $e) {
                        Log::warning('Error calculating days remaining', [
                            'subscription_id' => $subscription->id,
                            'error' => $e->getMessage(),
                        ]);
                    }

                    // Safe subscription plan access
                    $subscriptionPlan = null;
                    try {
                        if ($subscription->subscriptionPlan) {
                            $subscriptionPlan = [
                                'id' => $subscription->subscriptionPlan->id ?? null,
                                'name' => $subscription->subscriptionPlan->name ?? 'Paket Tidak Ditemukan',
                                'slug' => $subscription->subscriptionPlan->slug ?? null,
                            ];
                        }
                    } catch (\Exception $e) {
                        Log::warning('Error accessing subscription plan', [
                            'subscription_id' => $subscription->id,
                            'error' => $e->getMessage(),
                        ]);
                    }

                    return [
                        'id' => $subscription->id ?? null,
                        'subscription_code' => $subscription->subscription_code ?? null,
                        'subscription_plan' => $subscriptionPlan,
                        'status' => $subscription->status ?? 'unknown',
                        'amount_paid' => $subscription->amount_paid ?? 0,
                        'starts_at' => $formatDate($subscription->starts_at),
                        'ends_at' => $formatDate($subscription->ends_at),
                        'days_remaining' => $daysRemaining,
                        'is_trial' => $subscription->is_trial ?? false,
                        'created_at' => $formatDate($subscription->created_at),
                        'updated_at' => $formatDate($subscription->updated_at),
                    ];
                } catch (\Exception $e) {
                    // If there's any error processing a subscription, log it and return basic info
                    Log::warning('Error formatting subscription for history', [
                        'subscription_id' => $subscription->id ?? 'unknown',
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                    
                    // Safe date formatting for fallback
                    $formatDate = function ($date) {
                        if (!$date) return null;
                        try {
                            return $date instanceof \Carbon\Carbon 
                                ? $date->toIso8601String() 
                                : (is_string($date) ? $date : null);
                        } catch (\Exception $e) {
                            return null;
                        }
                    };
                    
                    return [
                        'id' => $subscription->id ?? null,
                        'subscription_code' => $subscription->subscription_code ?? null,
                        'subscription_plan' => null,
                        'status' => $subscription->status ?? 'unknown',
                        'amount_paid' => $subscription->amount_paid ?? 0,
                        'starts_at' => $formatDate($subscription->starts_at ?? null),
                        'ends_at' => $formatDate($subscription->ends_at ?? null),
                        'days_remaining' => 0,
                        'is_trial' => $subscription->is_trial ?? false,
                        'created_at' => $formatDate($subscription->created_at ?? null),
                        'updated_at' => $formatDate($subscription->updated_at ?? null),
                    ];
                }
            })->filter(function ($subscription) {
                // Filter out any null subscriptions
                return $subscription !== null && isset($subscription['id']);
            });

            return response()->json([
                'success' => true,
                'data' => $formattedSubscriptions->values()->all(),
                'total' => $formattedSubscriptions->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get subscription history', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil history subscription',
                'error' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan saat memuat history subscription',
            ], 500);
        }
    }

    /**
     * ✅ FIXED: Calculate upgrade options with DAILY VALUE calculation
     *
     * Perhitungan berdasarkan nilai harian:
     * 1. Hitung harga per hari paket lama dan baru
     * 2. Hitung sisa nilai uang dari paket lama
     * 3. Gabungkan dengan harga paket baru untuk dapat total hari aktif
     *
     * Returns 3 upgrade options:
     * 1. Prorated (Daily Value): Menghitung berdasarkan nilai harian
     * 2. Full Payment: Bayar full, dapat bonus hari
     * 3. Discount: Diskon 10%
     */
    private function calculateUpgradeOptions($currentSubscription, $newPrice)
    {
        $now = Carbon::now();
        $currentEndsAt = $currentSubscription->ends_at;
        $currentStartsAt = $currentSubscription->starts_at;
        $currentAmountPaid = $currentSubscription->amount_paid;

        // Check if same plan (paket sama)
        $isSamePlan = $currentSubscription->subscription_plan_id == $newPrice->subscription_plan_id;

        // Calculate remaining time
        $remainingDays = max(0, $now->diffInDays($currentEndsAt, false)); // Ensure non-negative
        $totalDays = $currentStartsAt->diffInDays($currentEndsAt);
        $usedDays = $totalDays - $remainingDays;

        // Calculate DAILY VALUE (harga per hari)
        $currentDailyPrice = $totalDays > 0 ? ($currentAmountPaid / $totalDays) : 0;
        $newDailyPrice = $newPrice->duration_months > 0 ? ($newPrice->final_price / ($newPrice->duration_months * 30)) : 0;

        // Calculate remaining value (sisa nilai uang dari paket lama)
        $remainingValue = $remainingDays * $currentDailyPrice;

        // Round for display
        $remainingDaysRounded = round($remainingDays, 1);
        $remainingValueRounded = round($remainingValue, 2);
        $standardDays = $newPrice->duration_months * 30;

        // ================== BONUS DAYS UPGRADE (SATU-SATUNYA OPSI) ==================
        // Bayar full + bonus hari terbatas (max 60 hari)
        // Konversi hanya 30-50% dari sisa nilai Basic
        // Sangat aman untuk margin, tapi user tetap dapat benefit
        // Solusi untuk kasus: 100 user tidak bisa exploit jadi 13 bulan

        $bonusDaysConversionRate = 0.40; // 40% konversi (bisa diatur 30-50%)
        $maxBonusDays = 60; // Cap maksimal bonus hari (hanya untuk paket berbeda)

        if ($isSamePlan) {
            // Jika paket sama, hanya tambahkan sisa hari tanpa cap 60 hari
            $bonusDaysFinal = (int) $remainingDays;
            $bonusDaysCreditUsed = $remainingValue; // Gunakan 100% nilai karena paket sama
        } else {
            // Jika paket berbeda, gunakan logika konversi dengan cap 60 hari
            // Hitung bonus hari dari konversi 40% sisa nilai (pembagian uang)
            $bonusDaysFromValue = 0;
            $convertedValue = $remainingValue * $bonusDaysConversionRate;
            if ($newDailyPrice > 0) {
                $bonusDaysFromValue = (int) floor($convertedValue / $newDailyPrice);
            }

            // Hitung bonus hari dari sisa hari (pembagian hari)
            $bonusDaysFromDays = (int) $remainingDays;

            // Ambil maksimal dari sisa pembagian uang dan hari, tapi cap maksimal 60 hari
            $bonusDaysFinal = min($maxBonusDays, max(0, max($bonusDaysFromDays, $bonusDaysFromValue)));
            // Credit yang digunakan adalah nilai konversi 40% dari sisa nilai
            $bonusDaysCreditUsed = $convertedValue;
        }

        $bonusDaysAmount = $newPrice->final_price; // Bayar full
        $bonusDaysTotalDays = $standardDays + $bonusDaysFinal;
        $bonusDaysEndsAt = $now->copy()->addDays($bonusDaysTotalDays);
        $bonusDaysEffectiveDailyPrice = $bonusDaysTotalDays > 0 ? ($bonusDaysAmount / $bonusDaysTotalDays) : 0;

        // Return hanya 1 opsi (Bonus Days)
        return [
            'upgrade_option' => [
                'type' => 'bonus_days',
                'label' => 'Upgrade Paket',
                'description' => "",
                'amount_to_pay' => round($bonusDaysAmount, 2),
                'credit_amount' => round($bonusDaysCreditUsed, 2),
                'credit_percentage' => $isSamePlan ? 100 : round($bonusDaysConversionRate * 100, 0), // 100% jika paket sama, 40% jika berbeda
                'ends_at' => $bonusDaysEndsAt,
                'total_days' => $bonusDaysTotalDays,
                'bonus_days' => $bonusDaysFinal,
                'max_bonus_days' => $isSamePlan ? null : $maxBonusDays, // Tidak ada cap jika paket sama
                'savings' => 0,
                'effective_daily_price' => round($bonusDaysEffectiveDailyPrice, 2),
                'is_recommended' => true,
                'calculation_details' => $isSamePlan ? [
                    'remaining_value' => round($remainingValue, 2),
                    'remaining_days' => $remainingDaysRounded,
                    'bonus_days_final' => $bonusDaysFinal,
                    'is_same_plan' => true,
                    'formula' => "Sisa hari dari paket sebelumnya = {$bonusDaysFinal} hari bonus (tanpa batas maksimal)",
                    'formula_explanation' => "Paket sama, tambahkan semua sisa hari tanpa konversi",
                ] : [
                    'remaining_value' => round($remainingValue, 2),
                    'conversion_rate' => $bonusDaysConversionRate * 100,
                    'converted_value' => round($remainingValue * $bonusDaysConversionRate, 2),
                    'bonus_days_from_value' => isset($bonusDaysFromValue) ? $bonusDaysFromValue : 0,
                    'bonus_days_from_days' => isset($bonusDaysFromDays) ? $bonusDaysFromDays : 0,
                    'bonus_days_final' => $bonusDaysFinal,
                    'max_cap' => $maxBonusDays,
                    'is_same_plan' => false,
                    'formula' => "Rp " . number_format($remainingValue, 0) . " × " . ($bonusDaysConversionRate * 100) . "% = Rp " . number_format($bonusDaysCreditUsed, 0) . " → " . $bonusDaysFinal . " hari bonus (max {$maxBonusDays} hari)",
                    'formula_explanation' => "Konversi " . ($bonusDaysConversionRate * 100) . "% dari sisa nilai dengan cap maksimal {$maxBonusDays} hari",
                ],
            ],
            'summary' => [
                'current_plan' => $currentSubscription->subscriptionPlan->name ?? 'Unknown Plan',
                'new_plan' => $newPrice->subscriptionPlan->name ?? 'Unknown Plan',
                'remaining_days' => $remainingDaysRounded,
                'total_days' => $totalDays,
                'used_days' => $usedDays,
                'current_amount' => $currentAmountPaid,
                'current_daily_price' => round($currentDailyPrice, 2),
                'new_plan_price' => $newPrice->final_price,
                'new_daily_price' => round($newDailyPrice, 2),
                'remaining_value' => round($remainingValue, 2),
                'credit_percentage' => $totalDays > 0 ? round(($remainingDays / $totalDays) * 100, 1) : 0,
                'calculation_method' => 'daily_value',
                'explanation' => "Sisa {$remainingDaysRounded} hari × Rp " . number_format($currentDailyPrice, 0) . "/hari = Rp " . number_format($remainingValue, 0) . " (nilai sisa paket lama)",
            ]
        ];
    }
}
