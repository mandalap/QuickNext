<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PublicReceiptController extends Controller
{
    /**
     * Get receipt by token (public access)
     */
    public function getReceipt($token)
    {
        try {
            $order = Order::where('receipt_token', $token)
                ->with([
                    'orderItems.product',
                    'customer',
                    'business',
                    'outlet',
                    'employee.user',
                    'payments'
                ])
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Struk tidak ditemukan atau link tidak valid.'
                ], 404);
            }

            // Generate comprehensive receipt data
            $receipt = [
                'order' => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'subtotal' => (float) $order->subtotal,
                    'tax_amount' => (float) $order->tax_amount,
                    'discount_amount' => (float) $order->discount_amount,
                    'coupon_code' => $order->coupon_code,
                    'total' => (float) $order->total,
                    'paid_amount' => (float) $order->paid_amount,
                    'change_amount' => (float) $order->change_amount,
                    'notes' => $order->notes,
                    'ordered_at' => $order->ordered_at?->toISOString(),
                    'created_at' => $order->created_at?->toISOString(),
                ],
                'business' => [
                    'name' => $order->business?->name ?? 'KASIR POS SYSTEM',
                    'address' => $order->business?->address ?? '',
                    'phone' => $order->business?->phone ?? '',
                    'email' => $order->business?->email ?? '',
                ],
                'outlet' => [
                    'name' => $order->outlet?->name ?? 'Main Outlet',
                    'address' => $order->outlet?->address ?? '',
                    'phone' => $order->outlet?->phone ?? '',
                ],
                'customer' => $order->customer ? [
                    'name' => $order->customer->name,
                    'phone' => $order->customer->phone,
                    'email' => $order->customer->email,
                ] : null,
                'cashier' => [
                    'name' => $order->employee?->user?->name ?? 'Kasir',
                ],
                'items' => $order->orderItems->map(function ($item) {
                    return [
                        'product_name' => $item->product_name,
                        'variant_name' => $item->variant_name,
                        'quantity' => (int) $item->quantity,
                        'price' => (float) $item->price,
                        'subtotal' => (float) $item->subtotal,
                    ];
                }),
                'payments' => $order->payments->map(function ($payment) {
                    return [
                        'method' => $payment->payment_method,
                        'amount' => (float) $payment->amount,
                        'status' => $payment->status,
                        'paid_at' => $payment->paid_at?->toISOString(),
                        'notes' => $payment->payment_data['notes'] ?? null,
                    ];
                }),
            ];

            return response()->json([
                'success' => true,
                'data' => $receipt
            ]);
        } catch (\Exception $e) {
            Log::error('PublicReceiptController: Failed to get receipt', [
                'token' => $token,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat struk.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
