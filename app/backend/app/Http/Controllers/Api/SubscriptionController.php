<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionPlanPrice;
use App\Models\UserSubscription;
use App\Models\Business;
use App\Services\MidtransService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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

        $plan = SubscriptionPlan::findOrFail($request->subscription_plan_id);
        $price = SubscriptionPlanPrice::findOrFail($request->subscription_plan_price_id);

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

            // If paid subscription, create Midtrans payment token
            $snapToken = null;
            if (!$isTrial && $price->final_price > 0) {
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
                    ]);

                } catch (\Exception $e) {
                    Log::error('Failed to create Midtrans snap token', [
                        'subscription_id' => $subscription->id,
                        'error' => $e->getMessage(),
                    ]);
                    // Continue without snap token for now
                }
            }

            DB::commit();

            // Fire SubscriptionCreated event
            event(new \App\Events\SubscriptionCreated($subscription));

            return response()->json([
                'success' => true,
                'message' => $isTrial
                    ? 'Trial subscription activated successfully'
                    : 'Subscription created. Please proceed with payment.',
                'data' => $subscription->load(['subscriptionPlan', 'subscriptionPlanPrice']),
                'requires_payment' => !$isTrial,
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
        $user = Auth::user();

        // Employee roles need to check their business owner's subscription
        $isEmployeeRole = in_array($user->role, ['kasir', 'kitchen', 'waiter', 'admin']);

        if ($isEmployeeRole) {
            // ✅ FIX: Don't use cache for now to ensure fresh data when subscription features are changed
            // Cache key for employee subscription check (5 minutes cache)
            // $cacheKey = "subscription:employee:{$user->id}";
            // Cache::forget($cacheKey);
            
            // $result = Cache::remember($cacheKey, 300, function() use ($user) {
            $result = (function() use ($user) {
            // Get employee's business and check owner's subscription
            $employee = \App\Models\Employee::where('user_id', $user->id)
                ->where('is_active', true)
                ->with(['business.owner.subscriptions' => function($query) {
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
            
            // ✅ NEW: Check has_reports_access first (configurable from Filament), fallback to has_advanced_reports
            $hasReportsAccess = isset($plan->has_reports_access) 
                ? $plan->has_reports_access 
                : ($plan->has_advanced_reports ?? false);
            
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
                'is_trial' => $activeSubscription->is_trial,
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
        // ✅ FIX: Don't use cache for now to ensure fresh data
        // $cacheKey = "subscription:user:{$user->id}";
        // Cache::forget($cacheKey);
        
        $subscription = UserSubscription::with(['subscriptionPlan', 'subscriptionPlanPrice'])
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'pending_payment'])
            ->latest()
            ->first();

        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'No active subscription found',
                'has_subscription' => false,
            ], 404);
        }

        // Check if subscription is still active (not expired)
        $isActive = $subscription->isActive();
        $daysRemaining = $subscription->daysRemaining();
        $isPendingPayment = $subscription->status === 'pending_payment';

        // Get subscription plan features
        $plan = $subscription->subscriptionPlan;
        
        // ✅ NEW: Check has_reports_access first (configurable from Filament), fallback to has_advanced_reports
        $hasReportsAccess = isset($plan->has_reports_access) 
            ? $plan->has_reports_access 
            : ($plan->has_advanced_reports ?? false);
        
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
            'is_trial' => $subscription->is_trial,
            'trial_ended' => $subscription->isTrialEnded(),
            'plan_features' => $planFeatures, // ✅ NEW: Include subscription plan features
        ]);
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
            // If Midtrans rejects duplicate order_id, we'll handle it in the error
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

        $newPlan = SubscriptionPlan::findOrFail($request->subscription_plan_id);
        $newPrice = SubscriptionPlanPrice::findOrFail($request->subscription_plan_price_id);

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
            // Calculate upgrade options
            $upgradeOptions = $this->calculateUpgradeOptions($currentSubscription, $newPrice);

            // For now, use the first option (prorated) as default
            $selectedOption = $upgradeOptions['prorated'];

            $startsAt = Carbon::now();
            $endsAt = $selectedOption['ends_at'];
            $amountToPay = $selectedOption['amount_to_pay'];
            $creditAmount = $selectedOption['credit_amount'];

            Log::info('Calculated upgrade details', [
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'duration_months' => $newPrice->duration_months,
                'amount_to_pay' => $amountToPay,
                'credit_amount' => $creditAmount,
            ]);

            // ✅ FIX: Determine if payment is required
            $requiresPayment = $amountToPay > 0;
            $subscriptionStatus = $requiresPayment ? 'pending_payment' : 'active';

            // Mark old subscription as upgraded
            $currentSubscription->update([
                'status' => 'upgraded',
                'notes' => ($currentSubscription->notes ?? '') . ' | Upgraded to ' . $newPlan->name . ' at ' . Carbon::now(),
            ]);

            // Create new subscription
            $oldPlanName = $currentSubscription->subscriptionPlan ? $currentSubscription->subscriptionPlan->name : 'Previous Plan';
            $subscriptionCode = 'SUB-' . strtoupper(Str::random(10));

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
                'notes' => 'Upgraded from ' . $oldPlanName . ' (Prorated: ' . $creditAmount . ' credit applied)',
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

            return response()->json([
                'success' => true,
                'message' => $requiresPayment 
                    ? 'Upgrade berhasil dibuat. Silakan lakukan pembayaran untuk mengaktifkan paket.'
                    : 'Subscription upgraded and activated successfully!',
                'data' => $newSubscription->load(['subscriptionPlan', 'subscriptionPlanPrice']),
                'requires_payment' => $requiresPayment, // ✅ FIX: Return true if payment required
                'snap_token' => $snapToken, // ✅ FIX: Return snap token for payment
                'client_key' => config('midtrans.client_key'),
                'amount_to_pay' => $amountToPay,
                'credit_amount' => $creditAmount,
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

        // Get new plan and price
        $newPlan = SubscriptionPlan::findOrFail($planId);
        $newPrice = SubscriptionPlanPrice::findOrFail($priceId);

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

        // Find latest pending subscription
        $subscription = UserSubscription::where('user_id', $user->id)
            ->where('status', 'pending_payment')
            ->latest()
            ->first();

        if (!$subscription) {
            // Check if already have active subscription
            $activeSubscription = UserSubscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->where('ends_at', '>', now())
                ->latest()
                ->first();

            if ($activeSubscription) {
                return response()->json([
                    'success' => true,
                    'already_active' => true,
                    'message' => 'Subscription already active',
                    'data' => $activeSubscription->load(['subscriptionPlan', 'subscriptionPlanPrice']),
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No pending subscription found',
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
     * Calculate upgrade options with prorated billing
     */
    private function calculateUpgradeOptions($currentSubscription, $newPrice)
    {
        $now = Carbon::now();
        $currentEndsAt = $currentSubscription->ends_at;
        $currentStartsAt = $currentSubscription->starts_at;
        $currentAmountPaid = $currentSubscription->amount_paid;

        // Calculate remaining time
        $remainingDays = $now->diffInDays($currentEndsAt, false);
        $totalDays = $currentStartsAt->diffInDays($currentEndsAt);
        $usedDays = $totalDays - $remainingDays;

        // Round remaining days to 1 decimal place for display
        $remainingDaysRounded = round($remainingDays, 1);

        // Calculate credit amount (proportional to remaining time)
        $creditAmount = 0;
        if ($remainingDays > 0 && $totalDays > 0) {
            $creditAmount = ($remainingDays / $totalDays) * $currentAmountPaid;
        }

        // Calculate new end date (add remaining days to new subscription)
        $newEndsAt = $now->copy()->addMonths($newPrice->duration_months);
        if ($remainingDays > 0) {
            $newEndsAt->addDays($remainingDays);
        }

        // Option 1: Prorated (with credit)
        $proratedAmount = max(0, $newPrice->final_price - $creditAmount);

        // Option 2: Full payment (no credit, but extend duration)
        $fullAmount = $newPrice->final_price;

        // Option 3: Discounted upgrade (10% discount)
        $discountAmount = $newPrice->final_price * 0.1;
        $discountedAmount = $newPrice->final_price - $discountAmount;

        return [
            'prorated' => [
                'type' => 'prorated',
                'label' => 'Upgrade dengan Credit',
                'description' => 'Gunakan sisa waktu sebagai credit',
                'amount_to_pay' => $proratedAmount,
                'credit_amount' => $creditAmount,
                'ends_at' => $newEndsAt,
                'savings' => $creditAmount,
                'is_recommended' => true,
            ],
            'full' => [
                'type' => 'full',
                'label' => 'Upgrade Full + Extension',
                'description' => 'Bayar full, sisa waktu ditambahkan',
                'amount_to_pay' => $fullAmount,
                'credit_amount' => 0,
                'ends_at' => $newEndsAt,
                'savings' => 0,
                'is_recommended' => false,
            ],
            'discount' => [
                'type' => 'discount',
                'label' => 'Upgrade dengan Diskon 10%',
                'description' => 'Diskon khusus untuk upgrade',
                'amount_to_pay' => $discountedAmount,
                'credit_amount' => 0,
                'ends_at' => $now->copy()->addMonths($newPrice->duration_months),
                'savings' => $discountAmount,
                'is_recommended' => false,
            ],
            'summary' => [
                'current_plan' => $currentSubscription->subscriptionPlan->name,
                'new_plan' => $newPrice->subscriptionPlan->name,
                'remaining_days' => $remainingDaysRounded,
                'total_days' => $totalDays,
                'used_days' => $usedDays,
                'current_amount' => $currentAmountPaid,
                'new_plan_price' => $newPrice->final_price,
            ]
        ];
    }
}
