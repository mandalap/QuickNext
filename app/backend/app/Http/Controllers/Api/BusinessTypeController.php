<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessType;
use Illuminate\Http\Request;

class BusinessTypeController extends Controller
{
    /**
     * Get all active business types
     */
    public function index()
    {
        $businessTypes = BusinessType::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        \Log::info('Business Types API called', [
            'count' => $businessTypes->count(),
            'types' => $businessTypes->pluck('name', 'code')->toArray()
        ]);

        return response()->json([
            'success' => true,
            'data' => $businessTypes
        ]);
    }

    /**
     * Get business type by code
     */
    public function show($code)
    {
        $businessType = BusinessType::where('code', $code)
            ->where('is_active', true)
            ->first();

        if (!$businessType) {
            return response()->json([
                'success' => false,
                'message' => 'Business type not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $businessType
        ]);
    }
}
