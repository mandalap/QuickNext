<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Outlet;
use App\Models\OutletSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SettingsController extends Controller
{
    public function getBusiness()
    {
        $business = Business::first();

        return response()->json($business);
    }

    public function updateBusiness(Request $request)
    {
        $business = Business::first();

        if (!$business) {
            return response()->json(['error' => 'Business not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'tax_number' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $business->update($request->all());

        return response()->json($business);
    }

    public function getOutlets()
    {
        $outlets = Outlet::all();

        return response()->json($outlets);
    }

    public function storeOutlet(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $outlet = Outlet::create($request->all());

        return response()->json($outlet, 201);
    }

    public function getPaymentMethods()
    {
        // Assuming payment methods are stored in config or database
        $methods = ['cash', 'card', 'transfer'];

        return response()->json($methods);
    }

    public function updatePaymentMethods(Request $request)
    {
        // Implement update logic
        return response()->json(['message' => 'Payment methods updated']);
    }

    /**
     * Get outlet setting for receipt footer message
     */
    public function getReceiptFooterMessage(Request $request)
    {
        try {
            $outletId = $request->header('X-Outlet-Id');
            
            if (!$outletId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Outlet ID is required'
                ], 400);
            }

            // Validate outlet exists
            $outlet = Outlet::find($outletId);
            if (!$outlet) {
                return response()->json([
                    'success' => false,
                    'message' => 'Outlet tidak ditemukan'
                ], 404);
            }

            $setting = OutletSetting::where('outlet_id', $outletId)
                ->where('setting_key', 'receipt_footer_message')
                ->first();

            $message = $setting ? $setting->setting_value : '';

            return response()->json([
                'success' => true,
                'data' => [
                    'outlet_id' => (int) $outletId,
                    'footer_message' => $message
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('SettingsController: Error getting receipt footer message', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'outlet_id' => $outletId
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server: ' . $e->getMessage(),
                'data' => [
                    'outlet_id' => (int) ($request->header('X-Outlet-Id') ?? 0),
                    'footer_message' => ''
                ]
            ], 500);
        }
    }

    /**
     * Update outlet setting for receipt footer message
     */
    public function updateReceiptFooterMessage(Request $request)
    {
        try {
            $user = $request->user();
            
            // Check if user has admin or owner role
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $allowedRoles = ['super_admin', 'owner', 'admin'];
            if (!in_array($user->role, $allowedRoles)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Admin or Owner role required.',
                    'user_role' => $user->role
                ], 403);
            }

            $outletId = $request->header('X-Outlet-Id');
            
            if (!$outletId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Outlet ID is required'
                ], 400);
            }

            // Validate outlet exists
            $outlet = Outlet::find($outletId);
            if (!$outlet) {
                return response()->json([
                    'success' => false,
                    'message' => 'Outlet tidak ditemukan'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'footer_message' => 'nullable|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $footerMessage = $request->input('footer_message', '');

            $setting = OutletSetting::updateOrCreate(
                [
                    'outlet_id' => $outletId,
                    'setting_key' => 'receipt_footer_message'
                ],
                [
                    'setting_value' => $footerMessage,
                    'data_type' => 'string',
                    'description' => 'Custom footer message untuk struk pembayaran'
                ]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'outlet_id' => (int) $outletId,
                    'footer_message' => $setting->setting_value
                ],
                'message' => 'Footer message berhasil diperbarui'
            ]);
        } catch (\Exception $e) {
            Log::error('SettingsController: Error updating receipt footer message', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'outlet_id' => $outletId ?? null,
                'footer_message' => $request->input('footer_message', '')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
