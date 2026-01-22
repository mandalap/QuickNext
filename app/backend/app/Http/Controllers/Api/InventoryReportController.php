<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\InventoryMovement;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class InventoryReportController extends Controller
{
    /**
     * Get inventory status report
     */
    public function getInventoryStatus(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $search = $request->input('search', '');
        $categoryId = $request->input('category_id', '');
        $stockStatus = $request->input('stock_status', 'all'); // all, low, out, available
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 10);

        // Build query for inventory status
        $query = Product::select([
                'products.id',
                'products.name',
                'products.sku',
                'products.stock',
                'products.min_stock',
                'products.price',
                'products.cost',
                'products.stock_type',
                'products.is_active',
                DB::raw('COALESCE(categories.name, "") as category_name'),
                'categories.id as category_id'
            ])
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('products.business_id', $businessId)
            ->where('products.is_active', true);
        
        // Filter by outlet if provided (through product_outlets pivot table)
        // If product is global (is_global = 1), it's available in all outlets
        if ($outletId) {
            $query->where(function($q) use ($outletId) {
                $q->whereExists(function($subquery) use ($outletId) {
                    $subquery->select(DB::raw(1))
                        ->from('product_outlets')
                        ->whereColumn('product_outlets.product_id', 'products.id')
                        ->where('product_outlets.outlet_id', $outletId);
                })
                ->orWhere(function($q2) {
                    // Include global products (available in all outlets)
                    $q2->where('products.is_global', 1);
                });
            });
        }

        // Search filter
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('products.name', 'like', "%{$search}%")
                  ->orWhere('products.sku', 'like', "%{$search}%")
                  ->orWhere('categories.name', 'like', "%{$search}%");
            });
        }

        // Category filter
        if ($categoryId) {
            $query->where('products.category_id', $categoryId);
        }

        // Stock status filter
        switch ($stockStatus) {
            case 'low':
                $query->whereRaw('products.stock <= products.min_stock');
                break;
            case 'out':
                $query->where('products.stock', 0);
                break;
            case 'available':
                $query->whereRaw('products.stock > products.min_stock');
                break;
        }

        // Get summary statistics - use separate query to avoid issues
        $summaryQuery = Product::select([
                DB::raw('COUNT(*) as total_products'),
                DB::raw('SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END) as low_stock_count'),
                DB::raw('SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock_count'),
                DB::raw('SUM(stock * COALESCE(NULLIF(cost, 0), price)) as total_inventory_value'),
                DB::raw('AVG(stock) as avg_stock_level')
            ])
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('products.business_id', $businessId)
            ->where('products.is_active', true);
        
        // Apply same filters for summary
        if ($outletId) {
            $summaryQuery->where(function($q) use ($outletId) {
                $q->whereExists(function($subquery) use ($outletId) {
                    $subquery->select(DB::raw(1))
                        ->from('product_outlets')
                        ->whereColumn('product_outlets.product_id', 'products.id')
                        ->where('product_outlets.outlet_id', $outletId);
                })
                ->orWhere(function($q2) {
                    $q2->where('products.is_global', 1);
                });
            });
        }
        if ($search) {
            $summaryQuery->where(function($q) use ($search) {
                $q->where('products.name', 'like', "%{$search}%")
                  ->orWhere('products.sku', 'like', "%{$search}%")
                  ->orWhere('categories.name', 'like', "%{$search}%");
            });
        }
        if ($categoryId) {
            $summaryQuery->where('products.category_id', $categoryId);
        }
        switch ($stockStatus) {
            case 'low':
                $summaryQuery->whereRaw('products.stock <= products.min_stock');
                break;
            case 'out':
                $summaryQuery->where('products.stock', 0);
                break;
            case 'available':
                $summaryQuery->whereRaw('products.stock > products.min_stock');
                break;
        }
        
        $summary = $summaryQuery->first();
        
        // Ensure summary always has values
        if (!$summary) {
            $summary = (object)[
                'total_products' => 0,
                'low_stock_count' => 0,
                'out_of_stock_count' => 0,
                'total_inventory_value' => 0,
                'avg_stock_level' => 0
            ];
        }

        // Get total count before pagination
        $countQuery = clone $query;
        $totalCount = $countQuery->count('products.id');

        // Sort and paginate
        $query->orderBy('products.' . $sortBy, $sortOrder);
        $products = $query->skip(($page - 1) * $perPage)->take($perPage)->get();
        
        Log::info('Inventory Status Query Result', [
            'business_id' => $businessId,
            'outlet_id' => $outletId,
            'total_count' => $totalCount,
            'products_count' => $products->count(),
            'summary' => $summary
        ]);

        // Add stock status for each product
        $products = $products->map(function($product) {
            if ($product->stock == 0) {
                $product->stock_status = 'out_of_stock';
                $product->stock_status_label = 'Habis';
                $product->stock_status_color = 'red';
            } elseif ($product->stock <= $product->min_stock) {
                $product->stock_status = 'low_stock';
                $product->stock_status_label = 'Stok Rendah';
                $product->stock_status_color = 'yellow';
            } else {
                $product->stock_status = 'available';
                $product->stock_status_label = 'Tersedia';
                $product->stock_status_color = 'green';
            }
            
            // Calculate stock value: use cost if available, otherwise use price
            $costOrPrice = $product->cost && $product->cost > 0 ? $product->cost : $product->price;
            $product->stock_value = $product->stock * $costOrPrice;
            
            return $product;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => $summary ?: (object)[
                    'total_products' => 0,
                    'low_stock_count' => 0,
                    'out_of_stock_count' => 0,
                    'total_inventory_value' => 0,
                    'avg_stock_level' => 0
                ],
                'products' => $products ?: [],
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $totalCount ?: 0,
                    'last_page' => ceil($totalCount / $perPage) ?: 1,
                    'from' => ($page - 1) * $perPage + 1,
                    'to' => min($page * $perPage, $totalCount ?: 0)
                ]
            ]
        ]);
    }

    /**
     * Get stock movement report
     */
    public function getStockMovements(Request $request)
    {
        try {
            $user = Auth::user();
            $businessId = $request->header('X-Business-Id') ?: ($user ? $this->getBusinessIdForUser($user) : null);
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                Log::warning('Stock Movements: Business ID not found', [
                    'user_id' => $user->id ?? null,
                    'headers' => $request->headers->all()
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID required'
                ], 400);
            }

        // Get date range - default to 'this-month' if not specified to show more data
        $dateRangeParam = $request->input('date_range', 'this-month');
        $customStart = $request->input('custom_start') ?: $request->input('start_date');
        $customEnd = $request->input('custom_end') ?: $request->input('end_date');
        $dateRange = $this->getDateRange($dateRangeParam, $customStart, $customEnd);
        
        Log::info('Stock Movements Date Range', [
            'param' => $dateRangeParam,
            'custom_start' => $customStart,
            'custom_end' => $customEnd,
            'calculated' => [
                'start' => $dateRange['start']->toDateTimeString(),
                'end' => $dateRange['end']->toDateTimeString()
            ]
        ]);
        $type = $request->input('type', 'all'); // all, in, out, adjustment
        $reason = $request->input('reason', 'all'); // all, sale, purchase, waste, adjustment, transfer
        $productId = $request->input('product_id', '');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $page = $request->input('page', 1);
        $perPage = $request->input('per_page', 10);

        // Build query for stock movements
        // First check if there are any movements for this business
        $hasMovements = InventoryMovement::leftJoin('products', 'inventory_movements.product_id', '=', 'products.id')
            ->whereNotNull('inventory_movements.product_id')
            ->where('products.business_id', $businessId)
            ->exists();
        
        Log::info('Stock Movements - Has movements check', [
            'business_id' => $businessId,
            'has_movements' => $hasMovements
        ]);

        $query = InventoryMovement::select([
                'inventory_movements.id',
                'inventory_movements.type',
                'inventory_movements.reason',
                'inventory_movements.quantity',
                'inventory_movements.stock_before',
                'inventory_movements.stock_after',
                'inventory_movements.reference_type',
                'inventory_movements.reference_id',
                'inventory_movements.notes',
                'inventory_movements.created_at',
                'products.name as product_name',
                'products.sku as product_sku',
                DB::raw('COALESCE(categories.name, "") as category_name')
            ])
            ->leftJoin('products', 'inventory_movements.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->whereNotNull('inventory_movements.product_id')
            ->where('products.business_id', $businessId)
            ->whereBetween('inventory_movements.created_at', [
                $dateRange['start']->format('Y-m-d H:i:s'),
                $dateRange['end']->format('Y-m-d H:i:s')
            ]);

        // Log query for debugging
        Log::info('Stock Movements Query', [
            'business_id' => $businessId,
            'outlet_id' => $outletId,
            'date_range' => [
                'start' => $dateRange['start']->toDateTimeString(),
                'end' => $dateRange['end']->toDateTimeString()
            ],
            'type' => $type,
            'reason' => $reason,
            'product_id' => $productId
        ]);

        // Filter by outlet if provided (through product_outlets pivot table)
        // Note: Products are linked to outlets via product_outlets pivot table
        // If product is global (is_global = 1), it's available in all outlets
        if ($outletId) {
            $query->where(function($q) use ($outletId) {
                $q->whereExists(function($subquery) use ($outletId) {
                    $subquery->select(DB::raw(1))
                        ->from('product_outlets')
                        ->whereColumn('product_outlets.product_id', 'products.id')
                        ->where('product_outlets.outlet_id', $outletId);
                })
                ->orWhere(function($q2) {
                    // Include global products (available in all outlets)
                    $q2->where('products.is_global', 1);
                });
            });
        }

        // Type filter
        if ($type !== 'all') {
            $query->where('inventory_movements.type', $type);
        }

        // Reason filter
        if ($reason !== 'all') {
            $query->where('inventory_movements.reason', $reason);
        }

        // Product filter
        if ($productId) {
            $query->where('inventory_movements.product_id', $productId);
        }

        // Get summary statistics - use same base query
        $summaryQuery = InventoryMovement::leftJoin('products', 'inventory_movements.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->whereNotNull('inventory_movements.product_id')
            ->where('products.business_id', $businessId)
            ->whereBetween('inventory_movements.created_at', [
                $dateRange['start']->format('Y-m-d H:i:s'),
                $dateRange['end']->format('Y-m-d H:i:s')
            ]);
        
        // Apply same filters for summary
        if ($outletId) {
            $summaryQuery->where(function($q) use ($outletId) {
                $q->whereExists(function($subquery) use ($outletId) {
                    $subquery->select(DB::raw(1))
                        ->from('product_outlets')
                        ->whereColumn('product_outlets.product_id', 'products.id')
                        ->where('product_outlets.outlet_id', $outletId);
                })
                ->orWhere(function($q2) {
                    // Include global products (available in all outlets)
                    $q2->where('products.is_global', 1);
                });
            });
        }
        if ($type !== 'all') {
            $summaryQuery->where('inventory_movements.type', $type);
        }
        if ($reason !== 'all') {
            $summaryQuery->where('inventory_movements.reason', $reason);
        }
        if ($productId) {
            $summaryQuery->where('inventory_movements.product_id', $productId);
        }
        
        $summary = $summaryQuery->select([
            DB::raw('COUNT(*) as total_movements'),
            DB::raw('SUM(CASE WHEN inventory_movements.type = "in" THEN inventory_movements.quantity ELSE 0 END) as total_in'),
            DB::raw('SUM(CASE WHEN inventory_movements.type = "out" THEN inventory_movements.quantity ELSE 0 END) as total_out'),
            DB::raw('SUM(CASE WHEN inventory_movements.type = "adjustment" THEN inventory_movements.quantity ELSE 0 END) as total_adjustments'),
            DB::raw('COUNT(DISTINCT inventory_movements.product_id) as products_affected')
        ])->first();

        // Log summary for debugging
        Log::info('Stock Movements Summary', [
            'summary' => $summary
        ]);

        // Sort and paginate - validate and map sortBy field
        $sortFieldMap = [
            'created_at' => 'inventory_movements.created_at',
            'quantity' => 'inventory_movements.quantity',
            'type' => 'inventory_movements.type',
            'reason' => 'inventory_movements.reason',
            'product_name' => 'products.name',
        ];
        
        $sortField = $sortFieldMap[$sortBy] ?? 'inventory_movements.created_at';
        
        // Get total count before ordering and pagination
        // Use a simpler count query to avoid issues with joins
        $countQuery = InventoryMovement::leftJoin('products', 'inventory_movements.product_id', '=', 'products.id')
            ->whereNotNull('inventory_movements.product_id')
            ->where('products.business_id', $businessId)
            ->whereBetween('inventory_movements.created_at', [
                $dateRange['start']->format('Y-m-d H:i:s'),
                $dateRange['end']->format('Y-m-d H:i:s')
            ]);
        
        // Apply same filters for count
        if ($outletId) {
            $countQuery->where(function($q) use ($outletId) {
                $q->whereExists(function($subquery) use ($outletId) {
                    $subquery->select(DB::raw(1))
                        ->from('product_outlets')
                        ->whereColumn('product_outlets.product_id', 'products.id')
                        ->where('product_outlets.outlet_id', $outletId);
                })
                ->orWhere(function($q2) {
                    // Include global products (available in all outlets)
                    $q2->where('products.is_global', 1);
                });
            });
        }
        if ($type !== 'all') {
            $countQuery->where('inventory_movements.type', $type);
        }
        if ($reason !== 'all') {
            $countQuery->where('inventory_movements.reason', $reason);
        }
        if ($productId) {
            $countQuery->where('inventory_movements.product_id', $productId);
        }
        
        $totalCount = $countQuery->count('inventory_movements.id');
        
        // Apply ordering and pagination
        $query->orderBy($sortField, $sortOrder);
        $movements = $query->skip(($page - 1) * $perPage)->take($perPage)->get();

        // Log results for debugging
        Log::info('Stock Movements Results', [
            'total_count' => $totalCount,
            'movements_count' => $movements->count(),
            'page' => $page,
            'per_page' => $perPage
        ]);

        // Add formatted data
        $movements = $movements->map(function($movement) {
            try {
                $movement->type_label = $this->getTypeLabel($movement->type ?? '');
                $movement->reason_label = $this->getReasonLabel($movement->reason ?? '');
                $movement->type_color = $this->getTypeColor($movement->type ?? '');
            } catch (\Exception $e) {
                Log::warning('Error formatting movement', [
                    'movement_id' => $movement->id ?? null,
                    'error' => $e->getMessage()
                ]);
            }
            return $movement;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => $summary ?: (object)[
                    'total_movements' => 0,
                    'total_in' => 0,
                    'total_out' => 0,
                    'total_adjustments' => 0,
                    'products_affected' => 0
                ],
                'movements' => $movements,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $totalCount,
                    'last_page' => ceil($totalCount / $perPage) ?: 1,
                    'from' => ($page - 1) * $perPage + 1,
                    'to' => min($page * $perPage, $totalCount)
                ]
            ]
        ]);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Database error fetching stock movements', [
                'error' => $e->getMessage(),
                'sql' => $e->getSql() ?? null,
                'bindings' => $e->getBindings() ?? null,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'request' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            Log::error('Error fetching stock movements', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error fetching stock movements: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get business ID for user
     */
    private function getBusinessIdForUser($user)
    {
        if (!$user) {
            return null;
        }

        // If user has business_id directly
        if ($user->business_id) {
            return $user->business_id;
        }

        // If user is associated with a business through a relationship
        if ($user->business) {
            return $user->business->id;
        }

        // If user is an employee, get business from employee relationship
        if ($user->employee && $user->employee->business_id) {
            return $user->employee->business_id;
        }

        return null;
    }

    /**
     * Get categories for filter dropdown
     */
    public function getCategories(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $categories = Category::where('business_id', $businessId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }

    /**
     * Get products for filter dropdown
     */
    public function getProducts(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $products = Product::where('business_id', $businessId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'sku']);

        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }

    /**
     * Get date range based on input
     */
    private function getDateRange($range, $customStart = null, $customEnd = null)
    {
        $now = Carbon::now('Asia/Jakarta');

        // Handle custom date range
        if ($customStart && $customEnd) {
            try {
                $start = Carbon::parse($customStart, 'Asia/Jakarta')->startOfDay();
                $end = Carbon::parse($customEnd, 'Asia/Jakarta')->endOfDay();
                
                // Validate date range
                if ($start->gt($end)) {
                    Log::warning('Invalid date range: start > end', [
                        'start' => $customStart,
                        'end' => $customEnd
                    ]);
                    // Swap if invalid
                    $temp = $start;
                    $start = $end;
                    $end = $temp;
                }
                
                return [
                    'start' => $start,
                    'end' => $end
                ];
            } catch (\Exception $e) {
                Log::error('Error parsing custom date range', [
                    'custom_start' => $customStart,
                    'custom_end' => $customEnd,
                    'error' => $e->getMessage()
                ]);
                // Fallback to today if parsing fails
                return [
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            }
        }

        switch ($range) {
            case 'today':
            case 'daily':
                return [
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            case 'yesterday':
                $yesterday = $now->copy()->subDay();
                return [
                    'start' => $yesterday->startOfDay(),
                    'end' => $yesterday->endOfDay()
                ];
            case 'week':
            case 'weekly':
            case 'this-week':
                return [
                    'start' => $now->copy()->subDays(7)->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            case 'last-week':
                $lastWeek = $now->copy()->subWeek();
                return [
                    'start' => $lastWeek->startOfWeek(),
                    'end' => $lastWeek->endOfWeek()
                ];
            case 'month':
            case 'monthly':
            case 'this-month':
                return [
                    'start' => $now->copy()->subDays(30)->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            case 'last-month':
                $lastMonth = $now->copy()->subMonth();
                return [
                    'start' => $lastMonth->startOfMonth(),
                    'end' => $lastMonth->endOfMonth()
                ];
            case 'this-year':
            case 'year':
                return [
                    'start' => $now->copy()->startOfYear(),
                    'end' => $now->copy()->endOfDay()
                ];
            default:
                return [
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
        }
    }

    /**
     * Get type label
     */
    private function getTypeLabel($type)
    {
        $labels = [
            'in' => 'Masuk',
            'out' => 'Keluar',
            'adjustment' => 'Penyesuaian'
        ];
        return $labels[$type] ?? $type;
    }

    /**
     * Get reason label
     */
    private function getReasonLabel($reason)
    {
        $labels = [
            'purchase' => 'Pembelian',
            'sale' => 'Penjualan',
            'waste' => 'Pembuangan',
            'adjustment' => 'Penyesuaian',
            'transfer' => 'Transfer'
        ];
        return $labels[$reason] ?? $reason;
    }

    /**
     * Get type color
     */
    private function getTypeColor($type)
    {
        $colors = [
            'in' => 'green',
            'out' => 'red',
            'adjustment' => 'blue'
        ];
        return $colors[$type] ?? 'gray';
    }
}
