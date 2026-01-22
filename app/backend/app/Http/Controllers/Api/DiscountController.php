<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Discount;
use App\Helpers\SubscriptionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class DiscountController extends Controller
{
    /**
     * Check promo access before processing request
     */
    private function checkPromoAccess($user)
    {
        if (!SubscriptionHelper::hasPromoAccess($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses Diskon & Promo memerlukan paket Premium. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_promo_access',
                'redirect_to' => '/subscription-settings'
            ], 403);
        }
        return null;
    }

    public function apiIndex(Request $request)
    {
        $user = Auth::user();
        
        // ✅ NEW: Check promo access
        $accessCheck = $this->checkPromoAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $query = Discount::where('business_id', $businessId)
            ->with(['outlet:id,name,code']);

        // If outlet_id is provided, show both outlet-specific and business-wide discounts
        if ($outletId) {
            $query->where(function($q) use ($outletId) {
                $q->where('outlet_id', $outletId)
                  ->orWhereNull('outlet_id'); // Business-wide discounts
            });
        }

        $discounts = $query->orderBy('created_at', 'desc')->get();

        return response()->json($discounts);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        
        // ✅ NEW: Check promo access
        $accessCheck = $this->checkPromoAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:discounts,code,NULL,id,business_id,' . $businessId . ',outlet_id,' . $outletId,
            'type' => 'required|string|in:percentage,fixed,bogo',
            'value' => 'required|numeric|min:0',
            'minimum_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'is_active' => 'boolean',
            'outlet_id' => 'nullable|exists:outlets,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Validate outlet belongs to business
        if ($outletId) {
            $outlet = \App\Models\Outlet::where('id', $outletId)
                ->where('business_id', $businessId)
                ->first();

            if (!$outlet) {
                return response()->json(['message' => 'Outlet not found or does not belong to business'], 400);
            }
        }

        $discount = Discount::create(array_merge($request->all(), [
            'business_id' => $businessId,
            'outlet_id' => $outletId,
            'used_count' => 0,
        ]));

        return response()->json($discount->load('outlet:id,name,code'), 201);
    }

    public function validateCode(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'order_total' => 'required|numeric|min:0',
        ]);

        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if (!$businessId) {
            return response()->json(['valid' => false, 'message' => 'Business ID required'], 400);
        }

        $query = Discount::where('code', $request->code)
            ->where('business_id', $businessId)
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('starts_at')
                      ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('ends_at')
                      ->orWhere('ends_at', '>=', now());
            });

        // If outlet_id is provided, prioritize outlet-specific discounts
        if ($outletId) {
            $query->where(function($q) use ($outletId) {
                $q->where('outlet_id', $outletId)
                  ->orWhereNull('outlet_id'); // Business-wide discounts
            });
        } else {
            // If no outlet context, only show business-wide discounts
            $query->whereNull('outlet_id');
        }

        $discount = $query->first();

        if (!$discount) {
            return response()->json(['valid' => false, 'message' => 'Invalid discount code']);
        }

        if ($discount->minimum_amount && $request->order_total < $discount->minimum_amount) {
            return response()->json([
                'valid' => false,
                'message' => "Minimum order amount not met. Required: Rp " . number_format((float) $discount->minimum_amount, 0, ',', '.') . ", Current: Rp " . number_format((float) $request->order_total, 0, ',', '.'),
                'minimum_amount' => $discount->minimum_amount,
                'current_amount' => $request->order_total
            ]);
        }

        $discountAmount = $discount->type === 'percentage'
            ? ($request->order_total * $discount->value / 100)
            : $discount->value;

        if ($discount->max_discount && $discountAmount > $discount->max_discount) {
            $discountAmount = $discount->max_discount;
        }

        return response()->json([
            'valid' => true,
            'data' => [
                'type' => $discount->type,
                'value' => $discount->value,
                'amount' => $discountAmount,
                'percent' => $discount->type === 'percentage' ? $discount->value : null,
            ],
            'discount' => $discount,
            'discount_amount' => $discountAmount,
        ]);
    }

    public function apiShow(Request $request, Discount $discount)
    {
        $businessId = $request->header('X-Business-Id');

        if ($discount->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($discount);
    }

    public function update(Request $request, Discount $discount)
    {
        $user = Auth::user();
        
        // ✅ NEW: Check promo access
        $accessCheck = $this->checkPromoAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if ($discount->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|unique:discounts,code,' . $discount->id . ',id,business_id,' . $businessId . ',outlet_id,' . ($outletId ?? 'NULL'),
            'type' => 'sometimes|required|string|in:percentage,fixed,bogo',
            'value' => 'sometimes|required|numeric|min:0',
            'minimum_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'is_active' => 'boolean',
            'outlet_id' => 'nullable|exists:outlets,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Validate outlet belongs to business
        if ($request->has('outlet_id') && $request->outlet_id) {
            $outlet = \App\Models\Outlet::where('id', $request->outlet_id)
                ->where('business_id', $businessId)
                ->first();

            if (!$outlet) {
                return response()->json(['message' => 'Outlet not found or does not belong to business'], 400);
            }
        }

        $discount->update($request->all());

        return response()->json($discount->load('outlet:id,name,code'));
    }

    public function destroy(Request $request, Discount $discount)
    {
        $user = Auth::user();
        
        // ✅ NEW: Check promo access
        $accessCheck = $this->checkPromoAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        $businessId = $request->header('X-Business-Id');

        if ($discount->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $discount->delete();

        return response()->json(['message' => 'Discount deleted successfully']);
    }
}
