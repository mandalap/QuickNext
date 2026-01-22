<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Models\CashierShift;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CashierPerformanceController extends Controller
{
    /**
     * Get cashier performance analytics
     */
    public function getPerformanceAnalytics(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');

            Log::info('CashierPerformance getPerformanceAnalytics - Request', [
                'user_id' => $user->id ?? null,
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'date_range' => $request->get('date_range'),
            ]);

            if (!$businessId) {
                Log::warning('CashierPerformance getPerformanceAnalytics - Business ID not found', [
                    'user_id' => $user->id ?? null,
                    'user_role' => $user->role ?? null,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $dateRange = $request->get('date_range', 'today');

            // Handle custom date range
            if (($request->has('custom_start') && $request->has('custom_end')) || 
                ($request->has('start_date') && $request->has('end_date'))) {
                $startDate = $request->has('custom_start') 
                    ? Carbon::parse($request->get('custom_start'))->startOfDay()
                    : Carbon::parse($request->get('start_date'))->startOfDay();
                $endDate = $request->has('custom_end')
                    ? Carbon::parse($request->get('custom_end'))->endOfDay()
                    : Carbon::parse($request->get('end_date'))->endOfDay();
            } else {
                $range = $this->getDateRange($dateRange);
                $startDate = $range['start'];
                $endDate = $range['end'];
            }

            Log::info('CashierPerformance getPerformanceAnalytics - Date range', [
                'date_range' => $dateRange,
                'custom_start' => $request->get('custom_start'),
                'custom_end' => $request->get('custom_end'),
                'start_date' => $startDate->format('Y-m-d H:i:s'),
                'end_date' => $endDate->format('Y-m-d H:i:s'),
            ]);

            // Get all cashiers for this business
            // ✅ FIX: User table doesn't have business_id column, get from employees table
            // Get user IDs from employees table for this business
            $employeeUserIds = \App\Models\Employee::where('business_id', $businessId)
                ->pluck('user_id')
                ->toArray();
            
            // If no employees found, return empty result
            if (empty($employeeUserIds)) {
                Log::info('CashierPerformance - No employees found for business', [
                    'business_id' => $businessId,
                ]);
                $cashiers = collect([]);
            } else {
                // Build query for cashiers
                $cashiersQuery = User::whereIn('id', $employeeUserIds)
                    ->where('role', 'kasir');
                
                // If outlet filter is needed, try to filter by employee outlet assignments
                if ($outletId) {
                    // ✅ FIX: employee_outlets table uses user_id, not employee_id
                    // Get user IDs directly from employee_outlets table
                    $outletUserIds = DB::table('employee_outlets')
                        ->where('outlet_id', $outletId)
                        ->where('business_id', $businessId)
                        ->pluck('user_id')
                        ->toArray();
                    
                    if (!empty($outletUserIds)) {
                        // Intersect with employee user IDs
                        $filteredUserIds = array_intersect($employeeUserIds, $outletUserIds);
                        if (!empty($filteredUserIds)) {
                            $cashiersQuery->whereIn('id', $filteredUserIds);
                        } else {
                            // No cashiers for this outlet
                            $cashiers = collect([]);
                        }
                    } else {
                        // No users found for this outlet
                        Log::info('CashierPerformance - No users found for outlet', [
                            'outlet_id' => $outletId,
                            'business_id' => $businessId,
                        ]);
                        $cashiers = collect([]);
                    }
                }
                
                // Only get if cashiers hasn't been set to empty collection
                if (!isset($cashiers)) {
                    $cashiers = $cashiersQuery->get();
                }
            }

            $performanceData = [];

            // ✅ FIX: Check if cashiers is empty before processing
            if ($cashiers->isEmpty()) {
                Log::info('CashierPerformance getPerformanceAnalytics - No cashiers found', [
                    'business_id' => $businessId,
                    'outlet_id' => $outletId,
                ]);
            }

            foreach ($cashiers as $cashier) {
                // Get employee_id for this user/cashier
                $employee = \App\Models\Employee::where('user_id', $cashier->id)
                    ->where('business_id', $businessId)
                    ->first();

                if (!$employee) {
                    continue; // Skip if no employee record found
                }

                // Get orders handled by this cashier
                $orders = Order::where('business_id', $businessId)
                    ->where('employee_id', $employee->id)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                    ->whereNull('deleted_at') // Handle soft deletes
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    });

                $totalOrders = $orders->count();
                $totalRevenue = $orders->sum('total') ?? 0;
                $avgOrderValue = $totalOrders > 0 && $totalRevenue > 0 ? $totalRevenue / $totalOrders : 0;

                // Get session data
                $sessions = CashierShift::where('business_id', $businessId)
                    ->where('user_id', $cashier->id)
                    ->whereBetween('opened_at', [$startDate, $endDate])
                    ->whereNull('deleted_at') // Handle soft deletes
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    });

                $totalSessions = $sessions->count();
                $totalSessionHours = 0;
                try {
                    $totalSessionHours = $sessions->get()->sum(function ($session) {
                        if (!$session->opened_at) {
                            return 0;
                        }
                        $closedAt = $session->closed_at ?? Carbon::now();
                        return $session->opened_at->diffInHours($closedAt);
                    });
                } catch (\Exception $e) {
                    Log::warning('Error calculating session hours', [
                        'cashier_id' => $cashier->id,
                        'error' => $e->getMessage(),
                    ]);
                    $totalSessionHours = 0;
                }

                // ✅ FIX: Calculate performance metrics
                // If no session hours, use default 1 hour to calculate orders per hour (avoid division by zero)
                // This ensures we still get a score even if there are no recorded sessions
                $effectiveSessionHours = $totalSessionHours > 0 ? $totalSessionHours : 1;
                $ordersPerHour = $totalOrders / $effectiveSessionHours;
                $revenuePerHour = $totalRevenue / $effectiveSessionHours;

                // Log for debugging (only in development)
                if (config('app.debug')) {
                    Log::info('CashierPerformance - Metrics calculation', [
                        'cashier_id' => $cashier->id,
                        'cashier_name' => $cashier->name,
                        'total_orders' => $totalOrders,
                        'total_revenue' => $totalRevenue,
                        'total_sessions' => $totalSessions,
                        'total_session_hours' => $totalSessionHours,
                        'effective_session_hours' => $effectiveSessionHours,
                        'orders_per_hour' => $ordersPerHour,
                        'revenue_per_hour' => $revenuePerHour,
                    ]);
                }

                // Get today's performance
                $todayOrders = Order::where('business_id', $businessId)
                    ->where('employee_id', $employee->id)
                    ->whereDate('created_at', today())
                    ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                    ->whereNull('deleted_at') // Handle soft deletes
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    })
                    ->count();

                $todayRevenue = Order::where('business_id', $businessId)
                    ->where('employee_id', $employee->id)
                    ->whereDate('created_at', today())
                    ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                    ->whereNull('deleted_at') // Handle soft deletes
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    })
                    ->sum('total') ?? 0;

                $performanceData[] = [
                    'cashier_id' => $cashier->id,
                    'cashier_name' => $cashier->name,
                    'cashier_email' => $cashier->email,
                    'total_orders' => $totalOrders,
                    'total_revenue' => $totalRevenue,
                    'avg_order_value' => round($avgOrderValue, 2),
                    'total_sessions' => $totalSessions,
                    'total_session_hours' => round($totalSessionHours, 2),
                    'orders_per_hour' => round($ordersPerHour, 2),
                    'revenue_per_hour' => round($revenuePerHour, 2),
                    'today_orders' => $todayOrders,
                    'today_revenue' => $todayRevenue,
                    'performance_score' => $this->calculatePerformanceScore($totalOrders, $totalRevenue, $ordersPerHour),
                ];
            }

            // Sort by performance score
            usort($performanceData, function ($a, $b) {
                return $b['performance_score'] <=> $a['performance_score'];
            });

            // Get summary statistics
            $summary = [
                'total_cashiers' => count($performanceData), // Use performanceData count, not cashiers
                'total_orders' => array_sum(array_column($performanceData, 'total_orders')) ?? 0,
                'total_revenue' => array_sum(array_column($performanceData, 'total_revenue')) ?? 0,
                'avg_performance_score' => count($performanceData) > 0 ?
                    round(array_sum(array_column($performanceData, 'performance_score')) / count($performanceData), 2) : 0,
                'top_performer' => count($performanceData) > 0 ? $performanceData[0]['cashier_name'] : null,
            ];

            // Log results for debugging
            Log::info('CashierPerformance getPerformanceAnalytics - Results', [
                'total_cashiers' => count($performanceData),
                'summary' => $summary,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'performance_data' => $performanceData,
                    'summary' => $summary,
                    'date_range' => $dateRange,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching cashier performance analytics: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => Auth::id(),
                'business_id' => $businessId ?? null,
                'outlet_id' => $outletId ?? null,
                'request_all' => $request->all(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error fetching cashier performance analytics: ' . $e->getMessage(),
                'error' => config('app.debug') ? [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ] : null
            ], 500);
        }
    }

    /**
     * Get cashier session history
     */
    public function getSessionHistory(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $dateRange = $request->get('date_range', 'week');

            // Handle custom date range
            if ($request->has('custom_start') && $request->has('custom_end')) {
                $startDate = Carbon::parse($request->get('custom_start'))->startOfDay();
                $endDate = Carbon::parse($request->get('custom_end'))->endOfDay();
            } else if ($request->has('start_date') && $request->has('end_date')) {
                $startDate = Carbon::parse($request->get('start_date'))->startOfDay();
                $endDate = Carbon::parse($request->get('end_date'))->endOfDay();
            } else {
                $range = $this->getDateRange($dateRange);
                $startDate = $range['start'];
                $endDate = $range['end'];
            }

            // ✅ FIX: Optimize query - use business_id directly instead of whereHas
            $sessions = CashierShift::where('business_id', $businessId)
            ->whereBetween('opened_at', [$startDate, $endDate])
            ->whereNull('deleted_at') // Handle soft deletes
            ->when($outletId, function ($query) use ($outletId) {
                return $query->where('outlet_id', $outletId);
            })
            ->with(['user', 'outlet'])
            ->orderBy('opened_at', 'desc')
            ->paginate(15);

            return response()->json([
                'success' => true,
                'data' => $sessions
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching cashier session history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching cashier session history: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get cashier detailed performance
     */
    public function getCashierDetail(Request $request, $cashierId): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $dateRange = $request->get('date_range', 'month');

            // Handle custom date range
            if ($request->has('custom_start') && $request->has('custom_end')) {
                $startDate = Carbon::parse($request->get('custom_start'))->startOfDay();
                $endDate = Carbon::parse($request->get('custom_end'))->endOfDay();
            } else if ($request->has('start_date') && $request->has('end_date')) {
                $startDate = Carbon::parse($request->get('start_date'))->startOfDay();
                $endDate = Carbon::parse($request->get('end_date'))->endOfDay();
            } else {
                $range = $this->getDateRange($dateRange);
                $startDate = $range['start'];
                $endDate = $range['end'];
            }

            // Verify cashier belongs to business
            $cashier = User::where('id', $cashierId)
                ->where('business_id', $businessId)
                ->where('role', 'kasir')
                ->first();

            if (!$cashier) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cashier not found'
                ], 404);
            }

            // Get employee record for this cashier
            $employee = \App\Models\Employee::where('user_id', $cashierId)
                ->where('business_id', $businessId)
                ->first();

            if (!$employee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee record not found for this cashier'
                ], 404);
            }

            // Get detailed performance metrics
            $orders = Order::where('business_id', $businessId)
                ->where('employee_id', $employee->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereNull('deleted_at') // Handle soft deletes
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                });

            $totalOrders = $orders->count();
            $totalRevenue = $orders->sum('total');
            $avgOrderValue = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;

            // Get hourly performance
            $hourlyPerformance = $orders->selectRaw('
                HOUR(created_at) as hour,
                COUNT(*) as order_count,
                SUM(total) as revenue
            ')
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

            // Get daily performance
            $dailyPerformance = $orders->selectRaw('
                DATE(created_at) as date,
                COUNT(*) as order_count,
                SUM(total) as revenue
            ')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

            // Get payment method breakdown
            $paymentMethods = $orders->selectRaw('
                payment_method,
                COUNT(*) as order_count,
                SUM(total) as revenue
            ')
            ->groupBy('payment_method')
            ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'cashier' => [
                        'id' => $cashier->id,
                        'name' => $cashier->name,
                        'email' => $cashier->email,
                    ],
                    'summary' => [
                        'total_orders' => $totalOrders,
                        'total_revenue' => $totalRevenue,
                        'avg_order_value' => round($avgOrderValue, 2),
                    ],
                    'hourly_performance' => $hourlyPerformance,
                    'daily_performance' => $dailyPerformance,
                    'payment_methods' => $paymentMethods,
                    'date_range' => $dateRange,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching cashier detail: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching cashier detail: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate performance score
     * 
     * Skor dihitung dari 3 komponen:
     * 1. Order Score: Jumlah order (max 50 poin) - setiap 10 order = 1 poin
     * 2. Revenue Score: Total revenue (max 30 poin) - setiap 1 juta = 3 poin
     * 3. Efficiency Score: Order per jam (max 20 poin) - setiap 1 order/jam = 2 poin
     * 
     * Total maksimal: 100 poin
     */
    private function calculatePerformanceScore($totalOrders, $totalRevenue, $ordersPerHour)
    {
        // Calculate scores
        $orderScore = min($totalOrders * 0.1, 50); // Max 50 points: 10 orders = 1 point
        $revenueScore = min($totalRevenue / 1000000 * 30, 30); // Max 30 points: 1M = 3 points
        $efficiencyScore = min($ordersPerHour * 2, 20); // Max 20 points: 1 order/hour = 2 points

        $totalScore = round($orderScore + $revenueScore + $efficiencyScore, 2);

        // Log for debugging (only in development)
        if (config('app.debug')) {
            Log::info('CashierPerformance calculatePerformanceScore', [
                'total_orders' => $totalOrders,
                'total_revenue' => $totalRevenue,
                'orders_per_hour' => $ordersPerHour,
                'order_score' => $orderScore,
                'revenue_score' => $revenueScore,
                'efficiency_score' => $efficiencyScore,
                'total_score' => $totalScore,
            ]);
        }

        return $totalScore;
    }

    /**
     * Get date range based on request parameter
     */
    private function getDateRange($dateRange)
    {
        $now = Carbon::now();

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
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
        }
    }

    /**
     * Get business ID for user
     */
    private function getBusinessIdForUser($user)
    {
        if (in_array($user->role, ['admin', 'kasir', 'kitchen', 'waiter'])) {
            // For employees, get business from their employee record
            $employee = \App\Models\Employee::where('user_id', $user->id)->first();
            if ($employee && $employee->business_id) {
                return $employee->business_id;
            }
        }

        // For owners/super_admin, try multiple methods to get business_id
        $businessId = null;

        // Method 1: Check if user has business_id field directly
        if (isset($user->business_id) && $user->business_id) {
            $businessId = $user->business_id;
        }

        // Method 2: Get from businesses relationship
        if (!$businessId && $user->businesses) {
            $businessId = $user->businesses->first()?->id;
        }

        // Method 3: Find business where user is owner
        if (!$businessId) {
            $business = \App\Models\Business::where('owner_id', $user->id)->first();
            $businessId = $business?->id;
        }

        // Method 4: Get from X-Business-Id header (fallback)
        if (!$businessId) {
            $businessId = request()->header('X-Business-Id');
        }

        // Log for debugging
        Log::info('CashierPerformance getBusinessIdForUser result', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'business_id' => $businessId,
            'has_businesses_relation' => $user->businesses ? 'yes' : 'no',
            'businesses_count' => $user->businesses ? $user->businesses->count() : 0,
            'x_business_id_header' => request()->header('X-Business-Id'),
        ]);

        return $businessId;
    }
}
