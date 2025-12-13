<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Order;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PublicOutletController extends Controller
{
    /**
     * Get public outlet information by slug
     */
    public function getOutletBySlug($slug)
    {
        $outlet = Outlet::with(['business', 'businessType'])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->where('is_public', true)
            ->first();

        if (!$outlet) {
            return response()->json([
                'success' => false,
                'message' => 'Outlet tidak ditemukan atau tidak tersedia'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $outlet->id,
                'name' => $outlet->name,
                'slug' => $outlet->slug,
                'description' => $outlet->description,
                'address' => $outlet->address,
                'phone' => $outlet->phone,
                'logo' => $outlet->logo,
                'cover_image' => $outlet->cover_image,
                'business' => [
                    'id' => $outlet->business->id,
                    'name' => $outlet->business->name,
                ],
                'business_type' => $outlet->businessType ? [
                    'id' => $outlet->businessType->id,
                    'name' => $outlet->businessType->name,
                ] : null,
            ]
        ]);
    }

    /**
     * Get products/menu for public outlet
     */
    public function getOutletProducts($slug, Request $request)
    {
        $outlet = Outlet::where('slug', $slug)
            ->where('is_active', true)
            ->where('is_public', true)
            ->first();

        if (!$outlet) {
            return response()->json([
                'success' => false,
                'message' => 'Outlet tidak ditemukan'
            ], 404);
        }

        $query = Product::where('business_id', $outlet->business_id)
            ->where('is_active', true)
            ->with(['category']);

        // Filter by category if provided
        if ($request->has('category_id') && $request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        // Search by name
        if ($request->has('search') && $request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Sort by
        $sortBy = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 20);
        $products = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }

    /**
     * Get categories for outlet
     */
    public function getOutletCategories($slug)
    {
        $outlet = Outlet::where('slug', $slug)
            ->where('is_active', true)
            ->where('is_public', true)
            ->first();

        if (!$outlet) {
            return response()->json([
                'success' => false,
                'message' => 'Outlet tidak ditemukan'
            ], 404);
        }

        $categories = Category::where('business_id', $outlet->business_id)
            ->withCount(['products' => function ($query) {
                $query->where('is_active', true);
            }])
            ->having('products_count', '>', 0)
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }

    /**
     * Place order from public customer
     */
    public function placeOrder($slug, Request $request)
    {
        $outlet = Outlet::where('slug', $slug)
            ->where('is_active', true)
            ->where('is_public', true)
            ->first();

        if (!$outlet) {
            return response()->json([
                'success' => false,
                'message' => 'Outlet tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:20',
            'customer_email' => 'nullable|email|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string|max:500',
            'table_id' => 'nullable|exists:tables,id',
            'delivery_address' => 'nullable|string',
            'order_type' => 'required|in:dine_in,takeaway,delivery',
            'payment_method' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Calculate total
            $total = 0;
            $orderItems = [];

            foreach ($request->items as $item) {
                $product = Product::find($item['product_id']);
                if (!$product || $product->business_id != $outlet->business_id) {
                    throw new \Exception('Invalid product');
                }

                $subtotal = $product->price * $item['quantity'];
                $total += $subtotal;

                $orderItems[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'price' => $product->price,
                    'subtotal' => $subtotal,
                    'notes' => $item['notes'] ?? null,
                ];
            }

            // Generate order number
            $orderNumber = 'ORD-' . strtoupper(uniqid());

            // Create order
            $order = Order::create([
                'business_id' => $outlet->business_id,
                'outlet_id' => $outlet->id,
                'order_number' => $orderNumber,
                'customer_name' => $request->customer_name,
                'customer_phone' => $request->customer_phone,
                'customer_email' => $request->customer_email,
                'table_id' => $request->table_id,
                'type' => 'self_service',
                'order_type' => $request->order_type,
                'status' => 'pending',
                'payment_method' => $request->payment_method,
                'payment_status' => 'pending',
                'subtotal' => $total,
                'tax' => 0,
                'discount' => 0,
                'total' => $total,
                'delivery_address' => $request->delivery_address,
                'notes' => $request->notes,
            ]);

            // Create order items
            foreach ($orderItems as $item) {
                $order->orderItems()->create($item);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pesanan berhasil dibuat',
                'data' => [
                    'order_number' => $order->order_number,
                    'order_id' => $order->id,
                    'total' => $order->total,
                    'status' => $order->status,
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat pesanan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check order status by order number (public)
     */
    public function checkOrderStatus($orderNumber)
    {
        // ✅ FIX: Load outlet dengan withTrashed untuk handle soft delete
        $order = Order::with([
            'orderItems.product', 
            'table', 
            'outlet' => function($query) {
                $query->withTrashed();
            }
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
            $order->load(['outlet' => function($query) {
                $query->withTrashed();
            }]);
        }

        // ✅ FIX: Jika masih belum ada, coba load langsung dari database
        if (!$order->outlet && $order->outlet_id) {
            try {
                $outlet = Outlet::withTrashed()->find($order->outlet_id);
                if ($outlet) {
                    $order->setRelation('outlet', $outlet);
                }
            } catch (\Exception $e) {
                \Log::warning('Failed to manually load outlet in PublicOutletController', [
                    'order_id' => $order->id,
                    'outlet_id' => $order->outlet_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // ✅ FIX: Helper untuk get outlet data
        $getOutletData = function() use ($order) {
            if ($order->outlet) {
                return [
                    'id' => $order->outlet->id,
                    'name' => $order->outlet->name ?? 'Outlet',
                    'address' => $order->outlet->address ?? null,
                    'phone' => $order->outlet->phone ?? null,
                ];
            }
            
            // Fallback: load manual jika outlet_id ada
            if ($order->outlet_id) {
                try {
                    $outlet = Outlet::withTrashed()->find($order->outlet_id);
                    if ($outlet) {
                        return [
                            'id' => $outlet->id,
                            'name' => $outlet->name ?? 'Outlet',
                            'address' => $outlet->address ?? null,
                            'phone' => $outlet->phone ?? null,
                        ];
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to load outlet in getOutletData', [
                        'order_id' => $order->id,
                        'outlet_id' => $order->outlet_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
            
            return null;
        };

        // ✅ FIX: Get customer data dari customer_data JSON atau customer relation
        $customerName = null;
        $customerPhone = null;
        $customerEmail = null;
        
        if ($order->customer) {
            $customerName = $order->customer->name;
            $customerPhone = $order->customer->phone;
            $customerEmail = $order->customer->email;
        } elseif ($order->customer_data) {
            $customerData = is_array($order->customer_data) ? $order->customer_data : json_decode($order->customer_data, true);
            $customerName = $customerData['name'] ?? null;
            $customerPhone = $customerData['phone'] ?? null;
            $customerEmail = $customerData['email'] ?? null;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'total' => $order->total,
                'subtotal' => $order->subtotal ?? $order->total,
                'tax_amount' => $order->tax_amount ?? 0,
                'discount_amount' => $order->discount_amount ?? 0,
                'paid_amount' => $order->paid_amount ?? 0,
                'outlet' => $getOutletData(), // ✅ FIX: Kirim sebagai object, bukan string
                'table' => $order->table ? [
                    'id' => $order->table->id,
                    'name' => $order->table->name,
                ] : null,
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone,
                'customer_email' => $customerEmail,
                'created_at' => $order->created_at,
                'ordered_at' => $order->ordered_at ?? $order->created_at,
                'items' => $order->orderItems->map(function ($item) {
                    return [
                        'product_name' => $item->product->name ?? $item->product_name ?? 'Product',
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                        'subtotal' => $item->subtotal,
                    ];
                }),
            ]
        ]);
    }
}
