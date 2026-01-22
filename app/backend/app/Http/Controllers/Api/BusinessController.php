<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\SubscriptionPlan;
use App\Models\UserSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class BusinessController extends Controller
{
    /**
     * Get all businesses for the authenticated user
     */
    public function index()
    {
        $user = auth()->user();

        // ✅ OPTIMIZATION: Use union query instead of orWhereHas for better performance
        // Get business IDs from different sources
        $businessIds = collect();
        
        // 1. Businesses where user is owner
        $ownerBusinessIds = Business::where('owner_id', $user->id)->pluck('id');
        $businessIds = $businessIds->merge($ownerBusinessIds);
        
        // 2. Businesses from business_users pivot table
        $memberBusinessIds = DB::table('business_users')
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->pluck('business_id');
        $businessIds = $businessIds->merge($memberBusinessIds);
        
        // 3. Businesses from employees table (for kasir, kitchen, waiter, admin)
        $employeeBusinessIds = DB::table('employees')
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->pluck('business_id');
        $businessIds = $businessIds->merge($employeeBusinessIds);
        
        // Get unique business IDs
        $uniqueBusinessIds = $businessIds->unique()->values()->all();
        
        // Fetch businesses with relationships
        $businesses = Business::whereIn('id', $uniqueBusinessIds)
            ->with(['owner', 'outlets', 'currentSubscription.subscriptionPlan', 'businessType'])
            ->get();

        // Add subscription info to each business
        $businesses->transform(function($business) {
            // Load business type relationship
            $business->load('businessType');

            if ($business->currentSubscription) {
                $business->subscription_info = [
                    'status' => $business->currentSubscription->status,
                    'is_trial' => $business->currentSubscription->is_trial,
                    'days_remaining' => $business->currentSubscription->daysRemaining(),
                    'plan_name' => $business->currentSubscription->subscriptionPlan->name ?? 'Unknown',
                    'ends_at' => $business->currentSubscription->ends_at,
                ];
            } else {
                $business->subscription_info = null;
            }
            return $business;
        });

        return response()->json($businesses)
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    /**
     * Get current selected business
     */
    public function current(Request $request)
    {
        $user = auth()->user();
        $businessId = $request->header('X-Business-Id');

        // If no business ID provided, try to get from user's employee record
        if (!$businessId) {
            // Check if user is an employee (kasir, kitchen, waiter, admin)
            if (in_array($user->role, ['kasir', 'kitchen', 'waiter', 'admin'])) {
                $employee = \App\Models\Employee::where('user_id', $user->id)
                    ->where('is_active', true)
                    ->first();

                if ($employee && $employee->business_id) {
                    $businessId = $employee->business_id;
                } else {
                    // Return empty response instead of 404 for better UX
                    return response()->json([
                        'success' => false,
                        'message' => 'No business assigned to employee',
                        'data' => null
                    ], 200); // Changed from 404 to 200 with success: false
                }
            } else {
                // For owners, try to get their first business
                $business = Business::where('owner_id', $user->id)->first();
                if ($business) {
                    return response()->json($business->load(['owner', 'outlets', 'businessType']));
                }
                // Return empty response instead of 404 for better UX
                // Frontend will handle this as "no business yet" instead of error
                return response()->json([
                    'success' => false,
                    'message' => 'No business found',
                    'data' => null
                ], 200); // Changed from 404 to 200 with success: false
            }
        }

        $business = Business::with(['owner', 'outlets', 'businessType'])->find($businessId);

        if (!$business) {
            // Return empty response instead of 404 for better UX
            return response()->json([
                'success' => false,
                'message' => 'Business not found',
                'data' => null
            ], 200); // Changed from 404 to 200 with success: false
        }

        // Check if user has access to this business
        $hasAccess = $business->owner_id === $user->id ||
                     $business->users()->where('business_users.user_id', $user->id)->where('business_users.is_active', true)->exists();

        // Also check if user is an employee of this business
        if (!$hasAccess && in_array($user->role, ['kasir', 'kitchen', 'waiter', 'admin'])) {
            $hasAccess = \App\Models\Employee::where('user_id', $user->id)
                ->where('business_id', $business->id)
                ->where('is_active', true)
                ->exists();
        }

        if (!$hasAccess) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($business);
    }

    /**
     * Create a new business
     */
    public function store(Request $request)
    {
        $user = auth()->user();
        
        // Reload user to get latest data
        $user->refresh();

        // Check if user profile is complete before creating business
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
        
        // ✅ FIX: Check if WhatsApp is verified (check both sources)
        // 1. Check whatsapp_verified_at in User model (set during registration)
        // 2. Check WhatsappVerification table (OTP verification)
        if (!empty($user->phone)) {
            $isVerified = false;
            
            // Priority 1: Check whatsapp_verified_at (set during registration)
            if ($user->whatsapp_verified_at) {
                $isVerified = true;
                \Log::info('WhatsApp verified via whatsapp_verified_at', [
                    'user_id' => $user->id,
                    'phone' => $user->phone,
                    'verified_at' => $user->whatsapp_verified_at,
                ]);
            } else {
                // Priority 2: Check WhatsappVerification table (OTP verification)
                $isVerified = \App\Models\WhatsappVerification::isPhoneVerified($user->phone);
                if ($isVerified) {
                    \Log::info('WhatsApp verified via WhatsappVerification table', [
                        'user_id' => $user->id,
                        'phone' => $user->phone,
                    ]);
                }
            }
            
            if (!$isVerified) {
                $profileErrors[] = 'Nomor WhatsApp belum diverifikasi. Silakan verifikasi nomor WhatsApp Anda terlebih dahulu.';
            }
        }
        
        if (!empty($profileErrors)) {
            return response()->json([
                'error' => 'Profil owner belum lengkap',
                'errors' => $profileErrors,
                'requires_profile_completion' => true,
                'missing_fields' => [
                    'name' => empty($user->name),
                    'phone' => empty($user->phone),
                    'address' => empty($user->address),
                    'whatsapp_verified' => !empty($user->phone) && (
                        $user->whatsapp_verified_at || 
                        \App\Models\WhatsappVerification::isPhoneVerified($user->phone)
                    ),
                ],
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20|regex:/^(\+62|62|0)[0-9]{9,12}$/',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string|max:50',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'logo' => 'nullable|string',
            'business_type_id' => 'nullable|exists:business_types,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            // ✅ IMPORTANT: Check if user already has an active subscription (from paid plan)
            $existingSubscription = UserSubscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->where('ends_at', '>', now())
                ->latest()
                ->first();

            $subscription = null;

            if ($existingSubscription) {
                // ✅ User already paid for subscription, use that one!
                $subscription = $existingSubscription;

                \Log::info('Using existing paid subscription for business', [
                    'user_id' => $user->id,
                    'subscription_id' => $subscription->id,
                    'plan' => $subscription->subscriptionPlan->name ?? 'Unknown',
                    'is_trial' => $subscription->is_trial,
                ]);
                
                // ✅ NEW: Check subscription plan limits for max_businesses
                $subscriptionPlan = $subscription->subscriptionPlan;
                $currentBusinessCount = Business::where('owner_id', $user->id)->count();
                
                // Check max_businesses limit (-1 means unlimited, null defaults to 1)
                $maxBusinesses = $subscriptionPlan->max_businesses ?? 1;
                if ($maxBusinesses !== -1 && $currentBusinessCount >= $maxBusinesses) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'error' => 'subscription_limit_reached',
                        'message' => sprintf(
                            'Batas paket %s tercapai! Anda hanya bisa membuat %s bisnis. Saat ini Anda sudah memiliki %d bisnis.',
                            $subscriptionPlan->name ?? 'Current',
                            $maxBusinesses === -1 ? 'unlimited' : $maxBusinesses,
                            $currentBusinessCount
                        ),
                        'upgrade_message' => 'Upgrade paket subscription Anda untuk menambahkan lebih banyak bisnis dan fitur premium lainnya!',
                        'limits' => [
                            'max_businesses' => $maxBusinesses,
                            'current_businesses' => $currentBusinessCount,
                        ],
                        'action' => 'upgrade_subscription',
                        'upgrade_url' => '/subscription-settings'
                    ], 403);
                }
            } else {
                // ❌ REMOVED: Auto-activation of pending_payment subscriptions
                // This was a security vulnerability - users could get paid subscriptions without payment
                // Paid subscriptions MUST be activated only through payment gateway webhook verification
                
                // Check if user has pending payment subscription
                $pendingSubscription = UserSubscription::where('user_id', $user->id)
                    ->where('status', 'pending_payment')
                    ->latest()
                    ->first();

                if ($pendingSubscription) {
                    // ❌ SECURITY FIX: Don't auto-activate pending payment subscriptions
                    // User must complete payment first through payment gateway
                    \Log::warning('User tried to create business with pending payment subscription', [
                        'user_id' => $user->id,
                        'subscription_id' => $pendingSubscription->id,
                        'subscription_code' => $pendingSubscription->subscription_code,
                        'message' => 'Payment must be completed before business creation',
                    ]);

			return response()->json([
			    'error' => 'Anda memiliki subscription yang belum dibayar. Silakan selesaikan pembayaran terlebih dahulu sebelum membuat bisnis.',
			    'requires_payment' => true,
			    'redirect_to' => '/subscription-plans',
			    'subscription_code' => $pendingSubscription->subscription_code,
			], 400);

                }

                // ✅ No existing subscription, check if user can use trial
                // Check if user has ever used trial before (prevent trial abuse)
                    $hasUsedTrial = UserSubscription::where('user_id', $user->id)
                        ->where('is_trial', true)
                        ->exists();

                    if ($hasUsedTrial) {
                        return response()->json([
                            'error' => 'Anda sudah pernah menggunakan trial sebelumnya. Silakan pilih paket berbayar untuk melanjutkan.',
                            'requires_subscription' => true,
                        ], 400);
                    }

                    // ✅ User can use trial, create trial subscription
                    $trialPlan = SubscriptionPlan::where('slug', 'trial-7-days')->first();

                    if (!$trialPlan) {
                        return response()->json(['error' => 'Free trial plan not found. Please run subscription seeder.'], 500);
                    }
                    
                    // ✅ NEW: Check trial plan limits for max_businesses
                    $currentBusinessCount = Business::where('owner_id', $user->id)->count();
                    
                    // Check max_businesses limit (-1 means unlimited, null defaults to 1)
                    $maxBusinesses = $trialPlan->max_businesses ?? 1;
                    if ($maxBusinesses !== -1 && $currentBusinessCount >= $maxBusinesses) {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'error' => 'subscription_limit_reached',
                            'message' => sprintf(
                                'Batas paket %s tercapai! Anda hanya bisa membuat %s bisnis. Saat ini Anda sudah memiliki %d bisnis.',
                                $trialPlan->name ?? 'Trial',
                                $maxBusinesses === -1 ? 'unlimited' : $maxBusinesses,
                                $currentBusinessCount
                            ),
                            'upgrade_message' => 'Upgrade paket subscription Anda untuk menambahkan lebih banyak bisnis dan fitur premium lainnya!',
                            'limits' => [
                                'max_businesses' => $maxBusinesses,
                                'current_businesses' => $currentBusinessCount,
                            ],
                            'action' => 'upgrade_subscription',
                            'upgrade_url' => '/subscription-settings'
                        ], 403);
                    }

                    $trialPrice = $trialPlan->prices()->where('duration_type', 'monthly')->first();

                    // Create trial subscription (7 days)
                    $subscription = UserSubscription::create([
                        'user_id' => $user->id,
                        'subscription_plan_id' => $trialPlan->id,
                        'subscription_plan_price_id' => $trialPrice->id,
                        'subscription_code' => 'TRIAL-' . strtoupper(Str::random(10)),
                        'status' => 'active',
                        'amount_paid' => 0,
                        'starts_at' => now(),
                        'ends_at' => now()->addDays(7),
                        'trial_ends_at' => now()->addDays(7),
                        'is_trial' => true,
                        'plan_features' => json_encode([
                            'max_businesses' => $trialPlan->max_businesses ?? 1,
                            'max_outlets' => $trialPlan->max_outlets,
                            'max_products' => $trialPlan->max_products,
                            'max_employees' => $trialPlan->max_employees,
                        ]),
                    ]);

                    \Log::info('Created new trial subscription for business', [
                        'user_id' => $user->id,
                        'subscription_id' => $subscription->id,
                    ]);
            }

            // Format phone number if provided (optional, use user phone as fallback)
            $phone = $request->phone ? $this->formatPhoneNumber($request->phone) : $user->phone;
            $email = $request->email ?? $user->email;
            $address = $request->address ?? $user->address;

            // Create business
            $business = Business::create([
                'owner_id' => $user->id,
                'current_subscription_id' => $subscription->id,
                'business_type_id' => $request->business_type_id,
                'name' => $request->name,
                'slug' => Str::slug($request->name) . '-' . Str::random(6),
                'email' => $email,
                'phone' => $phone, // Use business phone or fallback to user phone
                'address' => $address, // Use business address or fallback to user address
                'tax_number' => $request->tax_number,
                'tax_rate' => $request->tax_rate ?? 0,
                'logo' => $request->logo,
                'currency' => 'IDR',
                'status' => 'active',
                'subscription_expires_at' => $subscription->ends_at, // ✅ Use subscription end date
            ]);

            \Log::info('Business created successfully', [
                'business_id' => $business->id,
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'subscription_status' => $subscription->status,
            ]);

            // Add owner to business_users with admin role
            $business->users()->attach($user->id, [
                'role' => 'admin',
                'is_active' => true,
                'joined_at' => now(),
            ]);

            // ✅ FIX: Outlet creation is handled by BusinessObserver automatically
            // No need to create outlet here to prevent duplicate creation
            // The observer will create the default outlet when Business is created
            
            DB::commit();

            // Load subscription info and business type
            $business->load(['owner', 'outlets', 'currentSubscription.subscriptionPlan', 'businessType']);
            if ($business->currentSubscription) {
                $business->subscription_info = [
                    'status' => $business->currentSubscription->status,
                    'is_trial' => $business->currentSubscription->is_trial,
                    'days_remaining' => $business->currentSubscription->daysRemaining(),
                    'plan_name' => $business->currentSubscription->subscriptionPlan->name ?? 'Unknown',
                    'ends_at' => $business->currentSubscription->ends_at,
                ];
            }

            return response()->json($business, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to create business: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create business: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Show a specific business
     */
    public function show(Business $business)
    {
        $user = auth()->user();

        // Check if user has access to this business
        $hasAccess = $business->owner_id === $user->id ||
                     $business->users()->where('business_users.user_id', $user->id)->where('business_users.is_active', true)->exists();

        // Also check if user is an employee of this business
        if (!$hasAccess && in_array($user->role, ['kasir', 'kitchen', 'waiter', 'admin'])) {
            $hasAccess = \App\Models\Employee::where('user_id', $user->id)
                ->where('business_id', $business->id)
                ->where('is_active', true)
                ->exists();
        }

        if (!$hasAccess) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($business->load(['owner', 'outlets']));
    }

    /**
     * Update a business
     */
    public function update(Request $request, Business $business)
    {
        $user = auth()->user();

        // Only owner or admin can update
        if ($business->owner_id !== $user->id) {
            $userRole = $business->users()->where('user_id', $user->id)->first()?->pivot->role;
            if ($userRole !== 'admin') {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string|max:50',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'logo' => 'nullable|string',
            'business_type_id' => 'nullable|exists:business_types,id',
            'settings' => 'nullable|array',
            'settings.require_attendance_for_pos' => 'nullable|boolean',
            'midtrans_config' => 'nullable|array',
            'midtrans_config.server_key' => 'nullable|string|max:255',
            'midtrans_config.client_key' => 'nullable|string|max:255',
            'midtrans_config.is_production' => 'nullable|boolean',
            'midtrans_config.is_sanitized' => 'nullable|boolean',
            'midtrans_config.is_3ds' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updateData = $request->only(['name', 'email', 'phone', 'address', 'tax_number', 'tax_rate', 'logo', 'business_type_id', 'settings', 'midtrans_config']);

        if ($request->has('name')) {
            $updateData['slug'] = Str::slug($request->name) . '-' . Str::random(6);
        }

        // ✅ NEW: Handle settings update - merge with existing settings
        if ($request->has('settings')) {
            // ✅ FIX: Handle null settings properly
            $existingSettings = $business->settings;
            if ($existingSettings === null || !is_array($existingSettings)) {
                $existingSettings = [];
            }
            
            $newSettings = $request->settings;
            if (!is_array($newSettings)) {
                $newSettings = [];
            }
            
            // ✅ FIX: Convert boolean values explicitly to ensure they're stored correctly
            if (isset($newSettings['require_attendance_for_pos'])) {
                $newSettings['require_attendance_for_pos'] = filter_var(
                    $newSettings['require_attendance_for_pos'], 
                    FILTER_VALIDATE_BOOLEAN
                );
            }
            
            // ✅ FIX: Merge settings and ensure it's always an array (not null)
            $mergedSettings = array_merge($existingSettings, $newSettings);
            // ✅ FIX: Always save settings as array, even if empty (to ensure it's not null)
            $updateData['settings'] = $mergedSettings;
            
            // ✅ DEBUG: Log settings update
            Log::info('Updating business settings', [
                'business_id' => $business->id,
                'existing_settings' => $existingSettings,
                'new_settings' => $newSettings,
                'merged_settings' => $updateData['settings'],
                'require_attendance_for_pos' => $updateData['settings']['require_attendance_for_pos'] ?? false,
            ]);
        } else {
            // ✅ FIX: If settings not in request, ensure existing settings are preserved
            // Don't overwrite with null
            if ($business->settings !== null) {
                $updateData['settings'] = $business->settings;
            }
        }

        // Handle midtrans_config - only update if provided
        if ($request->has('midtrans_config')) {
            $midtransConfig = $request->midtrans_config;
            
            // If midtrans_config is empty object or null, clear it
            if (empty($midtransConfig) || (empty($midtransConfig['server_key']) && empty($midtransConfig['client_key']))) {
                $updateData['midtrans_config'] = null;
            } else {
                // Validate that server_key and client_key are provided together
                if (empty($midtransConfig['server_key']) || empty($midtransConfig['client_key'])) {
                    return response()->json([
                        'errors' => [
                            'midtrans_config' => ['Server Key dan Client Key harus diisi bersamaan']
                        ]
                    ], 422);
                }
                
                // Set defaults for optional fields
                $updateData['midtrans_config'] = [
                    'server_key' => $midtransConfig['server_key'],
                    'client_key' => $midtransConfig['client_key'],
                    'is_production' => $midtransConfig['is_production'] ?? false,
                    'is_sanitized' => $midtransConfig['is_sanitized'] ?? true,
                    'is_3ds' => $midtransConfig['is_3ds'] ?? true,
                ];
            }
        }

        $business->update($updateData);

        return response()->json($business->load(['owner', 'outlets', 'businessType']));
    }

    /**
     * Delete a business
     */
    public function destroy(Business $business)
    {
        $user = auth()->user();

        // Only owner can delete
        if ($business->owner_id !== $user->id) {
            return response()->json(['message' => 'Only business owner can delete'], 403);
        }

        $business->delete();

        return response()->json(['message' => 'Business deleted successfully']);
    }

    /**
     * Switch to a business (set as current context)
     */
    public function switch(Request $request, Business $business)
    {
        $user = auth()->user();

        // Check if user has access to this business
        $hasAccess = $business->owner_id === $user->id ||
                     $business->users()->where('business_users.user_id', $user->id)->where('business_users.is_active', true)->exists();

        // Also check if user is an employee of this business
        if (!$hasAccess && in_array($user->role, ['kasir', 'kitchen', 'waiter', 'admin'])) {
            $hasAccess = \App\Models\Employee::where('user_id', $user->id)
                ->where('business_id', $business->id)
                ->where('is_active', true)
                ->exists();
        }

        if (!$hasAccess) {
            return response()->json(['message' => 'You don\'t have access to this business'], 403);
        }

        return response()->json([
            'message' => 'Business switched successfully',
            'business' => $business->load(['owner', 'outlets'])
        ]);
    }

    /**
     * Get subscription limits for current business
     */
    public function getSubscriptionLimits(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['error' => 'Business ID required'], 400);
        }

        $business = Business::with('currentSubscription.subscriptionPlan')->find($businessId);

        if (!$business) {
            return response()->json(['error' => 'Business not found'], 404);
        }

        return response()->json($business->getSubscriptionLimits());
    }

    /**
     * Format phone number to standard format (62xxxxxxxxxx)
     */
    private function formatPhoneNumber(string $phone): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Convert to 62 format
        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        } elseif (substr($phone, 0, 2) !== '62') {
            $phone = '62' . $phone;
        }
        
        return $phone;
    }
}
// Updated Sat Jan 17 02:48:26 UTC 2026
// Test Sat Jan 17 02:49:52 UTC 2026
