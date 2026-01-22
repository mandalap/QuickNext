<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class WhatsAppController extends Controller
{
    /**
     * Send custom WhatsApp message
     */
    public function sendCustomMessage(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $validator = Validator::make($request->all(), [
            'phone_number' => 'required|string',
            'message' => 'required|string',
            'outlet_id' => 'nullable|exists:outlets,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Get outlet if provided
            $outlet = null;
            if ($request->has('outlet_id')) {
                $outlet = \App\Models\Outlet::where('id', $request->input('outlet_id'))
                    ->where('business_id', $businessId)
                    ->first();
            } elseif ($outletId) {
                $outlet = \App\Models\Outlet::where('id', $outletId)
                    ->where('business_id', $businessId)
                    ->first();
            }

            $whatsappService = new WhatsAppService($outlet);
            $result = $whatsappService->sendCustomMessage(
                $request->input('phone_number'),
                $request->input('message')
            );

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('WhatsApp: Failed to send custom message', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send payment receipt with custom message
     */
    public function sendPaymentReceipt(Request $request, Order $order)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only access orders from their business
        if ($order->business_id != $businessId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'custom_message' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $order->load(['orderItems.product', 'customer', 'business', 'outlet', 'payments']);

            // ✅ FIX: Validate customer and phone number before sending
            if (!$order->customer) {
                Log::warning('WhatsApp: Order has no customer', [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Order tidak memiliki data pelanggan. Silakan tambahkan data pelanggan terlebih dahulu.'
                ], 400);
            }

            if (!$order->customer->phone) {
                Log::warning('WhatsApp: Customer has no phone number', [
                    'order_id' => $order->id,
                    'customer_id' => $order->customer->id,
                    'customer_name' => $order->customer->name
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Pelanggan tidak memiliki nomor WhatsApp. Silakan lengkapi nomor WhatsApp pelanggan terlebih dahulu.'
                ], 400);
            }

            // ✅ FIX: Validate outlet WhatsApp configuration
            if (!$order->outlet) {
                Log::warning('WhatsApp: Order has no outlet', [
                    'order_id' => $order->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Order tidak memiliki outlet'
                ], 400);
            }

            if (!$order->outlet->whatsapp_api_key) {
                Log::warning('WhatsApp: Outlet has no API key configured', [
                    'order_id' => $order->id,
                    'outlet_id' => $order->outlet->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'WhatsApp belum dikonfigurasi untuk outlet ini. Silakan konfigurasi WhatsApp terlebih dahulu di pengaturan outlet.'
                ], 400);
            }

            if (!($order->outlet->whatsapp_enabled ?? false)) {
                Log::warning('WhatsApp: WhatsApp is disabled for outlet', [
                    'order_id' => $order->id,
                    'outlet_id' => $order->outlet->id
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'WhatsApp dinonaktifkan untuk outlet ini. Silakan aktifkan WhatsApp di pengaturan outlet.'
                ], 400);
            }

            Log::info('WhatsApp: Preparing to send payment receipt', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'customer_id' => $order->customer->id,
                'customer_name' => $order->customer->name,
                'customer_phone' => $order->customer->phone,
                'outlet_id' => $order->outlet->id,
                'outlet_name' => $order->outlet->name,
                'provider' => $order->outlet->whatsapp_provider ?? 'unknown'
            ]);

            $whatsappService = new WhatsAppService($order->outlet);
            $customMessage = $request->input('custom_message');

            $result = $whatsappService->sendPaymentReceipt($order, null, $customMessage);

            // ✅ FIX: Log detailed result
            Log::info('WhatsApp: Payment receipt send result', [
                'order_id' => $order->id,
                'success' => $result['success'] ?? false,
                'message' => $result['message'] ?? 'No message',
                'message_id' => $result['message_id'] ?? null,
                'status' => $result['status'] ?? null,
                'customer_phone' => $order->customer->phone
            ]);

            // ✅ FIX: Return more detailed response
            // Check multiple success indicators
            $isSuccess = false;
            if (isset($result['success']) && $result['success'] === true) {
                $isSuccess = true;
            } elseif (isset($result['message_id']) && !empty($result['message_id'])) {
                // If message_id exists, consider it successful
                $isSuccess = true;
            } elseif (isset($result['status']) && in_array($result['status'], ['sent', 'success', 'delivered'])) {
                // If status indicates success, consider it successful
                $isSuccess = true;
            }

            if ($isSuccess) {
                return response()->json([
                    'success' => true,
                    'message' => 'Kuitansi berhasil dikirim ke WhatsApp pelanggan',
                    'data' => [
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'customer_phone' => $order->customer->phone,
                        'message_id' => $result['message_id'] ?? null,
                        'status' => $result['status'] ?? 'sent'
                    ]
                ]);
            } else {
                // If result says success but actually failed, log warning
                Log::warning('WhatsApp: Payment receipt send reported failure', [
                    'order_id' => $order->id,
                    'result' => $result,
                    'has_message_id' => isset($result['message_id']),
                    'has_status' => isset($result['status']),
                    'status_value' => $result['status'] ?? null
                ]);
                return response()->json([
                    'success' => false,
                    'message' => $result['message'] ?? 'Gagal mengirim kuitansi ke WhatsApp. Periksa konfigurasi WhatsApp dan nomor pelanggan.',
                    'error' => $result['message'] ?? 'Unknown error'
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('WhatsApp: Failed to send payment receipt', [
                'order_id' => $order->id,
                'order_number' => $order->order_number ?? null,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengirim kuitansi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test WhatsApp connection
     */
    public function testConnection(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $validator = Validator::make($request->all(), [
            'outlet_id' => 'nullable|exists:outlets,id',
            'phone_number' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Get outlet
            $outlet = null;
            if ($request->has('outlet_id')) {
                $outlet = \App\Models\Outlet::where('id', $request->input('outlet_id'))
                    ->where('business_id', $businessId)
                    ->first();
            } elseif ($outletId) {
                $outlet = \App\Models\Outlet::where('id', $outletId)
                    ->where('business_id', $businessId)
                    ->first();
            }

            if (!$outlet || !$outlet->whatsapp_api_key) {
                return response()->json([
                    'success' => false,
                    'message' => 'WhatsApp not configured for this outlet'
                ], 400);
            }

            $whatsappService = new WhatsAppService($outlet);
            $testMessage = "🧪 *Test Message dari quickKasir*\n\nIni adalah pesan test untuk memverifikasi konfigurasi WhatsApp Anda.\n\nJika Anda menerima pesan ini, berarti konfigurasi WhatsApp sudah benar! ✅";

            // Format phone number
            $phoneNumber = $request->input('phone_number');
            $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);
            if (substr($phoneNumber, 0, 1) === '0') {
                $phoneNumber = '62' . substr($phoneNumber, 1);
            } elseif (substr($phoneNumber, 0, 2) !== '62') {
                $phoneNumber = '62' . $phoneNumber;
            }

            Log::info('WhatsApp: Testing connection', [
                'outlet_id' => $outlet->id,
                'provider' => $outlet->whatsapp_provider,
                'phone_number' => $phoneNumber,
                'has_api_key' => !empty($outlet->whatsapp_api_key),
            ]);

            $result = $whatsappService->sendCustomMessage(
                $phoneNumber,
                $testMessage
            );

            Log::info('WhatsApp: Test connection result', [
                'outlet_id' => $outlet->id,
                'success' => $result['success'] ?? false,
                'message' => $result['message'] ?? 'No message',
            ]);

            if (isset($result['success']) && $result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Pesan test berhasil dikirim! Silakan cek WhatsApp Anda.',
                    'data' => $result
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'] ?? 'Gagal mengirim pesan test. Periksa konfigurasi API key dan nomor telepon.',
                    'error' => $result['message'] ?? 'Unknown error'
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('WhatsApp: Test connection failed', [
                'outlet_id' => $outlet->id ?? null,
                'phone_number' => $request->input('phone_number'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim pesan test: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

