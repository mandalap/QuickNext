<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class OutletController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['error' => 'Business ID required'], 400);
        }

        // ✅ FIX: Validate that user has access to this business
        $business = \App\Models\Business::find($businessId);

        if (!$business) {
            return response()->json(['error' => 'Business not found'], 404);
        }

        // ✅ FIX: Check if user owns this business or has access to it
        $hasAccess = false;

        if ($user->role === 'super_admin') {
            $hasAccess = true;
        } elseif ($user->role === 'owner') {
            // Owner can only access their own businesses
            $hasAccess = $business->owner_id === $user->id;
        } else {
            // For other roles (admin, kasir, kitchen, waiter), check if user is assigned to this business
            // Check via employees table
            $employee = \App\Models\Employee::where('user_id', $user->id)
                ->where('business_id', $businessId)
                ->where('is_active', true)
                ->first();

            if ($employee) {
                $hasAccess = true;
            } else {
                // Also check business_users pivot table
                $hasAccess = $business->users()->where('user_id', $user->id)->exists();
            }
        }

        if (!$hasAccess) {
            \Log::warning('Unauthorized outlet access attempt', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'business_id' => $businessId,
                'business_owner_id' => $business->owner_id,
            ]);
            return response()->json(['error' => 'Unauthorized: You do not have access to this business'], 403);
        }

        // ✅ FIX: Only return outlets for the business the user has access to
        $outlets = Outlet::where('business_id', $businessId)
            ->with('business.businessType', 'businessType') // Load both outlet's own type and business type
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($outlets);
    }

    public function store(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['error' => 'Business ID required'], 400);
        }

        // Check subscription limit
        $business = \App\Models\Business::with('currentSubscription.subscriptionPlan')->find($businessId);
        if (!$business) {
            return response()->json(['error' => 'Business not found'], 404);
        }

        if (!$business->canCreateOutlet()) {
            $limits = $business->getSubscriptionLimits();
            $currentPlan = $business->currentSubscription->subscriptionPlan->name ?? 'Current';

            return response()->json([
                'success' => false,
                'error' => 'subscription_limit_reached',
                'message' => sprintf(
                    'Limit outlet yang Anda beli sudah habis! Paket %s Anda hanya mencakup %s outlet. Saat ini Anda sudah menggunakan %d outlet dari semua bisnis Anda.',
                    $currentPlan,
                    $limits['max_outlets'] === -1 ? 'unlimited' : $limits['max_outlets'],
                    $limits['current_outlets']
                ),
                'upgrade_message' => 'Tingkatkan paket Anda sekarang untuk mengelola lebih banyak outlet dan membuka akses ke fitur premium yang akan membantu bisnis Anda berkembang lebih cepat! 🚀',
                'limits' => $limits,
                'action' => 'upgrade_subscription',
                'upgrade_url' => '/subscription-settings'
            ], 403);
        }

        // ✅ NEW: Check subscription feature for self service (requires has_self_service_access)
        if ($request->has('self_service_enabled') && $request->self_service_enabled) {
            if ($business->currentSubscription && $business->currentSubscription->subscriptionPlan) {
                $plan = $business->currentSubscription->subscriptionPlan;
                // Self Service requires has_self_service_access feature
                if (!($plan->has_self_service_access ?? false)) {
                    return response()->json([
                        'success' => false,
                        'error' => 'subscription_feature_required',
                        'message' => 'Fitur Self Service memerlukan paket subscription yang memiliki akses ke fitur Self Service. Silakan upgrade paket Anda.',
                        'required_feature' => 'has_self_service_access',
                        'action' => 'upgrade_subscription',
                        'upgrade_url' => '/subscription-settings'
                    ], 403);
                }
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'subscription_required',
                    'message' => 'Fitur Self Service memerlukan paket subscription aktif. Silakan berlangganan paket yang sesuai.',
                    'action' => 'subscribe',
                    'subscribe_url' => '/subscription-plans'
                ], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:outlets,code',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'logo' => 'nullable|string',
            'is_active' => 'boolean',
            'self_service_enabled' => 'boolean',
            'business_type_id' => 'nullable|exists:business_types,id',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'attendance_radius' => 'nullable|integer|min:10|max:1000',
            'shift_pagi_start' => 'nullable|date_format:H:i',
            'shift_pagi_end' => 'nullable|date_format:H:i',
            'shift_siang_start' => 'nullable|date_format:H:i',
            'shift_siang_end' => 'nullable|date_format:H:i',
            'shift_malam_start' => 'nullable|date_format:H:i',
            'shift_malam_end' => 'nullable|date_format:H:i',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $outletData = array_merge($request->all(), [
            'business_id' => $businessId,
        ]);

        // Ensure code is uppercase
        if (isset($outletData['code'])) {
            $outletData['code'] = strtoupper($outletData['code']);
        }

        // Generate slug if not provided
        if (empty($outletData['slug']) && !empty($outletData['name'])) {
            $slug = \Illuminate\Support\Str::slug($outletData['name']);
            $originalSlug = $slug;
            $counter = 1;

            // Ensure unique slug
            while (\App\Models\Outlet::where('slug', $slug)->where('id', '!=', $outletData['id'] ?? 0)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }

            $outletData['slug'] = $slug;
        }

        // Convert time format from "HH:mm" to "H:i:s" for database storage
        $timeFields = [
            'shift_pagi_start', 'shift_pagi_end',
            'shift_siang_start', 'shift_siang_end',
            'shift_malam_start', 'shift_malam_end'
        ];

        foreach ($timeFields as $field) {
            if (isset($outletData[$field]) && $outletData[$field]) {
                // If format is "HH:mm", convert to "HH:mm:00"
                if (preg_match('/^(\d{1,2}):(\d{2})$/', $outletData[$field], $matches)) {
                    $outletData[$field] = sprintf('%02d:%02d:00', (int)$matches[1], (int)$matches[2]);
                }
            }
        }

        $outlet = Outlet::create($outletData);

        // Load business relationship and business type
        $outlet->load('business.businessType', 'businessType');

        return response()->json($outlet, 201);
    }

    public function show(Request $request, Outlet $outlet)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only view outlets from their business
        if ($outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Load business relationship and business type
        $outlet->load('business.businessType', 'businessType');

        return response()->json($outlet);
    }

    public function update(Request $request, Outlet $outlet)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only update outlets from their business
        if ($outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:outlets,code,' . $outlet->id,
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'logo' => 'nullable|string',
            'is_active' => 'boolean',
            'self_service_enabled' => 'boolean',
            'attendance_face_id_required' => 'boolean',
            'attendance_gps_required' => 'boolean',
            'business_type_id' => 'nullable|exists:business_types,id',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'attendance_radius' => 'nullable|integer|min:10|max:1000',
            'shift_pagi_start' => 'nullable|date_format:H:i',
            'shift_pagi_end' => 'nullable|date_format:H:i',
            'shift_siang_start' => 'nullable|date_format:H:i',
            'shift_siang_end' => 'nullable|date_format:H:i',
            'shift_malam_start' => 'nullable|date_format:H:i',
            'shift_malam_end' => 'nullable|date_format:H:i',
        ]);
        
        // ✅ NEW: Only owner can update attendance_face_id_required and attendance_gps_required
        $user = $request->user();
        if (($request->has('attendance_face_id_required') || $request->has('attendance_gps_required')) && !in_array($user->role, ['super_admin', 'owner'])) {
            return response()->json([
                'success' => false,
                'error' => 'unauthorized',
                'message' => 'Hanya owner yang dapat mengatur wajib FaceID dan GPS untuk absensi'
            ], 403);
        }

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // ✅ NEW: Check subscription feature for self service (requires has_self_service_access)
        if ($request->has('self_service_enabled') && $request->self_service_enabled) {
            $business = \App\Models\Business::with('currentSubscription.subscriptionPlan')->find($businessId);
            if ($business && $business->currentSubscription && $business->currentSubscription->subscriptionPlan) {
                $plan = $business->currentSubscription->subscriptionPlan;
                // Self Service requires has_self_service_access feature
                if (!($plan->has_self_service_access ?? false)) {
                    return response()->json([
                        'success' => false,
                        'error' => 'subscription_feature_required',
                        'message' => 'Fitur Self Service memerlukan paket subscription yang memiliki akses ke fitur Self Service. Silakan upgrade paket Anda.',
                        'required_feature' => 'has_self_service_access',
                        'action' => 'upgrade_subscription',
                        'upgrade_url' => '/subscription-settings'
                    ], 403);
                }
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'subscription_required',
                    'message' => 'Fitur Self Service memerlukan paket subscription aktif. Silakan berlangganan paket yang sesuai.',
                    'action' => 'subscribe',
                    'subscribe_url' => '/subscription-plans'
                ], 403);
            }
        }

        $updateData = $request->all();

        // Ensure code is uppercase
        if (isset($updateData['code'])) {
            $updateData['code'] = strtoupper($updateData['code']);
        }

        // Generate slug if name changed and slug not provided
        if (isset($updateData['name']) && empty($updateData['slug'])) {
            $slug = \Illuminate\Support\Str::slug($updateData['name']);
            $originalSlug = $slug;
            $counter = 1;

            // Ensure unique slug
            while (\App\Models\Outlet::where('slug', $slug)->where('id', '!=', $outlet->id)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }

            $updateData['slug'] = $slug;
        }

        // Convert time format from "HH:mm" to "H:i:s" for database storage
        $timeFields = [
            'shift_pagi_start', 'shift_pagi_end',
            'shift_siang_start', 'shift_siang_end',
            'shift_malam_start', 'shift_malam_end'
        ];

        foreach ($timeFields as $field) {
            if (isset($updateData[$field]) && $updateData[$field]) {
                // If format is "HH:mm", convert to "HH:mm:00"
                if (preg_match('/^(\d{1,2}):(\d{2})$/', $updateData[$field], $matches)) {
                    $updateData[$field] = sprintf('%02d:%02d:00', (int)$matches[1], (int)$matches[2]);
                }
            }
        }

        try {
            $outlet->update($updateData);

            // Load business relationship and business type
            $outlet->load('business.businessType', 'businessType');

            return response()->json($outlet);
        } catch (\Exception $e) {
            \Log::error('Error updating outlet', [
                'outlet_id' => $outlet->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'update_data' => $updateData,
            ]);

            // Check if error is related to missing column
            if (str_contains($e->getMessage(), 'attendance_face_id_required') || 
                str_contains($e->getMessage(), "Unknown column 'attendance_face_id_required'")) {
                return response()->json([
                    'success' => false,
                    'error' => 'database_migration_required',
                    'message' => 'Field attendance_face_id_required belum tersedia. Silakan jalankan migration terlebih dahulu: php artisan migrate',
                ], 500);
            }

            return response()->json([
                'success' => false,
                'error' => 'update_failed',
                'message' => 'Gagal mengupdate outlet: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, Outlet $outlet)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only delete outlets from their business
        if ($outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Check if outlet has any orders
        if ($outlet->orders()->count() > 0) {
            return response()->json([
                'error' => 'Cannot delete outlet with existing orders'
            ], 422);
        }

        $outlet->delete();

        return response()->json(['message' => 'Outlet deleted successfully']);
    }

    /**
     * Update payment gateway configuration for an outlet
     */
    public function updatePaymentGatewayConfig(Request $request, Outlet $outlet)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only update outlets from their business
        if ($outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'gateway' => 'required|string|in:midtrans', // Can add more gateways later
            'server_key' => 'nullable|string', // Changed to nullable - allow update without server_key
            'client_key' => 'required|string',
            'is_production' => 'nullable|boolean',
            'is_sanitized' => 'nullable|boolean',
            'is_3ds' => 'nullable|boolean',
            'enabled' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Get current config or initialize
        $config = $outlet->payment_gateway_config ?? [];
        if (is_string($config)) {
            $config = json_decode($config, true) ?? [];
        }

        // Update the specific gateway config
        $gateway = $request->input('gateway');

        // Get existing server_key if updating and new server_key is not provided
        $existingServerKey = null;
        if (isset($config[$gateway]['server_key'])) {
            $existingServerKey = $config[$gateway]['server_key'];
        }

        // Only update server_key if new one is provided
        $serverKey = $request->input('server_key');
        if (!empty($serverKey) && trim($serverKey) !== '') {
            // New server_key provided, encrypt it
            $serverKey = encrypt($serverKey);
        } elseif ($existingServerKey) {
            // No new server_key provided, keep existing one
            $serverKey = $existingServerKey;
        } else {
            // No server_key at all - this is an error for initial setup
            return response()->json([
                'success' => false,
                'error' => 'Server Key wajib diisi untuk konfigurasi baru'
            ], 422);
        }

        $config[$gateway] = [
            'server_key' => $serverKey,
            'client_key' => $request->input('client_key'),
            'is_production' => $request->input('is_production', false),
            'is_sanitized' => $request->input('is_sanitized', true),
            'is_3ds' => $request->input('is_3ds', true),
            'enabled' => $request->input('enabled'),
            'updated_at' => now()->toIso8601String(),
        ];

        $outlet->payment_gateway_config = $config;
        $outlet->save();

        // Return decrypted server_key for display (masked)
        $responseConfig = $config[$gateway];
        $responseConfig['server_key'] = '***' . substr($request->input('server_key'), -4);

        return response()->json([
            'success' => true,
            'message' => 'Payment gateway configuration updated successfully',
            'data' => [
                'outlet' => $outlet->load('business.businessType', 'businessType'),
                'gateway_config' => $responseConfig
            ]
        ]);
    }

    /**
     * Get payment gateway configuration for an outlet
     */
    public function getPaymentGatewayConfig(Request $request, Outlet $outlet)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only view outlets from their business
        if ($outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $gateway = $request->query('gateway', 'midtrans');

        // Get config
        $config = $outlet->payment_gateway_config ?? [];
        if (is_string($config)) {
            $config = json_decode($config, true) ?? [];
        }

        $gatewayConfig = $config[$gateway] ?? null;

        if ($gatewayConfig) {
            // Decrypt server_key but return masked version
            try {
                $serverKey = decrypt($gatewayConfig['server_key']);
                $gatewayConfig['server_key'] = '***' . substr($serverKey, -4);
                $gatewayConfig['has_server_key'] = true;
            } catch (\Exception $e) {
                $gatewayConfig['server_key'] = null;
                $gatewayConfig['has_server_key'] = false;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'outlet_id' => $outlet->id,
                'outlet_name' => $outlet->name,
                'gateway' => $gateway,
                'config' => $gatewayConfig,
                'is_configured' => !is_null($gatewayConfig)
            ]
        ]);
    }

    /**
     * Delete payment gateway configuration for an outlet
     */
    public function deletePaymentGatewayConfig(Request $request, Outlet $outlet)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only update outlets from their business
        if ($outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $gateway = $request->query('gateway', 'midtrans');

        // Get current config
        $config = $outlet->payment_gateway_config ?? [];
        if (is_string($config)) {
            $config = json_decode($config, true) ?? [];
        }

        // Remove the gateway config
        unset($config[$gateway]);

        $outlet->payment_gateway_config = empty($config) ? null : $config;
        $outlet->save();

        return response()->json([
            'success' => true,
            'message' => 'Payment gateway configuration deleted successfully'
        ]);
    }

    /**
     * Debug endpoint to verify outlet Midtrans configuration
     */
    public function debugMidtransConfig(Request $request, Outlet $outlet)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only view outlets from their business
        if ($outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Get raw database data
        $rawConfig = $outlet->getRawOriginal('payment_gateway_config');

        // Get processed config
        $processedConfig = $outlet->payment_gateway_config;

        // Get Midtrans config using the model method
        $midtransConfig = $outlet->getMidtransConfig();

        // Check if has custom config
        $hasCustomConfig = $outlet->hasCustomMidtransConfig();

        // Try to decrypt server_key for verification
        $decryptedServerKey = null;
        if (isset($processedConfig['midtrans']['server_key'])) {
            try {
                $decryptedServerKey = decrypt($processedConfig['midtrans']['server_key']);
            } catch (\Exception $e) {
                $decryptedServerKey = 'DECRYPT_ERROR: ' . $e->getMessage();
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'outlet_id' => $outlet->id,
                'outlet_name' => $outlet->name,
                'raw_database_config' => $rawConfig,
                'processed_config' => $processedConfig,
                'midtrans_config_from_model' => [
                    'server_key_prefix' => substr($midtransConfig['server_key'] ?? '', 0, 20),
                    'client_key_prefix' => substr($midtransConfig['client_key'] ?? '', 0, 20),
                    'is_production' => $midtransConfig['is_production'] ?? false,
                    'is_sanitized' => $midtransConfig['is_sanitized'] ?? true,
                    'is_3ds' => $midtransConfig['is_3ds'] ?? true,
                ],
                'has_custom_config' => $hasCustomConfig,
                'midtrans_config_details' => isset($processedConfig['midtrans']) ? [
                    'enabled' => $processedConfig['midtrans']['enabled'] ?? false,
                    'is_production' => $processedConfig['midtrans']['is_production'] ?? false,
                    'client_key' => $processedConfig['midtrans']['client_key'] ?? null,
                    'server_key_encrypted' => isset($processedConfig['midtrans']['server_key']),
                    'server_key_decrypted_prefix' => $decryptedServerKey ? substr($decryptedServerKey, 0, 20) : null,
                    'updated_at' => $processedConfig['midtrans']['updated_at'] ?? null,
                ] : null,
            ]
        ]);
    }

    /**
     * Update WhatsApp configuration for an outlet
     */
    public function updateWhatsAppConfig(Request $request, Outlet $outlet)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check online integration access (required for WhatsApp config)
        if (!\App\Helpers\SubscriptionHelper::hasOnlineIntegration($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Konfigurasi WhatsApp memerlukan paket dengan fitur Integrasi Online. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_online_integration',
                'redirect_to' => '/subscription-plans'
            ], 403);
        }

        $businessId = $request->header('X-Business-Id');

        // Ensure user can only update outlets from their business
        if ($outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'whatsapp_provider' => 'nullable|string|in:fonnte,wablas,kirimwa,wablitz',
            'whatsapp_api_key' => 'nullable|string',
            'whatsapp_phone_number' => 'nullable|string|max:20',
            'whatsapp_enabled' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $updateData = [];

        // ✅ FIX: Always update provider if provided (required for WhatsApp to work)
        if ($request->has('whatsapp_provider')) {
            $provider = $request->input('whatsapp_provider');
            // Always save provider if it's a valid string (not empty and not null)
            if (!empty($provider) && is_string($provider)) {
                $updateData['whatsapp_provider'] = trim($provider);
            } else {
                // If provider is empty/null, set to null (will use default when reading)
                $updateData['whatsapp_provider'] = null;
            }
        }

        // Only update API key if provided (and encrypt it)
        if ($request->has('whatsapp_api_key') && !empty($request->input('whatsapp_api_key'))) {
            $apiKey = $request->input('whatsapp_api_key');
            // Encrypt the API key
            $updateData['whatsapp_api_key'] = encrypt($apiKey);
        }

        // Only update phone number if provided
        if ($request->has('whatsapp_phone_number')) {
            $updateData['whatsapp_phone_number'] = $request->input('whatsapp_phone_number');
        }

        // Update enabled status
        $updateData['whatsapp_enabled'] = $request->input('whatsapp_enabled');

        try {
            $outlet->update($updateData);
            // ✅ FIX: Refresh outlet data to get latest values from database
            $outlet->refresh();
        } catch (\Illuminate\Database\QueryException $e) {
            // Check if error is about missing columns
            if (strpos($e->getMessage(), "Unknown column") !== false) {
                return response()->json([
                    'success' => false,
                    'error' => 'Database columns not found. Please run migration: php artisan migrate',
                    'message' => 'WhatsApp configuration columns are missing. Please contact administrator to run database migration.',
                    'details' => $e->getMessage()
                ], 500);
            }
            throw $e;
        }

        // ✅ FIX: Log the actual provider value from database for debugging
        \Log::info('WhatsApp Config Update Response', [
            'outlet_id' => $outlet->id,
            'whatsapp_provider' => $outlet->whatsapp_provider,
            'whatsapp_provider_type' => gettype($outlet->whatsapp_provider),
            'is_null' => is_null($outlet->whatsapp_provider),
            'is_empty' => empty($outlet->whatsapp_provider),
        ]);

        // Return masked API key for display
        $responseData = [
            'outlet_id' => $outlet->id,
            'outlet_name' => $outlet->name,
            'whatsapp_provider' => $outlet->whatsapp_provider, // ✅ FIX: Return actual value, even if null
            'whatsapp_phone_number' => $outlet->whatsapp_phone_number,
            'whatsapp_enabled' => $outlet->whatsapp_enabled,
            'has_api_key' => !empty($outlet->whatsapp_api_key),
        ];

        // If API key was updated, show masked version
        if ($request->has('whatsapp_api_key') && !empty($request->input('whatsapp_api_key'))) {
            $apiKey = $request->input('whatsapp_api_key');
            $responseData['api_key_preview'] = '***' . substr($apiKey, -4);
        }

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp configuration updated successfully',
            'data' => $responseData
        ]);
    }

    /**
     * Get WhatsApp configuration for an outlet
     */
    public function getWhatsAppConfig(Request $request, Outlet $outlet)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check online integration access (required for WhatsApp config)
        if (!\App\Helpers\SubscriptionHelper::hasOnlineIntegration($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Konfigurasi WhatsApp memerlukan paket dengan fitur Integrasi Online. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_online_integration',
                'redirect_to' => '/subscription-plans'
            ], 403);
        }

        $businessId = $request->header('X-Business-Id');

        // Ensure user can only view outlets from their business
        if ($outlet->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $hasApiKey = !empty($outlet->whatsapp_api_key);
        $apiKeyPreview = null;

        if ($hasApiKey) {
            try {
                $decryptedKey = decrypt($outlet->whatsapp_api_key);
                $apiKeyPreview = '***' . substr($decryptedKey, -4);
            } catch (\Exception $e) {
                // If decryption fails, just show that key exists
                $apiKeyPreview = '***';
            }
        }

        // ✅ FIX: Return actual provider from database, don't use fallback
        // If provider is null, frontend will handle it
        $provider = $outlet->whatsapp_provider;

        return response()->json([
            'success' => true,
            'data' => [
                'outlet_id' => $outlet->id,
                'outlet_name' => $outlet->name,
                'whatsapp_provider' => $provider, // Return actual value, even if null
                'whatsapp_phone_number' => $outlet->whatsapp_phone_number,
                'whatsapp_enabled' => $outlet->whatsapp_enabled ?? false,
                'has_api_key' => $hasApiKey,
                'api_key_preview' => $apiKeyPreview,
            ]
        ]);
    }
}
