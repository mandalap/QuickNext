<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Outlet;
use App\Helpers\SubscriptionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Check if user has access to advanced reports
     */
    private function checkAdvancedReportsAccess($user)
    {
        if (!SubscriptionHelper::hasAdvancedReports($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses laporan advanced memerlukan paket Professional atau lebih tinggi. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_advanced_reports',
                'redirect_to' => '/subscription-plans'
            ], 403);
        }
        return null;
    }

    /**
     * Get sales summary report
     */
    public function getSalesSummary(Request $request)
    {
        try {
            // ✅ FIX: Add detailed logging at the start
            Log::info('ReportController: getSalesSummary called', [
                'chart_type' => $request->get('chart_type', 'daily'),
                'date_range' => $request->get('date_range'),
                'custom_start' => $request->get('custom_start'),
                'custom_end' => $request->get('custom_end'),
                'user_id' => $request->user()?->id,
                'business_id_header' => $request->header('X-Business-Id'),
                'outlet_id_header' => $request->header('X-Outlet-Id'),
            ]);

            // ✅ FIX: Get date range with error handling
            try {
                $dateRange = $this->getDateRange($request);
                Log::info('Date range calculated', [
                    'start' => $dateRange['start']->toDateTimeString(),
                    'end' => $dateRange['end']->toDateTimeString()
                ]);
            } catch (\Exception $e) {
                Log::error('Error getting date range', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }

            $user = $request->user();
            
            if (!$user) {
                Log::warning('ReportController: User not authenticated');
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // ✅ FIX: Check advanced reports access
            $accessCheck = $this->checkAdvancedReportsAccess($user);
            if ($accessCheck) {
                return $accessCheck;
            }
            
            $businessId = $request->header('X-Business-Id') ?? $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');
            
            // ✅ FIX: Get chart type from request
            $chartType = $request->get('chart_type', 'daily'); // daily, weekly, monthly

            Log::info('Business and outlet IDs', [
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'user_role' => $user->role,
                'chart_type' => $chartType
            ]);

            if (!$businessId) {
                Log::warning('ReportController: Business ID not found', [
                    'user_id' => $user->id,
                    'user_role' => $user->role
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID is required'
                ], 400);
            }

            // Base query for orders - only count paid orders
            // ✅ FIX: Ensure Carbon dates are converted to proper format for database
            $startDate = $dateRange['start'] instanceof Carbon 
                ? $dateRange['start']->toDateTimeString() 
                : $dateRange['start'];
            $endDate = $dateRange['end'] instanceof Carbon 
                ? $dateRange['end']->toDateTimeString() 
                : $dateRange['end'];
            
            Log::info('Query date range', [
                'start' => $startDate,
                'end' => $endDate
            ]);

            // ✅ FIX: Use paid_at from payments table instead of created_at
            $query = DB::table('orders')
                ->leftJoin('payments', function($join) {
                    $join->on('orders.id', '=', 'payments.order_id')
                         ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']);
                })
                ->where(function($q) use ($startDate, $endDate) {
                    $q->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$startDate, $endDate]);
                })
                ->where('orders.payment_status', 'paid') // ✅ FIX: Only count paid orders
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready']);

            if ($businessId) {
                $query->where('orders.business_id', $businessId);
            }

            if ($outletId) {
                $query->where('orders.outlet_id', $outletId);
            }

            // Get basic stats
            $stats = $query->selectRaw('
                COUNT(DISTINCT orders.id) as total_transactions,
                COALESCE(SUM(orders.subtotal), 0) as total_subtotal,
                COALESCE(SUM(orders.total), 0) as total_sales,
                COALESCE(SUM(orders.discount_amount), 0) as total_discount,
                COALESCE(SUM(orders.tax_amount), 0) as total_tax,
                COALESCE(AVG(orders.total), 0) as average_transaction
            ')->first();

            // ✅ FIX: Handle null stats
            if (!$stats) {
                $stats = (object) [
                    'total_transactions' => 0,
                    'total_subtotal' => 0,
                    'total_sales' => 0,
                    'total_discount' => 0,
                    'total_tax' => 0,
                    'average_transaction' => 0
                ];
            }

            // ✅ FIX: Calculate net sales correctly
            // orders.total = subtotal + tax - discount (already final amount paid)
            // Total Sales = subtotal (before tax and discount) - untuk display di frontend
            // Net Sales = orders.total (subtotal + tax - discount = final amount paid)
            // Jadi: Total Sales (subtotal) < Net Sales (total yang dibayar)
            $netSales = ($stats->total_sales ?? 0); // orders.total already = subtotal + tax - discount

            // Get payment methods distribution from payments table
            // ✅ FIX: Filter only valid payment statuses
            // ✅ FIX: Use paid_at from payments table instead of created_at
            $paymentMethodsQuery = DB::table('orders')
                ->join('payments', 'orders.id', '=', 'payments.order_id')
                ->where(function($q) use ($startDate, $endDate) {
                    $q->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$startDate, $endDate]);
                })
                ->where('orders.payment_status', 'paid') // ✅ FIX: Only paid orders
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']); // ✅ FIX: Valid payment statuses

            if ($businessId) {
                $paymentMethodsQuery->where('orders.business_id', $businessId);
            }

            if ($outletId) {
                $paymentMethodsQuery->where('orders.outlet_id', $outletId);
            }

            // ✅ FIX: Handle case where there are no payments
            $paymentMethods = $paymentMethodsQuery
                ->selectRaw('payments.payment_method, SUM(payments.amount) as amount, COUNT(DISTINCT orders.id) as count')
                ->groupBy('payments.payment_method')
                ->get();
            
            // ✅ FIX: Ensure paymentMethods is always a collection
            if (!$paymentMethods || $paymentMethods->isEmpty()) {
                $paymentMethods = collect([]);
            } else {
                $paymentMethods = $paymentMethods->map(function ($item) use ($stats) {
                    return [
                        'name' => $this->formatPaymentMethod($item->payment_method ?? 'unknown'),
                        'amount' => (float) ($item->amount ?? 0),
                        'count' => (int) ($item->count ?? 0),
                        'percentage' => ($stats->total_sales ?? 0) > 0 ? round((($item->amount ?? 0) / ($stats->total_sales ?? 1)) * 100, 2) : 0
                    ];
                });
            }

            // Get sales trend based on chart type
            $timezone = 'Asia/Jakarta';
            $dailySales = collect([]);
            
            if ($chartType === 'daily') {
                // ✅ FIX: For daily chart, show hourly data (00:00 - 23:00)
                // ✅ FIX: Use paid_at from payments table instead of created_at
                $hourlySalesQuery = DB::table('orders')
                    ->leftJoin('payments', function($join) {
                        $join->on('orders.id', '=', 'payments.order_id')
                             ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']);
                    })
                    ->where(function($query) use ($startDate, $endDate) {
                        $query->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$startDate, $endDate]);
                    })
                    ->where('orders.payment_status', 'paid')
                    ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                    ->where('orders.business_id', $businessId);
                
                if ($outletId) {
                    $hourlySalesQuery->where('orders.outlet_id', $outletId);
                }
                
                $hourlySalesRaw = $hourlySalesQuery
                    ->selectRaw('HOUR(COALESCE(payments.paid_at, orders.created_at)) as hour, SUM(orders.total) as sales, COUNT(DISTINCT orders.id) as transactions')
                    ->groupBy('hour')
                    ->orderBy('hour')
                    ->get();
                
                // Fill in all hours (0-23)
                $hourlySalesMap = [];
                foreach ($hourlySalesRaw as $item) {
                    $hourlySalesMap[$item->hour] = [
                        'date' => sprintf('%02d:00', $item->hour),
                        'sales' => (float) ($item->sales ?? 0),
                        'transactions' => (int) ($item->transactions ?? 0)
                    ];
                }
                
                // Generate all hours
                for ($hour = 0; $hour < 24; $hour++) {
                    if (!isset($hourlySalesMap[$hour])) {
                        $dailySales->push([
                            'date' => sprintf('%02d:00', $hour),
                            'sales' => 0,
                            'transactions' => 0
                        ]);
                    } else {
                        $dailySales->push($hourlySalesMap[$hour]);
                    }
                }
            } else {
                // ✅ FIX: For weekly/monthly, show daily data
                // ✅ FIX: Use paid_at from payments table instead of created_at
                $dailySalesQuery = DB::table('orders')
                    ->leftJoin('payments', function($join) {
                        $join->on('orders.id', '=', 'payments.order_id')
                             ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']);
                    })
                    ->where(function($query) use ($startDate, $endDate) {
                        $query->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$startDate, $endDate]);
                    })
                    ->where('orders.payment_status', 'paid')
                    ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                    ->where('orders.business_id', $businessId);
                
                if ($outletId) {
                    $dailySalesQuery->where('orders.outlet_id', $outletId);
                }
                
                $dailySalesRaw = $dailySalesQuery
                    ->selectRaw('DATE(COALESCE(payments.paid_at, orders.created_at)) as date, SUM(orders.total) as sales, COUNT(DISTINCT orders.id) as transactions')
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get();
                
                // ✅ FIX: Fill in missing dates in the range
                $dailySalesMap = [];
                foreach ($dailySalesRaw as $item) {
                    $dailySalesMap[$item->date] = [
                        'date' => $item->date ?? null,
                        'sales' => (float) ($item->sales ?? 0),
                        'transactions' => (int) ($item->transactions ?? 0)
                    ];
                }
                
                // Generate all dates in range
                $currentDate = \Carbon\Carbon::parse($startDate, $timezone)->copy()->startOfDay();
                $endDateCarbon = \Carbon\Carbon::parse($endDate, $timezone)->copy()->startOfDay();
                
                // Loop through all dates from start to end (inclusive)
                while ($currentDate->lte($endDateCarbon)) {
                    $dateStr = $currentDate->format('Y-m-d');
                    if (!isset($dailySalesMap[$dateStr])) {
                        $dailySales->push([
                            'date' => $dateStr,
                            'sales' => 0,
                            'transactions' => 0
                        ]);
                    } else {
                        $dailySales->push($dailySalesMap[$dateStr]);
                    }
                    $currentDate->addDay();
                }
            }

            // Get top products
            // ✅ FIX: Only count paid orders
            // ✅ FIX: Use 'subtotal' instead of 'total_price' (correct column name)
            // ✅ FIX: Use paid_at from payments table instead of created_at
            $topProducts = DB::table('order_items')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->leftJoin('payments', function($join) {
                    $join->on('orders.id', '=', 'payments.order_id')
                         ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']);
                })
                ->where(function($q) use ($startDate, $endDate) {
                    $q->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$startDate, $endDate]);
                })
                ->where('orders.payment_status', 'paid') // ✅ FIX: Only paid orders
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->when($businessId, function ($query) use ($businessId) {
                    return $query->where('orders.business_id', $businessId);
                })
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('orders.outlet_id', $outletId);
                })
                ->selectRaw('
                    order_items.product_name,
                    SUM(order_items.quantity) as total_quantity,
                    SUM(order_items.subtotal) as total_revenue,
                    COUNT(DISTINCT orders.id) as order_count
                ')
                ->groupBy('order_items.product_name')
                ->orderBy('total_revenue', 'desc')
                ->limit(10)
                ->get();
            
            // ✅ FIX: Ensure topProducts is always a collection
            if (!$topProducts) {
                $topProducts = collect([]);
            } else {
                $topProducts = $topProducts->map(function ($item) {
                    return [
                        'name' => $item->product_name ?? 'Unknown',
                        'quantity' => (int) ($item->total_quantity ?? 0),
                        'sales' => (float) ($item->total_revenue ?? 0),
                        'order_count' => (int) ($item->order_count ?? 0)
                    ];
                });
            }

            // Hitung growth rate sederhana berdasarkan total_sales dibanding periode sebelumnya
            $growthRate = 0;
            try {
                if (isset($stats, $startDate, $endDate)) {
                    $currentTotal = (float) ($stats->total_sales ?? 0);

                    $start = \Carbon\Carbon::parse($startDate);
                    $end = \Carbon\Carbon::parse($endDate);
                    $periodLength = $end->diffInDays($start);

                    $previousStart = $start->copy()->subDays($periodLength + 1);
                    $previousEnd = $start->copy()->subDay();

                    $previousQuery = DB::table('orders')
                        ->leftJoin('payments', function ($join) {
                            $join->on('orders.id', '=', 'payments.order_id')
                                 ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']);
                        })
                        ->where(function ($q) use ($previousStart, $previousEnd) {
                            $q->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$previousStart, $previousEnd]);
                        })
                        ->where('orders.payment_status', 'paid')
                        ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready']);

                    if ($businessId) {
                        $previousQuery->where('orders.business_id', $businessId);
                    }

                    if ($outletId) {
                        $previousQuery->where('orders.outlet_id', $outletId);
                    }

                    $previousTotal = (float) $previousQuery->sum('orders.total');

                    if ($previousTotal > 0) {
                        $growthRate = round((($currentTotal - $previousTotal) / $previousTotal) * 100, 2);
                    } else {
                        $growthRate = $currentTotal > 0 ? 100.0 : 0.0;
                    }
                }
            } catch (\Exception $growthException) {
                $growthRate = 0;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'total_sales' => (float) ($stats->total_sales ?? 0), // ✅ FIX: Total Penjualan = orders.total (subtotal + tax - discount = total yang dibayar)
                    'total_transactions' => (int) ($stats->total_transactions ?? 0),
                    'net_sales' => (float) ($stats->total_subtotal ?? 0), // ✅ FIX: Penjualan Bersih = subtotal (sebelum pajak dan diskon)
                    'total_discount' => (float) ($stats->total_discount ?? 0),
                    'total_tax' => (float) ($stats->total_tax ?? 0),
                    'average_transaction' => (float) ($stats->average_transaction ?? 0),
                    'growth_rate' => (float) $growthRate,
                    'payment_methods' => $paymentMethods->values()->toArray(),
                    'daily_sales' => $dailySales->values()->toArray(),
                    'top_products' => $topProducts->values()->toArray()
                ]
            ]);

        } catch (\Exception $e) {
            // ✅ FIX: Detailed error logging
            $errorDetails = [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id,
                'business_id' => $request->header('X-Business-Id'),
                'outlet_id' => $request->header('X-Outlet-Id'),
                'date_range' => $request->get('date_range'),
                'custom_start' => $request->get('custom_start'),
                'custom_end' => $request->get('custom_end'),
            ];
            
            Log::error('ReportController: getSalesSummary failed', $errorDetails);

            // ✅ FIX: Return detailed error in development, simple message in production
            $isDevelopment = config('app.debug', false);
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching sales summary: ' . $e->getMessage(),
                'error' => $isDevelopment ? [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => explode("\n", $e->getTraceAsString())
                ] : null
            ], 500);
        }
    }

    /**
     * Get sales detail report
     */
    public function getSalesDetail(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $dateRange = $this->getDateRange($request);
            
            $businessId = $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 10);
            $search = $request->get('search', '');
            $status = $request->get('status', 'all');
            $paymentMethod = $request->get('payment_method', 'all');
            
            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID is required'
                ], 400);
            }

            // ✅ FIX: Use paid_at from payments table instead of created_at
            // First, get orders that match date range (using created_at as fallback)
            // Then filter by paid_at if exists
            $startDate = $dateRange['start'] instanceof Carbon 
                ? $dateRange['start']->toDateTimeString() 
                : $dateRange['start'];
            $endDate = $dateRange['end'] instanceof Carbon 
                ? $dateRange['end']->toDateTimeString() 
                : $dateRange['end'];
            
            $query = DB::table('orders')
                ->leftJoin('employees', 'orders.employee_id', '=', 'employees.id')
                ->leftJoin('users', 'employees.user_id', '=', 'users.id')
                ->leftJoin('customers', 'orders.customer_id', '=', 'customers.id')
                ->where('orders.payment_status', 'paid') // Only paid orders
                ->whereRaw('(
                    orders.created_at BETWEEN ? AND ?
                    OR EXISTS (
                        SELECT 1 FROM payments 
                        WHERE payments.order_id = orders.id 
                        AND payments.status IN (\'success\', \'paid\', \'settlement\', \'capture\')
                        AND payments.paid_at BETWEEN ? AND ?
                    )
                )', [$startDate, $endDate, $startDate, $endDate])
                ->select([
                    'orders.id',
                    'orders.order_number',
                    DB::raw('COALESCE((SELECT MAX(paid_at) FROM payments WHERE payments.order_id = orders.id AND payments.status IN (\'success\', \'paid\', \'settlement\', \'capture\')), orders.created_at) as transaction_date'),
                    'orders.created_at',
                    'orders.total',
                    'orders.discount_amount',
                    'orders.tax_amount',
                    DB::raw('(SELECT payment_method FROM payments WHERE payments.order_id = orders.id AND payments.status IN (\'success\', \'paid\', \'settlement\', \'capture\') ORDER BY paid_at DESC LIMIT 1) as payment_method'),
                    'orders.status',
                    'orders.employee_id',
                    'users.name as cashier_name',
                    'customers.name as customer_name',
                    DB::raw('(SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as items_count')
                ]);

            if ($businessId) {
                $query->where('orders.business_id', $businessId);
            }

            if ($outletId) {
                $query->where('orders.outlet_id', $outletId);
            }

            // Apply filters
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('orders.order_number', 'like', "%{$search}%")
                        ->orWhere('customers.name', 'like', "%{$search}%")
                        ->orWhere('users.name', 'like', "%{$search}%");
                });
            }

            if ($status !== 'all') {
                $query->where('orders.status', $status);
            }

            if ($paymentMethod !== 'all') {
                $query->whereExists(function($subquery) use ($paymentMethod) {
                    $subquery->select(DB::raw(1))
                             ->from('payments')
                             ->whereColumn('payments.order_id', 'orders.id')
                             ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture'])
                             ->where('payments.payment_method', $paymentMethod);
                });
            }

            // Get paginated results - order by transaction date (paid_at or created_at)
            $orders = $query->orderByRaw('COALESCE((SELECT MAX(paid_at) FROM payments WHERE payments.order_id = orders.id AND payments.status IN (\'success\', \'paid\', \'settlement\', \'capture\')), orders.created_at) DESC')
                ->paginate($perPage, ['*'], 'page', $page);

            // Get summary stats
            // ✅ FIX: Use paid_at from payments table instead of created_at
            $summaryQuery = DB::table('orders')
                ->where('orders.payment_status', 'paid') // Only paid orders
                ->whereRaw('(
                    orders.created_at BETWEEN ? AND ?
                    OR EXISTS (
                        SELECT 1 FROM payments 
                        WHERE payments.order_id = orders.id 
                        AND payments.status IN (\'success\', \'paid\', \'settlement\', \'capture\')
                        AND payments.paid_at BETWEEN ? AND ?
                    )
                )', [$startDate, $endDate, $startDate, $endDate]);

            if ($businessId) {
                $summaryQuery->where('orders.business_id', $businessId);
            }

            if ($outletId) {
                $summaryQuery->where('orders.outlet_id', $outletId);
            }

            $summary = $summaryQuery->selectRaw('
                COUNT(DISTINCT orders.id) as total_transactions,
                COALESCE(SUM(orders.subtotal), 0) as total_subtotal,
                COALESCE(SUM(orders.total), 0) as total_sales,
                COALESCE(SUM(orders.discount_amount), 0) as total_discount,
                COALESCE(SUM(orders.tax_amount), 0) as total_tax
            ')->first();
            
            // ✅ FIX: Handle null summary
            if (!$summary) {
                $summary = (object) [
                    'total_transactions' => 0,
                    'total_subtotal' => 0,
                    'total_sales' => 0,
                    'total_discount' => 0,
                    'total_tax' => 0,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'orders' => $orders,
                    'summary' => [
                        'total_transactions' => (int) ($summary->total_transactions ?? 0),
                        'total_sales' => (float) ($summary->total_sales ?? 0), // ✅ FIX: Total Penjualan = orders.total (subtotal + tax - discount)
                        'total_discount' => (float) ($summary->total_discount ?? 0),
                        'total_tax' => (float) ($summary->total_tax ?? 0),
                        'net_sales' => (float) ($summary->total_subtotal ?? 0) // ✅ FIX: Penjualan Bersih = subtotal (sebelum pajak dan diskon)
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('ReportController: getSalesDetail failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id,
                'business_id' => $request->header('X-Business-Id'),
                'outlet_id' => $request->header('X-Outlet-Id'),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching sales detail: ' . $e->getMessage(),
                'error' => config('app.debug', false) ? [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ] : null
            ], 500);
        }
    }

    /**
     * Get financial data
     */
    public function getFinancialData(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $businessId = $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            // Get date range from request
            $startDate = $request->input('start_date', now()->startOfDay()->toDateString());
            $endDate = $request->input('end_date', now()->endOfDay()->toDateString());

            // Calculate income for different periods
            $todayStart = now()->startOfDay();
            $todayEnd = now()->endOfDay();
            $weekStart = now()->startOfWeek();
            $monthStart = now()->startOfMonth();

            // Base query for orders (income)
            $baseOrderQuery = DB::table('orders')
                ->where('business_id', $businessId)
                ->where('payment_status', 'paid');

            if ($outletId) {
                $baseOrderQuery->where('outlet_id', $outletId);
            }

            // Income calculations
            $incomeToday = (clone $baseOrderQuery)->whereBetween('created_at', [$todayStart, $todayEnd])->sum('total');
            $incomeWeek = (clone $baseOrderQuery)->whereBetween('created_at', [$weekStart, now()])->sum('total');
            $incomeMonth = (clone $baseOrderQuery)->whereBetween('created_at', [$monthStart, now()])->sum('total');

            // Previous period for growth calculation
            $yesterdayStart = now()->subDay()->startOfDay();
            $yesterdayEnd = now()->subDay()->endOfDay();
            $incomeYesterday = (clone $baseOrderQuery)
                ->whereBetween('created_at', [$yesterdayStart, $yesterdayEnd])
                ->sum('total');

            $incomeGrowth = $incomeYesterday > 0
                ? (($incomeToday - $incomeYesterday) / $incomeYesterday) * 100
                : 0;

            // Base query for expenses
            $baseExpenseQuery = DB::table('expenses')
                ->where('business_id', $businessId);

            if ($outletId) {
                $baseExpenseQuery->where('outlet_id', $outletId);
            }

            // Expense calculations
            $expenseToday = (clone $baseExpenseQuery)->whereDate('date', $todayStart)->sum('amount');
            $expenseWeek = (clone $baseExpenseQuery)->whereBetween('date', [$weekStart, now()])->sum('amount');
            $expenseMonth = (clone $baseExpenseQuery)->whereBetween('date', [$monthStart, now()])->sum('amount');

            // Previous expense for growth
            $expenseYesterday = (clone $baseExpenseQuery)->whereDate('date', $yesterdayStart)->sum('amount');

            $expenseGrowth = $expenseYesterday > 0
                ? (($expenseToday - $expenseYesterday) / $expenseYesterday) * 100
                : 0;

            // Net income calculations
            $netIncomeToday = $incomeToday - $expenseToday;
            $netIncomeWeek = $incomeWeek - $expenseWeek;
            $netIncomeMonth = $incomeMonth - $expenseMonth;

            $netIncomeYesterday = $incomeYesterday - $expenseYesterday;
            $netIncomeGrowth = $netIncomeYesterday != 0
                ? (($netIncomeToday - $netIncomeYesterday) / abs($netIncomeYesterday)) * 100
                : 0;

            // Calculate cash balance from closed shifts
            $cashBalance = DB::table('cashier_shifts')
                ->where('business_id', $businessId)
                ->where('status', 'closed')
                ->sum('actual_cash');

            // Get recent transactions
            $recentTransactions = DB::table('orders')
                ->leftJoin('customers', 'orders.customer_id', '=', 'customers.id')
                ->leftJoin('employees', 'orders.employee_id', '=', 'employees.id')
                ->leftJoin('users', 'employees.user_id', '=', 'users.id')
                ->where('orders.business_id', $businessId)
                ->where('orders.payment_status', 'paid')
                ->whereBetween('orders.created_at', [$startDate, $endDate])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('orders.outlet_id', $outletId);
                })
                ->select([
                    'orders.id',
                    'orders.order_number as transaction_number',
                    'customers.name as customer_name',
                    'orders.total as amount',
                    'orders.created_at',
                    'orders.status',
                    'users.name as cashier'
                ])
                ->latest('orders.created_at')
                ->limit(10)
                ->get()
                ->map(function ($item) {
                    // Get payment method from first payment
                    $payment = DB::table('payments')
                        ->where('order_id', $item->id)
                        ->first();

                    return [
                        'id' => $item->id,
                        'transaction_number' => $item->transaction_number,
                        'customer_name' => $item->customer_name ?? 'Walk-in',
                        'customer' => $item->customer_name ?? 'Walk-in',
                        'amount' => $item->amount,
                        'total_amount' => $item->amount,
                        'payment_method' => $payment->payment_method ?? 'cash',
                        'created_at' => $item->created_at,
                        'status' => $item->status,
                        'cashier' => $item->cashier ?? 'Unknown',
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'income' => [
                        'today' => $incomeToday,
                        'this_week' => $incomeWeek,
                        'this_month' => $incomeMonth,
                        'growth' => round($incomeGrowth, 2),
                    ],
                    'expense' => [
                        'today' => $expenseToday,
                        'this_week' => $expenseWeek,
                        'this_month' => $expenseMonth,
                        'growth' => round($expenseGrowth, 2),
                    ],
                    'net_income' => [
                        'today' => $netIncomeToday,
                        'this_week' => $netIncomeWeek,
                        'this_month' => $netIncomeMonth,
                        'growth' => round($netIncomeGrowth, 2),
                    ],
                    'cash_balance' => $cashBalance,
                    'recent_transactions' => $recentTransactions,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('ReportController: getFinancialData failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error fetching financial data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export sales data
     * ✅ FIX: Added support for PDF, Excel, and CSV formats
     */
    public function exportSales(Request $request, $format = null)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            // Get format from request if not passed as parameter
            $format = $format ?? $request->get('format', 'csv');
            
            Log::info('Export sales called', [
                'format' => $format,
                'params' => $request->all(),
                'headers' => [
                    'X-Business-Id' => $request->header('X-Business-Id'),
                    'X-Outlet-Id' => $request->header('X-Outlet-Id'),
                ]
            ]);
            
            $dateRange = $this->getDateRange($request);
            $businessId = $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');

            // ✅ FIX: Use same query structure as getSalesDetail for consistency
            try {
                $startDate = $dateRange['start'] instanceof \Carbon\Carbon 
                    ? $dateRange['start']->copy()->startOfDay() 
                    : \Carbon\Carbon::parse($dateRange['start'])->startOfDay();
                $endDate = $dateRange['end'] instanceof \Carbon\Carbon 
                    ? $dateRange['end']->copy()->endOfDay() 
                    : \Carbon\Carbon::parse($dateRange['end'])->endOfDay();
            } catch (\Exception $dateError) {
                Log::error('Export sales date parsing error', [
                    'error' => $dateError->getMessage(),
                    'date_range' => $dateRange,
                ]);
                throw new \Exception('Invalid date range: ' . $dateError->getMessage());
            }
            
            $startDateStr = $startDate->toDateTimeString();
            $endDateStr = $endDate->toDateTimeString();
            
            $query = DB::table('orders')
                ->leftJoin('employees', 'orders.employee_id', '=', 'employees.id')
                ->leftJoin('users', 'employees.user_id', '=', 'users.id')
                ->leftJoin('customers', 'orders.customer_id', '=', 'customers.id')
                ->where('orders.payment_status', 'paid') // Only paid orders
                ->whereRaw('(
                    orders.created_at BETWEEN ? AND ?
                    OR EXISTS (
                        SELECT 1 FROM payments 
                        WHERE payments.order_id = orders.id 
                        AND payments.status IN (\'success\', \'paid\', \'settlement\', \'capture\')
                        AND payments.paid_at BETWEEN ? AND ?
                    )
                )', [$startDateStr, $endDateStr, $startDateStr, $endDateStr])
                ->select([
                    'orders.id',
                    'orders.order_number',
                    DB::raw('COALESCE((SELECT MAX(paid_at) FROM payments WHERE payments.order_id = orders.id AND payments.status IN (\'success\', \'paid\', \'settlement\', \'capture\')), orders.created_at) as transaction_date'),
                    'orders.created_at',
                    'orders.total',
                    'orders.discount_amount',
                    'orders.tax_amount',
                    DB::raw('(SELECT payment_method FROM payments WHERE payments.order_id = orders.id AND payments.status IN (\'success\', \'paid\', \'settlement\', \'capture\') ORDER BY paid_at DESC LIMIT 1) as payment_method'),
                    'orders.status',
                    'users.name as cashier_name',
                    'customers.name as customer_name'
                ]);

            if ($businessId) {
                $query->where('orders.business_id', $businessId);
            }

            if ($outletId) {
                $query->where('orders.outlet_id', $outletId);
            }

            // ✅ FIX: Add filter support for search, status, and payment method
            $search = $request->get('search');
            if ($search && !empty(trim($search))) {
                $searchTerm = '%' . trim($search) . '%';
                $query->where(function($q) use ($searchTerm) {
                    $q->where('orders.order_number', 'like', $searchTerm)
                      ->orWhere('customers.name', 'like', $searchTerm)
                      ->orWhere('users.name', 'like', $searchTerm);
                });
            }

            $status = $request->get('status');
            if ($status && $status !== 'all' && !empty($status)) {
                $query->where('orders.status', $status);
            }

            $paymentMethod = $request->get('paymentMethod');
            if (empty($paymentMethod)) {
                $paymentMethod = $request->get('payment_method'); // Try alternative parameter name
            }
            if ($paymentMethod && $paymentMethod !== 'all' && !empty($paymentMethod)) {
                // ✅ FIX: Use whereExists for payment method filter (same as getSalesDetail)
                $query->whereExists(function($subquery) use ($paymentMethod) {
                    $subquery->select(DB::raw(1))
                             ->from('payments')
                             ->whereColumn('payments.order_id', 'orders.id')
                             ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture'])
                             ->where('payments.payment_method', $paymentMethod);
                });
            }

            // ✅ FIX: Execute query with error handling - use same ordering as getSalesDetail
            try {
                $orders = $query->orderByRaw('COALESCE((SELECT MAX(paid_at) FROM payments WHERE payments.order_id = orders.id AND payments.status IN (\'success\', \'paid\', \'settlement\', \'capture\')), orders.created_at) DESC')
                    ->get();
            } catch (\Exception $queryError) {
                Log::error('Export sales query error', [
                    'error' => $queryError->getMessage(),
                    'file' => $queryError->getFile(),
                    'line' => $queryError->getLine(),
                    'sql' => $query->toSql(),
                    'bindings' => $query->getBindings(),
                ]);
                throw new \Exception('Database query failed: ' . $queryError->getMessage());
            }

            // Calculate summary
            $totalSales = $orders->sum('total');
            $totalDiscount = $orders->sum('discount_amount');
            $totalTax = $orders->sum('tax_amount');
            $totalTransactions = $orders->count();
            
            Log::info('Export sales query successful', [
                'orders_count' => $orders->count(),
                'total_sales' => $totalSales,
            ]);

            // Get outlet data
            $outlet = null;
            if ($outletId) {
                try {
                    $outlet = Outlet::find($outletId);
                } catch (\Exception $e) {
                    Log::warning('Export sales - Failed to load outlet', [
                        'outlet_id' => $outletId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Handle PDF format
            if ($format === 'pdf') {
                $html = $this->generateSalesPDF($orders, $dateRange, [
                    'totalSales' => $totalSales,
                    'totalDiscount' => $totalDiscount,
                    'totalTax' => $totalTax,
                    'totalTransactions' => $totalTransactions,
                ], $outlet);
                
                return response($html)
                    ->header('Content-Type', 'text/html; charset=UTF-8')
                    ->header('Content-Disposition', 'inline; filename="sales_report_' . date('Y-m-d') . '.html"');
            }

            // Handle CSV and Excel formats
            if ($format === 'csv' || $format === 'excel') {
                $csv = "No. Order,Tanggal,Total,Potongan,Pajak,Metode Pembayaran,Status,Kasir,Pelanggan\n";
                foreach ($orders as $order) {
                // ✅ FIX: Use transaction_date if available, otherwise use created_at
                $transactionDate = $order->transaction_date ?? $order->created_at;
                $dateFormatted = \Carbon\Carbon::parse($transactionDate)->format('d/m/Y H:i');
                
                $csv .= sprintf(
                    "%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                    $order->order_number,
                    $dateFormatted,
                    number_format($order->total, 0, ',', '.'),
                    number_format($order->discount_amount ?? 0, 0, ',', '.'),
                    number_format($order->tax_amount ?? 0, 0, ',', '.'),
                    $this->formatPaymentMethod($order->payment_method ?? 'cash'),
                    ucfirst($order->status ?? 'completed'),
                    $order->cashier_name ?? '-',
                    $order->customer_name ?? '-'
                );
                }

                // Add summary row
                $csv .= "\n";
                $csv .= "RINGKASAN\n";
                $csv .= "Total Transaksi," . $totalTransactions . "\n";
                $csv .= "Total Penjualan," . number_format($totalSales, 0, ',', '.') . "\n";
                $csv .= "Total Potongan," . number_format($totalDiscount, 0, ',', '.') . "\n";
                $csv .= "Total Pajak," . number_format($totalTax, 0, ',', '.') . "\n";

                $extension = $format === 'csv' ? 'csv' : 'xlsx';
                $contentType = $format === 'csv' 
                    ? 'text/csv' 
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                
                return response($csv)
                    ->header('Content-Type', $contentType)
                    ->header('Content-Disposition', 'attachment; filename="sales_report_' . date('Y-m-d') . '.' . $extension . '"');
            }

            return response()->json([
                'success' => false,
                'message' => 'Format not supported: ' . $format
            ], 400);

        } catch (\Exception $e) {
            Log::error('Export sales error', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'request_params' => $request->all(),
                'format' => $format ?? $request->get('format'),
            ]);
            
            $isDevelopment = config('app.debug', false);
            
            return response()->json([
                'success' => false,
                'message' => 'Error exporting sales data: ' . $e->getMessage(),
                'error' => $isDevelopment ? [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ] : null
            ], 500);
        }
    }

    /**
     * Generate HTML for PDF export of sales report
     */
    private function generateSalesPDF($orders, $dateRange, $summary, $outlet = null)
    {
        $startDate = $dateRange['start'] instanceof Carbon ? $dateRange['start'] : Carbon::parse($dateRange['start']);
        $endDate = $dateRange['end'] instanceof Carbon ? $dateRange['end'] : Carbon::parse($dateRange['end']);
        
        $dateRangeText = $startDate->format('d/m/Y') . ' - ' . $endDate->format('d/m/Y');
        
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Laporan Penjualan</title>
    <style>
        ' . $this->getReportStyles() . '
        .summary {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .summary h3 {
            margin-top: 0;
            color: #4CAF50;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-item label {
            display: block;
            font-size: 11px;
            color: #666;
            margin-bottom: 5px;
        }
        .summary-item .value {
            display: block;
            font-size: 16px;
            font-weight: bold;
            color: #4CAF50;
        }
    </style>
</head>
<body>
    ' . $this->generateReportHeader('Laporan Penjualan', $outlet, 'Periode: ' . $dateRangeText) . '
    
    <div class="summary">
        <h3>Ringkasan</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <label>Total Transaksi</label>
                <div class="value">' . number_format($summary['totalTransactions'], 0, ',', '.') . '</div>
            </div>
            <div class="summary-item">
                <label>Total Penjualan</label>
                <div class="value">Rp ' . number_format($summary['totalSales'], 0, ',', '.') . '</div>
            </div>
            <div class="summary-item">
                <label>Total Potongan</label>
                <div class="value">Rp ' . number_format($summary['totalDiscount'], 0, ',', '.') . '</div>
            </div>
            <div class="summary-item">
                <label>Total Pajak</label>
                <div class="value">Rp ' . number_format($summary['totalTax'], 0, ',', '.') . '</div>
            </div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>No. Order</th>
                <th>Tanggal</th>
                <th>Total</th>
                <th>Potongan</th>
                <th>Pajak</th>
                <th>Metode Pembayaran</th>
                <th>Status</th>
                <th>Kasir</th>
                <th>Pelanggan</th>
            </tr>
        </thead>
        <tbody>';
        
        foreach ($orders as $order) {
            // ✅ FIX: Use transaction_date if available, otherwise use created_at
            $transactionDate = $order->transaction_date ?? $order->created_at;
            $dateFormatted = \Carbon\Carbon::parse($transactionDate)->format('d/m/Y H:i');
            
            $html .= '<tr>
                <td>' . htmlspecialchars($order->order_number) . '</td>
                <td>' . $dateFormatted . '</td>
                <td>Rp ' . number_format($order->total, 0, ',', '.') . '</td>
                <td>Rp ' . number_format($order->discount_amount ?? 0, 0, ',', '.') . '</td>
                <td>Rp ' . number_format($order->tax_amount ?? 0, 0, ',', '.') . '</td>
                <td>' . htmlspecialchars($this->formatPaymentMethod($order->payment_method ?? 'cash')) . '</td>
                <td>' . ucfirst($order->status ?? 'completed') . '</td>
                <td>' . htmlspecialchars($order->cashier_name ?? '-') . '</td>
                <td>' . htmlspecialchars($order->customer_name ?? '-') . '</td>
            </tr>';
        }
        
        $html .= '</tbody>
    </table>
    
    <div class="footer">
        <p>Dicetak pada: ' . $this->formatIndonesianDate(Carbon::now('Asia/Jakarta')) . '</p>
    </div>
</body>
</html>';
        
        return $html;
    }

    /**
     * Get date range based on request parameters
     * ✅ FIX: Added error handling and timezone support
     */
    private function getDateRange(Request $request)
    {
        try {
            $dateRange = $request->get('date_range', 'today');
            $customStart = $request->get('custom_start');
            $customEnd = $request->get('custom_end');

            // ✅ FIX: Set timezone to Asia/Jakarta
            $timezone = 'Asia/Jakarta';
            $now = Carbon::now($timezone);

            // ✅ FIX: Handle custom date range with error handling
            if ($customStart && $customEnd) {
                try {
                    $start = Carbon::parse($customStart, $timezone)->startOfDay();
                    $end = Carbon::parse($customEnd, $timezone)->endOfDay();
                    
                    // ✅ FIX: Validate date range
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

            // ✅ FIX: Handle predefined date ranges
            switch (strtolower($dateRange)) {
                case 'today':
                case 'hari_ini':
                    return [
                        'start' => $now->copy()->startOfDay(),
                        'end' => $now->copy()->endOfDay()
                    ];
                case 'yesterday':
                case 'kemarin':
                    $yesterday = $now->copy()->subDay();
                    return [
                        'start' => $yesterday->startOfDay(),
                        'end' => $yesterday->endOfDay()
                    ];
                case 'week':
                case 'this_week':
                case 'minggu_ini':
                case '7days':
                case '7_days':
                    return [
                        'start' => $now->copy()->startOfWeek()->startOfDay(),
                        'end' => $now->copy()->endOfDay()
                    ];
                case 'last_week':
                case 'minggu_lalu':
                    $lastWeekStart = $now->copy()->subWeek()->startOfWeek()->startOfDay();
                    $lastWeekEnd = $now->copy()->subWeek()->endOfWeek()->endOfDay();
                    return [
                        'start' => $lastWeekStart,
                        'end' => $lastWeekEnd
                    ];
                case 'month':
                case 'this_month':
                case 'bulan_ini':
                    return [
                        'start' => $now->copy()->startOfMonth()->startOfDay(),
                        'end' => $now->copy()->endOfDay()
                    ];
                case 'last_month':
                case 'bulan_kemarin':
                case 'previous_month':
                    $lastMonth = $now->copy()->subMonth();
                    return [
                        'start' => $lastMonth->copy()->startOfMonth()->startOfDay(),
                        'end' => $lastMonth->copy()->endOfMonth()->endOfDay()
                    ];
                case 'quarter':
                    return [
                        'start' => $now->copy()->startOfQuarter()->startOfDay(),
                        'end' => $now->copy()->endOfDay()
                    ];
                case 'year':
                    return [
                        'start' => $now->copy()->startOfYear()->startOfDay(),
                        'end' => $now->copy()->endOfDay()
                    ];
                default:
                    // ✅ FIX: Default to today for unknown ranges
                    Log::warning('Unknown date range, defaulting to today', [
                        'date_range' => $dateRange
                    ]);
                    return [
                        'start' => $now->copy()->startOfDay(),
                        'end' => $now->copy()->endOfDay()
                    ];
            }
        } catch (\Exception $e) {
            Log::error('Error in getDateRange', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // ✅ FIX: Return safe default (today) on any error
            $now = Carbon::now('Asia/Jakarta');
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
        if (!$user) {
            return null;
        }

        // ✅ FIX: Priority 1: Get from request header (most reliable)
        $headerBusinessId = request()->header('X-Business-Id');
        if ($headerBusinessId) {
            return $headerBusinessId;
        }

        // ✅ FIX: Priority 2: Check if user has business_id directly
        if (isset($user->business_id) && $user->business_id) {
            return $user->business_id;
        }

        // ✅ FIX: Priority 3: For owner/admin, try to get from user's businesses
        if (in_array($user->role, ['owner', 'admin', 'super_admin'])) {
            // Try to get first business for this user
            $userBusiness = DB::table('businesses')
                ->where('owner_id', $user->id)
                ->first();
            if ($userBusiness) {
                return $userBusiness->id;
            }
        }

        return null;
    }

    /**
     * Get payment type report
     */
    public function getPaymentTypeReport(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $dateRange = $this->getDateRange($request);
            $businessId = $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');

            // ✅ FIX: Use paid_at from payments table instead of created_at
            // Base query for orders with payments
            $query = DB::table('orders')
                ->leftJoin('payments', function($join) {
                    $join->on('orders.id', '=', 'payments.order_id')
                         ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']);
                })
                ->where(function($q) use ($dateRange) {
                    $q->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$dateRange['start'], $dateRange['end']]);
                })
                ->where('orders.payment_status', 'paid')
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready']);

            if ($businessId) {
                $query->where('orders.business_id', $businessId);
            }

            if ($outletId) {
                $query->where('orders.outlet_id', $outletId);
            }

            // Get payment methods summary
            $paymentMethods = $query->clone()
                ->selectRaw('
                    payments.payment_method,
                    COUNT(DISTINCT orders.id) as transaction_count,
                    SUM(payments.amount) as total_amount,
                    AVG(payments.amount) as average_amount
                ')
                ->groupBy('payments.payment_method')
                ->orderBy('total_amount', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'payment_method' => $this->formatPaymentMethod($item->payment_method),
                        'payment_method_raw' => $item->payment_method,
                        'transaction_count' => (int) $item->transaction_count,
                        'total_amount' => (float) $item->total_amount,
                        'average_amount' => (float) $item->average_amount
                    ];
                });

            // Calculate total for percentage calculation
            $totalAmount = $paymentMethods->sum('total_amount');
            $totalTransactions = $paymentMethods->sum('transaction_count');

            // Add percentage to each payment method
            $paymentMethods = $paymentMethods->map(function ($item) use ($totalAmount, $totalTransactions) {
                $item['percentage_amount'] = $totalAmount > 0 ? round(($item['total_amount'] / $totalAmount) * 100, 2) : 0;
                $item['percentage_transactions'] = $totalTransactions > 0 ? round(($item['transaction_count'] / $totalTransactions) * 100, 2) : 0;
                return $item;
            });

            // Get daily payment trends
            $dailyPayments = $query->clone()
                ->selectRaw('
                    DATE(COALESCE(payments.paid_at, orders.created_at)) as date,
                    payments.payment_method,
                    COUNT(DISTINCT orders.id) as transaction_count,
                    SUM(payments.amount) as total_amount
                ')
                ->groupBy('date', 'payments.payment_method')
                ->orderBy('date')
                ->orderBy('total_amount', 'desc')
                ->get()
                ->groupBy('date')
                ->map(function ($dayData) {
                    return $dayData->map(function ($item) {
                        return [
                            'payment_method' => $this->formatPaymentMethod($item->payment_method),
                            'transaction_count' => (int) $item->transaction_count,
                            'total_amount' => (float) $item->total_amount
                        ];
                    });
                });

            // Get hourly distribution for selected date range
            // ✅ FIX: Support all date ranges, not just 'today'
                $hourlyPayments = $query->clone()
                    ->selectRaw('
                        HOUR(COALESCE(payments.paid_at, orders.created_at)) as hour,
                        payments.payment_method,
                        COUNT(DISTINCT orders.id) as transaction_count,
                        SUM(payments.amount) as total_amount
                    ')
                    ->groupBy('hour', 'payments.payment_method')
                    ->orderBy('hour')
                    ->get()
                    ->groupBy('hour')
                    ->map(function ($hourData) {
                        return $hourData->map(function ($item) {
                            return [
                                'payment_method' => $this->formatPaymentMethod($item->payment_method),
                                'transaction_count' => (int) $item->transaction_count,
                                'total_amount' => (float) $item->total_amount
                            ];
                        });
                    });

            // Get top transactions by payment method
            $topTransactions = $query->clone()
                ->leftJoin('employees', 'orders.employee_id', '=', 'employees.id')
                ->leftJoin('users', 'employees.user_id', '=', 'users.id')
                ->leftJoin('customers', 'orders.customer_id', '=', 'customers.id')
                ->select([
                    'orders.order_number',
                    'orders.created_at',
                    'payments.payment_method',
                    'payments.amount',
                    'users.name as cashier_name',
                    'customers.name as customer_name'
                ])
                ->orderBy('payments.amount', 'desc')
                ->limit(20)
                ->get()
                ->map(function ($item) {
                    return [
                        'order_number' => $item->order_number,
                        'created_at' => $item->created_at,
                        'payment_method' => $this->formatPaymentMethod($item->payment_method),
                        'amount' => (float) $item->amount,
                        'cashier_name' => $item->cashier_name,
                        'customer_name' => $item->customer_name
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => [
                        'total_amount' => (float) $totalAmount,
                        'total_transactions' => (int) $totalTransactions,
                        'average_transaction' => $totalTransactions > 0 ? round($totalAmount / $totalTransactions, 2) : 0,
                        'payment_methods_count' => $paymentMethods->count()
                    ],
                    'payment_methods' => $paymentMethods,
                    'daily_trends' => $dailyPayments,
                    'hourly_trends' => $hourlyPayments,
                    'top_transactions' => $topTransactions
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching payment type report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sales chart data for visualization
     */
    public function getSalesChartData(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $dateRange = $this->getDateRange($request);
            $businessId = $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');
            $chartType = $request->get('chart_type', 'daily'); // daily, weekly, monthly, hourly

            // Base query for orders
            // ✅ FIX: Use paid_at from payments table instead of created_at
            $query = DB::table('orders')
                ->leftJoin('payments', function($join) {
                    $join->on('orders.id', '=', 'payments.order_id')
                         ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']);
                })
                ->where(function($q) use ($dateRange) {
                    $q->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$dateRange['start'], $dateRange['end']]);
                })
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready']);

            if ($businessId) {
                $query->where('orders.business_id', $businessId);
            }

            if ($outletId) {
                $query->where('orders.outlet_id', $outletId);
            }

            $chartData = collect([]);

            switch ($chartType) {
                case 'hourly':
                    $chartData = $query->clone()
                        ->selectRaw('
                            HOUR(COALESCE(payments.paid_at, orders.created_at)) as period,
                            DATE(COALESCE(payments.paid_at, orders.created_at)) as date,
                            SUM(orders.total) as sales,
                            COUNT(DISTINCT orders.id) as transactions,
                            AVG(orders.total) as average_transaction
                        ')
                        ->groupBy('period', 'date')
                        ->orderBy('date')
                        ->orderBy('period')
                        ->get()
                        ->map(function ($item) {
                            return [
                                'period' => sprintf('%02d:00', $item->period),
                                'date' => $item->date,
                                'sales' => (float) $item->sales,
                                'transactions' => (int) $item->transactions,
                                'average_transaction' => (float) $item->average_transaction
                            ];
                        });
                    break;

                case 'weekly':
                    $chartData = $query->clone()
                        ->selectRaw('
                            YEARWEEK(COALESCE(payments.paid_at, orders.created_at), 1) as period,
                            YEAR(COALESCE(payments.paid_at, orders.created_at)) as year,
                            WEEK(COALESCE(payments.paid_at, orders.created_at), 1) as week,
                            SUM(orders.total) as sales,
                            COUNT(DISTINCT orders.id) as transactions,
                            AVG(orders.total) as average_transaction
                        ')
                        ->groupBy('period')
                        ->orderBy('period')
                        ->get()
                        ->map(function ($item) {
                            return [
                                'period' => "Minggu {$item->week}, {$item->year}",
                                'year' => $item->year,
                                'week' => $item->week,
                                'sales' => (float) $item->sales,
                                'transactions' => (int) $item->transactions,
                                'average_transaction' => (float) $item->average_transaction
                            ];
                        });
                    break;

                case 'monthly':
                    $chartData = $query->clone()
                        ->selectRaw('
                            DATE_FORMAT(COALESCE(payments.paid_at, orders.created_at), "%Y-%m") as period,
                            YEAR(COALESCE(payments.paid_at, orders.created_at)) as year,
                            MONTH(COALESCE(payments.paid_at, orders.created_at)) as month,
                            SUM(orders.total) as sales,
                            COUNT(DISTINCT orders.id) as transactions,
                            AVG(orders.total) as average_transaction
                        ')
                        ->groupBy('period')
                        ->orderBy('period')
                        ->get()
                        ->map(function ($item) {
                            $monthNames = [
                                1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
                                5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
                                9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
                            ];
                            return [
                                'period' => "{$monthNames[$item->month]} {$item->year}",
                                'year' => $item->year,
                                'month' => $item->month,
                                'sales' => (float) $item->sales,
                                'transactions' => (int) $item->transactions,
                                'average_transaction' => (float) $item->average_transaction
                            ];
                        });
                    break;

                case 'daily':
                default:
                    $chartData = $query->clone()
                        ->selectRaw('
                            DATE(COALESCE(payments.paid_at, orders.created_at)) as period,
                            SUM(orders.total) as sales,
                            COUNT(DISTINCT orders.id) as transactions,
                            AVG(orders.total) as average_transaction
                        ')
                        ->groupBy('period')
                        ->orderBy('period')
                        ->get()
                        ->map(function ($item) {
                            return [
                                'period' => $item->period,
                                'sales' => (float) $item->sales,
                                'transactions' => (int) $item->transactions,
                                'average_transaction' => (float) $item->average_transaction
                            ];
                        });
                    break;
            }

            // Get category sales data
            // ✅ FIX: Use paid_at from payments table instead of created_at
            $categoryData = DB::table('order_items')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->leftJoin('payments', function($join) {
                    $join->on('orders.id', '=', 'payments.order_id')
                         ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']);
                })
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->join('categories', 'products.category_id', '=', 'categories.id')
                ->where(function($q) use ($dateRange) {
                    $q->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$dateRange['start'], $dateRange['end']]);
                })
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->when($businessId, function ($query) use ($businessId) {
                    return $query->where('orders.business_id', $businessId);
                })
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('orders.outlet_id', $outletId);
                })
                ->selectRaw('
                    categories.name as category_name,
                    SUM(order_items.subtotal) as sales,
                    SUM(order_items.quantity) as quantity_sold,
                    COUNT(DISTINCT orders.id) as order_count
                ')
                ->groupBy('categories.id', 'categories.name')
                ->orderBy('sales', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'category_name' => $item->category_name,
                        'sales' => (float) $item->sales,
                        'quantity_sold' => (int) $item->quantity_sold,
                        'order_count' => (int) $item->order_count
                    ];
                });

            // Get payment method distribution
            $paymentData = $query->clone()
                ->selectRaw('
                    payments.payment_method,
                    SUM(orders.total) as sales,
                    COUNT(DISTINCT orders.id) as transactions
                ')
                ->groupBy('payments.payment_method')
                ->orderBy('sales', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'payment_method' => $this->formatPaymentMethod($item->payment_method),
                        'payment_method_raw' => $item->payment_method,
                        'sales' => (float) $item->sales,
                        'transactions' => (int) $item->transactions
                    ];
                });

            // Calculate totals for percentage
            $totalSales = $chartData->sum('sales');
            $totalTransactions = $chartData->sum('transactions');

            // Add percentage to payment data
            $paymentData = $paymentData->map(function ($item) use ($totalSales, $totalTransactions) {
                // $item is already an array from the previous map, but ensure type safety
                $itemArray = is_array($item) ? $item : (array) $item;
                return [
                    'payment_method' => $itemArray['payment_method'],
                    'payment_method_raw' => $itemArray['payment_method_raw'],
                    'sales' => $itemArray['sales'],
                    'transactions' => $itemArray['transactions'],
                    'sales_percentage' => $totalSales > 0 ? round(($itemArray['sales'] / $totalSales) * 100, 2) : 0,
                    'transactions_percentage' => $totalTransactions > 0 ? round(($itemArray['transactions'] / $totalTransactions) * 100, 2) : 0,
                ];
            });

            // Get top products
            // ✅ FIX: Use paid_at from payments table instead of created_at
            $topProducts = DB::table('order_items')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->leftJoin('payments', function($join) {
                    $join->on('orders.id', '=', 'payments.order_id')
                         ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']);
                })
                ->where(function($q) use ($dateRange) {
                    $q->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$dateRange['start'], $dateRange['end']]);
                })
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->when($businessId, function ($query) use ($businessId) {
                    return $query->where('orders.business_id', $businessId);
                })
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('orders.outlet_id', $outletId);
                })
                ->selectRaw('
                    order_items.product_name,
                    SUM(order_items.subtotal) as sales,
                    SUM(order_items.quantity) as quantity_sold,
                    COUNT(DISTINCT orders.id) as order_count
                ')
                ->groupBy('order_items.product_name')
                ->orderBy('sales', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($item) {
                    return [
                        'name' => $item->product_name,
                        'sales' => (float) $item->sales,
                        'quantity_sold' => (int) $item->quantity_sold,
                        'order_count' => (int) $item->order_count
                    ];
                });

            // Calculate growth percentage (compare with previous period)
            $growthPercentage = $this->calculateGrowthPercentage($chartData, $chartType, $dateRange, $businessId, $outletId);

            return response()->json([
                'success' => true,
                'data' => [
                    'chart_type' => $chartType,
                    'date_range' => [
                        'start' => $dateRange['start']->format('Y-m-d'),
                        'end' => $dateRange['end']->format('Y-m-d')
                    ],
                    'summary' => [
                        'total_sales' => (float) $totalSales,
                        'total_transactions' => (int) $totalTransactions,
                        'average_transaction' => $totalTransactions > 0 ? round($totalSales / $totalTransactions, 2) : 0,
                        'growth_rate' => (float) $growthPercentage,
                        'growth_percentage' => (float) $growthPercentage // Add alias for frontend compatibility
                    ],
                    'chart_data' => $chartData->values()->toArray(),
                    'category_data' => $categoryData->values()->toArray(),
                    'payment_data' => $paymentData->values()->toArray(),
                    'top_products' => $topProducts->values()->toArray()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching sales chart data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate growth percentage compared to previous period
     */
    private function calculateGrowthPercentage($currentData, $chartType, $dateRange, $businessId, $outletId)
    {
        try {
            $currentTotal = $currentData->sum('sales');

            // Calculate previous period date range
            $periodLength = $dateRange['end']->diffInDays($dateRange['start']);
            $previousStart = $dateRange['start']->copy()->subDays($periodLength + 1);
            $previousEnd = $dateRange['start']->copy()->subDay();

            // ✅ FIX: Use paid_at from payments table instead of created_at
            $previousQuery = DB::table('orders')
                ->leftJoin('payments', function($join) {
                    $join->on('orders.id', '=', 'payments.order_id')
                         ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture']);
                })
                ->where(function($q) use ($previousStart, $previousEnd) {
                    $q->whereBetween(DB::raw('COALESCE(payments.paid_at, orders.created_at)'), [$previousStart, $previousEnd]);
                })
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready']);

            if ($businessId) {
                $previousQuery->where('orders.business_id', $businessId);
            }

            if ($outletId) {
                $previousQuery->where('orders.outlet_id', $outletId);
            }

            $previousTotal = $previousQuery->sum('orders.total');

            if ($previousTotal > 0) {
                return round((($currentTotal - $previousTotal) / $previousTotal) * 100, 2);
            }

            return $currentTotal > 0 ? 100 : 0;

        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Format payment method name
     */
    private function formatPaymentMethod($method)
    {
        $methods = [
            'cash' => 'Tunai',
            'card' => 'Kartu',
            'transfer' => 'Transfer',
            'qris' => 'QRIS',
            'gopay' => 'GoPay',
            'ovo' => 'OVO',
            'dana' => 'DANA',
            'shopeepay' => 'ShopeePay',
            'bank_transfer' => 'Transfer Bank',
            'e_wallet' => 'E-Wallet',
            'credit_card' => 'Kartu Kredit',
            'debit_card' => 'Kartu Debit'
        ];

        return $methods[$method] ?? ucfirst($method);
    }

    /**
     * Export product sales data
     * ✅ FIX: Added support for PDF, Excel, and CSV formats
     */
    public function exportProductSales(Request $request, $format = null)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            // Get format from request if not passed as parameter
            $format = $format ?? $request->get('format', 'csv');
            
            Log::info('Export product sales called', [
                'format' => $format,
                'params' => $request->all(),
            ]);
            
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');
            
            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID is required'
                ], 400);
            }
            
            // Get date range
            $dateRange = $this->getDateRange($request);
            
            // ✅ FIX: Convert date range to proper format
            try {
                $startDate = $dateRange['start'] instanceof \Carbon\Carbon 
                    ? $dateRange['start']->copy()->startOfDay() 
                    : \Carbon\Carbon::parse($dateRange['start'])->startOfDay();
                $endDate = $dateRange['end'] instanceof \Carbon\Carbon 
                    ? $dateRange['end']->copy()->endOfDay() 
                    : \Carbon\Carbon::parse($dateRange['end'])->endOfDay();
            } catch (\Exception $dateError) {
                Log::error('Export product sales date parsing error', [
                    'error' => $dateError->getMessage(),
                    'date_range' => $dateRange,
                ]);
                throw new \Exception('Invalid date range: ' . $dateError->getMessage());
            }
            
            $startDateStr = $startDate->toDateTimeString();
            $endDateStr = $endDate->toDateTimeString();
            
            $search = $request->get('search', '');
            $sortBy = $request->get('sort_by', 'total_revenue');
            $sortOrder = $request->get('sort_order', 'desc');
            
            // Build query for product sales (same as ProductReportController)
            $query = DB::table('order_items')
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereBetween('orders.created_at', [$startDateStr, $endDateStr])
                ->whereNull('orders.deleted_at');
            
            if ($outletId) {
                $query->where('orders.outlet_id', $outletId);
            }
            
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('products.name', 'like', '%' . $search . '%')
                      ->orWhere('categories.name', 'like', '%' . $search . '%');
                });
            }
            
            // Get product sales with grouping
            $products = $query->select([
                    'products.id as product_id',
                    'products.name as product_name',
                    DB::raw('COALESCE(categories.name, "Tanpa Kategori") as category_name'),
                    DB::raw('SUM(order_items.quantity) as total_quantity'),
                    DB::raw('SUM(order_items.subtotal) as total_revenue'),
                    DB::raw('AVG(order_items.price) as avg_price'),
                    DB::raw('COUNT(DISTINCT order_items.order_id) as order_count')
                ])
                ->groupBy('products.id', 'products.name', 'categories.id', 'categories.name')
                ->orderBy($sortBy, $sortOrder)
                ->get();
            
            // Calculate summary
            $totalRevenue = $products->sum('total_revenue');
            $totalQuantity = $products->sum('total_quantity');
            $totalProducts = $products->count();
            
            // Get outlet data
            $outlet = null;
            if ($outletId) {
                try {
                    $outlet = Outlet::find($outletId);
                } catch (\Exception $e) {
                    Log::warning('Export product sales - Failed to load outlet', [
                        'outlet_id' => $outletId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            // Handle PDF format
            if ($format === 'pdf') {
                $html = $this->generateProductSalesPDF($products, $dateRange, [
                    'totalProducts' => $totalProducts,
                    'totalRevenue' => $totalRevenue,
                    'totalQuantity' => $totalQuantity,
                ], $outlet);
                
                return response($html)
                    ->header('Content-Type', 'text/html; charset=UTF-8')
                    ->header('Content-Disposition', 'inline; filename="product_sales_report_' . date('Y-m-d') . '.html"');
            }
            
            // Handle CSV and Excel formats
            if ($format === 'csv' || $format === 'excel') {
                $csv = "Nama Produk,Kategori,Total Terjual,Total Pendapatan,Rata-rata Harga,Jumlah Order\n";
                foreach ($products as $product) {
                    $csv .= sprintf(
                        "%s,%s,%s,%s,%s,%s\n",
                        $product->product_name,
                        $product->category_name,
                        number_format($product->total_quantity, 0, ',', '.'),
                        number_format($product->total_revenue, 0, ',', '.'),
                        number_format($product->avg_price, 0, ',', '.'),
                        $product->order_count
                    );
                }
                
                // Add summary row
                $csv .= "\n";
                $csv .= "RINGKASAN\n";
                $csv .= "Total Produk," . $totalProducts . "\n";
                $csv .= "Total Terjual," . number_format($totalQuantity, 0, ',', '.') . "\n";
                $csv .= "Total Pendapatan," . number_format($totalRevenue, 0, ',', '.') . "\n";
                
                $extension = $format === 'csv' ? 'csv' : 'xlsx';
                $contentType = $format === 'csv' 
                    ? 'text/csv' 
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                
                return response($csv)
                    ->header('Content-Type', $contentType)
                    ->header('Content-Disposition', 'attachment; filename="product_sales_report_' . date('Y-m-d') . '.' . $extension . '"');
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Format not supported: ' . $format
            ], 400);
            
        } catch (\Exception $e) {
            Log::error('Export product sales error', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error exporting product sales: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Generate HTML for PDF export of product sales report
     */
    private function generateProductSalesPDF($products, $dateRange, $summary, $outlet = null)
    {
        $startDate = $dateRange['start'] instanceof Carbon ? $dateRange['start'] : Carbon::parse($dateRange['start']);
        $endDate = $dateRange['end'] instanceof Carbon ? $dateRange['end'] : Carbon::parse($dateRange['end']);
        
        $dateRangeText = $startDate->format('d/m/Y') . ' - ' . $endDate->format('d/m/Y');
        
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Laporan Penjualan Produk</title>
    <style>
        ' . $this->getReportStyles() . '
        .summary {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .summary h3 {
            margin-top: 0;
            color: #4CAF50;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-item label {
            display: block;
            font-size: 11px;
            color: #666;
            margin-bottom: 5px;
        }
        .summary-item .value {
            display: block;
            font-size: 16px;
            font-weight: bold;
            color: #4CAF50;
        }
    </style>
</head>
<body>
    ' . $this->generateReportHeader('Laporan Penjualan Produk', $outlet, 'Periode: ' . $dateRangeText) . '
    
    <div class="summary">
        <h3>Ringkasan</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <label>Total Produk</label>
                <div class="value">' . number_format($summary['totalProducts'], 0, ',', '.') . '</div>
            </div>
            <div class="summary-item">
                <label>Total Terjual</label>
                <div class="value">' . number_format($summary['totalQuantity'], 0, ',', '.') . '</div>
            </div>
            <div class="summary-item">
                <label>Total Pendapatan</label>
                <div class="value">Rp ' . number_format($summary['totalRevenue'], 0, ',', '.') . '</div>
            </div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Nama Produk</th>
                <th>Kategori</th>
                <th>Total Terjual</th>
                <th>Total Pendapatan</th>
                <th>Rata-rata Harga</th>
                <th>Jumlah Order</th>
            </tr>
        </thead>
        <tbody>';
        
        foreach ($products as $product) {
            $html .= '<tr>
                <td>' . htmlspecialchars($product->product_name) . '</td>
                <td>' . htmlspecialchars($product->category_name) . '</td>
                <td>' . number_format($product->total_quantity, 0, ',', '.') . '</td>
                <td>Rp ' . number_format($product->total_revenue, 0, ',', '.') . '</td>
                <td>Rp ' . number_format($product->avg_price, 0, ',', '.') . '</td>
                <td>' . $product->order_count . '</td>
            </tr>';
        }
        
        $html .= '</tbody>
    </table>
    
    <div class="footer">
        <p>Dicetak pada: ' . $this->formatIndonesianDate(Carbon::now('Asia/Jakarta')) . '</p>
    </div>
</body>
</html>';
        
        return $html;
    }

    /**
     * Export category sales data
     * ✅ FIX: Added support for PDF, Excel, and CSV formats
     */
    public function exportCategorySales(Request $request, $format = null)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            // Get format from request if not passed as parameter
            $format = $format ?? $request->get('format', 'csv');
            
            Log::info('Export category sales called', [
                'format' => $format,
                'params' => $request->all(),
            ]);
            
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');
            
            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID is required'
                ], 400);
            }
            
            // Get date range
            $dateRange = $this->getDateRange($request);
            
            // ✅ FIX: Convert date range to proper format
            try {
                $startDate = $dateRange['start'] instanceof \Carbon\Carbon 
                    ? $dateRange['start']->copy()->startOfDay() 
                    : \Carbon\Carbon::parse($dateRange['start'])->startOfDay();
                $endDate = $dateRange['end'] instanceof \Carbon\Carbon 
                    ? $dateRange['end']->copy()->endOfDay() 
                    : \Carbon\Carbon::parse($dateRange['end'])->endOfDay();
            } catch (\Exception $dateError) {
                Log::error('Export category sales date parsing error', [
                    'error' => $dateError->getMessage(),
                    'date_range' => $dateRange,
                ]);
                throw new \Exception('Invalid date range: ' . $dateError->getMessage());
            }
            
            $startDateStr = $startDate->toDateTimeString();
            $endDateStr = $endDate->toDateTimeString();
            
            $sortBy = $request->get('sort_by', 'total_revenue');
            $sortOrder = $request->get('sort_order', 'desc');
            
            // Build query for category sales (same as ProductReportController)
            $query = DB::table('order_items')
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereBetween('orders.created_at', [$startDateStr, $endDateStr])
                ->whereNull('orders.deleted_at');
            
            if ($outletId) {
                $query->where('orders.outlet_id', $outletId);
            }
            
            // Get category sales with grouping
            $categories = $query->select([
                    DB::raw('COALESCE(categories.id, 0) as category_id'),
                    DB::raw('COALESCE(categories.name, "Tanpa Kategori") as category_name'),
                    DB::raw('COUNT(DISTINCT products.id) as product_count'),
                    DB::raw('SUM(order_items.quantity) as total_quantity'),
                    DB::raw('SUM(order_items.subtotal) as total_revenue'),
                    DB::raw('AVG(order_items.price) as avg_price'),
                    DB::raw('COUNT(DISTINCT order_items.order_id) as order_count')
                ])
                ->groupBy('categories.id', 'categories.name')
                ->orderBy($sortBy, $sortOrder)
                ->get();
            
            // Calculate summary
            $totalRevenue = $categories->sum('total_revenue');
            $totalQuantity = $categories->sum('total_quantity');
            $totalCategories = $categories->count();
            $totalProducts = $categories->sum('product_count');
            
            // Get outlet data
            $outlet = null;
            if ($outletId) {
                try {
                    $outlet = Outlet::find($outletId);
                } catch (\Exception $e) {
                    Log::warning('Export category sales - Failed to load outlet', [
                        'outlet_id' => $outletId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            // Handle PDF format
            if ($format === 'pdf') {
                $html = $this->generateCategorySalesPDF($categories, $dateRange, [
                    'totalCategories' => $totalCategories,
                    'totalProducts' => $totalProducts,
                    'totalRevenue' => $totalRevenue,
                    'totalQuantity' => $totalQuantity,
                ], $outlet);
                
                return response($html)
                    ->header('Content-Type', 'text/html; charset=UTF-8')
                    ->header('Content-Disposition', 'inline; filename="category_sales_report_' . date('Y-m-d') . '.html"');
            }
            
            // Handle CSV and Excel formats
            if ($format === 'csv' || $format === 'excel') {
                $csv = "Kategori,Jumlah Produk,Total Terjual,Total Pendapatan,Rata-rata Harga,Jumlah Order\n";
                foreach ($categories as $category) {
                    $csv .= sprintf(
                        "%s,%s,%s,%s,%s,%s\n",
                        $category->category_name,
                        $category->product_count,
                        number_format($category->total_quantity, 0, ',', '.'),
                        number_format($category->total_revenue, 0, ',', '.'),
                        number_format($category->avg_price, 0, ',', '.'),
                        $category->order_count
                    );
                }
                
                // Add summary row
                $csv .= "\n";
                $csv .= "RINGKASAN\n";
                $csv .= "Total Kategori," . $totalCategories . "\n";
                $csv .= "Total Produk," . $totalProducts . "\n";
                $csv .= "Total Terjual," . number_format($totalQuantity, 0, ',', '.') . "\n";
                $csv .= "Total Pendapatan," . number_format($totalRevenue, 0, ',', '.') . "\n";
                
                $extension = $format === 'csv' ? 'csv' : 'xlsx';
                $contentType = $format === 'csv' 
                    ? 'text/csv' 
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                
                return response($csv)
                    ->header('Content-Type', $contentType)
                    ->header('Content-Disposition', 'attachment; filename="category_sales_report_' . date('Y-m-d') . '.' . $extension . '"');
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Format not supported: ' . $format
            ], 400);
            
        } catch (\Exception $e) {
            Log::error('Export category sales error', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error exporting category sales: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Generate HTML for PDF export of category sales report
     */
    private function generateCategorySalesPDF($categories, $dateRange, $summary, $outlet = null)
    {
        $startDate = $dateRange['start'] instanceof Carbon ? $dateRange['start'] : Carbon::parse($dateRange['start']);
        $endDate = $dateRange['end'] instanceof Carbon ? $dateRange['end'] : Carbon::parse($dateRange['end']);
        
        $dateRangeText = $startDate->format('d/m/Y') . ' - ' . $endDate->format('d/m/Y');
        
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Laporan Penjualan Kategori</title>
    <style>
        ' . $this->getReportStyles() . '
        .summary {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .summary h3 {
            margin-top: 0;
            color: #4CAF50;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-item label {
            display: block;
            font-size: 11px;
            color: #666;
            margin-bottom: 5px;
        }
        .summary-item .value {
            display: block;
            font-size: 16px;
            font-weight: bold;
            color: #4CAF50;
        }
    </style>
</head>
<body>
    ' . $this->generateReportHeader('Laporan Penjualan Kategori', $outlet, 'Periode: ' . $dateRangeText) . '
    
    <div class="summary">
        <h3>Ringkasan</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <label>Total Kategori</label>
                <div class="value">' . number_format($summary['totalCategories'], 0, ',', '.') . '</div>
            </div>
            <div class="summary-item">
                <label>Total Produk</label>
                <div class="value">' . number_format($summary['totalProducts'], 0, ',', '.') . '</div>
            </div>
            <div class="summary-item">
                <label>Total Terjual</label>
                <div class="value">' . number_format($summary['totalQuantity'], 0, ',', '.') . '</div>
            </div>
            <div class="summary-item">
                <label>Total Pendapatan</label>
                <div class="value">Rp ' . number_format($summary['totalRevenue'], 0, ',', '.') . '</div>
            </div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Kategori</th>
                <th>Jumlah Produk</th>
                <th>Total Terjual</th>
                <th>Total Pendapatan</th>
                <th>Rata-rata Harga</th>
                <th>Jumlah Order</th>
            </tr>
        </thead>
        <tbody>';
        
        foreach ($categories as $category) {
            $html .= '<tr>
                <td>' . htmlspecialchars($category->category_name) . '</td>
                <td>' . $category->product_count . '</td>
                <td>' . number_format($category->total_quantity, 0, ',', '.') . '</td>
                <td>Rp ' . number_format($category->total_revenue, 0, ',', '.') . '</td>
                <td>Rp ' . number_format($category->avg_price, 0, ',', '.') . '</td>
                <td>' . $category->order_count . '</td>
            </tr>';
        }
        
        $html .= '</tbody>
    </table>
    
    <div class="footer">
        <p>Dicetak pada: ' . $this->formatIndonesianDate(Carbon::now('Asia/Jakarta')) . '</p>
    </div>
</body>
</html>';
        
        return $html;
    }

    /**
     * Export report by type (dynamic export handler)
     */
    public function exportReport(Request $request, $type)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $format = $request->get('format', 'excel');
            
            Log::info('Export report called', [
                'type' => $type,
                'format' => $format,
                'business_id' => $request->header('X-Business-Id'),
                'outlet_id' => $request->header('X-Outlet-Id'),
            ]);
            
            // Route to specific export method based on type
            switch ($type) {
                case 'sales':
                case 'sales-summary':
                case 'sales-detail':
                    // ✅ FIX: Pass format parameter to exportSales
                    return $this->exportSales($request, $format);
                    
                case 'product-sales':
                    return $this->exportProductSales($request, $format);
                    
                case 'category-sales':
                    return $this->exportCategorySales($request, $format);
                    
                case 'inventory-status':
                    return $this->exportInventoryStatus($request, $format);
                    
                case 'inventory':
                    return $this->exportInventory($request);
                    
                case 'cashier-performance':
                    return $this->exportCashierPerformance($request, $format);
                    
                case 'commission':
                    return $this->exportCommission($request, $format);
                    
                default:
                    Log::warning('Export type not supported', ['type' => $type]);
                    return response()->json([
                        'success' => false,
                        'message' => 'Export type not supported: ' . $type
                    ], 400);
            }
        } catch (\Exception $e) {
            Log::error('Export report error', [
                'type' => $type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error exporting report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export inventory status report
     */
    public function exportInventoryStatus(Request $request, $format = 'excel')
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                Log::warning('Export inventory status: Business ID missing', [
                    'headers' => $request->headers->all()
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID required'
                ], 400);
            }

            $search = $request->input('search', '');
            $categoryId = $request->input('category_id', '');
            $stockStatus = $request->input('stock_status', 'all');
            $sortBy = $request->input('sort_by', 'name');
            $sortOrder = $request->input('sort_order', 'asc');

            // Build query (same as getInventoryStatus but without pagination)
            $query = DB::table('products')
                ->join('categories', 'products.category_id', '=', 'categories.id')
                ->where('products.business_id', $businessId)
                ->where('products.is_active', true)
                ->select([
                    'products.name',
                    'products.sku',
                    'categories.name as category_name',
                    'products.stock',
                    'products.min_stock',
                    'products.price',
                    'products.cost',
                ]);

            // Apply filters
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('products.name', 'like', "%{$search}%")
                      ->orWhere('products.sku', 'like', "%{$search}%")
                      ->orWhere('categories.name', 'like', "%{$search}%");
                });
            }

            if ($categoryId) {
                $query->where('products.category_id', $categoryId);
            }

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

            $query->orderBy($sortBy, $sortOrder);
            $products = $query->get();

            // Log for debugging
            Log::info('Export inventory status - Products count', [
                'count' => $products->count(),
                'format' => $format,
                'business_id' => $businessId,
                'search' => $search,
                'category_id' => $categoryId,
                'stock_status' => $stockStatus
            ]);

            // Check if products is empty
            if ($products->isEmpty()) {
                Log::warning('Export inventory status - No products found');
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data produk untuk diekspor'
                ], 404);
            }

            // Get outlet data
            $outlet = null;
            if ($outletId) {
                try {
                    $outlet = Outlet::find($outletId);
                } catch (\Exception $e) {
                    Log::warning('Export inventory status - Failed to load outlet', [
                        'outlet_id' => $outletId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Generate CSV/Excel content
            if ($format === 'csv' || $format === 'excel') {
                $csv = "";
                
                // Add outlet information header
                if ($outlet) {
                    $csv .= "OUTLET INFORMATION\n";
                    $csv .= "Nama Outlet," . ($outlet->name ?? '-') . "\n";
                    $csv .= "Alamat," . ($outlet->address ?? '-') . "\n";
                    $csv .= "Telepon," . ($outlet->phone ?? '-') . "\n";
                    $csv .= "\n";
                }
                
                $csv .= "LAPORAN STATUS PERSEDIAAN\n";
                $csv .= "Tanggal," . date('d/m/Y H:i:s') . "\n";
                $csv .= "\n";
                $csv .= "Nama Produk,SKU,Kategori,Stok Saat Ini,Min Stok,Status,Harga,Nilai Stok\n";
                
                foreach ($products as $product) {
                    $status = 'Tersedia';
                    if ($product->stock == 0) {
                        $status = 'Habis';
                    } elseif ($product->stock <= $product->min_stock) {
                        $status = 'Stok Rendah';
                    }
                    
                    $costOrPrice = $product->cost && $product->cost > 0 ? $product->cost : $product->price;
                    $stockValue = $product->stock * $costOrPrice;
                    
                    $csv .= sprintf(
                        "%s,%s,%s,%s,%s,%s,%s,%s\n",
                        $product->name,
                        $product->sku,
                        $product->category_name,
                        $product->stock,
                        $product->min_stock,
                        $status,
                        number_format($product->price, 0, ',', '.'),
                        number_format($stockValue, 0, ',', '.')
                    );
                }

                $extension = $format === 'csv' ? 'csv' : 'xlsx';
                $contentType = $format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                
                return response($csv)
                    ->header('Content-Type', $contentType)
                    ->header('Content-Disposition', 'attachment; filename="inventory_status_' . date('Y-m-d') . '.' . $extension . '"');
            }

            // Generate PDF content (HTML format that can be printed to PDF)
            if ($format === 'pdf') {
                $html = $this->generateInventoryStatusPDF($products, $outlet);
                
                return response($html)
                    ->header('Content-Type', 'text/html; charset=UTF-8')
                    ->header('Content-Disposition', 'inline; filename="inventory_status_' . date('Y-m-d') . '.html"');
            }

            return response()->json([
                'success' => false,
                'message' => 'Format not supported: ' . $format
            ], 400);

        } catch (\Exception $e) {
            Log::error('Export inventory status error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error exporting inventory status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate HTML for PDF export of inventory status
     */
    private function generateInventoryStatusPDF($products, $outlet = null)
    {
        // Prepare outlet logo
        $logoHtml = '';
        if ($outlet && $outlet->logo) {
            $logo = trim($outlet->logo);
            // Check if logo is base64 or URL
            if (strpos($logo, 'data:image') === 0) {
                // Base64 image (data:image/png;base64,...)
                $logoHtml = '<img src="' . htmlspecialchars($logo) . '" alt="Logo" class="logo" />';
            } elseif (strpos($logo, 'http://') === 0 || strpos($logo, 'https://') === 0) {
                // Full URL
                $logoHtml = '<img src="' . htmlspecialchars($logo) . '" alt="Logo" class="logo" />';
            } elseif (strpos($logo, '/') === 0 || strpos($logo, 'storage/') === 0) {
                // Relative path - construct full URL
                $baseUrl = url('/');
                $logoUrl = $baseUrl . (strpos($logo, '/') === 0 ? '' : '/') . $logo;
                $logoHtml = '<img src="' . htmlspecialchars($logoUrl) . '" alt="Logo" class="logo" />';
            } elseif (strlen($logo) > 100) {
                // Likely base64 without data:image prefix, try to construct it
                // Check if it's valid base64
                if (base64_decode($logo, true) !== false) {
                    // Assume PNG if we can't determine
                    $logoHtml = '<img src="data:image/png;base64,' . htmlspecialchars($logo) . '" alt="Logo" class="logo" />';
                }
            }
        }

        $outletName = $outlet ? ($outlet->name ?? '-') : '-';
        $outletAddress = $outlet ? ($outlet->address ?? '-') : '-';
        $outletPhone = $outlet ? ($outlet->phone ?? '-') : '-';

        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Laporan Status Persediaan</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
            background-color: #fff;
        }
        .header {
            width: 100%;
            margin-bottom: 25px;
            padding: 20px;
            background-color: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }
        .header-content {
            display: flex;
            align-items: center;
            gap: 30px;
        }
        .logo-section {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo {
            width: 100px;
            height: 100px;
            object-fit: contain;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #fff;
            padding: 5px;
        }
        .outlet-section {
            flex: 1;
            min-width: 0;
        }
        .outlet-name {
            font-size: 22px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 12px;
            line-height: 1.2;
        }
        .outlet-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .outlet-info-item {
            display: flex;
            align-items: flex-start;
            font-size: 12px;
            color: #555;
            line-height: 1.4;
        }
        .outlet-info-label {
            font-weight: 600;
            color: #333;
            min-width: 70px;
            margin-right: 8px;
        }
        .outlet-info-value {
            flex: 1;
            word-wrap: break-word;
        }
        .report-title-section {
            flex-shrink: 0;
            text-align: right;
            border-left: 2px solid #4CAF50;
            padding-left: 20px;
            min-width: 200px;
        }
        .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .report-date {
            font-size: 11px;
            color: #666;
            margin-top: 5px;
        }
        @media print {
            .header {
                page-break-inside: avoid;
                border: 1px solid #000;
            }
            body {
                padding: 10px;
            }
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
        }
        .info {
            margin-bottom: 20px;
            text-align: right;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            text-align: left;
            border: 1px solid #ddd;
        }
        td {
            padding: 8px;
            border: 1px solid #ddd;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        .status-habis {
            color: #d32f2f;
            font-weight: bold;
        }
        .status-rendah {
            color: #f57c00;
            font-weight: bold;
        }
        .status-tersedia {
            color: #388e3c;
            font-weight: bold;
        }
        .text-right {
            text-align: right;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            ' . ($logoHtml ? '<div class="logo-section">' . $logoHtml . '</div>' : '') . '
            <div class="outlet-section">
                <div class="outlet-name">' . htmlspecialchars($outletName) . '</div>
                <div class="outlet-info">
                    <div class="outlet-info-item">
                        <span class="outlet-info-label">Alamat:</span>
                        <span class="outlet-info-value">' . htmlspecialchars($outletAddress) . '</span>
                    </div>
                    <div class="outlet-info-item">
                        <span class="outlet-info-label">Telepon:</span>
                        <span class="outlet-info-value">' . htmlspecialchars($outletPhone) . '</span>
                    </div>
                </div>
            </div>
            <div class="report-title-section">
                <div class="report-title">Laporan Status Persediaan</div>
                <div class="report-date">' . $this->formatIndonesianDate(Carbon::now('Asia/Jakarta')) . '</div>
            </div>
        </div>
    </div>
    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Nama Produk</th>
                <th>SKU</th>
                <th>Kategori</th>
                <th class="text-right">Stok Saat Ini</th>
                <th class="text-right">Min Stok</th>
                <th>Status</th>
                <th class="text-right">Harga</th>
                <th class="text-right">Nilai Stok</th>
            </tr>
        </thead>
        <tbody>';

        $no = 1;
        $totalStockValue = 0;
        
        foreach ($products as $product) {
            $status = 'Tersedia';
            $statusClass = 'status-tersedia';
            
            if ($product->stock == 0) {
                $status = 'Habis';
                $statusClass = 'status-habis';
            } elseif ($product->stock <= $product->min_stock) {
                $status = 'Stok Rendah';
                $statusClass = 'status-rendah';
            }
            
            $costOrPrice = $product->cost && $product->cost > 0 ? $product->cost : $product->price;
            $stockValue = $product->stock * $costOrPrice;
            $totalStockValue += $stockValue;
            
            $html .= '<tr>
                <td>' . $no . '</td>
                <td>' . htmlspecialchars($product->name) . '</td>
                <td>' . htmlspecialchars($product->sku) . '</td>
                <td>' . htmlspecialchars($product->category_name) . '</td>
                <td class="text-right">' . number_format($product->stock, 0, ',', '.') . '</td>
                <td class="text-right">' . number_format($product->min_stock, 0, ',', '.') . '</td>
                <td class="' . $statusClass . '">' . $status . '</td>
                <td class="text-right">Rp ' . number_format($product->price, 0, ',', '.') . '</td>
                <td class="text-right">Rp ' . number_format($stockValue, 0, ',', '.') . '</td>
            </tr>';
            
            $no++;
        }
        
        $html .= '</tbody>
        <tfoot>
            <tr style="background-color: #e0e0e0; font-weight: bold;">
                <td colspan="8" class="text-right">Total Nilai Inventori:</td>
                <td class="text-right">Rp ' . number_format($totalStockValue, 0, ',', '.') . '</td>
            </tr>
        </tfoot>
    </table>
    <div class="footer">
        <p>Dicetak pada: ' . $this->formatIndonesianDate(Carbon::now('Asia/Jakarta')) . '</p>
        <p>Total Produk: ' . count($products) . '</p>
    </div>
</body>
</html>';

        return $html;
    }

    /**
     * Export cashier performance report
     * ✅ FIX: Added support for PDF, Excel, and CSV formats
     */
    public function exportCashierPerformance(Request $request, $format = null)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            // Get format from request if not passed as parameter
            $format = $format ?? $request->get('format', 'csv');
            
            Log::info('Export cashier performance called', [
                'format' => $format,
                'params' => $request->all(),
            ]);
            
            $businessId = $request->header('X-Business-Id') ?? $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');
            
            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID is required'
                ], 400);
            }
            
            // Get date range
            $dateRange = $this->getDateRange($request);
            
            // Convert date range to proper format
            try {
                $startDate = $dateRange['start'] instanceof \Carbon\Carbon 
                    ? $dateRange['start']->copy()->startOfDay() 
                    : \Carbon\Carbon::parse($dateRange['start'])->startOfDay();
                $endDate = $dateRange['end'] instanceof \Carbon\Carbon 
                    ? $dateRange['end']->copy()->endOfDay() 
                    : \Carbon\Carbon::parse($dateRange['end'])->endOfDay();
            } catch (\Exception $dateError) {
                Log::error('Export cashier performance date parsing error', [
                    'error' => $dateError->getMessage(),
                    'date_range' => $dateRange,
                ]);
                throw new \Exception('Invalid date range: ' . $dateError->getMessage());
            }
            
            // Get cashier performance data (similar to CashierPerformanceController)
            $employeeUserIds = \App\Models\Employee::where('business_id', $businessId)
                ->pluck('user_id')
                ->toArray();
            
            if (empty($employeeUserIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data kasir untuk diekspor'
                ], 404);
            }
            
            // Build query for cashiers
            $cashiersQuery = \App\Models\User::whereIn('id', $employeeUserIds)
                ->where('role', 'kasir');
            
            // Filter by outlet if provided
            if ($outletId) {
                $outletUserIds = DB::table('employee_outlets')
                    ->where('outlet_id', $outletId)
                    ->where('business_id', $businessId)
                    ->pluck('user_id')
                    ->toArray();
                
                if (!empty($outletUserIds)) {
                    $filteredUserIds = array_intersect($employeeUserIds, $outletUserIds);
                    if (!empty($filteredUserIds)) {
                        $cashiersQuery->whereIn('id', $filteredUserIds);
                    } else {
                        return response()->json([
                            'success' => false,
                            'message' => 'Tidak ada data kasir untuk diekspor'
                        ], 404);
                    }
                }
            }
            
            $cashiers = $cashiersQuery->get();
            
            if ($cashiers->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data kasir untuk diekspor'
                ], 404);
            }
            
            $performanceData = [];
            
            foreach ($cashiers as $cashier) {
                // Get employee_id for this cashier
                $employee = \App\Models\Employee::where('user_id', $cashier->id)
                    ->where('business_id', $businessId)
                    ->first();
                
                if (!$employee) {
                    continue;
                }
                
                // Get orders handled by this cashier
                $orders = \App\Models\Order::where('business_id', $businessId)
                    ->where('employee_id', $employee->id)
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                    ->whereNull('deleted_at')
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    });
                
                $totalOrders = $orders->count();
                $totalRevenue = $orders->sum('total') ?? 0;
                $avgOrderValue = $totalOrders > 0 && $totalRevenue > 0 ? $totalRevenue / $totalOrders : 0;
                
                // Get session data
                $sessions = \App\Models\CashierShift::where('business_id', $businessId)
                    ->where('user_id', $cashier->id)
                    ->whereBetween('opened_at', [$startDate, $endDate])
                    ->whereNull('deleted_at')
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
                        $closedAt = $session->closed_at ?? \Carbon\Carbon::now();
                        return $session->opened_at->diffInHours($closedAt);
                    });
                } catch (\Exception $e) {
                    $totalSessionHours = 0;
                }
                
                $effectiveSessionHours = $totalSessionHours > 0 ? $totalSessionHours : 1;
                $ordersPerHour = $totalOrders / $effectiveSessionHours;
                $revenuePerHour = $totalRevenue / $effectiveSessionHours;
                
                // Calculate performance score
                $orderScore = min($totalOrders * 0.1, 50);
                $revenueScore = min($totalRevenue / 1000000 * 30, 30);
                $efficiencyScore = min($ordersPerHour * 2, 20);
                $performanceScore = round($orderScore + $revenueScore + $efficiencyScore, 2);
                
                $performanceData[] = [
                    'cashier_name' => $cashier->name,
                    'cashier_email' => $cashier->email,
                    'total_orders' => $totalOrders,
                    'total_revenue' => $totalRevenue,
                    'avg_order_value' => round($avgOrderValue, 2),
                    'total_sessions' => $totalSessions,
                    'total_session_hours' => round($totalSessionHours, 2),
                    'orders_per_hour' => round($ordersPerHour, 2),
                    'revenue_per_hour' => round($revenuePerHour, 2),
                    'performance_score' => $performanceScore,
                ];
            }
            
            // Sort by performance score
            usort($performanceData, function ($a, $b) {
                return $b['performance_score'] <=> $a['performance_score'];
            });
            
            // Generate CSV/Excel content
            if ($format === 'csv' || $format === 'excel') {
                $csv = "Nama Kasir,Email,Total Order,Total Pendapatan,Rata-rata Order,Total Sesi,Total Jam Sesi,Order per Jam,Pendapatan per Jam,Skor Performa\n";
                
                foreach ($performanceData as $data) {
                    $csv .= sprintf(
                        "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                        $data['cashier_name'],
                        $data['cashier_email'],
                        $data['total_orders'],
                        number_format($data['total_revenue'], 0, ',', '.'),
                        number_format($data['avg_order_value'], 0, ',', '.'),
                        $data['total_sessions'],
                        number_format($data['total_session_hours'], 2, ',', '.'),
                        number_format($data['orders_per_hour'], 2, ',', '.'),
                        number_format($data['revenue_per_hour'], 0, ',', '.'),
                        number_format($data['performance_score'], 2, ',', '.')
                    );
                }
                
                $extension = $format === 'csv' ? 'csv' : 'xlsx';
                $contentType = $format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                
                return response($csv)
                    ->header('Content-Type', $contentType)
                    ->header('Content-Disposition', 'attachment; filename="cashier_performance_' . date('Y-m-d') . '.' . $extension . '"');
            }
            
            // Get outlet data
            $outlet = null;
            $outletId = $request->header('X-Outlet-Id');
            if ($outletId) {
                try {
                    $outlet = Outlet::find($outletId);
                } catch (\Exception $e) {
                    Log::warning('Export cashier performance - Failed to load outlet', [
                        'outlet_id' => $outletId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            // Generate PDF content (HTML format that can be printed to PDF)
            if ($format === 'pdf') {
                $html = $this->generateCashierPerformancePDF($performanceData, $startDate, $endDate, $outlet);
                
                return response($html)
                    ->header('Content-Type', 'text/html; charset=UTF-8')
                    ->header('Content-Disposition', 'inline; filename="cashier_performance_' . date('Y-m-d') . '.html"');
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Format not supported: ' . $format
            ], 400);
            
        } catch (\Exception $e) {
            Log::error('Export cashier performance error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error exporting cashier performance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate HTML for PDF export of cashier performance
     */
    private function generateCashierPerformancePDF($performanceData, $startDate, $endDate, $outlet = null)
    {
        $dateRangeText = $startDate->format('d/m/Y') . ' - ' . $endDate->format('d/m/Y');
        
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Laporan Performa Kasir</title>
    <style>
        ' . $this->getReportStyles() . '
    </style>
</head>
<body>
    ' . $this->generateReportHeader('Laporan Performa Kasir', $outlet, 'Periode: ' . $dateRangeText) . '
    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Nama Kasir</th>
                <th>Email</th>
                <th class="text-right">Total Order</th>
                <th class="text-right">Total Pendapatan</th>
                <th class="text-right">Rata-rata Order</th>
                <th class="text-right">Total Sesi</th>
                <th class="text-right">Total Jam</th>
                <th class="text-right">Order/Jam</th>
                <th class="text-right">Pendapatan/Jam</th>
                <th class="text-right">Skor Performa</th>
            </tr>
        </thead>
        <tbody>';
        
        $no = 1;
        $totalOrders = 0;
        $totalRevenue = 0;
        
        foreach ($performanceData as $data) {
            $totalOrders += $data['total_orders'];
            $totalRevenue += $data['total_revenue'];
            
            $html .= '<tr>
                <td>' . $no . '</td>
                <td>' . htmlspecialchars($data['cashier_name']) . '</td>
                <td>' . htmlspecialchars($data['cashier_email']) . '</td>
                <td class="text-right">' . number_format($data['total_orders'], 0, ',', '.') . '</td>
                <td class="text-right">Rp ' . number_format($data['total_revenue'], 0, ',', '.') . '</td>
                <td class="text-right">Rp ' . number_format($data['avg_order_value'], 0, ',', '.') . '</td>
                <td class="text-right">' . number_format($data['total_sessions'], 0, ',', '.') . '</td>
                <td class="text-right">' . number_format($data['total_session_hours'], 2, ',', '.') . '</td>
                <td class="text-right">' . number_format($data['orders_per_hour'], 2, ',', '.') . '</td>
                <td class="text-right">Rp ' . number_format($data['revenue_per_hour'], 0, ',', '.') . '</td>
                <td class="text-right">' . number_format($data['performance_score'], 2, ',', '.') . '</td>
            </tr>';
            
            $no++;
        }
        
        $html .= '</tbody>
        <tfoot>
            <tr style="background-color: #e0e0e0; font-weight: bold;">
                <td colspan="3" class="text-right">Total:</td>
                <td class="text-right">' . number_format($totalOrders, 0, ',', '.') . '</td>
                <td class="text-right">Rp ' . number_format($totalRevenue, 0, ',', '.') . '</td>
                <td colspan="6"></td>
            </tr>
        </tfoot>
    </table>
    <div class="footer">
        <p>Dicetak pada: ' . date('d/m/Y H:i:s') . '</p>
        <p>Total Kasir: ' . count($performanceData) . '</p>
    </div>
</body>
</html>';
        
        return $html;
    }

    /**
     * Get commission report
     */
    public function getCommissionReport(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $businessId = $request->header('X-Business-Id') ?? $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');
            
            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID is required'
                ], 400);
            }
            
            // Get date range
            $dateRange = $this->getDateRange($request);
            
            // Convert date range to proper format
            try {
                $startDate = $dateRange['start'] instanceof \Carbon\Carbon 
                    ? $dateRange['start']->copy()->startOfDay() 
                    : \Carbon\Carbon::parse($dateRange['start'])->startOfDay();
                $endDate = $dateRange['end'] instanceof \Carbon\Carbon 
                    ? $dateRange['end']->copy()->endOfDay() 
                    : \Carbon\Carbon::parse($dateRange['end'])->endOfDay();
            } catch (\Exception $dateError) {
                Log::error('Commission report date parsing error', [
                    'error' => $dateError->getMessage(),
                    'date_range' => $dateRange,
                ]);
                throw new \Exception('Invalid date range: ' . $dateError->getMessage());
            }
            
            $startDateStr = $startDate->toDateTimeString();
            $endDateStr = $endDate->toDateTimeString();
            
            // Get employees with commission data
            $query = DB::table('employees')
                ->join('users', 'employees.user_id', '=', 'users.id')
                ->leftJoin('orders', function($join) use ($startDateStr, $endDateStr, $businessId, $outletId) {
                    $join->on('orders.employee_id', '=', 'employees.id')
                         ->where('orders.payment_status', 'paid')
                         ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                         ->whereBetween('orders.created_at', [$startDateStr, $endDateStr])
                         ->where('orders.business_id', $businessId)
                         ->whereNull('orders.deleted_at');
                    
                    if ($outletId) {
                        $join->where('orders.outlet_id', $outletId);
                    }
                })
                ->where('employees.business_id', $businessId)
                ->where('employees.is_active', true)
                ->whereNull('employees.deleted_at')
                ->select([
                    'employees.id as employee_id',
                    'employees.employee_code',
                    'employees.commission_rate',
                    'users.name as employee_name',
                    'users.email as employee_email',
                    DB::raw('COUNT(DISTINCT orders.id) as total_orders'),
                    DB::raw('COALESCE(SUM(orders.total), 0) as total_sales'),
                    DB::raw('COALESCE(SUM(orders.total) * employees.commission_rate / 100, 0) as total_commission')
                ])
                ->groupBy('employees.id', 'employees.employee_code', 'employees.commission_rate', 'users.name', 'users.email')
                ->orderBy('total_commission', 'desc');
            
            $commissionData = $query->get();
            
            // Calculate summary
            $summary = [
                'total_employees' => $commissionData->count(),
                'total_orders' => $commissionData->sum('total_orders'),
                'total_sales' => $commissionData->sum('total_sales'),
                'total_commission' => $commissionData->sum('total_commission'),
                'average_commission_rate' => $commissionData->count() > 0 
                    ? $commissionData->avg('commission_rate') 
                    : 0,
            ];
            
            return response()->json([
                'success' => true,
                'data' => [
                    'commission_data' => $commissionData->map(function($item) {
                        return [
                            'employee_id' => $item->employee_id,
                            'employee_code' => $item->employee_code,
                            'employee_name' => $item->employee_name,
                            'employee_email' => $item->employee_email,
                            'commission_rate' => (float) $item->commission_rate,
                            'total_orders' => (int) $item->total_orders,
                            'total_sales' => (float) $item->total_sales,
                            'total_commission' => (float) $item->total_commission,
                        ];
                    })->values(),
                    'summary' => [
                        'total_employees' => $summary['total_employees'],
                        'total_orders' => $summary['total_orders'],
                        'total_sales' => (float) $summary['total_sales'],
                        'total_commission' => (float) $summary['total_commission'],
                        'average_commission_rate' => round((float) $summary['average_commission_rate'], 2),
                    ],
                    'date_range' => [
                        'start' => $startDate->format('Y-m-d'),
                        'end' => $endDate->format('Y-m-d'),
                    ],
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching commission report: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching commission report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export commission report
     */
    public function exportCommission(Request $request, $format = null)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        // ✅ FIX: Check advanced reports access
        $accessCheck = $this->checkAdvancedReportsAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $format = $format ?? $request->get('format', 'csv');
            
            Log::info('Export commission called', [
                'format' => $format,
                'params' => $request->all(),
            ]);
            
            $businessId = $request->header('X-Business-Id') ?? $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');
            
            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID is required'
                ], 400);
            }
            
            // Get date range
            $dateRange = $this->getDateRange($request);
            
            // Convert date range to proper format
            try {
                $startDate = $dateRange['start'] instanceof \Carbon\Carbon 
                    ? $dateRange['start']->copy()->startOfDay() 
                    : \Carbon\Carbon::parse($dateRange['start'])->startOfDay();
                $endDate = $dateRange['end'] instanceof \Carbon\Carbon 
                    ? $dateRange['end']->copy()->endOfDay() 
                    : \Carbon\Carbon::parse($dateRange['end'])->endOfDay();
            } catch (\Exception $dateError) {
                Log::error('Export commission date parsing error', [
                    'error' => $dateError->getMessage(),
                    'date_range' => $dateRange,
                ]);
                throw new \Exception('Invalid date range: ' . $dateError->getMessage());
            }
            
            $startDateStr = $startDate->toDateTimeString();
            $endDateStr = $endDate->toDateTimeString();
            
            // Get commission data (same query as getCommissionReport)
            $query = DB::table('employees')
                ->join('users', 'employees.user_id', '=', 'users.id')
                ->leftJoin('orders', function($join) use ($startDateStr, $endDateStr, $businessId, $outletId) {
                    $join->on('orders.employee_id', '=', 'employees.id')
                         ->where('orders.payment_status', 'paid')
                         ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                         ->whereBetween('orders.created_at', [$startDateStr, $endDateStr])
                         ->where('orders.business_id', $businessId)
                         ->whereNull('orders.deleted_at');
                    
                    if ($outletId) {
                        $join->where('orders.outlet_id', $outletId);
                    }
                })
                ->where('employees.business_id', $businessId)
                ->where('employees.is_active', true)
                ->whereNull('employees.deleted_at')
                ->select([
                    'employees.id as employee_id',
                    'employees.employee_code',
                    'employees.commission_rate',
                    'users.name as employee_name',
                    'users.email as employee_email',
                    DB::raw('COUNT(DISTINCT orders.id) as total_orders'),
                    DB::raw('COALESCE(SUM(orders.total), 0) as total_sales'),
                    DB::raw('COALESCE(SUM(orders.total) * employees.commission_rate / 100, 0) as total_commission')
                ])
                ->groupBy('employees.id', 'employees.employee_code', 'employees.commission_rate', 'users.name', 'users.email')
                ->orderBy('total_commission', 'desc');
            
            $commissionData = $query->get();
            
            if ($commissionData->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data komisi untuk diekspor'
                ], 404);
            }
            
            // Generate CSV/Excel content
            if ($format === 'csv' || $format === 'excel') {
                $csv = "Kode Karyawan,Nama Karyawan,Email,Tingkat Komisi (%),Total Order,Total Penjualan,Total Komisi\n";
                
                foreach ($commissionData as $data) {
                    $csv .= sprintf(
                        "%s,%s,%s,%s,%s,%s,%s\n",
                        $data->employee_code,
                        $data->employee_name,
                        $data->employee_email,
                        number_format($data->commission_rate, 2, ',', '.'),
                        $data->total_orders,
                        number_format($data->total_sales, 0, ',', '.'),
                        number_format($data->total_commission, 0, ',', '.')
                    );
                }
                
                $extension = $format === 'csv' ? 'csv' : 'xlsx';
                $contentType = $format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                
                return response($csv)
                    ->header('Content-Type', $contentType)
                    ->header('Content-Disposition', 'attachment; filename="commission_report_' . date('Y-m-d') . '.' . $extension . '"');
            }
            
            // Get outlet data
            $outlet = null;
            $outletId = $request->header('X-Outlet-Id');
            if ($outletId) {
                try {
                    $outlet = Outlet::find($outletId);
                } catch (\Exception $e) {
                    Log::warning('Export commission - Failed to load outlet', [
                        'outlet_id' => $outletId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            // Generate PDF content
            if ($format === 'pdf') {
                $html = $this->generateCommissionPDF($commissionData, $startDate, $endDate, $outlet);
                
                return response($html)
                    ->header('Content-Type', 'text/html; charset=UTF-8')
                    ->header('Content-Disposition', 'inline; filename="commission_report_' . date('Y-m-d') . '.html"');
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Format not supported: ' . $format
            ], 400);
            
        } catch (\Exception $e) {
            Log::error('Export commission error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error exporting commission report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate HTML for PDF export of commission report
     */
    private function generateCommissionPDF($commissionData, $startDate, $endDate, $outlet = null)
    {
        $totalOrders = $commissionData->sum('total_orders');
        $totalSales = $commissionData->sum('total_sales');
        $totalCommission = $commissionData->sum('total_commission');
        
        $dateRangeText = $startDate->format('d/m/Y') . ' - ' . $endDate->format('d/m/Y');
        
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Laporan Komisi Karyawan</title>
    <style>
        ' . $this->getReportStyles() . '
        .summary {
            margin-top: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    ' . $this->generateReportHeader('Laporan Komisi Karyawan', $outlet, 'Periode: ' . $dateRangeText) . '
    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Kode Karyawan</th>
                <th>Nama Karyawan</th>
                <th>Email</th>
                <th class="text-right">Tingkat Komisi (%)</th>
                <th class="text-right">Total Order</th>
                <th class="text-right">Total Penjualan</th>
                <th class="text-right">Total Komisi</th>
            </tr>
        </thead>
        <tbody>';
        
        $no = 1;
        foreach ($commissionData as $data) {
            $html .= '<tr>
                <td>' . $no . '</td>
                <td>' . htmlspecialchars($data->employee_code) . '</td>
                <td>' . htmlspecialchars($data->employee_name) . '</td>
                <td>' . htmlspecialchars($data->employee_email) . '</td>
                <td class="text-right">' . number_format($data->commission_rate, 2, ',', '.') . '</td>
                <td class="text-right">' . number_format($data->total_orders, 0, ',', '.') . '</td>
                <td class="text-right">Rp ' . number_format($data->total_sales, 0, ',', '.') . '</td>
                <td class="text-right">Rp ' . number_format($data->total_commission, 0, ',', '.') . '</td>
            </tr>';
            
            $no++;
        }
        
        $html .= '</tbody>
        <tfoot>
            <tr style="background-color: #e0e0e0; font-weight: bold;">
                <td colspan="5" class="text-right">Total:</td>
                <td class="text-right">' . number_format($totalOrders, 0, ',', '.') . '</td>
                <td class="text-right">Rp ' . number_format($totalSales, 0, ',', '.') . '</td>
                <td class="text-right">Rp ' . number_format($totalCommission, 0, ',', '.') . '</td>
            </tr>
        </tfoot>
    </table>
    <div class="footer">
        <p>Dicetak pada: ' . date('d/m/Y H:i:s') . '</p>
        <p>Total Karyawan: ' . count($commissionData) . '</p>
    </div>
</body>
</html>';
        
        return $html;
    }

    /**
     * Format date to Indonesian format
     */
    private function formatIndonesianDate($date)
    {
        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        if ($date instanceof Carbon) {
            $day = $date->day;
            $month = $monthNames[$date->month];
            $year = $date->year;
            $hour = str_pad($date->hour, 2, '0', STR_PAD_LEFT);
            $minute = str_pad($date->minute, 2, '0', STR_PAD_LEFT);
            
            return $day . ' ' . $month . ' ' . $year . ', ' . $hour . ':' . $minute . ' WIB';
        }

        // Fallback to default format
        return date('d F Y, H:i') . ' WIB';
    }

    /**
     * Generate report header HTML with outlet information
     */
    private function generateReportHeader($reportTitle, $outlet = null, $additionalInfo = null)
    {
        // Prepare outlet logo
        $logoHtml = '';
        if ($outlet && $outlet->logo) {
            $logo = trim($outlet->logo);
            // Check if logo is base64 or URL
            if (strpos($logo, 'data:image') === 0) {
                // Base64 image (data:image/png;base64,...)
                $logoHtml = '<img src="' . htmlspecialchars($logo) . '" alt="Logo" class="logo" />';
            } elseif (strpos($logo, 'http://') === 0 || strpos($logo, 'https://') === 0) {
                // Full URL
                $logoHtml = '<img src="' . htmlspecialchars($logo) . '" alt="Logo" class="logo" />';
            } elseif (strpos($logo, '/') === 0 || strpos($logo, 'storage/') === 0) {
                // Relative path - construct full URL
                $baseUrl = url('/');
                $logoUrl = $baseUrl . (strpos($logo, '/') === 0 ? '' : '/') . $logo;
                $logoHtml = '<img src="' . htmlspecialchars($logoUrl) . '" alt="Logo" class="logo" />';
            } elseif (strlen($logo) > 100) {
                // Likely base64 without data:image prefix, try to construct it
                // Check if it's valid base64
                if (base64_decode($logo, true) !== false) {
                    // Assume PNG if we can't determine
                    $logoHtml = '<img src="data:image/png;base64,' . htmlspecialchars($logo) . '" alt="Logo" class="logo" />';
                }
            }
        }

        $outletName = $outlet ? ($outlet->name ?? '-') : '-';
        $outletAddress = $outlet ? ($outlet->address ?? '-') : '-';
        $outletPhone = $outlet ? ($outlet->phone ?? '-') : '-';

        $headerHtml = '
    <div class="header">
        <div class="header-content">
            ' . ($logoHtml ? '<div class="logo-section">' . $logoHtml . '</div>' : '') . '
            <div class="outlet-section">
                <div class="outlet-name">' . htmlspecialchars($outletName) . '</div>
                <div class="outlet-info">
                    <div class="outlet-info-item">
                        <span class="outlet-info-label">Alamat:</span>
                        <span class="outlet-info-value">' . htmlspecialchars($outletAddress) . '</span>
                    </div>
                    <div class="outlet-info-item">
                        <span class="outlet-info-label">Telepon:</span>
                        <span class="outlet-info-value">' . htmlspecialchars($outletPhone) . '</span>
                    </div>
                </div>
            </div>
            <div class="report-title-section">
                <div class="report-title">' . htmlspecialchars($reportTitle) . '</div>';
        
        if ($additionalInfo) {
            $headerHtml .= '<div class="report-additional-info">' . htmlspecialchars($additionalInfo) . '</div>';
        }
        
        $headerHtml .= '<div class="report-date">' . $this->formatIndonesianDate(Carbon::now('Asia/Jakarta')) . '</div>
            </div>
        </div>
    </div>';

        return $headerHtml;
    }

    /**
     * Get common CSS styles for report PDF
     */
    private function getReportStyles()
    {
        return '
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
            background-color: #fff;
        }
        .header {
            width: 100%;
            margin-bottom: 25px;
            padding: 20px;
            background-color: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }
        .header-content {
            display: flex;
            align-items: center;
            gap: 30px;
        }
        .logo-section {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo {
            width: 100px;
            height: 100px;
            object-fit: contain;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #fff;
            padding: 5px;
        }
        .outlet-section {
            flex: 1;
            min-width: 0;
        }
        .outlet-name {
            font-size: 22px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 12px;
            line-height: 1.2;
        }
        .outlet-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .outlet-info-item {
            display: flex;
            align-items: flex-start;
            font-size: 12px;
            color: #555;
            line-height: 1.4;
        }
        .outlet-info-label {
            font-weight: 600;
            color: #333;
            min-width: 70px;
            margin-right: 8px;
        }
        .outlet-info-value {
            flex: 1;
            word-wrap: break-word;
        }
        .report-title-section {
            flex-shrink: 0;
            text-align: right;
            border-left: 2px solid #4CAF50;
            padding-left: 20px;
            min-width: 200px;
        }
        .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .report-additional-info {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
        }
        .report-date {
            font-size: 11px;
            color: #666;
            margin-top: 5px;
        }
        @media print {
            .header {
                page-break-inside: avoid;
                border: 1px solid #000;
            }
            body {
                padding: 10px;
            }
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            text-align: left;
            border: 1px solid #ddd;
        }
        td {
            padding: 8px;
            border: 1px solid #ddd;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        .text-right {
            text-align: right;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 10px;
        }';
    }
}
