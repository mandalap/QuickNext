<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\Business;
use App\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    /**
     * Get combined dashboard data for product management
     * This reduces multiple API calls into one
     */
    public function getProductManagementData(Request $request)
    {
        try {
            $user = Auth::user();
            $businessId = $user->business_id;

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business not found'
                ], 404);
            }

            // Get business info
            $business = Business::select(['id', 'name', 'subscription_plan'])
                ->where('id', $businessId)
                ->first();

            // Get outlets
            $outlets = Outlet::select(['id', 'name', 'address'])
                ->where('business_id', $businessId)
                ->get();

            // Get current outlet (if specified)
            $currentOutletId = $request->get('outlet_id');
            $currentOutlet = $outlets->where('id', $currentOutletId)->first();

            // Get categories with product count
            $categories = Category::select(['id', 'name', 'description'])
                ->where('business_id', $businessId)
                ->withCount(['products' => function($query) use ($currentOutletId) {
                    if ($currentOutletId) {
                        $query->where('outlet_id', $currentOutletId);
                    }
                }])
                ->get();

            // Get products with pagination and filters
            $perPage = $request->get('per_page', 10);
            $page = $request->get('page', 1);
            $search = $request->get('search');
            $categoryId = $request->get('category');
            $sortField = $request->get('sort_field', 'name');
            $sortDirection = $request->get('sort_direction', 'asc');

            $query = Product::with(['category:id,name'])
                ->select(['id', 'name', 'sku', 'price', 'cost', 'stock', 'min_stock', 'image', 'category_id', 'is_active', 'created_at'])
                ->where('business_id', $businessId)
                ->where('is_active', true);

            // Apply filters
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('sku', 'LIKE', "%{$search}%")
                      ->orWhere('description', 'LIKE', "%{$search}%");
                });
            }

            if ($categoryId && $categoryId !== 'all') {
                $query->where('category_id', $categoryId);
            }

            // Apply sorting
            $allowedSortFields = ['name', 'price', 'stock', 'created_at', 'category_id', 'sku'];
            if (in_array($sortField, $allowedSortFields)) {
                $query->orderBy($sortField, $sortDirection);
            } else {
                $query->orderBy('name', 'asc');
            }

            $products = $query->paginate($perPage, ['*'], 'page', $page);

            // Calculate stats - ALWAYS use total from database, not filtered query
            // Stats should reflect ALL products, not filtered results
            $totalProducts = Product::where('business_id', $businessId)
                ->where('is_active', true)
                ->count();

            $lowStockProducts = Product::where('business_id', $businessId)
                ->where('is_active', true)
                ->whereRaw('stock <= COALESCE(min_stock, 10)')
                ->count();

            $outOfStockProducts = Product::where('business_id', $businessId)
                ->where('is_active', true)
                ->where('stock', 0)
                ->count();

            $totalValue = Product::where('business_id', $businessId)
                ->where('is_active', true)
                ->sum(DB::raw('price * stock'));

            return response()->json([
                'success' => true,
                'data' => [
                    'business' => $business,
                    'outlets' => $outlets,
                    'current_outlet' => $currentOutlet,
                    'categories' => $categories,
                    'products' => $products,
                    'stats' => [
                        'total_products' => $totalProducts,
                        'low_stock_products' => $lowStockProducts,
                        'out_of_stock_products' => $outOfStockProducts,
                        'total_value' => $totalValue,
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get basic dashboard stats
     */
    public function getStats(Request $request)
    {
        try {
            $user = Auth::user();
            $businessId = $user->business_id;
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business not found'
                ], 404);
            }

            // Get basic stats
            $totalProducts = Product::where('business_id', $businessId)
                ->where('is_active', true)
                ->when($outletId, function($query) use ($outletId) {
                    $query->where('outlet_id', $outletId);
                })
                ->count();

            $lowStockProducts = Product::where('business_id', $businessId)
                ->where('is_active', true)
                ->when($outletId, function($query) use ($outletId) {
                    $query->where('outlet_id', $outletId);
                })
                ->whereRaw('stock <= COALESCE(min_stock, 10)')
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_products' => $totalProducts,
                    'low_stock_products' => $lowStockProducts,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent orders
     */
    public function getRecentOrders(Request $request)
    {
        try {
            $user = Auth::user();
            $businessId = $user->business_id;
            $outletId = $request->header('X-Outlet-Id');
            $limit = $request->get('limit', 5);
            $dateRange = $this->cleanDateRange($request->get('date_range', 'today'));
            $dateFrom = $request->get('date_from');
            $dateTo = $request->get('date_to');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business not found'
                ], 404);
            }

            // Calculate date range - support custom date range
            if ($dateFrom && $dateTo) {
                $dateFilter = [
                    'start' => \Carbon\Carbon::parse($dateFrom)->startOfDay(),
                    'end' => \Carbon\Carbon::parse($dateTo)->endOfDay()
                ];
            } else {
                $dateFilter = $this->getDateRangeFilter($dateRange);
            }

            $orders = DB::table('orders')
                ->where('business_id', $businessId)
                ->when($outletId, function($query) use ($outletId) {
                    $query->where('outlet_id', $outletId);
                })
                ->whereBetween('created_at', [$dateFilter['start'], $dateFilter['end']])
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $orders
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch recent orders: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get top products
     */
    public function getTopProducts(Request $request)
    {
        try {
            // Log request for debugging
            Log::info('getTopProducts called', [
                'path' => $request->path(),
                'full_url' => $request->fullUrl(),
                'method' => $request->method(),
                'headers' => $request->headers->all(),
                'query_params' => $request->query->all(),
                'route' => $request->route() ? $request->route()->getName() : 'no route',
            ]);

            $user = Auth::user();

            if (!$user) {
                Log::error('User not authenticated in getTopProducts');
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            // ✅ FIX: Get business_id from header first, fallback to user->business_id
            $businessId = $request->header('X-Business-Id') ?? $user->business_id;
            $outletId = $request->header('X-Outlet-Id');
            $limit = $request->get('limit', 5);
            $dateRange = $this->cleanDateRange($request->get('date_range', 'today'));
            $dateFrom = $request->get('date_from');
            $dateTo = $request->get('date_to');

            Log::info('getTopProducts params', [
                'business_id' => $businessId,
                'business_id_from_header' => $request->header('X-Business-Id'),
                'business_id_from_user' => $user->business_id,
                'outlet_id' => $outletId,
                'limit' => $limit,
                'date_range' => $dateRange,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ]);

            if (!$businessId) {
                Log::error('Business not found', [
                    'user_id' => $user->id,
                    'header_business_id' => $request->header('X-Business-Id'),
                    'user_business_id' => $user->business_id,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Business not found. Please select a business first.'
                ], 404);
            }

            // Calculate date range - support custom date range
            if ($dateFrom && $dateTo) {
                $dateFilter = [
                    'start' => \Carbon\Carbon::parse($dateFrom)->startOfDay(),
                    'end' => \Carbon\Carbon::parse($dateTo)->endOfDay()
                ];
            } else {
                $dateFilter = $this->getDateRangeFilter($dateRange);
            }

            Log::info('getTopProducts dateFilter', [
                'dateFilter' => $dateFilter,
                'dateRange' => $dateRange,
            ]);

            // ✅ FIX: Use subtotal instead of total_price (field doesn't exist)
            $topProducts = DB::table('order_items')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->when($outletId, function($query) use ($outletId) {
                    $query->where('orders.outlet_id', $outletId);
                })
                ->whereBetween('orders.created_at', [$dateFilter['start'], $dateFilter['end']])
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->selectRaw('
                    order_items.product_name,
                    order_items.product_id,
                    SUM(order_items.quantity) as total_quantity,
                    SUM(order_items.subtotal) as total_revenue,
                    COUNT(DISTINCT orders.id) as order_count
                ')
                ->groupBy('order_items.product_id', 'order_items.product_name')
                ->orderBy('total_revenue', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($item) {
                    return [
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,
                        'total_quantity' => (int) $item->total_quantity,
                        'total_revenue' => (float) $item->total_revenue,
                        'order_count' => (int) $item->order_count,
                    ];
                });

            Log::info('getTopProducts success', [
                'count' => $topProducts->count(),
                'business_id' => $businessId,
            ]);

            return response()->json([
                'success' => true,
                'data' => $topProducts
            ]);

        } catch (\Exception $e) {
            Log::error('getTopProducts error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch top products: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clean date range parameter (remove invalid characters)
     */
    private function cleanDateRange($dateRange)
    {
        if (!$dateRange || !is_string($dateRange)) {
            return 'today';
        }
        
        // Remove trailing :number (e.g., "yesterday:1" -> "yesterday")
        if (strpos($dateRange, ':') !== false) {
            $dateRange = explode(':', $dateRange)[0];
        }
        
        // Trim whitespace
        $dateRange = trim($dateRange);
        
        // Validate allowed values
        $allowedValues = ['today', 'yesterday', 'week', 'month', 'custom'];
        if (!in_array($dateRange, $allowedValues)) {
            return 'today'; // Default to today if invalid
        }
        
        return $dateRange;
    }

    /**
     * Get date range filter based on date range string
     */
    private function getDateRangeFilter($dateRange)
    {
        // Clean the date range parameter first
        $dateRange = $this->cleanDateRange($dateRange);
        
        $now = now();

        switch ($dateRange) {
            case 'today':
                return [
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            case 'yesterday':
                return [
                    'start' => $now->copy()->subDay()->startOfDay(),
                    'end' => $now->copy()->subDay()->endOfDay()
                ];
            case 'week':
                return [
                    'start' => $now->copy()->subDays(7)->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            case 'month':
                return [
                    'start' => $now->copy()->subDays(30)->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            default:
                return [
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
        }
    }
}
