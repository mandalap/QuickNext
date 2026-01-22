<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OnlinePlatform;
use App\Models\PlatformOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OnlinePlatformController extends Controller
{
    public function apiIndex()
    {
        $platforms = OnlinePlatform::all();

        return response()->json($platforms);
    }

    public function syncOrders(OnlinePlatform $platform)
    {
        // Implement sync logic with external platform API
        // For now, return success
        return response()->json(['message' => 'Orders synced for ' . $platform->name]);
    }

    public function getPlatformOrders(OnlinePlatform $platform)
    {
        $orders = PlatformOrder::where('platform_id', $platform->id)->with('order')->get();

        return response()->json($orders);
    }

    public function updateSettings(Request $request, OnlinePlatform $platform)
    {
        $validator = Validator::make($request->all(), [
            'api_key' => 'nullable|string',
            'api_secret' => 'nullable|string',
            'webhook_url' => 'nullable|url',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $platform->update($request->all());

        return response()->json($platform);
    }

    public function handleWebhook(Request $request, OnlinePlatform $platform)
    {
        // Handle incoming webhook from platform
        // Process order data, etc.
        return response()->json(['message' => 'Webhook handled']);
    }

    public function grabfoodWebhook(Request $request)
    {
        // Handle GrabFood webhook
        // Validate and process order
        return response()->json(['message' => 'GrabFood webhook processed']);
    }

    public function gofoodWebhook(Request $request)
    {
        // Handle GoFood webhook
        // Validate and process order
        return response()->json(['message' => 'GoFood webhook processed']);
    }

    public function shopeefoodWebhook(Request $request)
    {
        // Handle ShopeeFood webhook
        // Validate and process order
        return response()->json(['message' => 'ShopeeFood webhook processed']);
    }
}
