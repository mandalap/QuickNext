<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Order;
use App\Models\Customer;
use App\Models\OrderItem;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class SalesController extends Controller
{
    /**
     * Get business ID for current user based on their role
     */
    private function getBusinessIdForUser($user)
    {
        if (in_array($user->role, ['admin', 'kasir', 'kitchen', 'waiter'])) {
            // For employees, get business from their employee record
            $employee = \App\Models\Employee::where('user_id', $user->id)->first();
            return $employee?->business_id;
        } else {
            // For owners/super_admin, try multiple methods to get business_id
            $businessId = null;

            // Method 1: Check if user has business_id field directly
            if (isset($user->business_id) && $user->business_id) {
                $businessId = $user->business_id;
            }

            // Method 2: Get from businesses relationship
            if (!$businessId) {
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

            Log::info('getBusinessIdForUser result', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'business_id' => $businessId,
                'has_businesses_relation' => $user->businesses ? 'yes' : 'no',
                'businesses_count' => $user->businesses ? $user->businesses->count() : 0
            ]);

            return $businessId;
        }
    }

    /**
     * Debug endpoint for sales data
     */
    public function debug(): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            // Get all orders for debugging
            $allOrders = Order::with(['employee.user', 'customer'])
                ->where('business_id', $businessId)
                ->orderBy('created_at', 'desc')
                ->get();

            // Get orders without business filter for comparison
            $allOrdersNoFilter = Order::with(['employee.user', 'customer'])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'debug_info' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role,
                        'business_id' => $user->business_id ?? 'null'
                    ],
                    'detected_business_id' => $businessId,
                    'headers' => [
                        'x_business_id' => request()->header('X-Business-Id'),
                        'x_outlet_id' => request()->header('X-Outlet-Id')
                    ],
                    'orders_with_business_filter' => $allOrders->map(function($order) {
                        return [
                            'id' => $order->id,
                            'order_number' => $order->order_number,
                            'total' => $order->total,
                            'status' => $order->status,
                            'business_id' => $order->business_id,
                            'employee_id' => $order->employee_id,
                            'employee_name' => $order->employee?->user?->name ?? 'null',
                            'created_at' => $order->created_at
                        ];
                    }),
                    'recent_orders_no_filter' => $allOrdersNoFilter->map(function($order) {
                        return [
                            'id' => $order->id,
                            'order_number' => $order->order_number,
                            'total' => $order->total,
                            'status' => $order->status,
                            'business_id' => $order->business_id,
                            'employee_id' => $order->employee_id,
                            'employee_name' => $order->employee?->user?->name ?? 'null',
                            'created_at' => $order->created_at
                        ];
                    })
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Debug endpoint
     */
    public function debugOld(): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'businesses_count' => $user->businesses->count(),
                    'fallback_business_id' => $businessId,
                    'orders_count' => $businessId ? Order::where('business_id', $businessId)->count() : 0,
                    'customers_count' => $businessId ? Customer::where('business_id', $businessId)->count() : 0,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Debug failed',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    /**
     * Get sales statistics
     */
    public function getStats(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            Log::info('SalesController getStats called', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'business_id' => $businessId,
                'x_business_id_header' => request()->header('X-Business-Id'),
                'x_outlet_id_header' => request()->header('X-Outlet-Id')
            ]);

            if (!$businessId) {
                Log::warning('No business_id found for user', [
                    'user_id' => $user->id,
                    'user_role' => $user->role
                ]);
                return response()->json([
                    'success' => true,
                    'data' => [
                        'total_orders' => 0,
                        'total_revenue' => 0,
                        'avg_order_value' => 0,
                        'active_customers' => 0,
                        'orders_growth' => 0,
                        'revenue_growth' => 0,
                        'avg_order_growth' => 0,
                        'customers_growth' => 0,
                    ]
                ]);
            }

            $dateRange = $request->get('date_range', 'today');
            // Outlet context from headers
            $outletId = $request->header('X-Outlet-Id');

            // ✅ FIX: Handle custom date range
            if ($request->has('date_from') && $request->has('date_to')) {
                $startDate = Carbon::parse($request->get('date_from'))->startOfDay();
                $endDate = Carbon::parse($request->get('date_to'))->endOfDay();
            } else {
                $range = $this->getDateRange($dateRange);
                $startDate = $range['start'];
                $endDate = $range['end'];
            }

            // RBAC: Batasi employee maksimal 7 hari (admin diperlakukan seperti owner)
            $isEmployee = in_array($user->role, ['kasir', 'kitchen', 'waiter']);
            if ($isEmployee && $startDate->lt(Carbon::now()->copy()->subDays(7)->startOfDay())) {
                $startDate = Carbon::now()->copy()->subDays(7)->startOfDay();
            }

            // ✅ FIX: Filter berdasarkan kasir yang login - konsisten dengan getOrders
            // ✅ FIX: Admin diperlakukan seperti owner (bisa melihat semua transaksi)
            $employeeId = null;
            $activeShift = null;
            if (in_array($user->role, ['kasir', 'kitchen', 'waiter'])) {
                // ✅ FIX: Check if user has active shift first (konsisten dengan getOrders)
                $activeShift = \App\Models\CashierShift::where('user_id', $user->id)
                    ->where('status', 'open')
                    ->first();

                if ($activeShift) {
                    // Use employee_id from active shift
                    $employeeId = $activeShift->employee_id;
                    Log::info('Employee ID from active shift (for stats)', [
                        'user_id' => $user->id,
                        'shift_id' => $activeShift->id,
                        'employee_id' => $employeeId
                    ]);
                } else {
                    // Fallback to employee record
                    $employee = \App\Models\Employee::where('user_id', $user->id)->first();
                    $employeeId = $employee?->id;
                    Log::info('Employee ID from employee record (no active shift)', [
                        'user_id' => $user->id,
                        'employee_id' => $employeeId,
                        'has_employee_record' => $employee ? true : false
                    ]);
                }
            } else {
                // Owner, admin, super_admin: Bisa melihat semua transaksi
                Log::info('User is owner/admin/super_admin, showing all transactions', [
                    'user_id' => $user->id,
                    'user_role' => $user->role
                ]);
            }

            // ✅ FIX: Get current period stats - pass activeShift untuk konsistensi dengan getOrders
            $currentStats = $this->calculateStats($startDate, $endDate, $businessId, $employeeId, $outletId, $activeShift);

            // Get previous period stats for comparison
            // ✅ FIX: Untuk custom date range, hitung periode sebelumnya dengan durasi yang sama
            $periodDays = $startDate->diffInDays($endDate) + 1; // +1 karena termasuk hari terakhir
            $previousStartDate = $startDate->copy()->subDays($periodDays);
            $previousEndDate = $startDate->copy()->subDay();
            // ✅ FIX: Previous stats tidak perlu filter shift aktif (karena shift aktif hanya untuk periode saat ini)
            $previousStats = $this->calculateStats($previousStartDate, $previousEndDate, $businessId, $employeeId, $outletId, null);

            // Calculate additional stats for dashboard
            // ✅ FIX: Gunakan logic yang sama dengan calculateStats - hitung berdasarkan waktu pembayaran
            $totalItems = OrderItem::whereHas('order', function($query) use ($businessId, $startDate, $endDate, $employeeId, $user, $outletId, $activeShift) {
                $query->where('business_id', $businessId)
                      ->where('payment_status', 'paid') // ✅ Hanya order yang sudah dibayar
                      ->where(function ($q) use ($startDate, $endDate) {
                          // 1) Order dibuat dalam rentang tanggal
                          $q->whereBetween('created_at', [$startDate, $endDate])
                            // 2) Order yang sudah dibayar dalam rentang tanggal
                            ->orWhere(function ($qq) use ($startDate, $endDate) {
                                $qq->where('payment_status', 'paid')
                                   ->orWhereIn('status', ['completed'])
                                   ->whereBetween('updated_at', [$startDate, $endDate]);
                            })
                            // 3) Order yang dibayar dalam rentang tanggal (dari payments table)
                            ->orWhereHas('payments', function ($p) use ($startDate, $endDate) {
                                $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                                  ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$startDate, $endDate]);
                            });
                      })
                      ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']); // ✅ PERBAIKAN: Include more statuses

                // ✅ Filter outlet jika tersedia
                if ($outletId) {
                    $query->where('outlet_id', $outletId);
                }

                // ✅ FIX: Filter berdasarkan shift_id aktif (konsisten dengan calculateStats dan getOrders)
                if ($activeShift && $activeShift->id && $activeShift->status === 'open') {
                    $query->where(function ($q) use ($activeShift) {
                        $q->where('shift_id', $activeShift->id)
                          ->orWhere(function ($selfServiceQ) use ($activeShift) {
                              $selfServiceQ->where('type', 'self_service')
                                          ->where('payment_status', 'paid')
                                          ->whereNull('shift_id')
                                          ->where('outlet_id', $activeShift->outlet_id ?? null);
                          });
                    });
                } elseif (in_array($user->role, ['kasir', 'kitchen', 'waiter']) && $employeeId !== null) {
                    // ✅ FIX: Fallback: Jika tidak ada shift aktif, filter berdasarkan employee_id
                    $query->where('employee_id', $employeeId);
                }
                // ✅ FIX: Jika owner/admin/super_admin atau employeeId null, tampilkan semua transaksi (tidak ada filter)
            })->sum('quantity');

            $totalSales = (float) $currentStats['total_revenue'];
            $totalTransactions = (int) $currentStats['total_orders'];
            $uniqueCustomers = (int) $currentStats['active_customers'];
            $averageTransaction = (float) $currentStats['avg_order_value'];
            $totalItemsInt = (int) $totalItems;

            // Calculate conversion rate (simplified - orders per customer)
            $conversionRate = $uniqueCustomers > 0 ? ($totalTransactions / $uniqueCustomers) * 100 : 0;

            // Calculate average rating (placeholder - would need rating system)
            $averageRating = 4.5; // Placeholder

            // Calculate daily target percentage (placeholder - would need target system)
            $dailyTarget = 75.0; // Placeholder

            // Calculate growth percentages
            $stats = [
                // Dashboard format
                'total_sales' => $totalSales,
                'total_transactions' => $totalTransactions,
                'unique_customers' => $uniqueCustomers,
                'total_items' => $totalItemsInt,
                'average_transaction' => $averageTransaction,
                'conversion_rate' => (float) $conversionRate,
                'average_rating' => (float) $averageRating,
                'daily_target_percentage' => (float) $dailyTarget,

                // Legacy format for backward compatibility
                'total_orders' => $totalTransactions,
                'total_revenue' => $totalSales,
                'avg_order_value' => $averageTransaction,
                'active_customers' => $uniqueCustomers,
                'orders_growth' => (float) $this->calculateGrowth($currentStats['total_orders'], $previousStats['total_orders']),
                'revenue_growth' => (float) $this->calculateGrowth($currentStats['total_revenue'], $previousStats['total_revenue']),
                'avg_order_growth' => (float) $this->calculateGrowth($currentStats['avg_order_value'], $previousStats['avg_order_value']),
                'customers_growth' => (float) $this->calculateGrowth($currentStats['active_customers'], $previousStats['active_customers']),
            ];

            // Debug log
            Log::info('Stats calculated for kasir dashboard', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'employee_id' => $employeeId,
                'date_range' => $dateRange,
                'stats' => $stats
            ]);

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            Log::error('Sales stats error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id(),
                'business_id' => $this->getBusinessIdForUser(Auth::user()) ?? 'null'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sales statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get orders with pagination and filters
     */
    public function getOrders(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            Log::info('SalesController getOrders called', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'business_id' => $businessId,
                'x_business_id_header' => request()->header('X-Business-Id'),
                'x_outlet_id_header' => request()->header('X-Outlet-Id')
            ]);

            if (!$businessId) {
                Log::warning('No business_id found for user in getOrders', [
                    'user_id' => $user->id,
                    'user_role' => $user->role
                ]);
                return response()->json([
                    'success' => true,
                    'data' => [
                        'orders' => [],
                        'current_page' => 1,
                        'last_page' => 1,
                        'total' => 0,
                        'per_page' => 5
                    ]
                ]);
            }

            $query = Order::with(['customer', 'items.product', 'employee.user', 'payments'])
                ->where('business_id', $businessId);

            // Filter by outlet if provided in header
            $outletId = $request->header('X-Outlet-Id');
            if ($outletId) {
                $query->where('outlet_id', $outletId);
                Log::info('SalesController: Filtering by outlet', [
                    'outlet_id' => $outletId,
                    'user_id' => $user->id,
                    'user_role' => $user->role
                ]);
            } else {
                Log::info('SalesController: No outlet filter applied', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                    'business_id' => $businessId
                ]);
            }

            // ✅ FIX: Filter berdasarkan shift aktif untuk menghindari kebingungan keuangan
            // Catatan:
            // - Untuk transaksi yang sudah dibayar (paid/completed), HANYA filter berdasarkan shift_id aktif (status = 'open')
            // - Order dari shift yang sudah ditutup (status = 'closed') TIDAK boleh muncul lagi (sudah ditotalkan sebelumnya)
            // - Untuk status 'pending' atau 'unpaid', JANGAN filter berdasarkan shift agar unpaid orders tetap terlihat
            // ✅ FIX: Admin diperlakukan seperti owner (bisa melihat semua transaksi)
            $requestedStatus = $request->get('status');
            $isEmployee = in_array($user->role, ['kasir', 'kitchen', 'waiter']);
            $shouldFilterByShift = $isEmployee && ($requestedStatus !== 'pending' && $requestedStatus !== 'all');

            if ($shouldFilterByShift || ($isEmployee && $requestedStatus === null)) {
                // ✅ FIX: Check if user has active shift (status = 'open') - shift yang sudah ditutup tidak dihitung
                $activeShift = \App\Models\CashierShift::where('user_id', $user->id)
                    ->where('status', 'open') // ✅ FIX: Hanya shift yang masih aktif (belum ditutup)
                    ->first();

                Log::info('SalesController: Shift filter check', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                    'has_active_shift' => $activeShift ? 'yes' : 'no',
                    'active_shift_id' => $activeShift?->id,
                    'active_shift_status' => $activeShift?->status,
                    'active_shift_employee_id' => $activeShift?->employee_id,
                    'requested_status' => $requestedStatus,
                ]);

                // ✅ FIX: Filter berdasarkan shift_id aktif (status = 'open') untuk transaksi yang sudah dibayar
                // Ini memastikan HANYA transaksi dari shift aktif yang ditampilkan
                // Transaksi dari shift yang sudah ditutup TIDAK akan muncul lagi (sudah ditotalkan di shift tersebut)
                // Transaksi unpaid tetap ditampilkan (tidak di-filter oleh shift_id)
                if ($activeShift && $activeShift->id && $activeShift->status === 'open') {
                    // ✅ FIX: Pastikan hanya order dengan shift_id = shift aktif SAAT INI
                    // Order dari shift pagi yang sudah ditutup (status = 'closed') TIDAK akan muncul
                    // karena mereka punya shift_id berbeda (shift pagi)
                    $query->where(function ($q) use ($activeShift) {
                        // ✅ FIX: Untuk transaksi yang sudah dibayar, HANYA tampilkan dari shift aktif SAAT INI
                        // Order dari shift yang sudah ditutup tidak akan muncul karena punya shift_id berbeda
                        $q->where(function ($paidQ) use ($activeShift) {
                            $paidQ->where(function ($shiftQ) use ($activeShift) {
                                // Order dengan shift_id = shift aktif
                                $shiftQ->where('shift_id', $activeShift->id)
                                      // ✅ NEW: Atau order self-service yang sudah dibayar tapi belum punya shift_id
                                      // (akan muncul sebagai "Self-Service Payment" tanpa shift)
                                      ->orWhere(function ($selfServiceQ) use ($activeShift) {
                                          $selfServiceQ->where('type', 'self_service')
                                                      ->where('payment_status', 'paid')
                                                      ->whereNull('shift_id')
                                                      ->where('outlet_id', $activeShift->outlet_id ?? null);
                                      });
                            })
                            ->where(function ($statusQ) {
                                $statusQ->where('payment_status', 'paid')
                                       ->orWhere('payment_status', 'completed')
                                       ->orWhere('status', 'completed')
                                       ->orWhere('status', 'success');
                            });
                        });

                        // ✅ FIX: Untuk unpaid orders, tetap tampilkan semua unpaid orders dari outlet yang sama
                        // Tapi HANYA unpaid orders yang BELUM terkait dengan shift yang sudah ditutup
                        $q->orWhere(function ($unpaidQ) use ($activeShift) {
                            $unpaidQ->where(function ($unpaidStatusQ) {
                                      $unpaidStatusQ->where('payment_status', 'pending')
                                                   ->orWhere('payment_status', 'unpaid');
                                  })
                                  ->where('outlet_id', $activeShift->outlet_id ?? null)
                                  ->where(function ($shiftIdQ) use ($activeShift) {
                                      // ✅ FIX: Hanya unpaid orders yang:
                                      // 1. Belum punya shift_id (null) - belum ditotalkan di shift manapun
                                      // 2. Atau shift_id-nya = shift aktif (untuk kasus unpaid di shift aktif)
                                      // Unpaid orders dari shift yang sudah ditutup TIDAK akan muncul
                                      // karena mereka punya shift_id dari shift yang sudah ditutup (tidak = shift aktif)
                                      // Filter shift_id ini sudah cukup untuk mengecualikan order dari shift yang sudah ditutup
                                      $shiftIdQ->whereNull('shift_id')
                                             ->orWhere('shift_id', $activeShift->id);
                                  });
                        });
                    });

                    Log::info('SalesController: Filtering by active shift (open only)', [
                        'shift_id' => $activeShift->id,
                        'shift_status' => $activeShift->status,
                        'outlet_id' => $activeShift->outlet_id,
                        'applied_filter' => '(shift_id=active AND paid) OR (unpaid AND outlet_id AND (shift_id IS NULL OR shift_id=active))',
                        'note' => 'Orders from closed shifts will NOT appear (already totaled)',
                    ]);
                } else {
                    // Fallback: Jika tidak ada shift aktif, gunakan employee_id filter
                    $employee = \App\Models\Employee::where('user_id', $user->id)->first();
                    if ($employee && $employee->id) {
                        $query->where('employee_id', $employee->id);
                        Log::info('SalesController: No active shift, using employee_id filter', [
                            'employee_id' => $employee->id,
                        ]);
                    }
                }
            }

            // Apply filters
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%")
                      ->orWhereHas('customer', function ($customerQuery) use ($search) {
                          $customerQuery->where('name', 'like', "%{$search}%")
                                       ->orWhere('phone', 'like', "%{$search}%");
                      });
                });
            }

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->has('date_range')) {
                $dateRange = $this->getDateRange($request->date_range);
                // RBAC: Batasi employee maksimal 7 hari
                $isEmployee = in_array($user->role, ['kasir', 'admin', 'kitchen', 'waiter']);
                if ($isEmployee && $dateRange['start']->lt(Carbon::now()->copy()->subDays(7)->startOfDay())) {
                    $dateRange['start'] = Carbon::now()->copy()->subDays(7)->startOfDay();
                }

                // PERBAIKAN: Jangan hanya pakai created_at. Order yang dibuat kemarin
                // tetapi dibayar hari ini harus tetap muncul di transaksi "Hari Ini".
                // Kita gabungkan 3 kriteria tanggal:
                // 1) created_at di rentang tanggal (default)
                // 2) updated_at di rentang tanggal untuk order yang sudah paid/completed
                // 3) paid_at/created_at dari tabel payments di rentang tanggal
                $start = $dateRange['start'];
                $end = $dateRange['end'];

                $query->where(function ($q) use ($start, $end) {
                    $q->whereBetween('created_at', [$start, $end])
                      ->orWhere(function ($qq) use ($start, $end) {
                          $qq->where('payment_status', 'paid')
                             ->orWhereIn('status', ['completed'])
                             ->whereBetween('updated_at', [$start, $end]);
                      })
                      ->orWhereHas('payments', function ($p) use ($start, $end) {
                          $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                            ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$start, $end]);
                      });
                });
            }

            // Apply sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('limit', 5);

            // Debug: Log the final query
            Log::info('SalesController: Final query before pagination', [
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings(),
                'per_page' => $perPage
            ]);

            $orders = $query->paginate($perPage);

            // Debug: Log the results
            Log::info('SalesController: Query results', [
                'total_orders' => $orders->total(),
                'current_page' => $orders->currentPage(),
                'per_page' => $orders->perPage(),
                'orders_count' => $orders->count()
            ]);

            // Transform data
            $transformedOrders = $orders->map(function ($order) {
                // Derive display status to avoid mismatch between pages
                $derivedStatus = $order->status;
                if ($order->payment_status === 'paid' && $derivedStatus !== 'completed') {
                    $derivedStatus = 'completed';
                }

                // Determine last payment method and payment time if exists
                $lastPaymentMethod = null;
                $paidAt = null;
                if ($order->relationLoaded('payments')) {
                    $last = $order->payments
                        ->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                        ->sortByDesc('created_at')
                        ->first();
                    $lastPaymentMethod = $last?->payment_method;
                    // ✅ FIX: Ambil waktu pembayaran terakhir dari payments table
                    $paidAt = $last?->paid_at
                        ? $last->paid_at->format('Y-m-d H:i')
                        : ($last?->created_at ? $last->created_at->format('Y-m-d H:i') : null);
                }

                // ✅ FIX: Gunakan waktu pembayaran terakhir jika tersedia, jika tidak gunakan updated_at saat payment_status = paid
                $paymentTime = $paidAt
                    ?? ($order->payment_status === 'paid' && $order->updated_at ? $order->updated_at->format('Y-m-d H:i') : null)
                    ?? ($order->status === 'completed' && $order->updated_at ? $order->updated_at->format('Y-m-d H:i') : null);

                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'customer' => $order->customer ? [ // ✅ FIX: Object customer lengkap untuk frontend
                        'id' => $order->customer->id,
                        'name' => $order->customer->name,
                        'phone' => $order->customer->phone,
                        'email' => $order->customer->email,
                    ] : null,
                    'customer_id' => $order->customer_id, // ✅ FIX: Tambahkan customer_id untuk identifikasi member
                    'customer_name' => $order->customer ? $order->customer->name : 'Walk-in Customer', // ✅ FIX: Alias untuk frontend
                    'customer_phone' => $order->customer ? $order->customer->phone : null, // ✅ FIX: Alias untuk frontend
                    'phone' => $order->customer ? $order->customer->phone : '-',
                    'email' => $order->customer ? $order->customer->email : '-',
                    'subtotal' => $order->subtotal ?? 0,
                    'tax_amount' => $order->tax_amount ?? 0,
                    'discount_amount' => $order->discount_amount ?? 0,
                    'total' => $order->total,
                    'total_amount' => $order->total, // ✅ TAMBAHAN: Alias untuk frontend
                    'amount' => $order->total, // ✅ TAMBAHAN: Alias untuk frontend
                    'items' => $order->items->map(function ($item) {
                        return [
                            'name' => $item->product ? $item->product->name : 'Unknown Product',
                            'product_name' => $item->product ? $item->product->name : 'Unknown Product', // ✅ NEW: Alias untuk frontend
                            'qty' => $item->quantity,
                            'quantity' => $item->quantity, // ✅ NEW: Alias untuk frontend
                            'price' => $item->price,
                            'subtotal' => $item->subtotal ?? ($item->quantity * $item->price), // ✅ NEW: Subtotal
                            'notes' => $item->notes ?? null, // ✅ NEW: Catatan item
                            'note' => $item->notes ?? null, // ✅ NEW: Alias untuk frontend
                        ];
                    }),
                    'status' => $derivedStatus,
                    'payment_method' => $lastPaymentMethod ?? 'cash',
                    'payment_status' => $order->payment_status ?? 'unpaid',
                    'created_at' => $order->created_at->format('Y-m-d H:i'),
                    'time' => $order->created_at->format('Y-m-d H:i'), // ✅ TAMBAHAN: Alias untuk frontend (waktu order dibuat)
                    'completed_at' => $order->status === 'completed' ? $order->updated_at->format('Y-m-d H:i') : null,
                    'paid_at' => $paidAt, // ✅ FIX: Waktu pembayaran dari payments table
                    'payment_time' => $paymentTime, // ✅ FIX: Waktu pembayaran untuk sorting (paid_at > updated_at saat paid > completed_at)
                    'cashier' => $order->employee && $order->employee->user ? $order->employee->user->name : 'Unknown',
                    'table' => $order->table ? [ // ✅ FIX: Object table lengkap untuk frontend
                        'id' => $order->table->id,
                        'name' => $order->table->name,
                    ] : null,
                    'table_id' => $order->table_id, // ✅ FIX: Tambahkan table_id untuk frontend
                    'table_name' => $order->table ? $order->table->name : null, // ✅ FIX: Tambahkan table_name untuk frontend
                    'table_display' => $order->table ? "Meja {$order->table->name}" : 'Take Away', // ✅ FIX: Alias untuk backward compatibility
                    'notes' => $order->notes
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'orders' => $transformedOrders,
                    'current_page' => $orders->currentPage(),
                    'last_page' => $orders->lastPage(),
                    'total' => $orders->total(),
                    'per_page' => $orders->perPage()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get customers with pagination and filters
     */
    public function getCustomers(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            if (!$businessId) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'customers' => [],
                        'current_page' => 1,
                        'last_page' => 1,
                        'total' => 0,
                        'per_page' => 5
                    ]
                ]);
            }

            $outletId = $request->header('X-Outlet-Id');

            $query = Customer::where('business_id', $businessId);

            // Filter by outlet jika provided
            // Untuk menghindari duplikasi, kita akan deduplikasi berdasarkan phone di transformasi nanti
            // karena customer yang sama bisa punya beberapa record dengan phone yang sama

            // Apply search filter
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Apply sorting
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('limit', 5);
            $customers = $query->paginate($perPage);

            // Deduplikasi customer berdasarkan phone
            // Normalize phone dan ambil customer pertama per phone (yang paling baru)
            $uniqueCustomers = collect();
            $seenPhones = [];

            // Get collection from pagination object
            $customerCollection = $customers->getCollection();

            // Sort by created_at desc untuk ambil customer terbaru pertama
            $sortedCustomers = $customerCollection->sortByDesc('created_at');

            foreach ($sortedCustomers as $customer) {
                $phone = $customer->phone;

                // Skip jika phone null/empty - include semua customer tanpa phone
                if (!$phone || trim($phone) === '') {
                    $uniqueCustomers->push($customer);
                    continue;
                }

                // Normalize phone (remove spaces, dashes)
                $normalizedPhone = preg_replace('/[\s\-]/', '', $phone);

                // Jika phone sudah pernah dilihat, skip (ambil yang pertama saja)
                if (isset($seenPhones[$normalizedPhone])) {
                    continue;
                }

                // Tandai phone ini sudah dilihat
                $seenPhones[$normalizedPhone] = true;
                $uniqueCustomers->push($customer);
            }

            // Replace pagination collection dengan unique customers (keep order)
            $customers->setCollection($uniqueCustomers->values());

            // Transform data
            $transformedCustomers = $customers->map(function ($customer) {
                $totalOrders = $customer->orders()->count();
                $totalSpent = $customer->orders()->sum('total');
                $lastOrder = $customer->orders()->latest()->first();
                $favoriteItems = $customer->orders()
                    ->join('order_items', 'orders.id', '=', 'order_items.order_id')
                    ->join('products', 'order_items.product_id', '=', 'products.id')
                    ->select('products.name', DB::raw('SUM(order_items.quantity) as total_qty'))
                    ->groupBy('products.id', 'products.name')
                    ->orderBy('total_qty', 'desc')
                    ->limit(3)
                    ->get()
                    ->map(function ($item) {
                        return [
                            'name' => $item->name,
                            'total_qty' => $item->total_qty
                        ];
                    })
                    ->toArray();

                // Get outlets where this customer has shopped
                $outletVisits = DB::table('orders')
                    ->join('outlets', 'orders.outlet_id', '=', 'outlets.id')
                    ->where('orders.customer_id', $customer->id)
                    ->where('orders.status', 'completed')
                    ->select(
                        'outlets.id',
                        'outlets.name',
                        DB::raw('COUNT(orders.id) as visit_count'),
                        DB::raw('MAX(orders.created_at) as last_visit'),
                        DB::raw('SUM(orders.total) as total_spent_at_outlet')
                    )
                    ->groupBy('outlets.id', 'outlets.name')
                    ->orderBy('visit_count', 'desc')
                    ->get();

                // Get last visit info
                $lastOrderWithOutlet = DB::table('orders')
                    ->join('outlets', 'orders.outlet_id', '=', 'outlets.id')
                    ->where('orders.customer_id', $customer->id)
                    ->where('orders.status', 'completed')
                    ->select('outlets.id as outlet_id', 'outlets.name as outlet_name', 'orders.created_at')
                    ->orderBy('orders.created_at', 'desc')
                    ->first();

                return [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'email' => $customer->email,
                    'address' => $customer->address,
                    'birthday' => $customer->birthday,
                    'total_orders' => $totalOrders,
                    'total_spent' => $totalSpent,
                    'total_visits' => $customer->total_visits,
                    'avg_order_value' => $totalOrders > 0 ? $totalSpent / $totalOrders : 0,
                    'last_order' => $lastOrder ? $lastOrder->created_at->toISOString() : null,
                    'status' => $this->getCustomerStatus($totalOrders, $totalSpent),
                    'join_date' => $customer->created_at->toISOString(),
                    'favorite_items' => $favoriteItems,
                    'created_at' => $customer->created_at->toISOString(),
                    // Outlet information
                    'outlets' => $outletVisits,
                    'last_outlet' => $lastOrderWithOutlet ? [
                        'id' => $lastOrderWithOutlet->outlet_id,
                        'name' => $lastOrderWithOutlet->outlet_name,
                    ] : null,
                    'last_visit_at' => $lastOrderWithOutlet ? $lastOrderWithOutlet->created_at : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'customers' => $transformedCustomers,
                    'current_page' => $customers->currentPage(),
                    'last_page' => $customers->lastPage(),
                    'total' => $customers->total(),
                    'per_page' => $customers->perPage()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch customers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single order details
     */
    public function getOrderById($id): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            $order = Order::with(['customer', 'items.product', 'employee.user'])
                ->where('business_id', $businessId)
                ->findOrFail($id);

            $tableName = 'Take Away';
            if ($order->table) {
                $tableObj = $order->table;
                if (is_object($tableObj) && property_exists($tableObj, 'name') && $tableObj->name) {
                    $tableName = "Meja " . $tableObj->name;
                }
            }

            // Generate receipt token if not exists
            $receiptToken = $order->receipt_token;
            if (!$receiptToken) {
                $receiptToken = $order->generateReceiptToken();
            }
            $receiptUrl = $order->getReceiptUrl();

            $transformedOrder = [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer' => $order->customer ? $order->customer->name : 'Walk-in Customer',
                'phone' => $order->customer ? $order->customer->phone : '-',
                'email' => $order->customer ? $order->customer->email : '-',
                'subtotal' => $order->subtotal ?? 0,
                'tax_amount' => $order->tax_amount ?? 0,
                'discount_amount' => $order->discount_amount ?? 0,
                'total' => $order->total,
                'items' => $order->items->map(function ($item) {
                    return [
                        'name' => $item->product ? $item->product->name : 'Unknown Product',
                        'product_name' => $item->product ? $item->product->name : 'Unknown Product', // ✅ NEW: Alias untuk frontend
                        'qty' => $item->quantity,
                        'quantity' => $item->quantity, // ✅ NEW: Alias untuk frontend
                        'price' => $item->price,
                        'subtotal' => $item->subtotal ?? ($item->quantity * $item->price), // ✅ NEW: Subtotal
                        'notes' => $item->notes ?? null, // ✅ NEW: Catatan item
                        'note' => $item->notes ?? null, // ✅ NEW: Alias untuk frontend
                    ];
                }),
                'status' => $order->status,
                'payment_method' => $order->payment_status ?? 'cash',
                'created_at' => $order->created_at->format('Y-m-d H:i'),
                'completed_at' => $order->status === 'completed' ? $order->updated_at->format('Y-m-d H:i') : null,
                'cashier' => $order->employee && $order->employee->user ? $order->employee->user->name : 'Unknown',
                'table' => $tableName,
                'notes' => $order->notes,
                'receipt_token' => $receiptToken,
                'receipt_url' => $receiptUrl
            ];

            return response()->json([
                'success' => true,
                'data' => $transformedOrder
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update order status
     */
    public function updateOrderStatus(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            $order = Order::where('business_id', $businessId)
                ->findOrFail($id);

            $order->update([
                'status' => $request->status,
                'notes' => $request->notes ?? $order->notes,
                'completed_at' => $request->status === 'completed' ? now() : $order->completed_at
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order status updated successfully',
                'data' => $order
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update order status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel order
     */
    public function cancelOrder(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            $order = Order::where('business_id', $businessId)
                ->findOrFail($id);

            $order->update([
                'status' => 'cancelled',
                'cancellation_reason' => $request->reason,
                'cancelled_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order cancelled successfully',
                'data' => $order
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel order',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get customer details
     */
    public function getCustomerById($id): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            $customer = Customer::where('business_id', $businessId)
                ->findOrFail($id);

            $totalOrders = $customer->orders()->count();
            $totalSpent = $customer->orders()->sum('total');
            $lastOrder = $customer->orders()->latest()->first();

            $transformedCustomer = [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'address' => $customer->address,
                'birthday' => $customer->birthday,
                'total_orders' => $totalOrders,
                'total_spent' => $totalSpent,
                'avg_order_value' => $totalOrders > 0 ? $totalSpent / $totalOrders : 0,
                'last_order' => $lastOrder ? $lastOrder->created_at->format('Y-m-d') : null,
                'status' => $this->getCustomerStatus($totalOrders, $totalSpent),
                'join_date' => $customer->created_at->format('Y-m-d')
            ];

            return response()->json([
                'success' => true,
                'data' => $transformedCustomer
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Create customer
     */
    public function createCustomer(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found for user'
                ], 400);
            }

            $outletId = $request->header('X-Outlet-Id');

            $rules = [
                'name' => 'required|string|max:255',
                'phone' => [
                    'required',
                    'string',
                    'max:20',
                    function ($attribute, $value, $fail) use ($businessId, $outletId) {
                        if ($outletId) {
                            // Cek apakah sudah ada customer dengan phone yang sama yang pernah order di outlet ini
                            $existingCustomer = \App\Models\Customer::where('business_id', $businessId)
                                ->where('phone', $value)
                                ->whereHas('orders', function ($query) use ($outletId) {
                                    $query->where('outlet_id', $outletId);
                                })
                                ->first();

                            if ($existingCustomer) {
                                $fail('Nomor telepon sudah terdaftar untuk outlet ini.');
                            }
                        } else {
                            // Jika tidak ada outlet_id, cek unique per business saja
                            $existingCustomer = \App\Models\Customer::where('business_id', $businessId)
                                ->where('phone', $value)
                                ->first();

                            if ($existingCustomer) {
                                $fail('Nomor telepon sudah terdaftar.');
                            }
                        }
                    },
                ],
                'email' => 'nullable|email|max:255|unique:customers,email,NULL,id,business_id,' . $businessId,
                'address' => 'nullable|string|max:500',
                'birthday' => 'nullable|date'
            ];

            $request->validate($rules);

            $customer = Customer::create([
                'business_id' => $businessId,
                'name' => $request->name,
                'phone' => $request->phone,
                'email' => $request->email,
                'address' => $request->address,
                'birthday' => $request->birthday
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Customer created successfully',
                'data' => $customer
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update customer
     */
    public function updateCustomer(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found for user'
                ], 400);
            }

            $customer = Customer::where('business_id', $businessId)
                ->findOrFail($id);

            $request->validate([
                'name' => 'sometimes|string|max:255',
                'phone' => 'sometimes|string|max:20|unique:customers,phone,' . $id . ',id,business_id,' . $businessId,
                'email' => 'nullable|email|max:255|unique:customers,email,' . $id . ',id,business_id,' . $businessId,
                'address' => 'nullable|string|max:500',
                'birthday' => 'nullable|date'
            ]);

            $customer->update($request->only(['name', 'phone', 'email', 'address', 'birthday']));

            return response()->json([
                'success' => true,
                'message' => 'Customer updated successfully',
                'data' => $customer
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete customer
     */
    public function deleteCustomer($id): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found for user'
                ], 400);
            }

            $customer = Customer::where('business_id', $businessId)
                ->findOrFail($id);

            $customer->delete();

            return response()->json([
                'success' => true,
                'message' => 'Customer deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get customer orders
     */
    public function getCustomerOrders(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);

            $customer = Customer::where('business_id', $businessId)
                ->findOrFail($id);

            $query = $customer->orders()->with(['items.product', 'employee.user']);

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $perPage = $request->get('limit', 10);
            $orders = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $orders
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch customer orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export data
     */
    public function exportData(Request $request, $type): JsonResponse
    {
        try {
            // This would typically generate and return a file
            // For now, we'll return a success response
            return response()->json([
                'success' => true,
                'message' => "Export {$type} data initiated",
                'download_url' => url("/api/v1/export/{$type}/download")
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to export data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate stats for given date range
     */
    private function calculateStats(Carbon $startDate, Carbon $endDate, $businessId = null, $employeeId = null, $outletId = null, $activeShift = null): array
    {
        $user = Auth::user();
        if (!$businessId) {
            $businessId = $this->getBusinessIdForUser($user);
        }

        // ✅ FIX: Gunakan waktu pembayaran sebagai kriteria utama untuk statistik
        // Hanya hitung order yang benar-benar dibayar dalam rentang tanggal yang diminta
        // Prioritas: 1) paid_at dari payments table (paling akurat), 2) created_at jika tidak ada payment record (untuk cash payment)
        $baseQuery = Order::where('business_id', $businessId)
            ->where('payment_status', 'paid') // ✅ Hanya order yang sudah dibayar
            ->where(function ($q) use ($startDate, $endDate) {
                // ✅ FIX: Prioritas 1 - Order yang dibayar dalam rentang tanggal (dari payments table - paling akurat)
                // Ini adalah kriteria utama - jika order punya payment record, gunakan paid_at sebagai waktu pembayaran
                $q->whereHas('payments', function ($p) use ($startDate, $endDate) {
                      $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                        ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$startDate, $endDate]);
                })
                // ✅ FIX: Prioritas 2 - Order yang dibuat dalam rentang tanggal DAN sudah dibayar DAN tidak punya payment record
                // (untuk order cash yang dibayar langsung saat dibuat, tidak ada payment record)
                ->orWhere(function ($qq) use ($startDate, $endDate) {
                    $qq->whereBetween('created_at', [$startDate, $endDate])
                       ->where('payment_status', 'paid')
                       ->whereDoesntHave('payments'); // ✅ Hanya order yang tidak punya payment record
                });
            })
            ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready']); // ✅ Hanya status yang dianggap selesai

        // ✅ Filter outlet jika tersedia
        if ($outletId) {
            $baseQuery->where('outlet_id', $outletId);
        }

        // ✅ FIX: Filter berdasarkan shift_id aktif (konsisten dengan getOrders)
        // Jika ada shift aktif, filter berdasarkan shift_id (bukan employee_id)
        // Ini memastikan stats dan orders menggunakan filter yang sama
        if ($activeShift && $activeShift->id && $activeShift->status === 'open') {
            // ✅ FIX: Filter berdasarkan shift_id aktif (sama seperti getOrders)
            $baseQuery->where(function ($q) use ($activeShift) {
                // Order dengan shift_id = shift aktif
                $q->where('shift_id', $activeShift->id)
                  // Atau order self-service yang sudah dibayar tapi belum punya shift_id
                  ->orWhere(function ($selfServiceQ) use ($activeShift) {
                      $selfServiceQ->where('type', 'self_service')
                                  ->where('payment_status', 'paid')
                                  ->whereNull('shift_id')
                                  ->where('outlet_id', $activeShift->outlet_id ?? null);
                  });
            });
            
            Log::info('calculateStats: Filtering by active shift_id', [
                'shift_id' => $activeShift->id,
                'shift_status' => $activeShift->status,
                'outlet_id' => $activeShift->outlet_id,
            ]);
        } elseif (in_array($user->role, ['kasir', 'kitchen', 'waiter']) && $employeeId !== null) {
            // ✅ FIX: Fallback: Jika tidak ada shift aktif, filter berdasarkan employee_id
            $baseQuery->where('employee_id', $employeeId);
            Log::info('calculateStats: Filtering by employee_id (no active shift)', [
                'employee_id' => $employeeId,
            ]);
        }
        // ✅ FIX: Jika owner/admin/super_admin atau employeeId null, tampilkan semua transaksi (tidak ada filter)

        // ✅ FIX: Determine if employee filter was applied
        $applyEmployeeFilter = false;
        if ($activeShift && $activeShift->id && $activeShift->status === 'open') {
            $applyEmployeeFilter = true; // Filter by shift_id
        } elseif (in_array($user->role, ['kasir', 'admin', 'kitchen', 'waiter']) && $employeeId !== null) {
            $applyEmployeeFilter = true; // Filter by employee_id
        }

        Log::info('calculateStats query built', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'business_id' => $businessId,
            'employee_id' => $employeeId,
            'apply_employee_filter' => $applyEmployeeFilter,
            'has_active_shift' => $activeShift ? 'yes' : 'no',
            'active_shift_id' => $activeShift?->id,
            'start_date' => $startDate->toDateTimeString(),
            'end_date' => $endDate->toDateTimeString(),
            'outlet_id' => $outletId,
            'query_sql' => $baseQuery->toSql(),
            'query_bindings' => $baseQuery->getBindings()
        ]);

        // ✅ FIX: Gunakan query yang sama untuk totalOrders dan totalRevenue untuk konsistensi
        $totalOrders = $baseQuery->count();
        $totalRevenue = $baseQuery->sum('total');

        // ✅ DEBUG: Log detail untuk troubleshooting
        Log::info('calculateStats results', [
            'total_orders' => $totalOrders,
            'total_revenue' => $totalRevenue,
            'start_date' => $startDate->toDateTimeString(),
            'end_date' => $endDate->toDateTimeString(),
            'business_id' => $businessId,
            'outlet_id' => $outletId,
            'employee_id' => $employeeId,
        ]);

        $avgOrderValue = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;

        // ✅ FIX: Gunakan query yang sama dengan baseQuery untuk customersQuery agar konsisten
        $customersQuery = clone $baseQuery;
        $activeCustomers = $customersQuery->distinct('customer_id')->count('customer_id');

        return [
            'total_orders' => $totalOrders,
            'total_revenue' => $totalRevenue,
            'avg_order_value' => $avgOrderValue,
            'active_customers' => $activeCustomers
        ];
    }

    /**
     * Get date range based on period
     */
    private function getDateRange(string $period): array
    {
        $now = Carbon::now('Asia/Jakarta');

        switch ($period) {
            case 'today':
                return [
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay()
                ];
            case 'yesterday':
                $yesterday = $now->copy()->subDay();
                return [
                    'start' => $yesterday->copy()->startOfDay(),
                    'end' => $yesterday->copy()->endOfDay()
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

    /**
     * Calculate growth percentage
     */
    private function calculateGrowth($current, $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * Get customer status based on orders and spending
     */
    private function getCustomerStatus(int $totalOrders, float $totalSpent): string
    {
        if ($totalOrders >= 20 || $totalSpent >= 2000000) {
            return 'VIP';
        } elseif ($totalOrders >= 5 || $totalSpent >= 500000) {
            return 'Regular';
        } else {
            return 'New';
        }
    }
}
