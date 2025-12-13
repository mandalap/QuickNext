<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Discount;
use App\Helpers\SubscriptionHelper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PromoUsageController extends Controller
{
    /**
     * Check promo access before processing request
     */
    private function checkPromoAccess($user)
    {
        if (!SubscriptionHelper::hasPromoAccess($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses Diskon & Promo memerlukan paket Premium. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_promo_access',
                'redirect_to' => '/subscription-settings'
            ], 403);
        }
        return null;
    }

    /**
     * Get promo usage analytics
     */
    public function getPromoUsageAnalytics(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        // ✅ FIX: Check promo access
        $accessCheck = $this->checkPromoAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }
        
        try {
            // ✅ FIX: Use X-Business-Id header as fallback (like ReportController)
            $businessId = $request->header('X-Business-Id') ?? $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $dateRange = $request->get('date_range', 'month');
            $customStart = $request->get('custom_start');
            $customEnd = $request->get('custom_end');
            $range = $this->getDateRange($dateRange, $customStart, $customEnd);
            $startDate = $range['start'];
            $endDate = $range['end'];

            // Helper function to build base query for orders with discounts
            $buildOrdersWithDiscountsQuery = function() use ($businessId, $outletId, $startDate, $endDate) {
                return Order::where('business_id', $businessId)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                    ->where('discount_amount', '>', 0)
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    });
            };

            // Get counts and sums
            try {
                $ordersWithDiscountsQuery = $buildOrdersWithDiscountsQuery();
                $totalOrdersWithDiscounts = $ordersWithDiscountsQuery->count();
                $totalDiscountAmount = (float) ($ordersWithDiscountsQuery->sum('discount_amount') ?? 0);
                $totalRevenueWithDiscounts = (float) ($ordersWithDiscountsQuery->sum('total') ?? 0);
            } catch (\Exception $e) {
                Log::warning('Error getting orders with discounts, using defaults', ['error' => $e->getMessage()]);
                $totalOrdersWithDiscounts = 0;
                $totalDiscountAmount = 0;
                $totalRevenueWithDiscounts = 0;
            }

            // Get all orders for comparison
            try {
                $allOrdersQuery = Order::where('business_id', $businessId)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    });

                $totalOrders = $allOrdersQuery->count();
                $totalRevenue = (float) ($allOrdersQuery->sum('total') ?? 0);
            } catch (\Exception $e) {
                Log::warning('Error getting all orders, using defaults', ['error' => $e->getMessage()]);
                $totalOrders = 0;
                $totalRevenue = 0;
            }

            // Calculate metrics
            $discountUsageRate = $totalOrders > 0 ? ($totalOrdersWithDiscounts / $totalOrders) * 100 : 0;
            $averageDiscountAmount = $totalOrdersWithDiscounts > 0 ? $totalDiscountAmount / $totalOrdersWithDiscounts : 0;
            $discountImpactOnRevenue = $totalRevenue > 0 ? ($totalDiscountAmount / $totalRevenue) * 100 : 0;

            // Get discount types breakdown
            // ✅ FIX: Check if discount_type column exists, use COALESCE for null values
            try {
                $discountTypes = $buildOrdersWithDiscountsQuery()
                    ->selectRaw('
                        CASE
                            WHEN COALESCE(discount_type, "") = "percentage" THEN "Persentase"
                            WHEN COALESCE(discount_type, "") = "fixed" THEN "Nominal Tetap"
                            WHEN COALESCE(discount_type, "") = "buy_x_get_y" THEN "Beli X Dapat Y"
                            ELSE "Lainnya"
                        END as discount_type_name,
                        COALESCE(discount_type, "unknown") as discount_type,
                        COUNT(*) as usage_count,
                        SUM(discount_amount) as total_discount_amount,
                        AVG(discount_amount) as avg_discount_amount
                    ')
                    ->groupBy('discount_type')
                    ->get();
            } catch (\Exception $e) {
                // ✅ FIX: If discount_type column doesn't exist, return empty array
                Log::warning('discount_type column may not exist, using fallback', [
                    'error' => $e->getMessage()
                ]);
                $discountTypes = collect([]);
            }

            // Get daily discount usage
            try {
                $dailyUsage = $buildOrdersWithDiscountsQuery()
                    ->selectRaw('
                        DATE(created_at) as date,
                        COUNT(*) as orders_count,
                        SUM(COALESCE(discount_amount, 0)) as total_discount,
                        SUM(COALESCE(total, 0)) as total_revenue
                    ')
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get();
            } catch (\Exception $e) {
                Log::warning('Error getting daily usage, using fallback', ['error' => $e->getMessage()]);
                $dailyUsage = collect([]);
            }

            // Get top discount amounts
            try {
                $topDiscounts = $buildOrdersWithDiscountsQuery()
                    ->selectRaw('
                        COALESCE(discount_amount, 0) as discount_amount,
                        COUNT(*) as usage_count,
                        SUM(COALESCE(total, 0)) as total_revenue
                    ')
                    ->groupBy('discount_amount')
                    ->orderBy('usage_count', 'desc')
                    ->limit(10)
                    ->get();
            } catch (\Exception $e) {
                Log::warning('Error getting top discounts, using fallback', ['error' => $e->getMessage()]);
                $topDiscounts = collect([]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => [
                        'total_orders' => $totalOrders,
                        'total_orders_with_discounts' => $totalOrdersWithDiscounts,
                        'total_discount_amount' => $totalDiscountAmount,
                        'total_revenue' => $totalRevenue,
                        'total_revenue_with_discounts' => $totalRevenueWithDiscounts,
                        'discount_usage_rate' => round($discountUsageRate, 2),
                        'average_discount_amount' => round($averageDiscountAmount, 2),
                        'discount_impact_on_revenue' => round($discountImpactOnRevenue, 2),
                    ],
                    'discount_types' => $discountTypes,
                    'daily_usage' => $dailyUsage,
                    'top_discounts' => $topDiscounts,
                    'date_range' => $dateRange,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching promo usage analytics', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => Auth::id(),
                'business_id' => $businessId ?? null,
                'outlet_id' => $outletId ?? null,
                'date_range' => $dateRange ?? null,
            ]);
            
            // ✅ FIX: Return more user-friendly error message
            $errorMessage = 'Error fetching promo usage analytics';
            if (str_contains($e->getMessage(), 'discount_type')) {
                $errorMessage = 'Kolom discount_type tidak ditemukan di database. Silakan jalankan migration untuk menambahkan kolom ini.';
            } elseif (str_contains($e->getMessage(), 'discount_amount')) {
                $errorMessage = 'Kolom discount_amount tidak ditemukan di database. Silakan jalankan migration untuk menambahkan kolom ini.';
            } elseif (str_contains($e->getMessage(), 'SQLSTATE')) {
                $errorMessage = 'Database error: ' . (config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan pada database');
            }
            
            return response()->json([
                'success' => false,
                'message' => $errorMessage,
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get discount effectiveness analysis
     */
    public function getDiscountEffectiveness(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            // ✅ FIX: Use X-Business-Id header as fallback (like ReportController)
            $businessId = $request->header('X-Business-Id') ?? $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $dateRange = $request->get('date_range', 'month');
            $customStart = $request->get('custom_start');
            $customEnd = $request->get('custom_end');
            $range = $this->getDateRange($dateRange, $customStart, $customEnd);
            $startDate = $range['start'];
            $endDate = $range['end'];

            // Compare orders with and without discounts
            $ordersWithDiscounts = Order::where('business_id', $businessId)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->where('discount_amount', '>', 0)
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                });

            $ordersWithoutDiscounts = Order::where('business_id', $businessId)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->where('discount_amount', 0)
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                });

            // Calculate metrics for orders with discounts
            $withDiscountsStats = $ordersWithDiscounts->selectRaw('
                COUNT(*) as order_count,
                AVG(total) as avg_order_value,
                AVG(discount_amount) as avg_discount,
                SUM(total) as total_revenue,
                SUM(discount_amount) as total_discount_amount
            ')->first();

            // Calculate metrics for orders without discounts
            $withoutDiscountsStats = $ordersWithoutDiscounts->selectRaw('
                COUNT(*) as order_count,
                AVG(total) as avg_order_value,
                SUM(total) as total_revenue
            ')->first();

            // Calculate effectiveness metrics
            $effectiveness = [
                'with_discounts' => [
                    'order_count' => $withDiscountsStats->order_count ?? 0,
                    'avg_order_value' => round($withDiscountsStats->avg_order_value ?? 0, 2),
                    'total_revenue' => $withDiscountsStats->total_revenue ?? 0,
                    'avg_discount' => round($withDiscountsStats->avg_discount ?? 0, 2),
                    'total_discount_amount' => $withDiscountsStats->total_discount_amount ?? 0,
                ],
                'without_discounts' => [
                    'order_count' => $withoutDiscountsStats->order_count ?? 0,
                    'avg_order_value' => round($withoutDiscountsStats->avg_order_value ?? 0, 2),
                    'total_revenue' => $withoutDiscountsStats->total_revenue ?? 0,
                ],
                'comparison' => [
                    'order_value_difference' => round(($withDiscountsStats->avg_order_value ?? 0) - ($withoutDiscountsStats->avg_order_value ?? 0), 2),
                    'revenue_impact' => round((($withDiscountsStats->total_revenue ?? 0) - ($withoutDiscountsStats->total_revenue ?? 0)) / max($withoutDiscountsStats->total_revenue ?? 1, 1) * 100, 2),
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'effectiveness' => $effectiveness,
                    'date_range' => $dateRange,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching discount effectiveness: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching discount effectiveness: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get discount trends over time
     */
    public function getDiscountTrends(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            // ✅ FIX: Use X-Business-Id header as fallback (like ReportController)
            $businessId = $request->header('X-Business-Id') ?? $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $dateRange = $request->get('date_range', 'month');
            $customStart = $request->get('custom_start');
            $customEnd = $request->get('custom_end');
            $range = $this->getDateRange($dateRange, $customStart, $customEnd);
            $startDate = $range['start'];
            $endDate = $range['end'];

            // Get daily trends
            $dailyTrends = Order::where('business_id', $businessId)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                })
                ->selectRaw('
                    DATE(created_at) as date,
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN discount_amount > 0 THEN 1 ELSE 0 END) as orders_with_discounts,
                    SUM(discount_amount) as total_discount_amount,
                    SUM(total) as total_revenue,
                    AVG(CASE WHEN discount_amount > 0 THEN discount_amount ELSE NULL END) as avg_discount_amount
                ')
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            // Get hourly trends for today
            $hourlyTrends = Order::where('business_id', $businessId)
                ->whereDate('created_at', Carbon::today())
                ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                })
                ->selectRaw('
                    HOUR(created_at) as hour,
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN discount_amount > 0 THEN 1 ELSE 0 END) as orders_with_discounts,
                    SUM(discount_amount) as total_discount_amount
                ')
                ->groupBy('hour')
                ->orderBy('hour')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'daily_trends' => $dailyTrends,
                    'hourly_trends' => $hourlyTrends,
                    'date_range' => $dateRange,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching discount trends: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching discount trends: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get date range based on request parameter
     */
    /**
     * Clean date range parameter (remove trailing :number)
     */
    private function cleanDateRange($dateRange)
    {
        if (!$dateRange) {
            return 'month';
        }
        
        // Remove trailing :number (e.g., "year:1" -> "year")
        $cleaned = preg_replace('/:\d+$/', '', trim($dateRange));
        
        // Validate against allowed values
        $allowed = ['today', 'yesterday', 'week', 'month', 'year'];
        if (!in_array($cleaned, $allowed)) {
            Log::warning('Invalid date_range, defaulting to month', [
                'provided' => $dateRange,
                'cleaned' => $cleaned
            ]);
            return 'month';
        }
        
        return $cleaned;
    }

    private function getDateRange($dateRange, $customStart = null, $customEnd = null)
    {
        // Clean date range parameter
        $dateRange = $this->cleanDateRange($dateRange);
        
        $now = Carbon::now('Asia/Jakarta');

        // ✅ FIX: Handle custom date range
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
                // Fallback to month if parsing fails
                return [
                    'start' => $now->copy()->startOfMonth(),
                    'end' => $now->copy()->endOfMonth()
                ];
            }
        }

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
                    'start' => $now->copy()->startOfWeek(),
                    'end' => $now->copy()->endOfWeek()
                ];
            case 'month':
                return [
                    'start' => $now->copy()->startOfMonth(),
                    'end' => $now->copy()->endOfMonth()
                ];
            case 'year':
                return [
                    'start' => $now->copy()->startOfYear(),
                    'end' => $now->copy()->endOfYear()
                ];
            default:
                return [
                    'start' => $now->copy()->startOfMonth(),
                    'end' => $now->copy()->endOfMonth()
                ];
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

        try {
            if ($user->role === 'super_admin') {
                // Load businesses relationship if not loaded
                if (!$user->relationLoaded('businesses')) {
                    $user->load('businesses');
                }
                return $user->businesses->first()?->id;
            }

            // For other roles, check if business_id exists
            if (isset($user->business_id)) {
                return $user->business_id;
            }

            // Fallback: try to get from employee relationship
            if ($user->relationLoaded('employee')) {
                return $user->employee?->business_id;
            }

            // Load employee relationship if not loaded
            $user->load('employee');
            return $user->employee?->business_id;
        } catch (\Exception $e) {
            Log::error('Error getting business ID for user', [
                'user_id' => $user->id ?? null,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}
