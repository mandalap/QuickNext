<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\MidtransService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    protected $midtransService;

    public function __construct(MidtransService $midtransService)
    {
        $this->midtransService = $midtransService;
    }
    public function index()
    {
        $orders = Order::with('customer', 'orderItems.product')->paginate(15);

        return response()->json($orders);
    }

    /**
     * Get unpaid orders (for deferred payment feature - laundry)
     */
    public function unpaidOrders(Request $request)
    {
        try {
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            // ✅ FIX: Filter semua status yang belum dibayar penuh
            // Termasuk: 'pending', 'unpaid', 'partial' (jika ada)
            // Kecuali: 'paid', 'refunded'
            // Juga tampilkan jika paid_amount < total (untuk memastikan order yang belum lunas muncul)
            $query = Order::where(function ($q) {
                    $q->whereIn('payment_status', ['pending', 'unpaid', 'partial'])
                      // Juga tampilkan jika paid_amount < total (belum lunas)
                      ->orWhereRaw('COALESCE(paid_amount, 0) < total');
                })
                // Pastikan tidak termasuk yang sudah paid atau refunded
                ->whereNotIn('payment_status', ['paid', 'refunded'])
                ->with(['customer', 'orderItems.product', 'outlet', 'table', 'payments']);

            // Filter by business if provided
            if ($businessId) {
                $query->where('business_id', $businessId);
            }

            // Filter by outlet if provided
            if ($outletId) {
                $query->where('outlet_id', $outletId);
            }

            // Search by order number or customer name
            if ($request->has('search')) {
                $search = $request->get('search');
                $query->where(function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%")
                      ->orWhereHas('customer', function ($q) use ($search) {
                          $q->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                      });
                });
            }

            // Sort by date (newest first)
            $query->orderBy('created_at', 'desc');

            // Paginate
            $orders = $query->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $orders->items(),
                'pagination' => [
                    'current_page' => $orders->currentPage(),
                    'last_page' => $orders->lastPage(),
                    'per_page' => $orders->perPage(),
                    'total' => $orders->total(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('OrderController: Failed to get unpaid orders', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data order belum dibayar',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update order status (for laundry status flow)
     */
    public function updateStatus(Request $request, Order $order)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $newStatus = $request->get('status');
            
            // ✅ FIX: Simpan data penting sebelum update
            $shiftId = $order->shift_id;
            $oldStatus = $order->status;

            // Get business type to validate status flow
            $business = $order->business;
            $businessType = $business->businessType;

            if ($businessType) {
                $allowedStatuses = $businessType->order_statuses ?? [];
                if (!empty($allowedStatuses) && !in_array($newStatus, $allowedStatuses)) {
                    return response()->json([
                        'success' => false,
                        'message' => "Status '{$newStatus}' tidak valid untuk jenis bisnis ini.",
                        'allowed_statuses' => $allowedStatuses
                    ], 422);
                }
            }

            $order->status = $newStatus;
            $order->save();
            
            // ✅ FIX: Update shift statistics jika status berubah
            if ($shiftId && $newStatus !== $oldStatus) {
                $shift = \App\Models\CashierShift::find($shiftId);
                if ($shift && $shift->status === 'open') {
                    // Recalculate shift statistics setelah perubahan status
                    $shift->calculateExpectedTotals();
                    Log::info('OrderController: Shift statistics updated after status update', [
                        'order_id' => $order->id,
                        'shift_id' => $shiftId,
                        'old_status' => $oldStatus,
                        'new_status' => $newStatus,
                    ]);
                }
            }

            Log::info('OrderController: Order status updated', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'old_status' => $oldStatus,
                'new_status' => $newStatus
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Status order berhasil diupdate. Perhitungan shift telah diupdate.',
                'data' => $order->load('orderItems.product', 'customer')
            ]);
        } catch (\Exception $e) {
            Log::error('OrderController: Failed to update order status', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate status order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Order $order)
    {
        return response()->json($order->load('customer', 'orderItems.product', 'payments'));
    }

    public function update(Request $request, Order $order)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|required|string|in:pending,confirmed,preparing,ready,completed,cancelled',
            'payment_status' => 'sometimes|required|string|in:pending,partial,paid,refunded',
            'notes' => 'nullable|string',
            'customer_id' => 'nullable|exists:customers,id',
            'items' => 'sometimes|array|min:1',
            'items.*.product_id' => 'required_with:items|exists:products,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.price' => 'required_with:items|numeric|min:0',
            'subtotal' => 'sometimes|numeric|min:0',
            'tax_amount' => 'sometimes|numeric|min:0',
            'discount_amount' => 'sometimes|numeric|min:0',
            'total' => 'sometimes|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            // ✅ FIX: Simpan data penting sebelum update
            $shiftId = $order->shift_id;
            $oldStatus = $order->status;
            $oldPaymentStatus = $order->payment_status;

            // Update basic order info
            $orderData = $request->only([
                'status', 'payment_status', 'notes', 'customer_id'
            ]);

            // If items are being updated, recalculate totals and adjust stock
            if ($request->has('items')) {
                // ✅ FIX: Handle stock adjustment for order updates
                // Only adjust stock if order is unpaid (payment_status = 'pending')
                $isUnpaidOrder = $order->payment_status === 'pending';

                if ($isUnpaidOrder) {
                    // Load existing order items to restore stock
                    $order->load('orderItems.product');

                    // Restore stock for all existing items
                    foreach ($order->orderItems as $existingItem) {
                        if ($existingItem->product) {
                            $product = $existingItem->product;
                            $stockBefore = $product->stock;
                            $product->stock = $stockBefore + $existingItem->quantity;
                            $product->save();

                            Log::info('OrderController: Restored stock for order update', [
                                'order_id' => $order->id,
                                'product_id' => $product->id,
                                'product_name' => $product->name,
                                'quantity_restored' => $existingItem->quantity,
                                'stock_before' => $stockBefore,
                                'stock_after' => $product->stock,
                            ]);
                        }
                    }
                }

                $subtotal = 0;
                foreach ($request->items as $item) {
                    $subtotal += $item['quantity'] * $item['price'];
                }

                $taxAmount = $request->tax_amount ?? $order->tax_amount;
                $discountAmount = $request->discount_amount ?? $order->discount_amount;
                $total = $subtotal + $taxAmount - $discountAmount;

                $orderData['subtotal'] = $subtotal;
                $orderData['total'] = $total;

                // Delete old order items
                $order->orderItems()->delete();

                // Create new order items and adjust stock
                foreach ($request->items as $item) {
                    $product = \App\Models\Product::findOrFail($item['product_id']);

                    // Check stock availability if unpaid order
                    if ($isUnpaidOrder) {
                        if ($product->stock < $item['quantity']) {
                            throw new \Exception("Stok produk '{$product->name}' tidak mencukupi. Stok tersedia: {$product->stock}");
                        }

                        // Deduct stock for new items
                        $stockBefore = $product->stock;
                        $product->stock = $stockBefore - $item['quantity'];
                        $product->save();

                        // Clear products cache after stock change
                        $businessId = $order->business_id;
                        \Illuminate\Support\Facades\Cache::forget("products_pos:business:{$businessId}");
                        \Illuminate\Support\Facades\Cache::forget("products_stats:business:{$businessId}");

                        Log::info('OrderController: Deducted stock for order update', [
                            'order_id' => $order->id,
                            'product_id' => $product->id,
                            'product_name' => $product->name,
                            'quantity_deducted' => $item['quantity'],
                            'stock_before' => $stockBefore,
                            'stock_after' => $product->stock,
                        ]);
                    }

                    $order->orderItems()->create([
                        'product_id' => $item['product_id'],
                        'product_name' => $product->name,
                        'product_variant_id' => $item['product_variant_id'] ?? null,
                        'variant_name' => $item['variant_name'] ?? null,
                        'quantity' => $item['quantity'],
                        'price' => $item['price'],
                        'subtotal' => $item['quantity'] * $item['price'],
                        'notes' => $item['notes'] ?? null,
                    ]);
                }
            }

            $order->update($orderData);
            
            // ✅ FIX: Update shift statistics jika status atau payment_status berubah
            // Ini memastikan sinkronisasi antara owner dan kasir
            $statusChanged = isset($orderData['status']) && $orderData['status'] !== $oldStatus;
            $paymentStatusChanged = isset($orderData['payment_status']) && $orderData['payment_status'] !== $oldPaymentStatus;
            
            if ($shiftId && ($statusChanged || $paymentStatusChanged)) {
                $shift = \App\Models\CashierShift::find($shiftId);
                if ($shift && $shift->status === 'open') {
                    // Recalculate shift statistics setelah perubahan status
                    $shift->calculateExpectedTotals();
                    Log::info('OrderController: Shift statistics updated after order status change', [
                        'order_id' => $order->id,
                        'shift_id' => $shiftId,
                        'old_status' => $oldStatus,
                        'new_status' => $order->status,
                        'old_payment_status' => $oldPaymentStatus,
                        'new_payment_status' => $order->payment_status,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order updated successfully',
                'data' => $order->load('orderItems.product', 'customer', 'payments'),
                'toast' => [
                    'type' => 'success',
                    'title' => 'Order Diupdate',
                    'message' => "Order #{$order->order_number} berhasil diupdate. Perhitungan shift telah diupdate.",
                    'duration' => 3000
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('OrderController: Update failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update order',
                'error' => $e->getMessage(),
                'toast' => [
                    'type' => 'error',
                    'title' => 'Gagal Update Order',
                    'message' => 'Terjadi kesalahan saat update order. Silakan coba lagi.',
                    'duration' => 5000
                ]
            ], 500);
        }
    }

    /**
     * Add items to existing order (for kasir role)
     * Can only add items, cannot edit/delete existing items
     */
    public function addItems(Request $request, Order $order)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // ✅ FIX: Only allow adding items to unpaid orders
            if ($order->payment_status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menambah item ke order yang sudah dibayar',
                    'error' => 'Order sudah dibayar'
                ], 400);
            }

            DB::beginTransaction();

            // Calculate additional subtotal from new items
            $additionalSubtotal = 0;
            $newItemsData = [];

            foreach ($request->items as $item) {
                $product = \App\Models\Product::findOrFail($item['product_id']);

                // Check stock availability
                if ($product->stock < $item['quantity']) {
                    throw new \Exception("Stok produk '{$product->name}' tidak mencukupi. Stok tersedia: {$product->stock}");
                }

                $itemSubtotal = $item['quantity'] * $item['price'];
                $additionalSubtotal += $itemSubtotal;

                $newItemsData[] = [
                    'product_id' => $item['product_id'],
                    'product_name' => $product->name,
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'variant_name' => $item['variant_name'] ?? null,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $itemSubtotal,
                    'notes' => $item['notes'] ?? null,
                ];
            }

            // Add new items to order
            foreach ($newItemsData as $itemData) {
                $order->orderItems()->create($itemData);

                // Deduct stock
                $product = \App\Models\Product::find($itemData['product_id']);
                if ($product) {
                    $stockBefore = $product->stock;
                    $product->stock = $stockBefore - $itemData['quantity'];
                    $product->save();

                    // Clear products cache
                    $businessId = $order->business_id;
                    \Illuminate\Support\Facades\Cache::forget("products_pos:business:{$businessId}");
                    \Illuminate\Support\Facades\Cache::forget("products_stats:business:{$businessId}");

                    Log::info('OrderController: Added item to order', [
                        'order_id' => $order->id,
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'quantity_added' => $itemData['quantity'],
                        'stock_before' => $stockBefore,
                        'stock_after' => $product->stock,
                    ]);
                }
            }

            // Update order totals (add to existing, not replace)
            $existingSubtotal = (float)($order->subtotal ?? 0);
            $order->subtotal = $existingSubtotal + (float)$additionalSubtotal;
            $taxAmount = (float)($order->tax_amount ?? 0);
            $discountAmount = (float)($order->discount_amount ?? 0);
            $order->total = (float)$order->subtotal + $taxAmount - $discountAmount;
            $order->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Item berhasil ditambahkan ke order',
                'data' => $order->load('orderItems.product', 'customer', 'payments'),
                'toast' => [
                    'type' => 'success',
                    'title' => 'Item Ditambahkan',
                    'message' => "Item berhasil ditambahkan ke order #{$order->order_number}.",
                    'duration' => 3000
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('OrderController: Add items failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambah item ke order',
                'error' => $e->getMessage(),
                'toast' => [
                    'type' => 'error',
                    'title' => 'Gagal Menambah Item',
                    'message' => $e->getMessage() ?: 'Terjadi kesalahan saat menambah item. Silakan coba lagi.',
                    'duration' => 5000
                ]
            ], 500);
        }
    }

    /**
     * Apply discount to existing order (for kasir - can only apply discount, not edit items)
     */
    public function applyDiscount(Request $request, Order $order)
    {
        $validator = Validator::make($request->all(), [
            'discount_amount' => 'required|numeric|min:0',
            'discount_code' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // ✅ FIX: Only allow applying discount to unpaid orders
            if ($order->payment_status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menerapkan diskon ke order yang sudah dibayar',
                    'error' => 'Order sudah dibayar'
                ], 400);
            }

            DB::beginTransaction();

            // Apply discount
            $discountAmount = $request->discount_amount;
            $discountCode = $request->discount_code;

            $originalSubtotal = $order->subtotal ?? 0;
            $taxAmount = $order->tax_amount ?? 0;
            $newTotal = max($originalSubtotal + $taxAmount - $discountAmount, 0);

            $order->discount_amount = $discountAmount;
            if ($discountCode) {
                // Store discount code in notes or create a separate field
                // For now, append to notes
                $order->notes = ($order->notes ?? '') . ($order->notes ? ' | ' : '') . "Diskon: {$discountCode}";
            }
            $order->total = $newTotal;
            $order->save();

            Log::info('OrderController: Discount applied to order', [
                'order_id' => $order->id,
                'discount_amount' => $discountAmount,
                'discount_code' => $discountCode,
                'old_total' => $order->getOriginal('total'),
                'new_total' => $newTotal,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Diskon berhasil diterapkan ke order',
                'data' => $order->load('orderItems.product', 'customer', 'payments'),
                'toast' => [
                    'type' => 'success',
                    'title' => 'Diskon Diterapkan',
                    'message' => "Diskon berhasil diterapkan ke order #{$order->order_number}.",
                    'duration' => 3000
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('OrderController: Apply discount failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal menerapkan diskon ke order',
                'error' => $e->getMessage(),
                'toast' => [
                    'type' => 'error',
                    'title' => 'Gagal Menerapkan Diskon',
                    'message' => $e->getMessage() ?: 'Terjadi kesalahan saat menerapkan diskon. Silakan coba lagi.',
                    'duration' => 5000
                ]
            ], 500);
        }
    }

    public function destroy(Order $order)
    {
        DB::beginTransaction();

        try {
            // ✅ FIX: Simpan data penting sebelum delete
            $shiftId = $order->shift_id;
            $orderNumber = $order->order_number;
            $orderId = $order->id;

            // Restore stock jika order sudah dibayar
            if ($order->payment_status === 'paid') {
                $order->load('orderItems.product');
                foreach ($order->orderItems as $item) {
                    $product = $item->product;
                    if ($product) {
                        $stockBefore = $product->stock;
                        $product->stock = $stockBefore + $item->quantity;
                        $product->save();

                        // Create inventory movement record
                        \App\Models\InventoryMovement::create([
                            'product_id' => $product->id,
                            'type' => 'in',
                            'reason' => 'deleted_order',
                            'quantity' => $item->quantity,
                            'stock_before' => $stockBefore,
                            'stock_after' => $product->stock,
                            'reference_type' => 'order',
                            'reference_id' => $orderId,
                            'notes' => "Order #{$orderNumber} dihapus",
                        ]);
                    }
                }
            }

            $order->delete();

            // ✅ FIX: Update shift statistics jika order punya shift_id
            if ($shiftId) {
                $shift = \App\Models\CashierShift::find($shiftId);
                if ($shift && $shift->status === 'open') {
                    // Recalculate shift statistics setelah delete
                    $shift->calculateExpectedTotals();
                    Log::info('OrderController: Shift statistics updated after delete', [
                        'order_id' => $orderId,
                        'shift_id' => $shiftId,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order deleted successfully',
                'toast' => [
                    'type' => 'success',
                    'title' => 'Order Dihapus',
                    'message' => "Order #{$orderNumber} berhasil dihapus. Perhitungan shift telah diupdate.",
                    'duration' => 4000
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('OrderController: Failed to delete order', [
                'order_id' => $orderId ?? null,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to delete order',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function cancel(Order $order)
    {
        DB::beginTransaction();

        try {
            // ✅ FIX: Simpan shift_id sebelum cancel
            $shiftId = $order->shift_id;
            
            // Restore stock for cancelled order
            $order->load('orderItems.product');
            foreach ($order->orderItems as $item) {
                $product = $item->product;
                if ($product) {
                    $stockBefore = $product->stock;
                    $product->stock = $stockBefore + $item->quantity;
                    $product->save();

                    // Create inventory movement record for stock restoration
                    \App\Models\InventoryMovement::create([
                        'product_id' => $product->id,
                        'type' => 'in',
                        'reason' => 'cancelled_order',
                        'quantity' => $item->quantity,
                        'stock_before' => $stockBefore,
                        'stock_after' => $product->stock,
                        'reference_type' => 'order',
                        'reference_id' => $order->id,
                        'notes' => "Pembatalan order #{$order->order_number}",
                    ]);
                }
            }

            $order->status = 'cancelled';
            $order->save();
            
            // ✅ FIX: Update shift statistics jika order punya shift_id
            if ($shiftId) {
                $shift = \App\Models\CashierShift::find($shiftId);
                if ($shift && $shift->status === 'open') {
                    // Recalculate shift statistics setelah cancel
                    $shift->calculateExpectedTotals();
                    Log::info('OrderController: Shift statistics updated after cancel', [
                        'order_id' => $order->id,
                        'shift_id' => $shiftId,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $order,
                'toast' => [
                    'type' => 'info',
                    'title' => 'Order Dibatalkan',
                    'message' => "Order #{$order->order_number} berhasil dibatalkan. Stock produk telah dikembalikan.",
                    'duration' => 4000
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'error' => 'Failed to cancel order',
                'message' => $e->getMessage(),
                'toast' => [
                    'type' => 'error',
                    'title' => 'Gagal Membatalkan Order',
                    'message' => 'Terjadi kesalahan saat membatalkan order. Silakan coba lagi.',
                    'duration' => 5000
                ]
            ], 500);
        }
    }

    public function refund(Order $order)
    {
        DB::beginTransaction();

        try {
            // Restore stock for refunded order
            $order->load('orderItems.product');
            foreach ($order->orderItems as $item) {
                $product = $item->product;
                if ($product) {
                    $stockBefore = $product->stock;
                    $product->stock = $stockBefore + $item->quantity;
                    $product->save();

                    // Create inventory movement record for stock restoration
                    \App\Models\InventoryMovement::create([
                        'product_id' => $product->id,
                        'type' => 'in',
                        'reason' => 'refunded_order',
                        'quantity' => $item->quantity,
                        'stock_before' => $stockBefore,
                        'stock_after' => $product->stock,
                        'reference_type' => 'order',
                        'reference_id' => $order->id,
                        'notes' => "Refund order #{$order->order_number}",
                    ]);
                }
            }

            // ✅ FIX: Simpan shift_id sebelum update status
            $shiftId = $order->shift_id;

            $order->status = 'refunded';
            $order->payment_status = 'refunded';
            $order->save();

            // ✅ FIX: Update shift statistics jika order punya shift_id
            if ($shiftId) {
                $shift = \App\Models\CashierShift::find($shiftId);
                if ($shift && $shift->status === 'open') {
                    // Recalculate shift statistics setelah refund
                    $shift->calculateExpectedTotals();
                    Log::info('OrderController: Shift statistics updated after refund', [
                        'order_id' => $order->id,
                        'shift_id' => $shiftId,
                        'order_total' => $order->total,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $order,
                'toast' => [
                    'type' => 'warning',
                    'title' => 'Order Direfund',
                    'message' => "Order #{$order->order_number} berhasil direfund sebesar Rp " . number_format($order->total, 0, ',', '.') . ". Stock produk telah dikembalikan dan perhitungan shift telah diupdate.",
                    'duration' => 5000
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'error' => 'Failed to refund order',
                'message' => $e->getMessage(),
                'toast' => [
                    'type' => 'error',
                    'title' => 'Gagal Refund Order',
                    'message' => 'Terjadi kesalahan saat refund order. Silakan coba lagi.',
                    'duration' => 5000
                ]
            ], 500);
        }
    }

    /**
     * ✅ NEW: Sync payment status from Midtrans for an order
     * Useful when webhook doesn't trigger or payment status is out of sync
     */
    public function syncPaymentStatus(Request $request, Order $order)
    {
        try {
            // Find pending payment for this order
            $payment = Payment::where('order_id', $order->id)
                ->where('payment_method', 'qris')
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada payment pending untuk order ini',
                ], 404);
            }

            // Get transaction status from Midtrans using business-specific config
            try {
                // ✅ Get MidtransService dengan outlet config (fallback ke business lalu global)
                $midtransService = MidtransService::forOutlet($order->outlet);
                $transactionStatus = $midtransService->getTransactionStatus($payment->reference_number);

                Log::info('OrderController: Syncing payment status from Midtrans', [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'payment_id' => $payment->id,
                    'reference_number' => $payment->reference_number,
                    'transaction_status' => $transactionStatus->transaction_status,
                ]);

                // Update payment status if transaction is settled
                if ($transactionStatus->transaction_status === 'settlement' || 
                    $transactionStatus->transaction_status === 'capture') {
                    
                    DB::beginTransaction();
                    try {
                        $payment->update([
                            'status' => 'success',
                            'paid_at' => now(),
                            'payment_data' => array_merge(
                                $payment->payment_data ?? [],
                                [
                                    'transaction_id' => $transactionStatus->transaction_id ?? null,
                                    'transaction_status' => $transactionStatus->transaction_status,
                                    'payment_type' => $transactionStatus->payment_type ?? null,
                                    'transaction_time' => $transactionStatus->transaction_time ?? null,
                                ]
                            ),
                        ]);

                        // Update order status
                        $business = $order->business;
                        $settings = $business->settings ?? [];
                        $autoConfirm = $settings['kitchen_auto_confirm'] ?? true;

                        $newStatus = $order->status;
                        if ($order->status === 'pending') {
                            $newStatus = $autoConfirm ? 'confirmed' : 'pending';
                        }

                        // ✅ NEW: Assign shift_id untuk order self-service yang sudah dibayar via Midtrans
                        // Ini memastikan order muncul di transaksi kasir
                        if ($order->type === 'self_service' && !$order->shift_id) {
                            // Cari shift aktif di outlet yang sama
                            $activeShift = \App\Models\CashierShift::where('outlet_id', $order->outlet_id)
                                ->where('status', 'open')
                                ->orderBy('opened_at', 'desc')
                                ->first();

                            if ($activeShift) {
                                $order->shift_id = $activeShift->id;
                                Log::info('OrderController: Assigning shift_id to self-service order (syncPaymentStatus)', [
                                    'order_id' => $order->id,
                                    'shift_id' => $activeShift->id,
                                    'outlet_id' => $order->outlet_id,
                                    'reason' => 'Self-service order paid via Midtrans, assigned to active shift'
                                ]);
                            } else {
                                Log::info('OrderController: No active shift found for self-service order (syncPaymentStatus)', [
                                    'order_id' => $order->id,
                                    'outlet_id' => $order->outlet_id,
                                    'note' => 'Order will appear as Self-Service Payment without shift'
                                ]);
                            }
                        }

                        $order->update([
                            'payment_status' => 'paid',
                            'status' => $newStatus,
                        ]);

                        DB::commit();

                        Log::info('OrderController: Payment status synced successfully', [
                            'order_id' => $order->id,
                            'order_number' => $order->order_number,
                            'new_payment_status' => 'paid',
                            'new_order_status' => $newStatus,
                        ]);

                        // Reload order to get updated data
                        $order->refresh();
                        $order->load(['orderItems.product', 'table', 'outlet', 'discount', 'payments']);

                        return response()->json([
                            'success' => true,
                            'message' => 'Payment status berhasil di-sync dari Midtrans',
                            'data' => [
                                'order' => $order,
                                'payment' => $payment,
                                'transaction_status' => $transactionStatus->transaction_status,
                            ],
                        ]);
                    } catch (\Exception $e) {
                        DB::rollBack();
                        throw $e;
                    }
                } else {
                    // Payment still pending
                    return response()->json([
                        'success' => true,
                        'message' => 'Payment masih pending di Midtrans',
                        'data' => [
                            'order' => $order,
                            'payment' => $payment,
                            'transaction_status' => $transactionStatus->transaction_status,
                        ],
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('OrderController: Failed to sync payment status from Midtrans', [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'error' => $e->getMessage(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Gagal sync payment status dari Midtrans: ' . $e->getMessage(),
                    'error' => $e->getMessage(),
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('OrderController: Sync payment status failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal sync payment status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
