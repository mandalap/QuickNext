<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ProductReportController extends Controller
{
    /**
     * Get product sales report
     */
    public function getProductSales(Request $request)
    {
        try {
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json(['message' => 'Business ID required'], 400);
            }

            // Get date range
            $dateRange = $this->getDateRange($request->input('date_range', 'today'));
            $search = $request->input('search', '');
            $sortBy = $request->input('sort_by', 'total_revenue');
            $sortOrder = $request->input('sort_order', 'desc');
            $page = $request->input('page', 1);
            $perPage = $request->input('per_page', 10);

            // Build base query for product sales
            $baseQuery = OrderItem::join('products', 'order_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
                ->whereNull('orders.deleted_at'); // Handle soft deletes

            // Filter by outlet if provided
            if ($outletId) {
                $baseQuery->where('orders.outlet_id', $outletId);
            }

            // Search filter
            if ($search) {
                $baseQuery->where(function($q) use ($search) {
                    $q->where('products.name', 'like', "%{$search}%")
                      ->orWhere('categories.name', 'like', "%{$search}%");
                });
            }

            // Get total for summary (before grouping) - rebuild query instead of clone
            $summaryQuery = OrderItem::join('products', 'order_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
                ->whereNull('orders.deleted_at');

            if ($outletId) {
                $summaryQuery->where('orders.outlet_id', $outletId);
            }

            if ($search) {
                $summaryQuery->where(function($q) use ($search) {
                    $q->where('products.name', 'like', "%{$search}%")
                      ->orWhere('categories.name', 'like', "%{$search}%");
                });
            }

            // Calculate summary from order_items (for revenue, quantity, etc)
            $summary = $summaryQuery->select([
                DB::raw('COUNT(DISTINCT products.id) as total_products'),
                DB::raw('COALESCE(SUM(order_items.subtotal), 0) as total_revenue'),
                DB::raw('COALESCE(SUM(order_items.quantity), 0) as total_quantity'),
                DB::raw('COALESCE(AVG(order_items.price), 0) as avg_price'),
                DB::raw('COALESCE(SUM(DISTINCT orders.id), 0) as distinct_orders_count')
            ])->first();

            // Calculate total_tax and total_paid from distinct orders (to avoid double counting)
            $ordersQuery = \App\Models\Order::where('business_id', $businessId)
                ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
                ->whereNull('deleted_at');

            if ($outletId) {
                $ordersQuery->where('outlet_id', $outletId);
            }

            // Apply search filter to orders that have matching products
            if ($search) {
                $ordersQuery->whereHas('items.product', function($q) use ($search) {
                    $q->where('products.name', 'like', "%{$search}%")
                      ->orWhereHas('category', function($catQ) use ($search) {
                          $catQ->where('categories.name', 'like', "%{$search}%");
                      });
                });
            }

            $ordersSummary = $ordersQuery->select([
                DB::raw('COALESCE(SUM(tax_amount), 0) as total_tax'),
                DB::raw('COALESCE(SUM(total), 0) as total_paid')
            ])->first();

            // Merge the results
            $summary->total_tax = $ordersSummary->total_tax ?? 0;
            $summary->total_paid = $ordersSummary->total_paid ?? 0;

            // Build query for product sales with grouping
            $query = $baseQuery->select([
                    'products.id as product_id',
                    'products.name as product_name',
                    DB::raw('COALESCE(categories.name, "Tanpa Kategori") as category_name'),
                    DB::raw('COALESCE(categories.id, 0) as category_id'),
                    DB::raw('SUM(order_items.quantity) as total_quantity'),
                    DB::raw('SUM(order_items.subtotal) as total_revenue'),
                    DB::raw('AVG(order_items.price) as avg_price'),
                    DB::raw('COUNT(DISTINCT order_items.order_id) as order_count')
                ])
                ->groupBy('products.id', 'products.name', 'categories.id', 'categories.name');

            // Get total count by counting distinct products (rebuild query for count)
            $countQuery = OrderItem::join('products', 'order_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
                ->whereNull('orders.deleted_at');

            if ($outletId) {
                $countQuery->where('orders.outlet_id', $outletId);
            }

            if ($search) {
                $countQuery->where(function($q) use ($search) {
                    $q->where('products.name', 'like', "%{$search}%")
                      ->orWhere('categories.name', 'like', "%{$search}%");
                });
            }

            $totalCount = $countQuery->distinct('products.id')->count('products.id');

            // Sort and paginate using database
            $products = $query->orderBy($sortBy, $sortOrder)
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

            // Calculate percentage for each product
            $totalRevenue = $summary && $summary->total_revenue ? $summary->total_revenue : 1;
            $products = $products->map(function($product) use ($totalRevenue) {
                $product->revenue_percentage = $totalRevenue > 0 ? ($product->total_revenue / $totalRevenue) * 100 : 0;
                return $product;
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary ?? (object)[
                        'total_products' => 0,
                        'total_revenue' => 0,
                        'total_quantity' => 0,
                        'avg_price' => 0
                    ],
                    'products' => $products,
                    'pagination' => [
                        'current_page' => (int)$page,
                        'per_page' => (int)$perPage,
                        'total' => $totalCount,
                        'last_page' => ceil($totalCount / $perPage),
                        'from' => $totalCount > 0 ? (($page - 1) * $perPage + 1) : 0,
                        'to' => min($page * $perPage, $totalCount)
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error fetching product sales: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'business_id' => $businessId ?? null,
                'outlet_id' => $outletId ?? null,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error fetching product sales: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get category sales report
     */
    public function getCategorySales(Request $request)
    {
        try {
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json(['message' => 'Business ID required'], 400);
            }

            // Get date range
            $dateRange = $this->getDateRange($request->input('date_range', 'today'));
            $sortBy = $request->input('sort_by', 'total_revenue');
            $sortOrder = $request->input('sort_order', 'desc');
            $page = $request->input('page', 1);
            $perPage = $request->input('per_page', 10);

            // Build base query for category sales
            $baseQuery = OrderItem::join('products', 'order_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
                ->whereNull('orders.deleted_at'); // Handle soft deletes

            // Filter by outlet if provided
            if ($outletId) {
                $baseQuery->where('orders.outlet_id', $outletId);
            }

            // Get summary (before grouping) - rebuild query instead of clone
            $summaryQuery = OrderItem::join('products', 'order_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
                ->whereNull('orders.deleted_at');

            if ($outletId) {
                $summaryQuery->where('orders.outlet_id', $outletId);
            }

            $summary = $summaryQuery->select([
                DB::raw('COUNT(DISTINCT COALESCE(categories.id, 0)) as total_categories'),
                DB::raw('COALESCE(SUM(order_items.subtotal), 0) as total_revenue'),
                DB::raw('COUNT(DISTINCT products.id) as total_products'),
                DB::raw('COALESCE(AVG(order_items.subtotal), 0) as avg_revenue_per_category')
            ])->first();

            // Build query for category sales with grouping
            $query = $baseQuery->select([
                    DB::raw('COALESCE(categories.id, 0) as category_id'),
                    DB::raw('COALESCE(categories.name, "Tanpa Kategori") as category_name'),
                    DB::raw('COUNT(DISTINCT products.id) as product_count'),
                    DB::raw('SUM(order_items.quantity) as total_quantity'),
                    DB::raw('SUM(order_items.subtotal) as total_revenue'),
                    DB::raw('AVG(order_items.price) as avg_price'),
                    DB::raw('COUNT(DISTINCT order_items.order_id) as order_count')
                ])
                ->groupBy('categories.id', 'categories.name');

            // Get total count by counting distinct categories (rebuild query for count)
            $countQuery = OrderItem::join('products', 'order_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
                ->whereNull('orders.deleted_at');

            if ($outletId) {
                $countQuery->where('orders.outlet_id', $outletId);
            }

            // Count distinct categories (including null as one category)
            $totalCount = $countQuery->select(DB::raw('COUNT(DISTINCT COALESCE(categories.id, 0)) as count'))
                ->first()->count ?? 0;

            // Sort and paginate using database
            $categories = $query->orderBy($sortBy, $sortOrder)
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

            // Calculate percentage for each category
            $totalRevenue = $summary && $summary->total_revenue ? $summary->total_revenue : 1;
            $categories = $categories->map(function($category) use ($totalRevenue) {
                $category->revenue_percentage = $totalRevenue > 0 ? ($category->total_revenue / $totalRevenue) * 100 : 0;
                return $category;
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary ?? (object)[
                        'total_categories' => 0,
                        'total_revenue' => 0,
                        'total_products' => 0,
                        'avg_revenue_per_category' => 0
                    ],
                    'categories' => $categories,
                    'pagination' => [
                        'current_page' => (int)$page,
                        'per_page' => (int)$perPage,
                        'total' => (int)$totalCount,
                        'last_page' => $totalCount > 0 ? (int)ceil($totalCount / $perPage) : 1,
                        'from' => $totalCount > 0 ? (($page - 1) * $perPage + 1) : 0,
                        'to' => min($page * $perPage, $totalCount)
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error fetching category sales: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'business_id' => $businessId ?? null,
                'outlet_id' => $outletId ?? null,
                'request_params' => $request->all(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error fetching category sales: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get date range based on input
     */
    private function getDateRange($range)
    {
        $now = Carbon::now();

        switch ($range) {
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
            case 'this-week':
                return [
                    'start' => $now->copy()->startOfWeek(),
                    'end' => $now->copy()->endOfWeek()
                ];
            case 'last-week':
                return [
                    'start' => $now->copy()->subWeek()->startOfWeek(),
                    'end' => $now->copy()->subWeek()->endOfWeek()
                ];
            case 'this-month':
                return [
                    'start' => $now->copy()->startOfMonth(),
                    'end' => $now->copy()->endOfMonth()
                ];
            case 'last-month':
                return [
                    'start' => $now->copy()->subMonth()->startOfMonth(),
                    'end' => $now->copy()->subMonth()->endOfMonth()
                ];
            case 'this-year':
                return [
                    'start' => $now->copy()->startOfYear(),
                    'end' => $now->copy()->endOfYear()
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
            case 'year':
                return [
                    'start' => $now->copy()->subDays(365)->startOfDay(),
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
