<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ImageOptimizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    /**
     * Combined endpoint untuk initial load - return products + categories
     * Mengurangi API calls dari 2 menjadi 1
     */
    public function getInitialData(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        // ✅ OPTIMIZATION: Gunakan database aggregation, bukan filter di PHP
        $stats = [
            'total_all_products' => Product::where('business_id', $businessId)
                ->where('is_active', true)
                ->count(),
            'low_stock' => Product::where('business_id', $businessId)
                ->where('is_active', true)
                ->whereColumn('stock', '<', DB::raw('COALESCE(min_stock, 10)'))
                ->where('stock', '>', 0)
                ->count(),
            'out_of_stock' => Product::where('business_id', $businessId)
                ->where('is_active', true)
                ->where('stock', 0)
                ->count(),
            'stock_value' => Product::where('business_id', $businessId)
                ->where('is_active', true)
                ->selectRaw('SUM(price * stock) as total')
                ->value('total') ?? 0,
        ];

        // Get categories dengan cache
        $cacheKey = "categories:business:{$businessId}";
        $categories = \Illuminate\Support\Facades\Cache::remember($cacheKey, 3600, function() use ($businessId) {
            return \App\Models\Category::where('business_id', $businessId)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();
        });

        // Get products (paginated)
        $perPage = $request->query('per_page', 10);
        $query = Product::with(['category:id,name'])
            ->select(['id', 'name', 'sku', 'price', 'cost', 'stock', 'stock_type', 'min_stock', 'image', 'category_id', 'is_active', 'created_at',
                     'discount_price', 'discount_percentage', 'discount_start_date', 'discount_end_date']) // Include discount fields
            ->where('business_id', $businessId)
            ->where('is_active', true);

        // Apply filters jika ada
        if ($request->has('search') && !empty($request->search)) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('sku', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('description', 'LIKE', "%{$searchTerm}%");
            });
        }

        if ($request->has('category') && !empty($request->category)) {
            $query->where('category_id', $request->category);
        }

        // Apply sorting
        $sortField = $request->get('sort_field', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $allowedSortFields = ['name', 'price', 'stock', 'created_at', 'category_id', 'sku'];

        if (in_array($sortField, $allowedSortFields)) {
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $products = $query->paginate($perPage);

        // Tambahkan stats ke products response
        $productsArray = $products->toArray();
        $productsArray['stats'] = $stats;

        // Return combined response
        return response()->json([
            'products' => $productsArray,
            'categories' => $categories
        ]);
    }

    public function apiIndex(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        // Check if paginate query param exists
        $perPage = $request->query('per_page', null);

        if ($perPage) {
            // ✅ OPTIMIZATION: Cache stats untuk 5 menit (tidak sering berubah)
            $statsCacheKey = "products_stats:business:{$businessId}";
            $stats = \Illuminate\Support\Facades\Cache::remember($statsCacheKey, 300, function() use ($businessId) {
                return [
                    'total_all_products' => Product::where('business_id', $businessId)
                        ->where('is_active', true)
                        ->count(),
                    'low_stock' => Product::where('business_id', $businessId)
                        ->where('is_active', true)
                        ->whereColumn('stock', '<', DB::raw('COALESCE(min_stock, 10)'))
                        ->where('stock', '>', 0)
                        ->count(),
                    'out_of_stock' => Product::where('business_id', $businessId)
                        ->where('is_active', true)
                        ->where('stock', 0)
                        ->count(),
                    'stock_value' => Product::where('business_id', $businessId)
                        ->where('is_active', true)
                        ->selectRaw('SUM(price * stock) as total')
                        ->value('total') ?? 0,
                ];
            });

            // Return paginated response for product management
            $query = Product::with(['category:id,name']) // Only select needed fields
                ->select(['id', 'name', 'sku', 'price', 'cost', 'stock', 'stock_type', 'min_stock', 'image', 'category_id', 'is_active', 'created_at',
                         'discount_price', 'discount_percentage', 'discount_start_date', 'discount_end_date']) // Include discount fields and stock_type
                ->where('business_id', $businessId)
                ->where('is_active', true); // Only active products

            // Apply search filter
            if ($request->has('search') && !empty($request->search)) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('name', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('sku', 'LIKE', "%{$searchTerm}%")
                      ->orWhere('description', 'LIKE', "%{$searchTerm}%");
                });
            }

            // Apply category filter
            if ($request->has('category') && !empty($request->category)) {
                $query->where('category_id', $request->category);
            }

            // Apply sorting
            $sortField = $request->get('sort_field', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');

            // Validate sort field to prevent SQL injection
            $allowedSortFields = ['name', 'price', 'stock', 'created_at', 'category_id', 'sku'];
            if (in_array($sortField, $allowedSortFields)) {
                $query->orderBy($sortField, $sortDirection);
            } else {
                $query->orderBy('created_at', 'desc');
            }

            $products = $query->paginate($perPage);

            // Tambahkan stats ke response
            $response = $products->toArray();
            $response['stats'] = $stats;

            return response()->json($response);
        } else {
            // ✅ OPTIMIZATION: Cache products untuk POS (no pagination) - 1 menit
            // Products bisa berubah saat transaksi (stock), tapi tidak terlalu sering
            $cacheKey = "products_pos:business:{$businessId}";
            $products = \Illuminate\Support\Facades\Cache::remember($cacheKey, 60, function() use ($businessId) {
                return Product::with('category:id,name')
                    ->select(['id', 'name', 'sku', 'price', 'cost', 'stock', 'stock_type', 'min_stock', 'image', 'category_id', 'is_active', 'description',
                             'discount_price', 'discount_percentage', 'discount_start_date', 'discount_end_date'])
                    ->where('business_id', $businessId)
                    ->where('is_active', true)
                    ->orderBy('name', 'asc')
                    ->get();
            });

            return response()->json($products);
        }
    }

    public function store(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        // Check subscription limit
        $business = \App\Models\Business::with('currentSubscription.subscriptionPlan')->find($businessId);
        if (!$business) {
            return response()->json(['message' => 'Business not found'], 404);
        }

        if (!$business->canCreateProduct()) {
            $limits = $business->getSubscriptionLimits();
            $currentPlan = $business->currentSubscription->subscriptionPlan->name ?? 'Current';

            return response()->json([
                'success' => false,
                'error' => 'subscription_limit_reached',
                'message' => sprintf(
                    'Batas paket %s tercapai! Anda hanya bisa membuat %s produk. Saat ini Anda sudah memiliki %d produk.',
                    $currentPlan,
                    $limits['max_products'] === -1 ? 'unlimited' : $limits['max_products'],
                    $limits['current_products']
                ),
                'upgrade_message' => 'Upgrade paket subscription Anda untuk menambah lebih banyak produk dan fitur premium lainnya!',
                'limits' => $limits,
                'action' => 'upgrade_subscription',
                'upgrade_url' => '/subscription-settings'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'sku' => 'nullable|string|max:100|unique:products,sku,NULL,id,business_id,' . $businessId,
            'price' => 'required|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'stock_type' => 'nullable|in:tracked,untracked',
            'stock' => 'nullable|integer|min:0',
            'min_stock' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'discount_price' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_start_date' => 'nullable|date',
            'discount_end_date' => 'nullable|date|after_or_equal:discount_start_date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify category belongs to the same business
        $category = \App\Models\Category::find($request->category_id);
        if (!$category || $category->business_id != $businessId) {
            return response()->json(['errors' => ['category_id' => ['Invalid category']]], 422);
        }

        // ✅ DEBUG: Log request data untuk troubleshooting
        \Log::info('Product Create - Request data', [
            'stock_type' => $request->input('stock_type'),
            'stock' => $request->input('stock'),
            'has_stock_type' => $request->has('stock_type'),
            'all_request' => $request->except(['image']),
        ]);

        $productData = array_merge($request->except('image'), [
            'business_id' => $businessId,
            'slug' => \Illuminate\Support\Str::slug($request->name),
            'sku' => $request->sku ?? 'SKU-' . strtoupper(\Illuminate\Support\Str::random(8)),
            'stock_type' => $request->stock_type ?? 'tracked',
        ]);

        // ✅ FIX: Handle stock - ensure it's never null for database
        // If stock is empty, null, or not provided, set based on stock_type
        if (!isset($productData['stock']) || $productData['stock'] === '' || $productData['stock'] === null) {
            // For tracked products, default to 0 if not provided
            // For untracked products, always 0
            $productData['stock'] = 0;
        } else {
            // Ensure stock is an integer
            $productData['stock'] = (int) $productData['stock'];
        }

        // Set stock to 0 for untracked products (always)
        if ($productData['stock_type'] === 'untracked') {
            $productData['stock'] = 0;
        }

        // ✅ DEBUG: Log final product data before save
        \Log::info('Product Create - Final data', [
            'stock_type' => $productData['stock_type'],
            'stock' => $productData['stock'],
            'name' => $productData['name'],
        ]);

        // Handle image upload dengan optimization dan WebP conversion
        if ($request->hasFile('image')) {
            $imageService = new ImageOptimizationService();
            $productData['image'] = $imageService->optimizeAndSave(
                $request->file('image'),
                'products',
                800,  // max width
                85    // quality
            );
        }

        $product = Product::create($productData);

        // ✅ Clear cache setelah create
        \Illuminate\Support\Facades\Cache::forget("products_pos:business:{$businessId}");
        \Illuminate\Support\Facades\Cache::forget("products_stats:business:{$businessId}");
        \Illuminate\Support\Facades\Cache::forget("categories:business:{$businessId}"); // Clear category cache untuk update products_count

        return response()->json($product->load('category'), 201);
    }

    public function apiShow(Request $request, Product $product)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only view products from their business
        if ($product->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($product->load('category'));
    }

    public function update(Request $request, Product $product)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only update products from their business
        if ($product->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // ✅ FIX: Clean request data - convert empty strings to null for nullable numeric fields
        // IMPORTANT: Don't clean stock_type - it must be preserved as string
        $requestData = $request->all();

        // ✅ FIX: Preserve stock_type from request BEFORE cleaning (don't let it be lost)
        // Get stock_type directly from request before any processing
        $stockTypeFromRequest = $request->input('stock_type');

        // ✅ FIX: Ensure stock_type is in requestData for validation
        if ($stockTypeFromRequest !== null && $stockTypeFromRequest !== '') {
            $requestData['stock_type'] = $stockTypeFromRequest;
        }

        $fieldsToClean = ['discount_price', 'discount_percentage', 'cost', 'min_stock', 'stock'];
        foreach ($fieldsToClean as $field) {
            if (isset($requestData[$field]) && $requestData[$field] === '') {
                $requestData[$field] = null;
            }
        }

        // ✅ FIX: Normalize stock_type value before validation
        if (isset($requestData['stock_type'])) {
            $requestData['stock_type'] = strtolower(trim($requestData['stock_type']));
            // Ensure it's either 'tracked' or 'untracked'
            if ($requestData['stock_type'] !== 'tracked' && $requestData['stock_type'] !== 'untracked') {
                // If invalid, default to 'tracked'
                $requestData['stock_type'] = 'tracked';
            }
        }

        // ✅ FIX: Ensure required fields are present for update
        // If field is present but empty, use existing value
        if (isset($requestData['name']) && (empty($requestData['name']) || trim($requestData['name']) === '')) {
            $requestData['name'] = $product->name;
        }
        if (isset($requestData['category_id']) && (empty($requestData['category_id']) || $requestData['category_id'] === '')) {
            $requestData['category_id'] = $product->category_id;
        } elseif (isset($requestData['category_id'])) {
            // Ensure category_id is integer
            $requestData['category_id'] = (int) $requestData['category_id'];
        }
        if (isset($requestData['price']) && ($requestData['price'] === '' || $requestData['price'] === null)) {
            $requestData['price'] = $product->price;
        } elseif (isset($requestData['price'])) {
            // Ensure price is numeric
            $requestData['price'] = (float) $requestData['price'];
        }

        // ✅ FIX: More flexible validation for update
        // Only validate fields that are actually being updated
        $validationRules = [
            'sku' => 'sometimes|string|max:100|unique:products,sku,' . $product->id . ',id,business_id,' . $businessId,
            'cost' => 'nullable|numeric|min:0',
            'stock_type' => 'nullable|in:tracked,untracked',
            'stock' => 'nullable|integer|min:0',
            'min_stock' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'discount_price' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_start_date' => 'nullable|date',
            'discount_end_date' => 'nullable|date|after_or_equal:discount_start_date',
        ];

        // ✅ FIX: Only validate image if it's actually a file upload (not a URL string)
        // If image is a string URL, it means we're keeping the existing image, so skip validation
        if ($request->hasFile('image')) {
            $validationRules['image'] = 'image|mimes:jpeg,png,jpg,gif,webp|max:2048';
        }

        // Only add required validation if field is present in request
        if (isset($requestData['name']) && $requestData['name'] !== '') {
            $validationRules['name'] = 'required|string|max:255';
        }
        if (isset($requestData['category_id']) && $requestData['category_id'] !== '') {
            $validationRules['category_id'] = 'required|exists:categories,id';
        }
        if (isset($requestData['price']) && $requestData['price'] !== '') {
            $validationRules['price'] = 'required|numeric|min:0';
        }

        $validator = Validator::make($requestData, $validationRules);

        if ($validator->fails()) {
            // ✅ DEBUG: Log validation errors untuk troubleshooting
            \Log::error('Product update validation failed', [
                'product_id' => $product->id,
                'errors' => $validator->errors()->toArray(),
                'request_data' => $request->all(),
                'cleaned_data' => $requestData,
                'stock_type_from_request' => $stockTypeFromRequest,
                'stock_type_in_requestData' => $requestData['stock_type'] ?? 'not set',
            ]);
            return response()->json([
                'errors' => $validator->errors(),
                'message' => 'Validation failed',
                'debug' => [
                    'received_data' => $request->all(),
                    'cleaned_data' => $requestData,
                    'stock_type_from_request' => $stockTypeFromRequest,
                    'stock_type_in_requestData' => $requestData['stock_type'] ?? 'not set',
                ]
            ], 422);
        }

        // Verify category belongs to the same business if updating category
        if ($request->has('category_id')) {
            $category = \App\Models\Category::find($request->category_id);
            if (!$category || $category->business_id != $businessId) {
                return response()->json(['errors' => ['category_id' => ['Invalid category']]], 422);
            }
        }

        // ✅ FIX: Use cleaned data instead of raw request, but keep image handling separate
        $updateData = $requestData;
        unset($updateData['image']);
        unset($updateData['remove_image']);
        unset($updateData['_method']);
        if ($request->has('name')) {
            $updateData['slug'] = \Illuminate\Support\Str::slug($request->name);
        }

        // ✅ FIX: Always update stock_type if provided in request
        // IMPORTANT: Get stock_type directly from request, not from cleaned data
        // because FormData might not be in cleaned data properly

        // Log untuk debugging - check all possible sources
        \Log::info('Product Update - stock_type check', [
            'product_id' => $product->id,
            'request_input_stock_type' => $request->input('stock_type'),
            'request_has_stock_type' => $request->has('stock_type'),
            'requestData_stock_type' => $requestData['stock_type'] ?? 'not in requestData',
            'stockTypeFromRequest' => $stockTypeFromRequest,
            'current_stock_type' => $product->stock_type,
            'all_request_data' => $request->all(),
            'request_method' => $request->method(),
            'request_content_type' => $request->header('Content-Type'),
        ]);

        // ✅ FIX: Always update stock_type if provided in request (don't use existing value)
        // Priority: 1. stockTypeFromRequest (captured before cleaning), 2. request->input, 3. requestData
        if ($stockTypeFromRequest !== null && $stockTypeFromRequest !== '') {
            $updateData['stock_type'] = $stockTypeFromRequest;
            \Log::info('Product Update - Using stock_type from captured request', [
                'product_id' => $product->id,
                'new_stock_type' => $updateData['stock_type'],
            ]);
        } elseif ($request->has('stock_type') && $request->input('stock_type') !== null && $request->input('stock_type') !== '') {
            $updateData['stock_type'] = $request->input('stock_type');
            \Log::info('Product Update - Using stock_type from request->input', [
                'product_id' => $product->id,
                'new_stock_type' => $updateData['stock_type'],
            ]);
        } elseif (isset($requestData['stock_type']) && $requestData['stock_type'] !== null && $requestData['stock_type'] !== '') {
            // Fallback: check requestData directly
            $updateData['stock_type'] = $requestData['stock_type'];
            \Log::info('Product Update - Using stock_type from requestData', [
                'product_id' => $product->id,
                'new_stock_type' => $updateData['stock_type'],
            ]);
        } else {
            // Only use existing value if not provided at all
            $updateData['stock_type'] = $product->stock_type ?? 'tracked';
            \Log::warning('Product Update - Using existing stock_type (not provided in request)', [
                'product_id' => $product->id,
                'existing_stock_type' => $updateData['stock_type'],
            ]);
        }

        // ✅ FIX: Handle stock - ensure it's never null for database
        if (isset($updateData['stock'])) {
            // If stock is empty string or null, set to 0
            if ($updateData['stock'] === '' || $updateData['stock'] === null) {
                $updateData['stock'] = 0;
            } else {
                // Ensure stock is an integer
                $updateData['stock'] = (int) $updateData['stock'];
            }
        } else {
            // If stock is not provided, keep existing value or set to 0
            $updateData['stock'] = $product->stock ?? 0;
        }

        // Handle stock_type changes
        if (isset($updateData['stock_type']) && $updateData['stock_type'] === 'untracked') {
            // Set stock to 0 for untracked products (always)
            $updateData['stock'] = 0;
        }

        // ✅ DEBUG: Log final update data
        \Log::info('Product Update - Final data', [
            'product_id' => $product->id,
            'stock_type' => $updateData['stock_type'] ?? 'not set',
            'stock' => $updateData['stock'] ?? 'not set',
            'all_update_data' => $updateData,
        ]);

        // Handle image removal
        if ($request->has('remove_image') && $request->remove_image == '1') {
            // Delete old image if exists
            $imageService = new ImageOptimizationService();
            $imageService->deleteImage($product->image);
            $updateData['image'] = null;
        }
        // Handle image upload (new image) dengan optimization dan WebP conversion
        elseif ($request->hasFile('image')) {
            // Delete old image if exists
            $imageService = new ImageOptimizationService();
            $imageService->deleteImage($product->image);

            // Optimize and save new image
            $updateData['image'] = $imageService->optimizeAndSave(
                $request->file('image'),
                'products',
                800,  // max width
                85    // quality
            );
        }
        // If neither remove_image nor new image file, keep existing image (don't touch it)

        // ✅ DEBUG: Log before update
        \Log::info('Product Update - Before save', [
            'product_id' => $product->id,
            'updateData_stock_type' => $updateData['stock_type'] ?? 'not set',
            'updateData_stock' => $updateData['stock'] ?? 'not set',
            'updateData_name' => $updateData['name'] ?? 'not set',
            'updateData_category_id' => $updateData['category_id'] ?? 'not set',
            'updateData_price' => $updateData['price'] ?? 'not set',
            'current_product_stock_type' => $product->stock_type,
            'current_product_stock' => $product->stock,
            'all_updateData_keys' => array_keys($updateData),
            'all_updateData' => $updateData,
        ]);

        // ✅ FIX: Force update stock_type even if it seems unchanged
        // Use fill() and save() to ensure all fields are updated
        $product->fill($updateData);
        $product->save();

        // ✅ DEBUG: Log after update - reload to verify
        $product->refresh();
        \Log::info('Product Update - After save', [
            'product_id' => $product->id,
            'saved_stock_type' => $product->stock_type,
            'saved_stock' => $product->stock,
            'was_changed' => $product->wasChanged('stock_type'),
        ]);

        // ✅ Clear cache setelah update
        \Illuminate\Support\Facades\Cache::forget("products_pos:business:{$businessId}");
        \Illuminate\Support\Facades\Cache::forget("products_stats:business:{$businessId}");
        \Illuminate\Support\Facades\Cache::forget("categories:business:{$businessId}"); // Clear category cache untuk update products_count

        return response()->json($product->load('category'));
    }

    public function destroy(Request $request, Product $product)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only delete products from their business
        if ($product->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // ✅ FIX: Delete product image before deleting product
        if ($product->image) {
            $imageService = new ImageOptimizationService();
            $imageService->deleteImage($product->image);
        }

        $product->delete();

        // ✅ Clear cache setelah delete
        \Illuminate\Support\Facades\Cache::forget("products_pos:business:{$businessId}");
        \Illuminate\Support\Facades\Cache::forget("products_stats:business:{$businessId}");
        \Illuminate\Support\Facades\Cache::forget("categories:business:{$businessId}"); // Clear category cache untuk update products_count

        return response()->json(['message' => 'Product deleted successfully']);
    }

    public function stockAdjustment(Request $request, Product $product)
    {
        $businessId = $request->header('X-Business-Id');

        // Ensure user can only adjust stock for products from their business
        if ($product->business_id != $businessId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'adjustment' => 'required|integer',
            'reason' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $newStock = $product->stock + $request->adjustment;

        // Prevent negative stock
        if ($newStock < 0) {
            return response()->json([
                'errors' => ['adjustment' => ['Stock cannot be negative. Current stock: ' . $product->stock]]
            ], 422);
        }

        $product->stock = $newStock;
        $product->save();

        // ✅ Clear cache setelah stock adjustment
        $businessId = $product->business_id;
        \Illuminate\Support\Facades\Cache::forget("products_pos:business:{$businessId}");
        \Illuminate\Support\Facades\Cache::forget("products_stats:business:{$businessId}");

        // Optionally log the adjustment
        // \App\Models\InventoryMovement::create([...]);

        return response()->json($product->load('category'));
    }
}
