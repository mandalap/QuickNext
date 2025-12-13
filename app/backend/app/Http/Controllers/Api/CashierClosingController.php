<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierShift;
use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CashierClosingController extends Controller
{
    /**
     * Get cashier closing summary
     */
    public function getClosingSummary(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $businessId = $this->getBusinessIdForUser($user);
            $outletId = $request->header('X-Outlet-Id');

            Log::info('CashierClosing getClosingSummary - Request', [
                'user_id' => $user->id ?? null,
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'date' => $request->get('date'),
            ]);

            if (!$businessId) {
                Log::warning('CashierClosing getClosingSummary - Business ID not found', [
                    'user_id' => $user->id ?? null,
                    'user_role' => $user->role ?? null,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $date = $request->get('date', Carbon::today()->format('Y-m-d'));
            $startDate = Carbon::parse($date)->startOfDay();
            $endDate = Carbon::parse($date)->endOfDay();

            Log::info('CashierClosing getClosingSummary - Date range', [
                'date' => $date,
                'start_date' => $startDate->format('Y-m-d H:i:s'),
                'end_date' => $endDate->format('Y-m-d H:i:s'),
            ]);

            // ✅ FIX: Optimize query - use business_id directly instead of whereHas
            // CashierShift has business_id column directly, so we don't need whereHas
            $activeSessions = CashierShift::where('business_id', $businessId)
            ->whereDate('opened_at', $startDate)
            ->when($outletId, function ($query) use ($outletId) {
                return $query->where('outlet_id', $outletId);
            })
            ->where('status', 'open')
            ->whereNull('deleted_at') // Handle soft deletes
            ->with(['user', 'outlet'])
            ->get();

            // Get closed sessions for the day
            $closedSessions = CashierShift::where('business_id', $businessId)
            ->whereDate('opened_at', $startDate)
            ->when($outletId, function ($query) use ($outletId) {
                return $query->where('outlet_id', $outletId);
            })
            ->where('status', 'closed')
            ->whereNull('deleted_at') // Handle soft deletes
            ->with(['user', 'outlet'])
            ->get();

            // Get orders for the day
            $orders = Order::where('business_id', $businessId)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->whereIn('status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->whereNull('deleted_at') // Handle soft deletes
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                });

            $totalOrders = $orders->count();
            $totalRevenue = $orders->sum('total') ?? 0;
            $totalDiscount = $orders->sum('discount_amount') ?? 0;
            $totalTax = $orders->sum('tax_amount') ?? 0;

            // Log for debugging
            Log::info('CashierClosing getClosingSummary - Orders data', [
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'date' => $date,
                'start_date' => $startDate->format('Y-m-d H:i:s'),
                'end_date' => $endDate->format('Y-m-d H:i:s'),
                'total_orders' => $totalOrders,
                'total_revenue' => $totalRevenue,
                'active_sessions_count' => $activeSessions->count(),
                'closed_sessions_count' => $closedSessions->count(),
            ]);

            // Get payment method breakdown from payments table
            $paymentMethods = DB::table('orders')
                ->join('payments', 'orders.id', '=', 'payments.order_id')
                ->where('orders.business_id', $businessId)
                ->whereBetween('orders.created_at', [$startDate, $endDate])
                ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('orders.outlet_id', $outletId);
                })
                ->whereNull('orders.deleted_at')
                ->where('payments.status', 'success')
                ->selectRaw('
                    payments.payment_method,
                    COUNT(DISTINCT orders.id) as order_count,
                    SUM(payments.amount) as total_amount
                ')
                ->groupBy('payments.payment_method')
                ->get();

            // Calculate summary
            $summary = [
                'date' => $date,
                'active_sessions' => $activeSessions->count(),
                'closed_sessions' => $closedSessions->count(),
                'total_orders' => $totalOrders,
                'total_revenue' => $totalRevenue,
                'total_discount' => $totalDiscount,
                'total_tax' => $totalTax,
                'net_revenue' => $totalRevenue - $totalDiscount + $totalTax,
                'payment_methods' => $paymentMethods,
            ];

            // Log results for debugging
            Log::info('CashierClosing getClosingSummary - Results', [
                'active_sessions_count' => $activeSessions->count(),
                'closed_sessions_count' => $closedSessions->count(),
                'total_orders' => $totalOrders,
                'total_revenue' => $totalRevenue,
                'payment_methods_count' => $paymentMethods->count(),
            ]);

            // Always return data even if empty - convert collections to arrays
            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'active_sessions' => $activeSessions->toArray() ?? [],
                    'closed_sessions' => $closedSessions->toArray() ?? [],
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching cashier closing summary: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'user_id' => Auth::id(),
                'business_id' => $businessId ?? null,
                'outlet_id' => $outletId ?? null,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error fetching cashier closing summary: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Close cashier session
     */
    public function closeSession(Request $request): JsonResponse
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

            $sessionId = $request->input('session_id');
            $closingNotes = $request->input('closing_notes', '');
            $actualCashAmount = $request->input('actual_cash_amount', 0);

            // Find the session
            $session = CashierShift::where('id', $sessionId)
                ->whereHas('user', function ($query) use ($businessId) {
                    $query->where('business_id', $businessId);
                })
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                })
                ->where('status', 'open')
                ->first();

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Session not found or already closed'
                ], 404);
            }

            // Close the shift using the model method
            // Pass outlet ID from header to ensure correct order calculation
            $session->closeShift($actualCashAmount, $closingNotes, $user->id, $outletId);

            return response()->json([
                'success' => true,
                'message' => 'Session closed successfully',
                'data' => [
                    'session' => $session->fresh(['user', 'outlet']),
                    'summary' => [
                        'total_orders' => $session->total_transactions,
                        'total_revenue' => $session->expected_total,
                        'cash_difference' => $session->cash_difference,
                        'duration_hours' => $session->opened_at->diffInHours($session->closed_at),
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error closing cashier session: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error closing cashier session: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get cashier closing history
     */
    public function getClosingHistory(Request $request): JsonResponse
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
            $customStart = $request->get('custom_start') ?: $request->get('start_date');
            $customEnd = $request->get('custom_end') ?: $request->get('end_date');
            $range = $this->getDateRange($dateRange, $customStart, $customEnd);
            $startDate = $range['start'];
            $endDate = $range['end'];

            $sessions = CashierShift::whereHas('user', function ($query) use ($businessId) {
                $query->where('business_id', $businessId);
            })
            ->whereBetween('opened_at', [$startDate, $endDate])
            ->when($outletId, function ($query) use ($outletId) {
                return $query->where('outlet_id', $outletId);
            })
            ->where('status', 'closed')
            ->with(['user', 'outlet'])
            ->orderBy('closed_at', 'desc')
            ->paginate(15);

            return response()->json([
                'success' => true,
                'data' => $sessions
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching cashier closing history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching cashier closing history: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get cashier closing report
     */
    public function getClosingReport(Request $request): JsonResponse
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

            // Get daily closing summaries
            $dailySummaries = CashierShift::whereHas('user', function ($query) use ($businessId) {
                $query->where('business_id', $businessId);
            })
            ->whereBetween('opened_at', [$startDate, $endDate])
            ->when($outletId, function ($query) use ($outletId) {
                return $query->where('outlet_id', $outletId);
            })
            ->where('status', 'closed')
            ->selectRaw('
                DATE(closed_at) as date,
                COUNT(*) as sessions_count,
                SUM(total_transactions) as total_orders,
                SUM(expected_total) as total_revenue,
                SUM(actual_cash) as total_cash,
                SUM(cash_difference) as total_cash_difference,
                AVG(TIMESTAMPDIFF(HOUR, opened_at, closed_at)) as avg_session_hours
            ')
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->get();

            // Get cashier performance summary
            $cashierPerformance = CashierShift::whereHas('user', function ($query) use ($businessId) {
                $query->where('business_id', $businessId);
            })
            ->whereBetween('opened_at', [$startDate, $endDate])
            ->when($outletId, function ($query) use ($outletId) {
                return $query->where('outlet_id', $outletId);
            })
            ->where('status', 'closed')
            ->with('user')
            ->selectRaw('
                user_id,
                COUNT(*) as sessions_count,
                SUM(total_transactions) as total_orders,
                SUM(expected_total) as total_revenue,
                SUM(cash_difference) as total_cash_difference,
                AVG(TIMESTAMPDIFF(HOUR, opened_at, closed_at)) as avg_session_hours
            ')
            ->groupBy('user_id')
            ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'daily_summaries' => $dailySummaries,
                    'cashier_performance' => $cashierPerformance,
                    'date_range' => $dateRange,
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching cashier closing report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching cashier closing report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get date range based on request parameter or custom dates
     */
    private function getDateRange($dateRange, $customStart = null, $customEnd = null)
    {
        $now = Carbon::now();

        // If custom dates are provided, use them
        if ($customStart && $customEnd) {
            return [
                'start' => Carbon::parse($customStart)->startOfDay(),
                'end' => Carbon::parse($customEnd)->endOfDay()
            ];
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
                    'start' => $now->copy()->startOfWeek(),
                    'end' => $now->copy()->endOfWeek()
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
        Log::info('CashierClosing getBusinessIdForUser result', [
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
