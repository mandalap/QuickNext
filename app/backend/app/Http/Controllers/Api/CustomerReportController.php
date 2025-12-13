<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CustomerReportController extends Controller
{
    /**
     * Get customer analytics and statistics
     */
    public function getCustomerAnalytics(Request $request): JsonResponse
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
            $customStart = $request->get('custom_start') ?: $request->get('start_date');
            $customEnd = $request->get('custom_end') ?: $request->get('end_date');
            $range = $this->getDateRange($dateRange, $customStart, $customEnd);
            $startDate = $range['start'];
            $endDate = $range['end'];

            // Total customers
            $totalCustomers = Customer::where('business_id', $businessId)->count();

            // Active customers (customers with orders in date range)
            $activeCustomers = Customer::where('business_id', $businessId)
                ->whereHas('orders', function($query) use ($startDate, $endDate, $outletId) {
                    $query->whereBetween('created_at', [$startDate, $endDate])
                          ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                    if ($outletId) {
                        $query->where('outlet_id', $outletId);
                    }
                })
                ->count();

            // New customers (first order in date range)
            $newCustomers = Customer::where('business_id', $businessId)
                ->whereHas('orders', function($query) use ($startDate, $endDate, $outletId) {
                    $query->whereBetween('created_at', [$startDate, $endDate])
                          ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                    if ($outletId) {
                        $query->where('outlet_id', $outletId);
                    }
                })
                ->whereDoesntHave('orders', function($query) use ($startDate) {
                    $query->where('created_at', '<', $startDate)
                          ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                })
                ->count();

            // Customer retention rate (customers who ordered in previous period and current period)
            // For better retention calculation, we'll use a shorter previous period
            $periodDays = $startDate->diffInDays($endDate) + 1;

            // Use a more realistic previous period (same length as current period)
            $previousStartDate = $startDate->copy()->subDays($periodDays);
            $previousEndDate = $startDate->copy()->subDay();

            // Check if we have orders in the previous period
            $hasPreviousOrders = Order::where('business_id', $businessId)
                ->whereBetween('created_at', [$previousStartDate, $previousEndDate])
                ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                })
                ->exists();

            if ($hasPreviousOrders) {
                $returningCustomers = Customer::where('business_id', $businessId)
                    ->whereHas('orders', function($query) use ($startDate, $endDate, $outletId) {
                        $query->whereBetween('created_at', [$startDate, $endDate])
                              ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                        if ($outletId) {
                            $query->where('outlet_id', $outletId);
                        }
                    })
                    ->whereHas('orders', function($query) use ($previousStartDate, $previousEndDate, $outletId) {
                        $query->whereBetween('created_at', [$previousStartDate, $previousEndDate])
                              ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                        if ($outletId) {
                            $query->where('outlet_id', $outletId);
                        }
                    })
                    ->count();

                $retentionRate = $activeCustomers > 0 ? ($returningCustomers / $activeCustomers) * 100 : 0;
            } else {
                // If no previous orders, calculate retention based on customers with multiple orders in current period
                $returningCustomers = Customer::where('business_id', $businessId)
                    ->whereHas('orders', function($query) use ($startDate, $endDate, $outletId) {
                        $query->whereBetween('created_at', [$startDate, $endDate])
                              ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                        if ($outletId) {
                            $query->where('outlet_id', $outletId);
                        }
                    })
                    ->withCount(['orders' => function($query) use ($startDate, $endDate, $outletId) {
                        $query->whereBetween('created_at', [$startDate, $endDate])
                              ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                        if ($outletId) {
                            $query->where('outlet_id', $outletId);
                        }
                    }])
                    ->having('orders_count', '>', 1)
                    ->count();

                $retentionRate = $activeCustomers > 0 ? ($returningCustomers / $activeCustomers) * 100 : 0;
            }

            // Debug logging
            Log::info('Customer Analytics Debug', [
                'total_customers' => $totalCustomers,
                'active_customers' => $activeCustomers,
                'new_customers' => $newCustomers,
                'returning_customers' => $returningCustomers,
                'retention_rate' => $retentionRate,
                'has_previous_orders' => $hasPreviousOrders,
                'date_range' => $dateRange,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'previous_start_date' => $previousStartDate->format('Y-m-d'),
                'previous_end_date' => $previousEndDate->format('Y-m-d')
            ]);

            // Average order value per customer
            $avgOrderValue = Customer::where('business_id', $businessId)
                ->whereHas('orders', function($query) use ($startDate, $endDate, $outletId) {
                    $query->whereBetween('created_at', [$startDate, $endDate])
                          ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                    if ($outletId) {
                        $query->where('outlet_id', $outletId);
                    }
                })
                ->withCount(['orders' => function($query) use ($startDate, $endDate, $outletId) {
                    $query->whereBetween('created_at', [$startDate, $endDate])
                          ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                    if ($outletId) {
                        $query->where('outlet_id', $outletId);
                    }
                }])
                ->withSum(['orders' => function($query) use ($startDate, $endDate, $outletId) {
                    $query->whereBetween('created_at', [$startDate, $endDate])
                          ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                    if ($outletId) {
                        $query->where('outlet_id', $outletId);
                    }
                }], 'total')
                ->get()
                ->avg(function($customer) {
                    return $customer->orders_count > 0 ? $customer->orders_sum_total / $customer->orders_count : 0;
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'total_customers' => $totalCustomers,
                    'active_customers' => $activeCustomers,
                    'new_customers' => $newCustomers,
                    'returning_customers' => $returningCustomers,
                    'retention_rate' => round($retentionRate, 2),
                    'avg_order_value' => round($avgOrderValue, 2),
                    'date_range' => $dateRange,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch customer analytics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get top customers by spending
     */
    public function getTopCustomers(Request $request): JsonResponse
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
            $customStart = $request->get('custom_start') ?: $request->get('start_date');
            $customEnd = $request->get('custom_end') ?: $request->get('end_date');
            $range = $this->getDateRange($dateRange, $customStart, $customEnd);
            $startDate = $range['start'];
            $endDate = $range['end'];
            $limit = $request->get('limit', 10);

            $topCustomers = Customer::where('business_id', $businessId)
                ->whereHas('orders', function($query) use ($startDate, $endDate, $outletId) {
                    $query->whereBetween('created_at', [$startDate, $endDate])
                          ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                    if ($outletId) {
                        $query->where('outlet_id', $outletId);
                    }
                })
                ->withCount(['orders' => function($query) use ($startDate, $endDate, $outletId) {
                    $query->whereBetween('created_at', [$startDate, $endDate])
                          ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                    if ($outletId) {
                        $query->where('outlet_id', $outletId);
                    }
                }])
                ->withSum(['orders' => function($query) use ($startDate, $endDate, $outletId) {
                    $query->whereBetween('created_at', [$startDate, $endDate])
                          ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
                    if ($outletId) {
                        $query->where('outlet_id', $outletId);
                    }
                }], 'total')
                ->orderBy('orders_sum_total', 'desc')
                ->limit($limit)
                ->get()
                ->map(function($customer) {
                    return [
                        'id' => $customer->id,
                        'name' => $customer->name,
                        'email' => $customer->email,
                        'phone' => $customer->phone,
                        'total_spent' => (float) $customer->orders_sum_total,
                        'total_orders' => $customer->orders_count,
                        'avg_order_value' => $customer->orders_count > 0 ?
                            round($customer->orders_sum_total / $customer->orders_count, 2) : 0,
                        'last_order_at' => $customer->orders()
                            ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                            ->latest()
                            ->first()?->created_at?->format('Y-m-d H:i:s'),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $topCustomers
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch top customers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get customer demographics
     */
    public function getCustomerDemographics(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            // Gender distribution
            $genderStats = Customer::where('business_id', $businessId)
                ->selectRaw('gender, COUNT(*) as count')
                ->groupBy('gender')
                ->get()
                ->pluck('count', 'gender')
                ->toArray();

            // Age groups (based on birthday)
            $ageGroups = Customer::where('business_id', $businessId)
                ->whereNotNull('birthday')
                ->get()
                ->groupBy(function($customer) {
                    $age = $customer->birthday->age;
                    if ($age < 18) return 'Under 18';
                    if ($age < 25) return '18-24';
                    if ($age < 35) return '25-34';
                    if ($age < 45) return '35-44';
                    if ($age < 55) return '45-54';
                    return '55+';
                })
                ->map(function($group) {
                    return $group->count();
                })
                ->toArray();

            // Customer acquisition by month (last 12 months)
            $acquisitionStats = Customer::where('business_id', $businessId)
                ->where('created_at', '>=', Carbon::now()->subMonths(12))
                ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as count')
                ->groupBy('month')
                ->orderBy('month')
                ->get()
                ->pluck('count', 'month')
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => [
                    'gender_distribution' => $genderStats,
                    'age_groups' => $ageGroups,
                    'acquisition_by_month' => $acquisitionStats,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch customer demographics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get customer list with filters
     */
    public function getCustomerList(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $page = $request->get('page', 1);
            $limit = $request->get('limit', 15);
            $search = $request->get('search');
            $sortBy = $request->get('sort_by', 'total_spent');
            $sortOrder = $request->get('sort_order', 'desc');

            $query = Customer::where('business_id', $businessId);

            // Search filter
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                });
            }

            // Sort
            $allowedSortFields = ['name', 'email', 'total_spent', 'total_visits', 'created_at'];
            if (in_array($sortBy, $allowedSortFields)) {
                $query->orderBy($sortBy, $sortOrder);
            }

            $customers = $query->withCount(['orders' => function($query) {
                $query->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
            }])
            ->withSum(['orders' => function($query) {
                $query->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']);
            }], 'total')
            ->paginate($limit, ['*'], 'page', $page);

            $customers->getCollection()->transform(function($customer) {
                return [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'address' => $customer->address,
                    'gender' => $customer->gender,
                    'birthday' => $customer->birthday?->format('Y-m-d'),
                    'total_spent' => (float) $customer->orders_sum_total,
                    'total_visits' => $customer->orders_count,
                    'avg_order_value' => $customer->orders_count > 0 ?
                        round($customer->orders_sum_total / $customer->orders_count, 2) : 0,
                    'last_order_at' => $customer->orders()
                        ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                        ->latest()
                        ->first()?->created_at?->format('Y-m-d H:i:s'),
                    'created_at' => $customer->created_at->format('Y-m-d H:i:s'),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $customers
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch customer list',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get customer product purchase history
     */
    public function getCustomerProductHistory(Request $request, $customerId): JsonResponse
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
            $customStart = $request->get('custom_start') ?: $request->get('start_date');
            $customEnd = $request->get('custom_end') ?: $request->get('end_date');
            $range = $this->getDateRange($dateRange, $customStart, $customEnd);
            $startDate = $range['start'];
            $endDate = $range['end'];

            // Verify customer belongs to business
            $customer = Customer::where('id', $customerId)
                ->where('business_id', $businessId)
                ->first();

            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer not found'
                ], 404);
            }

            // Get customer's product purchase history
            $productHistory = OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.customer_id', $customerId)
                ->where('orders.business_id', $businessId)
                ->whereBetween('orders.created_at', [$startDate, $endDate])
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('orders.outlet_id', $outletId);
                })
                ->selectRaw('
                    order_items.product_name,
                    order_items.product_id,
                    order_items.variant_name,
                    SUM(order_items.quantity) as total_quantity,
                    SUM(order_items.subtotal) as total_spent,
                    COUNT(DISTINCT orders.id) as order_count,
                    MIN(orders.created_at) as first_purchase,
                    MAX(orders.created_at) as last_purchase,
                    AVG(order_items.quantity) as avg_quantity_per_order,
                    AVG(order_items.subtotal) as avg_spent_per_order
                ')
                ->groupBy('order_items.product_id', 'order_items.product_name', 'order_items.variant_name')
                ->orderBy('total_quantity', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,
                        'variant_name' => $item->variant_name,
                        'total_quantity' => (int) $item->total_quantity,
                        'total_spent' => (float) $item->total_spent,
                        'order_count' => (int) $item->order_count,
                        'first_purchase' => $item->first_purchase,
                        'last_purchase' => $item->last_purchase,
                        'avg_quantity_per_order' => round((float) $item->avg_quantity_per_order, 2),
                        'avg_spent_per_order' => round((float) $item->avg_spent_per_order, 2)
                    ];
                });

            // Get customer summary
            $customerSummary = [
                'customer_name' => $customer->name,
                'customer_email' => $customer->email,
                'total_products_purchased' => $productHistory->count(),
                'total_quantity' => $productHistory->sum('total_quantity'),
                'total_spent' => $productHistory->sum('total_spent'),
                'total_orders' => $productHistory->sum('order_count'),
                'date_range' => $dateRange,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d')
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'customer_summary' => $customerSummary,
                    'product_history' => $productHistory
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching customer product history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching customer product history: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get customer product preferences
     */
    public function getCustomerProductPreferences(Request $request): JsonResponse
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
            $customStart = $request->get('custom_start') ?: $request->get('start_date');
            $customEnd = $request->get('custom_end') ?: $request->get('end_date');
            $range = $this->getDateRange($dateRange, $customStart, $customEnd);
            $startDate = $range['start'];
            $endDate = $range['end'];

            // Get most ordered products by customers
            $topProducts = OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->whereBetween('orders.created_at', [$startDate, $endDate])
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('orders.outlet_id', $outletId);
                })
                ->selectRaw('
                    order_items.product_name,
                    order_items.product_id,
                    SUM(order_items.quantity) as total_quantity,
                    SUM(order_items.subtotal) as total_revenue,
                    COUNT(DISTINCT orders.customer_id) as unique_customers,
                    COUNT(DISTINCT orders.id) as total_orders,
                    AVG(order_items.quantity) as avg_quantity_per_order
                ')
                ->groupBy('order_items.product_id', 'order_items.product_name')
                ->orderBy('total_quantity', 'desc')
                ->limit(20)
                ->get()
                ->map(function ($item) {
                    return [
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,
                        'total_quantity' => (int) $item->total_quantity,
                        'total_revenue' => (float) $item->total_revenue,
                        'unique_customers' => (int) $item->unique_customers,
                        'total_orders' => (int) $item->total_orders,
                        'avg_quantity_per_order' => round((float) $item->avg_quantity_per_order, 2),
                        'popularity_score' => round(($item->total_quantity * 0.4) + ($item->unique_customers * 0.6), 2)
                    ];
                });

            // Get products by customer segments
            $customerSegments = [
                'frequent_customers' => $this->getProductPreferencesBySegment($businessId, $outletId, $startDate, $endDate, 'frequent'),
                'new_customers' => $this->getProductPreferencesBySegment($businessId, $outletId, $startDate, $endDate, 'new'),
                'high_value_customers' => $this->getProductPreferencesBySegment($businessId, $outletId, $startDate, $endDate, 'high_value')
            ];

            // Get seasonal trends (if we have enough data)
            $seasonalTrends = $this->getSeasonalProductTrends($businessId, $outletId);

            return response()->json([
                'success' => true,
                'data' => [
                    'top_products' => $topProducts,
                    'customer_segments' => $customerSegments,
                    'seasonal_trends' => $seasonalTrends,
                    'date_range' => $dateRange,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                    'summary' => [
                        'total_products_analyzed' => $topProducts->count(),
                        'total_unique_customers' => $topProducts->sum('unique_customers'),
                        'total_orders_analyzed' => $topProducts->sum('total_orders')
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching customer product preferences: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching customer product preferences: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get product preferences by customer segment
     */
    private function getProductPreferencesBySegment($businessId, $outletId, $startDate, $endDate, $segment)
    {
        $query = OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('customers', 'orders.customer_id', '=', 'customers.id')
            ->where('orders.business_id', $businessId)
            ->whereBetween('orders.created_at', [$startDate, $endDate])
            ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready']);

        if ($outletId) {
            $query->where('orders.outlet_id', $outletId);
        }

        // Apply segment filters
        switch ($segment) {
            case 'frequent':
                $query->whereRaw('(SELECT COUNT(*) FROM orders WHERE customer_id = customers.id AND created_at BETWEEN ? AND ? AND status IN (?, ?, ?, ?)) >= ?',
                    [$startDate, $endDate, 'completed', 'confirmed', 'preparing', 'ready', 3]); // Customers with 3+ orders
                break;
            case 'new':
                $query->whereRaw('NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = customers.id AND created_at < ? AND status IN (?, ?, ?, ?))',
                    [$startDate, 'completed', 'confirmed', 'preparing', 'ready']);
                break;
            case 'high_value':
                $query->whereRaw('(SELECT SUM(total) FROM orders WHERE customer_id = customers.id AND created_at BETWEEN ? AND ? AND status IN (?, ?, ?, ?)) > ?',
                    [$startDate, $endDate, 'completed', 'confirmed', 'preparing', 'ready', 500000]); // High value threshold
                break;
        }

        return $query->selectRaw('
                order_items.product_name,
                order_items.product_id,
                SUM(order_items.quantity) as total_quantity,
                SUM(order_items.subtotal) as total_revenue,
                COUNT(DISTINCT orders.customer_id) as unique_customers
            ')
            ->groupBy('order_items.product_id', 'order_items.product_name')
            ->orderBy('total_quantity', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name,
                    'total_quantity' => (int) $item->total_quantity,
                    'total_revenue' => (float) $item->total_revenue,
                    'unique_customers' => (int) $item->unique_customers
                ];
            });
    }

    /**
     * Get seasonal product trends
     */
    private function getSeasonalProductTrends($businessId, $outletId)
    {
        // Get product trends for the last 3 months
        $threeMonthsAgo = Carbon::now()->subMonths(3);

        return OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.business_id', $businessId)
            ->where('orders.created_at', '>=', $threeMonthsAgo)
            ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
            ->when($outletId, function ($query) use ($outletId) {
                return $query->where('orders.outlet_id', $outletId);
            })
            ->selectRaw('
                order_items.product_name,
                order_items.product_id,
                DATE_FORMAT(orders.created_at, "%Y-%m") as month,
                SUM(order_items.quantity) as monthly_quantity,
                SUM(order_items.subtotal) as monthly_revenue
            ')
            ->groupBy('order_items.product_id', 'order_items.product_name', 'month')
            ->orderBy('month', 'desc')
            ->orderBy('monthly_quantity', 'desc')
            ->get()
            ->groupBy('product_name')
            ->map(function ($productMonths) {
                return [
                    'product_name' => $productMonths->first()->product_name,
                    'product_id' => $productMonths->first()->product_id,
                    'trends' => $productMonths->map(function ($month) {
                        return [
                            'month' => $month->month,
                            'quantity' => (int) $month->monthly_quantity,
                            'revenue' => (float) $month->monthly_revenue
                        ];
                    })->values()
                ];
            })
            ->take(10)
            ->values();
    }

    /**
     * Get business ID for user
     */
    private function getBusinessIdForUser($user)
    {
        if ($user->role === 'super_admin') {
            return $user->businesses->first()?->id;
        }

        return $user->ownedBusinesses->first()?->id ?? $user->businesses->first()?->id;
    }

    /**
     * Get date range based on period or custom dates
     */
    private function getDateRange(string $period, $customStart = null, $customEnd = null): array
    {
        $now = Carbon::now('Asia/Jakarta');

        // If custom dates are provided, use them
        if ($customStart && $customEnd) {
            return [
                'start' => Carbon::parse($customStart)->startOfDay(),
                'end' => Carbon::parse($customEnd)->endOfDay()
            ];
        }

        switch ($period) {
            case 'today':
                return [
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay()
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
            case 'quarter':
                return [
                    'start' => $now->copy()->subDays(90)->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            case 'year':
                return [
                    'start' => $now->copy()->subDays(365)->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            default:
                return [
                    'start' => $now->copy()->subDays(30)->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
        }
    }
}
