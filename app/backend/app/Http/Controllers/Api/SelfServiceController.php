<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Order;
use App\Models\Table;
use App\Models\Outlet;
use App\Models\Customer;
use App\Models\Discount;
use App\Models\Payment;
use App\Services\MidtransService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SelfServiceController extends Controller
{
    protected $midtransService;

    public function __construct(MidtransService $midtransService)
    {
        $this->midtransService = $midtransService;
    }

    /**
     * Get outlet data for order response
     * ✅ FIX: Helper method untuk memastikan outlet data selalu dikirim
     */
    private function getOutletData($order)
    {
        // Method 1: Jika outlet sudah ter-load
        if ($order->outlet) {
            Log::info('SelfServiceController: getOutletData - Using loaded outlet', [
                'order_id' => $order->id,
                'outlet_id' => $order->outlet->id,
                'outlet_name' => $order->outlet->name,
            ]);
            return [
                'id' => $order->outlet->id,
                'name' => $order->outlet->name ?? 'Outlet',
                'address' => $order->outlet->address ?? null,
                'phone' => $order->outlet->phone ?? null,
            ];
        }

        // Method 2: Jika outlet_id ada tapi outlet belum ter-load, load manual
        if ($order->outlet_id) {
            try {
                Log::info('SelfServiceController: getOutletData - Loading outlet manually', [
                    'order_id' => $order->id,
                    'outlet_id' => $order->outlet_id,
                ]);
                
                // ✅ FIX: Coba load dengan withTrashed untuk handle soft delete
                $outlet = Outlet::withTrashed()->find($order->outlet_id);
                if (!$outlet) {
                    // Jika masih tidak ketemu, coba query langsung
                    $outlet = DB::table('outlets')->where('id', $order->outlet_id)->first();
                    if ($outlet) {
                        // Convert stdClass to array
                        $outlet = (array) $outlet;
                        Log::info('SelfServiceController: getOutletData - Outlet found via direct query', [
                            'outlet_id' => $outlet['id'],
                            'outlet_name' => $outlet['name'] ?? null,
                        ]);
                        return [
                            'id' => $outlet['id'],
                            'name' => $outlet['name'] ?? 'Outlet',
                            'address' => $outlet['address'] ?? null,
                            'phone' => $outlet['phone'] ?? null,
                        ];
                    }
                }
                
                if ($outlet) {
                    Log::info('SelfServiceController: getOutletData - Outlet found', [
                        'outlet_id' => $outlet->id,
                        'outlet_name' => $outlet->name,
                        'has_address' => !empty($outlet->address),
                        'has_phone' => !empty($outlet->phone),
                    ]);
                    return [
                        'id' => $outlet->id,
                        'name' => $outlet->name ?? 'Outlet',
                        'address' => $outlet->address ?? null,
                        'phone' => $outlet->phone ?? null,
                    ];
                } else {
                    Log::warning('SelfServiceController: getOutletData - Outlet not found in database', [
                        'order_id' => $order->id,
                        'outlet_id' => $order->outlet_id,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('SelfServiceController: getOutletData - Exception loading outlet', [
                    'order_id' => $order->id,
                    'outlet_id' => $order->outlet_id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        } else {
            Log::warning('SelfServiceController: getOutletData - No outlet_id in order', [
                'order_id' => $order->id,
                'order_number' => $order->order_number ?? null,
            ]);
        }

        // Method 3: Fallback - return null jika tidak ada outlet
        Log::warning('SelfServiceController: getOutletData - Returning null (no outlet data)', [
            'order_id' => $order->id,
            'outlet_id' => $order->outlet_id ?? null,
        ]);
        return null;
    }

    public function getMenu($tableQr)
    {
        // Log the incoming request
        \Log::info('Self-Service Menu Request', ['qr_code' => $tableQr]);

        // Find table by QR code
        $table = Table::where('qr_code', $tableQr)->first();

        if (!$table) {
            \Log::warning('Table not found', ['qr_code' => $tableQr]);
            return response()->json([
                'success' => false,
                'message' => 'QR Code tidak ditemukan. Pastikan QR Code sudah dibuat.'
            ], 404);
        }

        \Log::info('Table found', [
            'qr_code' => $tableQr,
            'table_id' => $table->id,
            'table_name' => $table->name,
            'status' => $table->status
        ]);

        // Get outlet info
        $outlet = $table->outlet;

        // ✅ NEW: Check if self-service is enabled for this outlet
        if (!$outlet || !$outlet->self_service_enabled) {
            \Log::warning('Self-service disabled for outlet', [
                'outlet_id' => $outlet->id ?? null,
                'outlet_name' => $outlet->name ?? null,
                'self_service_enabled' => $outlet->self_service_enabled ?? false,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Self Service tidak diaktifkan untuk outlet ini. Silakan hubungi administrator.'
            ], 403);
        }

        // ✅ NEW: Track scan setiap kali menu diakses
        $table->increment('scan_count');
        $table->update(['last_scan_at' => now()]);

        if (!$outlet) {
            \Log::error('Outlet not found for table', ['table_id' => $table->id]);
            return response()->json([
                'success' => false,
                'message' => 'Outlet tidak ditemukan untuk QR Code ini'
            ], 404);
        }

        // Get active products for this business with categories and images
        $products = Product::with('category')
            ->where('business_id', $outlet->business_id)
            ->where('is_active', true)
            ->get()
            ->map(function ($product) {
                // Add image URL (handle both old and new format)
                if ($product->image) {
                    // Remove 'storage/' prefix if exists (old format)
                    $imagePath = str_replace('storage/', '', $product->image);
                    $product->image_url = asset('storage/' . $imagePath);
                } else {
                    $product->image_url = null;
                }
                return $product;
            });

        // Get unique categories
        $categories = $products->pluck('category')->filter()->unique('id')->values();

        // ✅ NEW: Check if Midtrans is enabled for this outlet
        $midtransEnabled = false;
        try {
            // Method 1: Check outlet custom config
            if ($outlet->hasCustomMidtransConfig()) {
                $config = $outlet->payment_gateway_config;
                if (isset($config['midtrans'])) {
                    $midtransConfig = $config['midtrans'];
                    
                    // Check if enabled
                    if (isset($midtransConfig['enabled']) && $midtransConfig['enabled'] === true) {
                        // Try to get server_key (might be encrypted)
                        $serverKey = $midtransConfig['server_key'] ?? '';
                        if (!empty($serverKey)) {
                            // Try to decrypt if encrypted
                            if (strpos($serverKey, 'eyJpdiI6') === 0) {
                                try {
                                    $serverKey = decrypt($serverKey);
                                } catch (\Exception $e) {
                                    // If decryption fails, use as is (might be plain text)
                                    \Log::warning('Failed to decrypt server_key in self-service check', [
                                        'outlet_id' => $outlet->id
                                    ]);
                                }
                            }
                            
                            $clientKey = $midtransConfig['client_key'] ?? '';
                            
                            // Check if both keys are present
                            if (!empty($serverKey) && !empty($clientKey)) {
                                $midtransEnabled = true;
                                \Log::info('Midtrans enabled for outlet (custom config)', [
                                    'outlet_id' => $outlet->id,
                                    'outlet_name' => $outlet->name
                                ]);
                            }
                        }
                    }
                }
            } else {
                // Method 2: Check business-level config
                $business = $outlet->business;
                if ($business && $business->hasCustomMidtransConfig()) {
                    $config = $business->midtrans_config;
                    if (isset($config['enabled']) && $config['enabled'] === true) {
                        $serverKey = $config['server_key'] ?? '';
                        $clientKey = $config['client_key'] ?? '';
                        
                        if (!empty($serverKey) && !empty($clientKey)) {
                            $midtransEnabled = true;
                            \Log::info('Midtrans enabled for outlet (business config)', [
                                'outlet_id' => $outlet->id,
                                'business_id' => $business->id
                            ]);
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Error checking Midtrans config in self-service', [
                'outlet_id' => $outlet->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }

        \Log::info('Menu loaded successfully', [
            'qr_code' => $tableQr,
            'products_count' => $products->count(),
            'categories_count' => $categories->count(),
            'midtrans_enabled' => $midtransEnabled
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Menu berhasil dimuat',
            'data' => [
                'table' => [
                    'id' => $table->id,
                    'name' => $table->name,
                    'qr_code' => $table->qr_code,
                    'capacity' => $table->capacity,
                    'status' => $table->status,
                ],
                'outlet' => [
                    'id' => $outlet->id,
                    'name' => $outlet->name,
                    'tax_rate' => $outlet->getEffectiveTaxRate(),
                ],
                'outlet_id' => $outlet->id, // ✅ NEW: Include outlet_id for frontend
                'midtrans_enabled' => $midtransEnabled, // ✅ NEW: Include Midtrans status
                'products' => $products,
                'categories' => $categories,
            ]
        ]);
    }

    public function placeOrder(Request $request, $tableQr)
    {
        $table = Table::where('qr_code', $tableQr)->first();

        if (!$table) {
            return response()->json([
                'success' => false,
                'message' => 'QR Code tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'customer_email' => 'nullable|email|max:255',
            'jumlah_orang' => 'nullable|integer|min:1|max:100', // ✅ NEW: Jumlah orang (1-100)
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'discount_code' => 'nullable|string',
            'notes' => 'nullable|string',
            'payment_method' => 'nullable|in:pay_later,cash,card,transfer,qris,midtrans',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak valid',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Find or create customer (only if phone is provided)
            $customer = null;
            $customerId = null;

            if ($request->customer_phone) {
                $customer = Customer::where('business_id', $table->outlet->business_id)
                    ->where('phone', $request->customer_phone)
                    ->first();

                if (!$customer) {
                    $customer = Customer::create([
                        'business_id' => $table->outlet->business_id,
                        'name' => $request->customer_name ?: 'Guest',
                        'phone' => $request->customer_phone,
                        'email' => $request->customer_email,
                        'total_spent' => 0,
                        'total_visits' => 0,
                    ]);
                }

                $customerId = $customer->id;
            }

            // Calculate subtotal
            $subtotal = 0;
            foreach ($request->items as $item) {
                $subtotal += $item['quantity'] * $item['price'];
            }

            // Validate and apply discount if provided
            $discountAmount = 0;
            $discountId = null;
            $couponCode = null;

            if ($request->discount_code) {
                $discount = Discount::where('code', $request->discount_code)
                    ->where('business_id', $table->outlet->business_id)
                    ->where('is_active', true)
                    ->where(function ($query) {
                        $query->whereNull('starts_at')
                              ->orWhere('starts_at', '<=', now());
                    })
                    ->where(function ($query) {
                        $query->whereNull('ends_at')
                              ->orWhere('ends_at', '>=', now());
                    })
                    ->where(function($q) use ($table) {
                        $q->where('outlet_id', $table->outlet_id)
                          ->orWhereNull('outlet_id');
                    })
                    ->first();

                if (!$discount) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Kode diskon tidak valid atau sudah tidak aktif'
                    ], 422);
                }

                // Check minimum amount
                if ($discount->minimum_amount && $subtotal < $discount->minimum_amount) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => "Minimum pembelian tidak terpenuhi. Minimum: Rp " . number_format($discount->minimum_amount, 0, ',', '.')
                    ], 422);
                }

                // Check usage limit
                if ($discount->usage_limit && $discount->used_count >= $discount->usage_limit) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Kode diskon sudah mencapai batas penggunaan'
                    ], 422);
                }

                // Calculate discount
                $discountAmount = $discount->type === 'percentage'
                    ? ($subtotal * $discount->value / 100)
                    : $discount->value;

                // Apply max discount if set
                if ($discount->max_discount && $discountAmount > $discount->max_discount) {
                    $discountAmount = $discount->max_discount;
                }

                $discountId = $discount->id;
                $couponCode = $discount->code;

                // Increment usage count
                $discount->increment('used_count');
            }

            // Calculate tax based on outlet's tax rate
            $taxRate = $table->outlet->getEffectiveTaxRate();
            $taxAmount = ($subtotal - $discountAmount) * ($taxRate / 100);

            // Calculate total
            $total = $subtotal + $taxAmount - $discountAmount;

            // Determine payment status based on payment method
            $paymentMethod = $request->payment_method ?? 'pay_later';
            // Midtrans and pay_later should remain pending, others are marked as paid
            $paymentStatus = in_array($paymentMethod, ['pay_later', 'midtrans']) ? 'pending' : 'paid';
            $paidAmount = in_array($paymentMethod, ['pay_later', 'midtrans']) ? 0 : $total;

            // Generate order number
            $orderNumber = 'SS-' . strtoupper(substr(uniqid(), -8));

            // Create order
            $order = Order::create([
                'business_id' => $table->outlet->business_id,
                'outlet_id' => $table->outlet_id,
                'table_id' => $table->id,
                'customer_id' => $customerId,
                'order_number' => $orderNumber,
                'customer_data' => [
                    'name' => $request->customer_name ?: 'Guest',
                    'phone' => $request->customer_phone,
                    'email' => $request->customer_email,
                    'jumlah_orang' => $request->jumlah_orang ?? 1, // ✅ NEW: Jumlah orang
                ],
                'status' => 'pending',
                'notes' => $request->notes,
                'type' => 'self_service',
                'payment_status' => $paymentStatus,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'discount_id' => $discountId,
                'coupon_code' => $couponCode,
                'total' => $total,
                'paid_amount' => $paidAmount,
                'ordered_at' => now(),
            ]);

            // Create payment record if paid immediately (not pay_later or midtrans)
            if (!in_array($paymentMethod, ['pay_later', 'midtrans'])) {
                $order->payments()->create([
                    'amount' => $total,
                    'payment_method' => $paymentMethod,
                    'status' => 'success',
                    'paid_at' => now(),
                    'reference_number' => 'SS-PAY-' . $order->id . '-' . time(),
                ]);
            }

            // Create order items
            foreach ($request->items as $item) {
                $itemSubtotal = $item['quantity'] * $item['price'];

                // Get product name
                $product = Product::find($item['product_id']);

                $order->orderItems()->create([
                    'product_id' => $item['product_id'],
                    'product_name' => $product->name,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $itemSubtotal,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pesanan berhasil dibuat',
                'data' => [
                    'order_number' => $orderNumber,
                    'order' => $order->load('orderItems.product'),
                    'customer' => $customer,
                    'discount_applied' => $discountAmount > 0,
                    'discount_amount' => $discountAmount,
                    'payment_method' => $paymentMethod,
                    'payment_status' => $paymentStatus,
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Self-Service Order Error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat pesanan',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Search customer by phone number (public endpoint)
     */
    public function searchCustomerByPhone(Request $request, $qrCodeOrSlug)
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|min:8|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor telepon tidak valid',
                'errors' => $validator->errors()
            ], 422);
        }

        // Try to find table first, then outlet to get business_id
        $table = Table::where('qr_code', $qrCodeOrSlug)->first();
        $businessId = null;

        if ($table) {
            $businessId = $table->outlet->business_id;
        } else {
            $outlet = Outlet::where('slug', $qrCodeOrSlug)
                ->where('is_active', true)
                ->first();

            if (!$outlet) {
                return response()->json([
                    'success' => false,
                    'message' => 'QR Code atau Outlet tidak ditemukan'
                ], 404);
            }

            $businessId = $outlet->business_id;
        }

        // Search customer by phone
        $customer = Customer::where('business_id', $businessId)
            ->where('phone', $request->phone)
            ->first();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor telepon belum terdaftar',
                'found' => false
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Customer ditemukan',
            'found' => true,
            'data' => [
                'customer_id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'total_visits' => $customer->total_visits ?? 0,
                'total_spent' => $customer->total_spent ?? 0,
                'is_returning' => $customer->total_visits > 0,
            ]
        ]);
    }

    /**
     * Validate discount code for self-service (public endpoint)
     */
    public function validateDiscount(Request $request, $qrCodeOrSlug)
    {
        $validator = Validator::make($request->all(), [
            'discount_code' => 'required|string',
            'subtotal' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak valid',
                'errors' => $validator->errors()
            ], 422);
        }

        // Try to find table first, then outlet
        $table = Table::where('qr_code', $qrCodeOrSlug)->first();
        $outlet = null;

        if ($table) {
            $outlet = $table->outlet;
            $businessId = $outlet->business_id;
            $outletId = $outlet->id;
        } else {
            $outlet = Outlet::where('slug', $qrCodeOrSlug)
                ->where('is_active', true)
                ->first();

            if (!$outlet) {
                return response()->json([
                    'success' => false,
                    'message' => 'QR Code atau Outlet tidak ditemukan'
                ], 404);
            }

            $businessId = $outlet->business_id;
            $outletId = $outlet->id;
        }

        // Find discount
        $discount = Discount::where('code', $request->discount_code)
            ->where('business_id', $businessId)
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('starts_at')
                      ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('ends_at')
                      ->orWhere('ends_at', '>=', now());
            })
            ->where(function($q) use ($outletId) {
                $q->where('outlet_id', $outletId)
                  ->orWhereNull('outlet_id');
            })
            ->first();

        if (!$discount) {
            return response()->json([
                'success' => false,
                'message' => 'Kode diskon tidak valid atau sudah tidak aktif'
            ], 422);
        }

        // Check minimum amount
        if ($discount->minimum_amount && $request->subtotal < $discount->minimum_amount) {
            return response()->json([
                'success' => false,
                'message' => "Minimum pembelian tidak terpenuhi. Minimum: Rp " . number_format($discount->minimum_amount, 0, ',', '.'),
                'minimum_required' => $discount->minimum_amount,
                'current_subtotal' => $request->subtotal
            ], 422);
        }

        // Check usage limit
        if ($discount->usage_limit && $discount->used_count >= $discount->usage_limit) {
            return response()->json([
                'success' => false,
                'message' => 'Kode diskon sudah mencapai batas penggunaan'
            ], 422);
        }

        // Calculate discount
        $discountAmount = $discount->type === 'percentage'
            ? ($request->subtotal * $discount->value / 100)
            : $discount->value;

        // Apply max discount if set
        if ($discount->max_discount && $discountAmount > $discount->max_discount) {
            $discountAmount = $discount->max_discount;
        }

        return response()->json([
            'success' => true,
            'message' => 'Kode diskon valid',
            'data' => [
                'discount_code' => $discount->code,
                'discount_name' => $discount->name,
                'discount_type' => $discount->type,
                'discount_value' => $discount->value,
                'discount_amount' => $discountAmount,
                'subtotal' => $request->subtotal,
                'total_after_discount' => $request->subtotal - $discountAmount,
            ]
        ]);
    }

    public function getOrderStatus($orderNumber)
    {
        // ✅ FIX: Pastikan outlet selalu di-load dengan relasi lengkap (termasuk soft deleted)
        $order = Order::with([
            'orderItems.product', 
            'table', 
            'outlet' => function($query) {
                // ✅ FIX: Load outlet termasuk yang soft deleted
                $query->withTrashed();
            },
            'discount', 
            'payments', 
            'business'
        ])
            ->where('order_number', $orderNumber)
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan'
            ], 404);
        }

        // ✅ FIX: Pastikan outlet ter-load, jika belum ada reload
        if (!$order->outlet && $order->outlet_id) {
            $order->load('outlet');
        }

        // ✅ FIX: Jika masih belum ada, coba load langsung dari database
        if (!$order->outlet && $order->outlet_id) {
            try {
                $outlet = Outlet::find($order->outlet_id);
                if ($outlet) {
                    $order->setRelation('outlet', $outlet);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to manually load outlet', [
                    'order_id' => $order->id,
                    'outlet_id' => $order->outlet_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // ✅ FIX: Log outlet info untuk debugging
        Log::info('SelfServiceController: getOrderStatus outlet check', [
            'order_id' => $order->id,
            'order_number' => $orderNumber,
            'outlet_id' => $order->outlet_id,
            'has_outlet' => !is_null($order->outlet),
            'outlet_name' => $order->outlet ? $order->outlet->name : null,
            'outlet_address' => $order->outlet ? $order->outlet->address : null,
            'outlet_phone' => $order->outlet ? $order->outlet->phone : null,
        ]);

        // ✅ NEW: Check payment status from Midtrans if payment is still pending
        if ($order->payment_status === 'pending') {
            $pendingPayment = $order->payments()
                ->where('payment_method', 'qris')
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->first();

            if ($pendingPayment && $pendingPayment->reference_number) {
                try {
                    Log::info('Checking payment status from Midtrans', [
                        'order_number' => $orderNumber,
                        'payment_reference' => $pendingPayment->reference_number,
                    ]);

                    // ✅ Get MidtransService dengan outlet config (fallback ke business lalu global)
                    $midtransService = MidtransService::forOutlet($order->outlet);
                    $transactionStatus = $midtransService->getTransactionStatus($pendingPayment->reference_number);

                    Log::info('Midtrans transaction status', [
                        'order_number' => $orderNumber,
                        'transaction_status' => $transactionStatus->transaction_status,
                        'payment_type' => $transactionStatus->payment_type ?? null,
                    ]);

                    // Update payment status if transaction is settled
                    if ($transactionStatus->transaction_status === 'settlement' ||
                        $transactionStatus->transaction_status === 'capture') {

                        DB::beginTransaction();
                        try {
                            $pendingPayment->update([
                                'status' => 'success',
                                'paid_at' => now(),
                                'payment_data' => array_merge(
                                    $pendingPayment->payment_data ?? [],
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
                                    Log::info('SelfServiceController: Assigning shift_id to self-service order (getOrderStatus)', [
                                        'order_id' => $order->id,
                                        'shift_id' => $activeShift->id,
                                        'outlet_id' => $order->outlet_id,
                                        'reason' => 'Self-service order paid via Midtrans, assigned to active shift'
                                    ]);
                                } else {
                                    Log::info('SelfServiceController: No active shift found for self-service order (getOrderStatus)', [
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

                            Log::info('Payment status updated from Midtrans check', [
                                'order_number' => $orderNumber,
                                'new_payment_status' => 'paid',
                                'new_order_status' => $newStatus,
                            ]);

                            // Reload order to get updated data
                            $order->refresh();
                            $order->load(['orderItems.product', 'table', 'outlet', 'discount', 'payments']);

                        } catch (\Exception $e) {
                            DB::rollBack();
                            Log::error('Failed to update payment status from Midtrans check', [
                                'order_number' => $orderNumber,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                } catch (\Exception $e) {
                    // If transaction not found in Midtrans, continue with current status
                    Log::warning('Failed to check payment status from Midtrans', [
                        'order_number' => $orderNumber,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Status pesanan berhasil dimuat',
            'data' => [
                'order_number' => $order->order_number,
                'type' => $order->type,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'customer_name' => $order->customer_data['name'] ?? null,
                'customer_phone' => $order->customer_data['phone'] ?? null,
                'customer_email' => $order->customer_data['email'] ?? null,
                'items' => $order->orderItems,
                'subtotal' => $order->subtotal,
                'tax_amount' => $order->tax_amount,
                'discount_amount' => $order->discount_amount,
                'discount_code' => $order->coupon_code,
                'total' => $order->total,
                'notes' => $order->notes,
                'table' => $order->table ? [
                    'id' => $order->table->id,
                    'name' => $order->table->name,
                    'qr_code' => $order->table->qr_code,
                ] : null,
                'outlet' => $this->getOutletData($order),
                'payments' => $order->payments,
                'created_at' => $order->created_at,
            ]
        ]);
    }

    /**
     * Get menu by outlet slug (New user-friendly method)
     */
    public function getMenuByOutlet($outletSlug)
    {
        \Log::info('Public Menu Request by Outlet', ['outlet_slug' => $outletSlug]);

        // Find outlet by slug
        $outlet = Outlet::where('slug', $outletSlug)
            ->where('is_active', true)
            ->first();

        if (!$outlet) {
            \Log::warning('Outlet not found or inactive', ['slug' => $outletSlug]);
            return response()->json([
                'success' => false,
                'message' => 'Outlet tidak ditemukan atau tidak aktif'
            ], 404);
        }

        // ✅ NEW: Check if self-service is enabled for this outlet
        if (!$outlet->self_service_enabled) {
            \Log::warning('Self-service disabled for outlet', [
                'outlet_id' => $outlet->id,
                'outlet_name' => $outlet->name,
                'self_service_enabled' => $outlet->self_service_enabled,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Self Service tidak diaktifkan untuk outlet ini. Silakan hubungi administrator.'
            ], 403);
        }

        \Log::info('Outlet found', [
            'outlet_id' => $outlet->id,
            'outlet_name' => $outlet->name,
            'business_id' => $outlet->business_id
        ]);

        // Get active products for this business with categories and images
        $products = Product::with('category')
            ->where('business_id', $outlet->business_id)
            ->where('is_active', true)
            ->get()
            ->map(function ($product) {
                // Add image URL (handle both old and new format)
                if ($product->image) {
                    // Remove 'storage/' prefix if exists (old format)
                    $imagePath = str_replace('storage/', '', $product->image);
                    $product->image_url = asset('storage/' . $imagePath);
                } else {
                    $product->image_url = null;
                }
                return $product;
            });

        // Get unique categories
        $categories = $products->pluck('category')->filter()->unique('id')->values();

        \Log::info('Menu loaded successfully', [
            'outlet_slug' => $outletSlug,
            'products_count' => $products->count(),
            'categories_count' => $categories->count()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Menu berhasil dimuat',
            'data' => [
                'outlet' => [
                    'id' => $outlet->id,
                    'name' => $outlet->name,
                    'slug' => $outlet->slug,
                    'address' => $outlet->address ?? null,
                    'phone' => $outlet->phone ?? null,
                    'tax_rate' => $outlet->getEffectiveTaxRate(),
                ],
                'products' => $products,
                'categories' => $categories,
            ]
        ]);
    }

    /**
     * Place order by outlet slug (New user-friendly method)
     */
    public function placeOrderByOutlet(Request $request, $outletSlug)
    {
        \Log::info('Place Order Request by Outlet', [
            'outlet_slug' => $outletSlug,
            'customer_name' => $request->customer_name
        ]);

        // Find outlet by slug
        $outlet = Outlet::where('slug', $outletSlug)
            ->where('is_active', true)
            ->first();

        if (!$outlet) {
            return response()->json([
                'success' => false,
                'message' => 'Outlet tidak ditemukan atau tidak aktif'
            ], 404);
        }

        // ✅ NEW: Check if self-service is enabled for this outlet
        if (!$outlet->self_service_enabled) {
            \Log::warning('Self-service disabled for outlet', [
                'outlet_id' => $outlet->id,
                'outlet_name' => $outlet->name,
                'self_service_enabled' => $outlet->self_service_enabled,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Self Service tidak diaktifkan untuk outlet ini. Silakan hubungi administrator.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'customer_email' => 'nullable|email|max:255',
            'jumlah_orang' => 'nullable|integer|min:1|max:100', // ✅ NEW: Jumlah orang (1-100)
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'discount_code' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak valid',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Find or create customer (only if phone is provided)
            $customer = null;
            $customerId = null;

            if ($request->customer_phone) {
                $customer = Customer::where('business_id', $outlet->business_id)
                    ->where('phone', $request->customer_phone)
                    ->first();

                if (!$customer) {
                    $customer = Customer::create([
                        'business_id' => $outlet->business_id,
                        'name' => $request->customer_name ?: 'Guest',
                        'phone' => $request->customer_phone,
                        'email' => $request->customer_email,
                        'total_spent' => 0,
                        'total_visits' => 0,
                    ]);
                }

                $customerId = $customer->id;
            }

            // Calculate subtotal
            $subtotal = 0;
            foreach ($request->items as $item) {
                $subtotal += $item['quantity'] * $item['price'];
            }

            // Validate and apply discount if provided
            $discountAmount = 0;
            $discountId = null;
            $couponCode = null;

            if ($request->discount_code) {
                $discount = Discount::where('code', $request->discount_code)
                    ->where('business_id', $outlet->business_id)
                    ->where('is_active', true)
                    ->where(function ($query) {
                        $query->whereNull('starts_at')
                              ->orWhere('starts_at', '<=', now());
                    })
                    ->where(function ($query) {
                        $query->whereNull('ends_at')
                              ->orWhere('ends_at', '>=', now());
                    })
                    ->where(function($q) use ($outlet) {
                        $q->where('outlet_id', $outlet->id)
                          ->orWhereNull('outlet_id');
                    })
                    ->first();

                if (!$discount) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Kode diskon tidak valid atau sudah tidak aktif'
                    ], 422);
                }

                // Check minimum amount
                if ($discount->minimum_amount && $subtotal < $discount->minimum_amount) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => "Minimum pembelian tidak terpenuhi. Minimum: Rp " . number_format($discount->minimum_amount, 0, ',', '.')
                    ], 422);
                }

                // Check usage limit
                if ($discount->usage_limit && $discount->used_count >= $discount->usage_limit) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Kode diskon sudah mencapai batas penggunaan'
                    ], 422);
                }

                // Calculate discount
                $discountAmount = $discount->type === 'percentage'
                    ? ($subtotal * $discount->value / 100)
                    : $discount->value;

                // Apply max discount if set
                if ($discount->max_discount && $discountAmount > $discount->max_discount) {
                    $discountAmount = $discount->max_discount;
                }

                $discountId = $discount->id;
                $couponCode = $discount->code;

                // Increment usage count
                $discount->increment('used_count');
            }

            // Calculate tax based on outlet's tax rate
            $taxRate = $outlet->getEffectiveTaxRate();
            $taxAmount = ($subtotal - $discountAmount) * ($taxRate / 100);

            // Calculate total
            $total = $subtotal + $taxAmount - $discountAmount;

            // Generate order number
            $orderNumber = 'OL-' . strtoupper(substr(uniqid(), -8));

            // Create order (without table_id for outlet orders)
            $order = Order::create([
                'business_id' => $outlet->business_id,
                'outlet_id' => $outlet->id,
                'customer_id' => $customerId,
                'order_number' => $orderNumber,
                'customer_data' => [
                    'name' => $request->customer_name ?: 'Guest',
                    'phone' => $request->customer_phone,
                    'email' => $request->customer_email,
                    'jumlah_orang' => $request->jumlah_orang ?? 1, // ✅ NEW: Jumlah orang
                ],
                'status' => 'pending',
                'notes' => $request->notes,
                'type' => 'online',
                'payment_status' => 'pending',
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'discount_id' => $discountId,
                'coupon_code' => $couponCode,
                'total' => $total,
                'ordered_at' => now(),
            ]);

            // Create order items
            foreach ($request->items as $item) {
                $itemSubtotal = $item['quantity'] * $item['price'];

                // Get product name
                $product = Product::find($item['product_id']);

                $order->orderItems()->create([
                    'product_id' => $item['product_id'],
                    'product_name' => $product->name,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $itemSubtotal,
                ]);
            }

            DB::commit();

            \Log::info('Order created successfully', [
                'order_number' => $orderNumber,
                'outlet_slug' => $outletSlug,
                'total' => $total
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pesanan berhasil dibuat',
                'data' => [
                    'order_number' => $orderNumber,
                    'order' => $order->load('orderItems.product'),
                    'customer' => $customer,
                    'discount_applied' => $discountAmount > 0,
                    'discount_amount' => $discountAmount,
                    'payment_method' => $paymentMethod,
                    'payment_status' => $paymentStatus,
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Self-Service Order Error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat membuat pesanan',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Create Midtrans payment for self-service order
     */
    public function createMidtransPayment(Request $request, $orderNumber)
    {
        try {
            Log::info('Creating Midtrans payment for self-service', ['order_number' => $orderNumber]);

            // Find order by order number
            $order = Order::with(['customer', 'business', 'outlet'])
                ->where('order_number', $orderNumber)
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pesanan tidak ditemukan'
                ], 404);
            }

            Log::info('Order found', [
                'order_id' => $order->id,
                'payment_status' => $order->payment_status,
                'total' => $order->total,
            ]);

            // Check if order is already paid
            if ($order->payment_status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Pesanan sudah dibayar',
                ], 400);
            }

            // Generate unique payment reference
            $paymentReference = 'SS-' . $order->id . '-' . time();

            // Create or update payment record
            $payment = Payment::updateOrCreate(
                [
                    'order_id' => $order->id,
                    'payment_method' => 'qris',
                ],
                [
                    'amount' => $order->total,
                    'reference_number' => $paymentReference,
                    'status' => 'pending',
                ]
            );

            // Get customer data from order
            $customerData = $order->customer_data ?? [];
            $customerName = $customerData['name'] ?? ($order->customer->name ?? 'Guest');
            $customerEmail = $customerData['email'] ?? ($order->customer->email ?? 'guest@example.com');
            $customerPhone = $customerData['phone'] ?? ($order->customer->phone ?? '');

            // Prepare Midtrans parameters
            $params = [
                'order_id' => $paymentReference,
                'gross_amount' => (int) $order->total,
                'item_id' => 'order-' . $order->id,
                'item_name' => 'Self Service Order #' . $order->order_number,
                'price' => (int) $order->total,
                'customer_name' => $customerName,
                'customer_email' => $customerEmail,
                'customer_phone' => $customerPhone,
                'enabled_payments' => [
                    'gopay',
                    'shopeepay',
                    'qris',
                    'credit_card',
                    'bca_va',
                    'bni_va',
                    'bri_va',
                    'mandiri_va',
                    'permata_va',
                    'other_va',
                ],
            ];

            Log::info('Midtrans params', ['params' => $params]);

            // ✅ Get MidtransService dengan outlet config (fallback ke business lalu global)
            $midtransService = MidtransService::forOutlet($order->outlet);

            // Create Snap token
            $snapToken = $midtransService->createSnapToken($params);

            // Update payment with snap token
            $payment->update([
                'payment_data' => [
                    'snap_token' => $snapToken,
                    'created_at' => now()->toIso8601String(),
                ],
            ]);

            // Update order payment status to pending
            $order->update([
                'payment_status' => 'pending',
            ]);

            Log::info('Midtrans payment created for self-service', [
                'order_id' => $order->id,
                'order_number' => $orderNumber,
                'payment_reference' => $paymentReference,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pembayaran Midtrans berhasil dibuat',
                'data' => [
                    'payment_id' => $payment->id,
                    'snap_token' => $snapToken,
                    'payment_reference' => $paymentReference,
                    'amount' => $order->total,
                    'client_key' => $midtransService->getClientKey(), // ✅ Pakai client key dari business
                    'order_number' => $order->order_number,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create Midtrans payment for self-service', [
                'order_number' => $orderNumber ?? 'N/A',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat pembayaran Midtrans: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }
}
