<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class POSController extends Controller
{
    public function createOrder(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            \Log::error('POSController: Business ID required');
            return response()->json(['error' => 'Business ID required'], 400);
        }

        \Log::info('POSController: Creating order', [
            'business_id' => $businessId,
            'items_count' => count($request->items ?? []),
            'customer_id' => $request->customer_id
        ]);

        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|exists:customers,id',
            'table_id' => 'nullable|exists:tables,id',
            'queue_number' => 'nullable|string|max:20',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'coupon_code' => 'nullable|string',
            'tax' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            \Log::error('POSController: Validation failed', ['errors' => $validator->errors()]);
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Get outlet ID from header (required by middleware)
        $outletId = $request->header('X-Outlet-Id');

        // Check for active shift
        $user = auth()->user();
        $shiftId = null;

        // For kasir: MUST have active shift (waiter no longer required)
        if (in_array($user->role, ['kasir'])) {
            $activeShift = \App\Models\CashierShift::where('user_id', $user->id)
                ->where('outlet_id', $outletId)
                ->where('status', 'open')
                ->first();

            if (!$activeShift) {
                \Log::error('POSController: No active shift found for kasir', [
                    'user_id' => $user->id,
                    'outlet_id' => $outletId
                ]);
                return response()->json([
                    'error' => 'Anda harus membuka shift terlebih dahulu sebelum melakukan transaksi',
                    'requires_shift' => true
                ], 400);
            }

            $shiftId = $activeShift->id;
            \Log::info('POSController: Active shift found for kasir', ['shift_id' => $shiftId]);
        }
        // For other roles (owner/admin): Try to find any active shift in this outlet
        else {
            // Get employee record for this user
            $employee = \App\Models\Employee::where('user_id', auth()->id())
                ->where('business_id', $businessId)
                ->first();

            // If this user is also an employee with active shift, use it
            if ($employee) {
                $activeShift = \App\Models\CashierShift::where('employee_id', $employee->id)
                    ->where('outlet_id', $outletId)
                    ->where('status', 'open')
                    ->first();

                if ($activeShift) {
                    $shiftId = $activeShift->id;
                    \Log::info('POSController: Active shift found for employee', [
                        'employee_id' => $employee->id,
                        'shift_id' => $shiftId
                    ]);
                }
            }

            // If still no shift found, log it but continue (don't block owner/admin)
            if (!$shiftId) {
                \Log::warning('POSController: No active shift for owner/admin, order will be created without shift_id', [
                    'user_id' => $user->id,
                    'outlet_id' => $outletId
                ]);
            }
        }

        DB::beginTransaction();

        try {
            $subtotal = 0;
            foreach ($request->items as $item) {
                $subtotal += $item['quantity'] * $item['price'];
            }

            $taxAmount = $request->tax ?? 0;
            $discountAmount = $request->discount ?? 0;
            $total = $subtotal + $taxAmount - $discountAmount;

            // Get outlet (use from header if available, otherwise find from business)
            $outlet = $outletId
                ? \App\Models\Outlet::find($outletId)
                : \App\Models\Outlet::where('business_id', $businessId)->first();

            if (!$outlet) {
                \Log::error('POSController: No outlet found for business');
                return response()->json(['error' => 'No outlet configured for this business'], 400);
            }

            // Resolve employee for this business and user to ensure correct cashier on receipt
            $employee = \App\Models\Employee::where('user_id', auth()->id())
                ->where('business_id', $businessId)
                ->first();

            // Check if deferred payment (for laundry business)
            // Handle both boolean true and string "true"
            $isDeferredPayment = $request->has('deferred_payment') && (
                $request->deferred_payment === true ||
                $request->deferred_payment === 'true' ||
                $request->deferred_payment === 1
            );

            \Log::info('POSController: Deferred payment check', [
                'has_deferred_payment' => $request->has('deferred_payment'),
                'deferred_payment_value' => $request->input('deferred_payment'),
                'is_deferred_payment' => $isDeferredPayment,
            ]);

            // Get business type to determine initial status
            $business = \App\Models\Business::find($businessId);
            $businessType = $business->businessType;

            // Set initial status based on business type and payment type
            $initialStatus = 'pending';
            if ($isDeferredPayment && $businessType && $businessType->code === 'laundry') {
                // Untuk laundry dengan deferred payment, status awal adalah 'received'
                $initialStatus = 'received';
                \Log::info('POSController: Setting status to "received" for deferred laundry order');
            } elseif ($businessType && in_array($businessType->code, ['laundry'])) {
                // Untuk laundry, jika bukan deferred, tetap pending (akan diupdate saat payment)
                $initialStatus = 'pending';
            }

            $orderData = [
                'business_id' => $businessId,
                'outlet_id' => $outlet->id,
                'customer_id' => $request->customer_id,
                'table_id' => $request->table_id ?? null,
                'queue_number' => $request->queue_number ?? null,
                // Store employee_id, not user_id, so relations (employee.user) resolve correctly
                'employee_id' => $employee?->id ?? null,
                'shift_id' => $shiftId, // ← TAMBAHKAN SHIFT ID
                'order_number' => 'ORD-' . strtoupper(\Illuminate\Support\Str::random(8)),
                'type' => 'dine_in', // Default type for POS
                'status' => $initialStatus,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'coupon_code' => $request->coupon_code,
                'service_charge' => 0,
                'delivery_fee' => 0,
                'total' => $total,
                'paid_amount' => 0,
                'change_amount' => 0,
                'payment_status' => 'pending', // Always pending for deferred payment
                'notes' => $request->notes,
                'ordered_at' => now(),
            ];

            \Log::info('POSController: Order data prepared', [
                'order_data' => $orderData,
                'is_deferred_payment' => $isDeferredPayment,
            ]);

            $order = Order::create($orderData);

            \Log::info('POSController: Order created successfully', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'is_deferred_payment' => $isDeferredPayment,
            ]);

            // If linked to a table, mark the table as occupied
            if ($order->table_id) {
                try {
                    $table = \App\Models\Table::find($order->table_id);
                    if ($table && $table->status !== 'occupied') {
                        $table->status = 'occupied';
                        $table->save();
                    }
                } catch (\Exception $e) {
                    \Log::warning('POSController: Failed updating table status to occupied', [
                        'table_id' => $order->table_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            \Log::info('POSController: Order created', ['order_id' => $order->id]);

            foreach ($request->items as $item) {
                $product = \App\Models\Product::findOrFail($item['product_id']);

                // ✅ FIX: Check stock availability - skip for untracked products (unlimited stock)
                // Only check stock for tracked products
                if ($product->stock_type !== 'untracked' && $product->stock < $item['quantity']) {
                    throw new \Exception("Stok produk '{$product->name}' tidak mencukupi. Stok tersedia: {$product->stock}");
                }

                // Create order item
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'product_name' => $product->name,
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'variant_name' => $item['variant_name'] ?? null,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['quantity'] * $item['price'],
                    'notes' => $item['notes'] ?? null,
                ]);

                // ✅ FIX: Update product stock - skip for untracked products (unlimited stock)
                // Only update stock for tracked products
                if ($product->stock_type !== 'untracked') {
                    $stockBefore = $product->stock;
                    $product->stock = $stockBefore - $item['quantity'];
                    $product->save();
                } else {
                    // For untracked products, stock remains 0 (no tracking)
                    $stockBefore = 0;
                }

                // ✅ Clear products cache setelah stock berubah (untuk POS yang cache products)
                \Illuminate\Support\Facades\Cache::forget("products_pos:business:{$businessId}");
                \Illuminate\Support\Facades\Cache::forget("products_stats:business:{$businessId}");

                // ✅ FIX: Create inventory movement record - skip for untracked products
                // Only create movement for tracked products
                if ($product->stock_type !== 'untracked') {
                    \App\Models\InventoryMovement::create([
                        'product_id' => $product->id,
                        'type' => 'out',
                        'reason' => 'sale',
                        'quantity' => $item['quantity'],
                        'stock_before' => $stockBefore,
                        'stock_after' => $product->stock,
                        'reference_type' => 'order',
                        'reference_id' => $order->id,
                        'notes' => "Penjualan order #{$order->order_number}",
                    ]);
                }
            }

            DB::commit();

            \Log::info('POSController: Order created successfully', ['order_id' => $order->id]);

            $itemCount = $order->orderItems->count();
            $itemsText = $itemCount > 1 ? "{$itemCount} item" : "{$itemCount} item";

            // ✅ SECURITY: Persist notification for new order with role-based targeting
            try {
                // Determine role targets based on order type
                $roleTargets = ['kitchen', 'owner', 'admin']; // Always notify kitchen, owner, admin
                
                // Add waiter if dine-in order
                if ($order->type === 'dine_in') {
                    $roleTargets[] = 'waiter';
                }
                
                // Add kasir if payment is pending (kasir needs to process payment)
                if ($order->payment_status === 'pending') {
                    $roleTargets[] = 'kasir';
                }

                \App\Models\AppNotification::create([
                    'business_id' => $order->business_id,
                    'outlet_id' => $order->outlet_id,
                    'user_id' => null,
                    'role_targets' => array_unique($roleTargets), // Remove duplicates
                    'type' => 'order.created',
                    'title' => 'Order Baru: ' . $order->order_number,
                    'message' => "{$itemsText} - Total: Rp " . number_format($order->total, 0, ',', '.'),
                    'severity' => 'info',
                    'resource_type' => 'order',
                    'resource_id' => $order->id,
                    'meta' => [
                        'order_number' => $order->order_number,
                        'table_id' => $order->table_id,
                        'payment_status' => $order->payment_status,
                        'status' => $order->status,
                        'order_type' => $order->type,
                    ],
                ]);
            } catch (\Exception $e) {
                \Log::warning('POSController: Failed to create order notification', ['error' => $e->getMessage()]);
            }

            return response()->json([
                'success' => true,
                'data' => $order->load('orderItems.product'),
                'toast' => [
                    'type' => 'success',
                    'title' => 'Order Dibuat',
                    'message' => "Order #{$order->order_number} berhasil dibuat dengan {$itemsText}. Total: Rp " . number_format($order->total, 0, ',', '.'),
                    'duration' => 3000
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollback();
            \Log::error('POSController: Failed to create order', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to create order',
                'message' => $e->getMessage(),
                'toast' => [
                    'type' => 'error',
                    'title' => 'Gagal Membuat Order',
                    'message' => $e->getMessage(),
                    'duration' => 5000
                ]
            ], 500);
        }
    }

    public function processPayment(Request $request, Order $order)
    {
        \Log::info('POSController: Processing payment', [
            'order_id' => $order->id,
            'amount' => $request->amount
        ]);

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0',
            'method' => 'required|string|in:cash,card,transfer,qris',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            \Log::error('POSController: Payment validation failed', ['errors' => $validator->errors()]);
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Resolve employee for processor fields
            $employee = \App\Models\Employee::where('user_id', auth()->id())
                ->where('business_id', $order->business_id)
                ->first();

            // ✅ FIX: Jika order belum punya shift_id (dari waiter), assign ke shift kasir aktif
            if (!$order->shift_id) {
                $user = auth()->user();
                $outletId = $request->header('X-Outlet-Id') ?? $order->outlet_id;
                $shiftId = null;

                // Cari shift aktif untuk kasir
                if (in_array($user->role, ['kasir'])) {
                    $activeShift = \App\Models\CashierShift::where('user_id', $user->id)
                        ->where('outlet_id', $outletId)
                        ->where('status', 'open')
                        ->first();

                    if ($activeShift) {
                        $shiftId = $activeShift->id;
                    }
                }
                // Untuk owner/admin, coba cari shift aktif di outlet ini
                else {
                    if ($employee) {
                        $activeShift = \App\Models\CashierShift::where('employee_id', $employee->id)
                            ->where('outlet_id', $outletId)
                            ->where('status', 'open')
                            ->first();

                        if ($activeShift) {
                            $shiftId = $activeShift->id;
                        }
                    }

                    // Jika belum ketemu, cari shift aktif apa saja di outlet ini
                    if (!$shiftId) {
                        $activeShift = \App\Models\CashierShift::where('outlet_id', $outletId)
                            ->where('status', 'open')
                            ->first();

                        if ($activeShift) {
                            $shiftId = $activeShift->id;
                        }
                    }
                }

                // Update order dengan shift_id jika ditemukan
                if ($shiftId) {
                    $order->shift_id = $shiftId;
                    $order->save(); // ✅ Simpan shift_id sebelum processing payment
                    \Log::info('POSController: Assigning shift_id to waiter order', [
                        'order_id' => $order->id,
                        'shift_id' => $shiftId,
                        'user_role' => $user->role
                    ]);
                } else {
                    \Log::warning('POSController: No active shift found for waiter order payment', [
                        'order_id' => $order->id,
                        'user_role' => $user->role,
                        'outlet_id' => $outletId
                    ]);
                }
            }

            // If QRIS: create Midtrans Snap token and mark as pending
            if ($request->input('method') === 'qris') {
                // ✅ FIX: Load order with outlet relationship untuk get outlet config
                $order->load('outlet', 'customer', 'business');

                // ✅ FIX: Get MidtransService dengan outlet config (fallback ke business lalu global)
                $midtransService = \App\Services\MidtransService::forOutlet($order->outlet);

                // ✅ FIX: Generate unique payment reference (sama seperti di OrderPaymentController)
                $paymentReference = 'ORD-' . $order->id . '-' . time();

                // ✅ FIX: Prepare Midtrans parameters dengan enabled_payments lengkap (sama seperti self-service)
                $params = [
                    'order_id' => $paymentReference,
                    'gross_amount' => (int) round((float) ($order->total ?? 0)),
                    'item_id' => 'order-' . $order->id,
                    'item_name' => 'Order #' . $order->order_number,
                    'price' => (int) round((float) ($order->total ?? 0)),
                    'customer_name' => $order->customer->name ?? 'Guest',
                    'customer_email' => $order->customer->email ?? 'guest@example.com',
                    'customer_phone' => $order->customer->phone ?? '',
                    // ✅ FIX: Enable multiple payment methods (sama seperti self-service)
                    'enabled_payments' => [
                        'gopay',
                        'shopeepay',
                        'qris',
                        'credit_card',
                        'bca_va',
                        'bni_va',
                        'bri_va',
                        'permata_va',
                        'other_va',
                    ],
                ];

                \Log::info('POSController: Creating Midtrans payment', [
                    'order_id' => $order->id,
                    'payment_reference' => $paymentReference,
                    'enabled_payments' => $params['enabled_payments'],
                    'outlet_id' => $order->outlet->id,
                    'has_custom_config' => $order->outlet->hasCustomMidtransConfig(),
                ]);

                // Create Snap token
                $snapToken = $midtransService->createSnapToken($params);

                // ✅ FIX: Create or update payment record dengan reference_number
                $payment = Payment::updateOrCreate(
                    [
                        'order_id' => $order->id,
                        'payment_method' => 'qris',
                    ],
                    [
                        'amount' => $order->total,
                        'reference_number' => $paymentReference,
                        'status' => 'pending',
                        'payment_data' => [
                            'snap_token' => $snapToken,
                            'created_at' => now()->toIso8601String(),
                        ],
                        'processed_by_user_id' => auth()->id() ?? null,
                        'processed_by_employee_id' => $employee?->id ?? null,
                    ]
                );

                // ✅ FIX: Update employee_id order dengan kasir yang memproses QRIS
                // Ini memastikan transaksi muncul di daftar transaksi kasir yang memproses
                if ($employee && $employee->id) {
                    $order->employee_id = $employee->id;
                    \Log::info('POSController: Updating order employee_id to QRIS processor', [
                        'order_id' => $order->id,
                        'old_employee_id' => $order->getOriginal('employee_id'),
                        'new_employee_id' => $employee->id,
                        'reason' => 'QRIS payment initiated by different cashier'
                    ]);
                }

                // Ensure order stays pending until webhook updates to paid
                $order->payment_status = 'pending';
                $order->save();

                \Log::info('POSController: QRIS payment created', [
                    'order_id' => $order->id,
                    'payment_id' => $payment->id,
                    'payment_reference' => $paymentReference,
                ]);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'payment_id' => $payment->id,
                        'snap_token' => $snapToken,
                        'client_key' => $midtransService->getClientKey(), // ✅ FIX: Pakai client key dari outlet config
                        'payment_reference' => $paymentReference,
                        'order_number' => $order->order_number,
                        'status' => 'pending',
                    ],
                    'toast' => [
                        'type' => 'info',
                        'title' => 'Menunggu Pembayaran',
                        'message' => 'QRIS dibuat. Silakan selesaikan pembayaran di aplikasi e-wallet Anda.',
                        'duration' => 4000
                    ]
                ]);
            }

            // ✅ NEW: Get reference number from request (for QRIS toko / Transfer)
            $referenceNumber = $request->input('reference_number');
            
            $payment = Payment::create([
                'order_id' => $order->id,
                'amount' => $request->amount,
                'payment_method' => $request->input('method'),
                'reference_number' => $referenceNumber ? strtoupper(trim($referenceNumber)) : null, // ✅ NEW: Save reference number
                'payment_data' => $request->filled('notes') ? ['notes' => $request->notes] : null,
                'status' => 'success',
                'paid_at' => now(),
                'processed_by_user_id' => auth()->id() ?? null,
                'processed_by_employee_id' => $employee?->id ?? null,
            ]);
            
            \Log::info('POSController: Payment created with reference number', [
                'payment_id' => $payment->id,
                'order_id' => $order->id,
                'payment_method' => $request->input('method'),
                'reference_number' => $referenceNumber,
            ]);

            // ✅ FIX: Update employee_id order dengan kasir yang menerima pembayaran
            // Ini memastikan transaksi muncul di daftar transaksi kasir yang menerima uang
            if ($employee && $employee->id) {
                $order->employee_id = $employee->id;
                \Log::info('POSController: Updating order employee_id to payment processor', [
                    'order_id' => $order->id,
                    'old_employee_id' => $order->getOriginal('employee_id'),
                    'new_employee_id' => $employee->id,
                    'reason' => 'Payment processed by different cashier'
                ]);
            }

            // Update order payment status
            $totalPaid = $order->paid_amount + $request->amount;
            $change = $totalPaid - $order->total;

            \Log::info('POSController: Payment calculation debug', [
                'order_id' => $order->id,
                'order_total' => $order->total,
                'previous_paid' => $order->paid_amount,
                'current_payment' => $request->amount,
                'total_paid' => $totalPaid,
                'change_amount' => $change,
                'is_fully_paid' => $totalPaid >= $order->total
            ]);

            $order->paid_amount = $totalPaid;
            $order->change_amount = $change; // ✅ Perbaikan: kembalian bisa negatif jika kurang bayar

            if ($totalPaid >= $order->total) {
                $order->payment_status = 'paid';
                $order->status = 'completed';
                // ✅ Generate receipt token when payment is completed
                $order->generateReceiptToken();
            } else {
                $order->payment_status = 'partial';
            }

            $order->save();

            // ✅ SECURITY: Send notification when order is paid/completed
            if ($totalPaid >= $order->total) {
                try {
                    \App\Models\AppNotification::create([
                        'business_id' => $order->business_id,
                        'outlet_id' => $order->outlet_id,
                        'user_id' => null,
                        'role_targets' => ['kasir', 'owner', 'admin'], // Payment completed - notify kasir, owner, admin
                        'type' => 'order.paid',
                        'title' => 'Pembayaran Selesai: ' . $order->order_number,
                        'message' => "Order #{$order->order_number} telah dibayar lunas. Total: Rp " . number_format($order->total, 0, ',', '.'),
                        'severity' => 'success',
                        'resource_type' => 'order',
                        'resource_id' => $order->id,
                        'meta' => [
                            'order_number' => $order->order_number,
                            'payment_status' => 'paid',
                            'status' => 'completed',
                            'total_paid' => $totalPaid,
                        ],
                    ]);
                } catch (\Exception $e) {
                    \Log::warning('POSController: Failed to create payment notification', ['error' => $e->getMessage()]);
                }
            }

            // If order is completed and has shift_id, update shift statistics
            if ($order->status === 'completed' && $order->shift_id) {
                $this->updateShiftStatistics($order->shift_id);
            }

            \Log::info('POSController: Payment processed successfully', [
                'order_id' => $order->id,
                'payment_id' => $payment->id
            ]);

            // ✅ Send WhatsApp notification if payment is fully paid and outlet setting is enabled
            if ($totalPaid >= $order->total) {
                $order->load(['orderItems.product', 'customer', 'business', 'outlet', 'payments']);

                // Check if outlet has enabled sending receipt via WA
                if ($order->outlet && $order->outlet->isSendReceiptViaWAEnabled()) {
                    try {
                        // Pass outlet to WhatsAppService to use outlet-specific API key
                        $whatsappService = new \App\Services\WhatsAppService($order->outlet);
                        $whatsappService->sendPaymentReceipt($order);
                        \Log::info('POSController: WhatsApp receipt sent', [
                            'order_id' => $order->id,
                            'outlet_id' => $order->outlet->id
                        ]);
                    } catch (\Exception $e) {
                        \Log::warning('POSController: Failed to send WhatsApp notification', [
                            'order_id' => $order->id,
                            'error' => $e->getMessage()
                        ]);
                        // Don't fail the payment if WhatsApp fails
                    }
                } else {
                    \Log::info('POSController: WhatsApp receipt not sent - setting disabled', [
                        'order_id' => $order->id,
                        'outlet_id' => $order->outlet->id ?? null,
                        'setting_enabled' => $order->outlet ? $order->outlet->isSendReceiptViaWAEnabled() : false
                    ]);
                }
            }

            // ✅ NEW: Send invoice email if payment is fully paid and customer has email
            if ($totalPaid >= $order->total) {
                try {
                    $order->load(['orderItems.product', 'customer', 'business', 'outlet', 'payments']);

                    // Get customer email (from customer or order)
                    $customerEmail = null;
                    $customerName = null;

                    if ($order->customer && $order->customer->email) {
                        $customerEmail = $order->customer->email;
                        $customerName = $order->customer->name;
                    } elseif ($order->customer_email) {
                        $customerEmail = $order->customer_email;
                        $customerName = $order->customer->name ?? 'Pelanggan';
                    }

                    if ($customerEmail) {
                        // Try to find user first, if not found, send directly via Mail
                        $user = null;
                        if ($order->customer && $order->customer->user_id) {
                            $user = \App\Models\User::find($order->customer->user_id);
                        }

                        if ($user) {
                            // User exists, use notification
                            $user->notify(new \App\Notifications\InvoiceEmailNotification($order));
                        } else {
                            // No user, send directly via Mail facade
                            \Illuminate\Support\Facades\Mail::to($customerEmail)->send(
                                new \App\Mail\InvoiceMail($order, $customerName)
                            );
                        }

                        \Log::info('Invoice email sent successfully', [
                            'order_id' => $order->id,
                            'email' => $customerEmail
                        ]);
                    }
                } catch (\Exception $e) {
                    \Log::warning('POSController: Failed to send invoice email', [
                        'order_id' => $order->id,
                        'error' => $e->getMessage()
                    ]);
                    // Don't fail the payment if email fails
                }
            }

            $toastMessage = "Pembayaran berhasil diproses. ";
            if ($order->change_amount > 0) {
                $toastMessage .= "Kembalian: Rp " . number_format((float) ($order->change_amount ?? 0), 0, ',', '.');
            }

            // Persist notification for payment processed
            try {
                \App\Models\AppNotification::create([
                    'business_id' => $order->business_id,
                    'outlet_id' => $order->outlet_id,
                    'user_id' => null,
                    'role_targets' => ['kasir','owner','admin'],
                    'type' => 'payment.processed',
                    'title' => 'Pembayaran Berhasil: ' . $order->order_number,
                    'message' => 'Total terbayar: Rp ' . number_format($request->amount, 0, ',', '.'),
                    'severity' => 'success',
                    'resource_type' => 'order',
                    'resource_id' => $order->id,
                    'meta' => [
                        'order_number' => $order->order_number,
                        'method' => $request->input('method'),
                        'amount' => $request->amount,
                        'payment_id' => $payment->id,
                    ],
                ]);
            } catch (\Exception $e) {
                \Log::warning('POSController: Failed to create payment notification', ['error' => $e->getMessage()]);
            }

            return response()->json([
                'success' => true,
                'data' => $payment,
                'toast' => [
                    'type' => 'success',
                    'title' => 'Transaksi Berhasil',
                    'message' => $toastMessage,
                    'duration' => 3000
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('POSController: Payment processing failed', [
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to process payment',
                'message' => $e->getMessage(),
                'toast' => [
                    'type' => 'error',
                    'title' => 'Transaksi Gagal',
                    'message' => 'Pembayaran gagal diproses. Silakan coba lagi.',
                    'duration' => 5000
                ]
            ], 500);
        }
    }

    public function printReceipt(Order $order)
    {
        try {
            // Load order with all related data
            $order->load([
                'orderItems.product',
                'customer',
                'business',
                'outlet',
                'employee.user',
                'payments'
            ]);

            // Get custom footer message from outlet setting
            $footerMessage = '';
            if ($order->outlet_id) {
                $footerSetting = \App\Models\OutletSetting::where('outlet_id', $order->outlet_id)
                    ->where('setting_key', 'receipt_footer_message')
                    ->first();
                if ($footerSetting) {
                    $footerMessage = $footerSetting->setting_value;
                }
            }

            // Generate comprehensive receipt data
            $receipt = [
                'order' => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'queue_number' => $order->queue_number,
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
                ],
                'customer' => $order->customer ? [
                    'id' => $order->customer->id,
                    'name' => $order->customer->name,
                    'phone' => $order->customer->phone,
                    'email' => $order->customer->email,
                ] : [
                    'id' => null,
                    'name' => 'Walk-in Customer',
                    'phone' => null,
                    'email' => null,
                ],
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
                        'processed_by' => [
                            'user_id' => $payment->processed_by_user_id,
                            'employee_id' => $payment->processed_by_employee_id,
                            'user_name' => $payment->processedByUser?->name,
                        ],
                    ];
                }),
                'print_info' => [
                    'printed_at' => now()->format('Y-m-d H:i:s'),
                    'receipt_number' => 'RCP-' . str_pad($order->id, 6, '0', STR_PAD_LEFT),
                ],
                'custom_footer_message' => $footerMessage
            ];

            \Log::info('POSController: Print receipt data generated', [
                'order_id' => $order->id,
                'receipt_data' => $receipt
            ]);

            return response()->json([
                'success' => true,
                'data' => $receipt
            ]);
        } catch (\Exception $e) {
            \Log::error('POSController: Print receipt failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate receipt',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update shift statistics when order is completed
     */
    private function updateShiftStatistics($shiftId)
    {
        try {
            $shift = \App\Models\CashierShift::find($shiftId);
            if (!$shift) {
                \Log::warning('POSController: Shift not found for statistics update', ['shift_id' => $shiftId]);
                return;
            }

            // Get all completed orders for this shift
            $completedOrders = Order::where('shift_id', $shiftId)
                ->where('status', 'completed')
                ->with('payments')
                ->get();

            $totalTransactions = $completedOrders->count();
            $expectedTotal = $completedOrders->sum('total');

            // Calculate payment method breakdown
            $cashTotal = 0;
            $cashCount = 0;
            $cardTotal = 0;
            $cardCount = 0;
            $transferTotal = 0;
            $transferCount = 0;
            $qrisTotal = 0;
            $qrisCount = 0;

            foreach ($completedOrders as $order) {
                $payment = $order->payments->first(); // Get primary payment method
                if ($payment) {
                    switch ($payment->payment_method) {
                        case 'cash':
                            $cashTotal += $order->total;
                            $cashCount++;
                            break;
                        case 'card':
                            $cardTotal += $order->total;
                            $cardCount++;
                            break;
                        case 'transfer':
                            $transferTotal += $order->total;
                            $transferCount++;
                            break;
                        case 'qris':
                            $qrisTotal += $order->total;
                            $qrisCount++;
                            break;
                    }
                }
            }

            // Update shift record
            $shift->update([
                'total_transactions' => $totalTransactions,
                'expected_total' => $expectedTotal,
                'expected_cash' => $cashTotal,
                'expected_card' => $cardTotal,
                'expected_transfer' => $transferTotal,
                'expected_qris' => $qrisTotal,
                'cash_transactions' => $cashCount,
                'card_transactions' => $cardCount,
                'transfer_transactions' => $transferCount,
                'qris_transactions' => $qrisCount,
            ]);

            \Log::info('POSController: Shift statistics updated', [
                'shift_id' => $shiftId,
                'total_transactions' => $totalTransactions,
                'expected_total' => $expectedTotal
            ]);

        } catch (\Exception $e) {
            \Log::error('POSController: Failed to update shift statistics', [
                'shift_id' => $shiftId,
                'error' => $e->getMessage()
            ]);
        }
    }
}
