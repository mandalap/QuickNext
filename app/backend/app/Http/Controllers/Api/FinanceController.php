<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Expense;
use App\Models\CashierShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class FinanceController extends Controller
{
    /**
     * Get financial summary
     * Returns income, expense, net income, and cash balance
     */
    public function getFinancialSummary(Request $request)
    {
        try {
            $user = Auth::user();
            $businessId = $request->header('X-Business-Id') ?? $user->businesses->first()?->id;
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            // Get date range from request or default to today
            $startDate = $request->input('start_date', now()->startOfDay()->toDateString());
            $endDate = $request->input('end_date', now()->endOfDay()->toDateString());

            // Query for orders (income)
            $orderQuery = Order::where('business_id', $businessId)
                ->where('payment_status', 'paid')
                ->whereBetween('created_at', [$startDate, $endDate]);

            if ($outletId) {
                $orderQuery->where('outlet_id', $outletId);
            }

            // Query for expenses
            $expenseQuery = Expense::where('business_id', $businessId)
                ->whereBetween('expense_date', [$startDate, $endDate]);

            if ($outletId) {
                $expenseQuery->where('outlet_id', $outletId);
            }

            // Parse date range for calculations
            $requestStartDate = \Carbon\Carbon::parse($startDate)->startOfDay();
            $requestEndDate = \Carbon\Carbon::parse($endDate)->endOfDay();

            // ✅ FIX: Calculate income based on payment date, not order creation date
            // This ensures orders paid today are counted, even if created yesterday
            $incomeForRange = Order::where('business_id', $businessId)
                ->where('payment_status', 'paid')
                ->where(function ($q) use ($requestStartDate, $requestEndDate) {
                    // 1) Order dibuat dalam rentang tanggal
                    $q->whereBetween('created_at', [$requestStartDate, $requestEndDate])
                      // 2) Order yang sudah dibayar dalam rentang tanggal
                      ->orWhere(function ($qq) use ($requestStartDate, $requestEndDate) {
                          $qq->where('payment_status', 'paid')
                             ->whereBetween('updated_at', [$requestStartDate, $requestEndDate]);
                      })
                      // 3) Order yang dibayar dalam rentang tanggal (dari payments table)
                      ->orWhereHas('payments', function ($p) use ($requestStartDate, $requestEndDate) {
                          $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                            ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$requestStartDate, $requestEndDate]);
                      });
                })
                ->when($outletId, function($q) use ($outletId) {
                    return $q->where('outlet_id', $outletId);
                })
                ->sum('total');

            $expenseForRange = Expense::where('business_id', $businessId)
                ->whereBetween('expense_date', [$requestStartDate, $requestEndDate])
                ->when($outletId, function($q) use ($outletId) {
                    return $q->where('outlet_id', $outletId);
                })
                ->sum('amount');

            // Calculate for comparison periods (today, week, month)
            $todayStart = now()->startOfDay();
            $todayEnd = now()->endOfDay();
            $weekStart = now()->startOfWeek();
            $monthStart = now()->startOfMonth();

            // ✅ FIX: Income calculations based on payment date, not order creation date
            $incomeToday = Order::where('business_id', $businessId)
                ->where('payment_status', 'paid')
                ->where(function ($q) use ($todayStart, $todayEnd) {
                    $q->whereBetween('created_at', [$todayStart, $todayEnd])
                      ->orWhere(function ($qq) use ($todayStart, $todayEnd) {
                          $qq->where('payment_status', 'paid')
                             ->whereBetween('updated_at', [$todayStart, $todayEnd]);
                      })
                      ->orWhereHas('payments', function ($p) use ($todayStart, $todayEnd) {
                          $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                            ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$todayStart, $todayEnd]);
                      });
                })
                ->when($outletId, function($q) use ($outletId) {
                    return $q->where('outlet_id', $outletId);
                })
                ->sum('total');

            $incomeWeek = Order::where('business_id', $businessId)
                ->where('payment_status', 'paid')
                ->where(function ($q) use ($weekStart) {
                    $q->whereBetween('created_at', [$weekStart, now()])
                      ->orWhere(function ($qq) use ($weekStart) {
                          $qq->where('payment_status', 'paid')
                             ->whereBetween('updated_at', [$weekStart, now()]);
                      })
                      ->orWhereHas('payments', function ($p) use ($weekStart) {
                          $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                            ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$weekStart, now()]);
                      });
                })
                ->when($outletId, function($q) use ($outletId) {
                    return $q->where('outlet_id', $outletId);
                })
                ->sum('total');

            $incomeMonth = Order::where('business_id', $businessId)
                ->where('payment_status', 'paid')
                ->where(function ($q) use ($monthStart) {
                    $q->whereBetween('created_at', [$monthStart, now()])
                      ->orWhere(function ($qq) use ($monthStart) {
                          $qq->where('payment_status', 'paid')
                             ->whereBetween('updated_at', [$monthStart, now()]);
                      })
                      ->orWhereHas('payments', function ($p) use ($monthStart) {
                          $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                            ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$monthStart, now()]);
                      });
                })
                ->when($outletId, function($q) use ($outletId) {
                    return $q->where('outlet_id', $outletId);
                })
                ->sum('total');

            // Previous period for growth calculation
            $yesterdayStart = now()->subDay()->startOfDay();
            $yesterdayEnd = now()->subDay()->endOfDay();
            $incomeYesterday = Order::where('business_id', $businessId)
                ->where('payment_status', 'paid')
                ->where(function ($q) use ($yesterdayStart, $yesterdayEnd) {
                    $q->whereBetween('created_at', [$yesterdayStart, $yesterdayEnd])
                      ->orWhere(function ($qq) use ($yesterdayStart, $yesterdayEnd) {
                          $qq->where('payment_status', 'paid')
                             ->whereBetween('updated_at', [$yesterdayStart, $yesterdayEnd]);
                      })
                      ->orWhereHas('payments', function ($p) use ($yesterdayStart, $yesterdayEnd) {
                          $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                            ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$yesterdayStart, $yesterdayEnd]);
                      });
                })
                ->when($outletId, function($q) use ($outletId) {
                    return $q->where('outlet_id', $outletId);
                })
                ->sum('total');

            $incomeGrowth = $incomeYesterday > 0
                ? (($incomeToday - $incomeYesterday) / $incomeYesterday) * 100
                : 0;

            // Expense calculations for comparison periods
            $expenseToday = Expense::where('business_id', $businessId)
                ->whereDate('expense_date', $todayStart)
                ->when($outletId, function($q) use ($outletId) {
                    return $q->where('outlet_id', $outletId);
                })
                ->sum('amount');

            $expenseWeek = Expense::where('business_id', $businessId)
                ->whereBetween('expense_date', [$weekStart, now()])
                ->when($outletId, function($q) use ($outletId) {
                    return $q->where('outlet_id', $outletId);
                })
                ->sum('amount');

            $expenseMonth = Expense::where('business_id', $businessId)
                ->whereBetween('expense_date', [$monthStart, now()])
                ->when($outletId, function($q) use ($outletId) {
                    return $q->where('outlet_id', $outletId);
                })
                ->sum('amount');

            // Previous expense for growth
            $expenseYesterday = Expense::where('business_id', $businessId)
                ->whereDate('expense_date', $yesterdayStart)
                ->sum('amount');

            $expenseGrowth = $expenseYesterday > 0
                ? (($expenseToday - $expenseYesterday) / $expenseYesterday) * 100
                : 0;

            // Net income calculations
            // Use requested range for display (user can filter by date range)
            $displayIncomeToday = $incomeForRange; // Use requested range for display
            $displayExpenseToday = $expenseForRange; // Use requested range for display

            $netIncomeToday = $displayIncomeToday - $displayExpenseToday;
            $netIncomeWeek = $incomeWeek - $expenseWeek;
            $netIncomeMonth = $incomeMonth - $expenseMonth;

            $netIncomeYesterday = $incomeYesterday - $expenseYesterday;
            $netIncomeGrowth = $netIncomeYesterday > 0
                ? (($netIncomeToday - $netIncomeYesterday) / $netIncomeYesterday) * 100
                : 0;

            // Calculate cash balance
            // Logika:
            // 1. Ambil actual_cash dari shift terakhir yang ditutup
            // 2. Jika ada shift yang masih open, tambahkan expected cash dari shift open (minus opening balance)
            // 3. Kurangi dengan pengeluaran cash setelah shift terakhir ditutup

            $lastClosedShift = CashierShift::where('business_id', $businessId)
                ->where('status', 'closed')
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                })
                ->latest('closed_at')
                ->first();

            $baseCash = 0;
            $lastShiftDate = null;

            if ($lastClosedShift) {
                $baseCash = $lastClosedShift->actual_cash ?? 0;
                $lastShiftDate = $lastClosedShift->closed_at;
            }

            // Jika ada shift yang masih open, tambahkan cash sales dari shift tersebut
            $openShift = CashierShift::where('business_id', $businessId)
                ->where('status', 'open')
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                })
                ->latest('opened_at')
                ->first();

            if ($openShift) {
                // Hitung cash sales dari shift open (expected_cash - opening_balance)
                $openShiftCashSales = ($openShift->expected_cash ?? $openShift->opening_balance) - ($openShift->opening_balance ?? 0);
                $baseCash += max(0, $openShiftCashSales); // Pastikan tidak negatif

                // Jika tidak ada shift closed sebelumnya, gunakan opening balance dari shift open sebagai base
                if (!$lastClosedShift) {
                    $baseCash = ($openShift->opening_balance ?? 0) + max(0, $openShiftCashSales);
                }

                // Update last shift date ke opened_at dari shift open untuk filter expense
                if (!$lastShiftDate) {
                    $lastShiftDate = $openShift->opened_at;
                }
            }

            // Hitung pengeluaran cash setelah shift terakhir (closed atau open)
            $expensesAfterShift = 0;
            if ($lastShiftDate) {
                $expensesAfterShift = Expense::where('business_id', $businessId)
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    })
                    ->where('expense_date', '>=', $lastShiftDate->toDateString())
                    ->where(function ($query) {
                        $query->where('payment_method', 'cash')
                            ->orWhereNull('payment_method');
                    })
                    ->sum('amount');
            } else {
                // Jika tidak ada shift sama sekali, hitung semua pengeluaran cash
                $expensesAfterShift = Expense::where('business_id', $businessId)
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    })
                    ->where(function ($query) {
                        $query->where('payment_method', 'cash')
                            ->orWhereNull('payment_method');
                    })
                    ->sum('amount');
            }

            // ✅ NEW: Hitung pajak yang sudah dibayar (paid) untuk mengurangi saldo kas
            // Pajak yang dibayar mengurangi saldo kas karena uang keluar untuk membayar pajak
            $paidTaxesAfterShift = 0;
            if ($lastShiftDate) {
                $paidTaxesAfterShift = \App\Models\Tax::where('business_id', $businessId)
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    })
                    ->where('status', 'paid')
                    ->where(function ($query) use ($lastShiftDate) {
                        // Hitung pajak yang dibayar setelah shift terakhir
                        $query->where('paid_at', '>=', $lastShiftDate)
                            ->orWhere(function ($q) use ($lastShiftDate) {
                                // Jika paid_at null, gunakan updated_at saat status diubah menjadi paid
                                $q->whereNull('paid_at')
                                  ->where('updated_at', '>=', $lastShiftDate);
                            });
                    })
                    ->sum('amount');
            } else {
                // Jika tidak ada shift sama sekali, hitung semua pajak yang sudah dibayar
                $paidTaxesAfterShift = \App\Models\Tax::where('business_id', $businessId)
                    ->when($outletId, function ($query) use ($outletId) {
                        return $query->where('outlet_id', $outletId);
                    })
                    ->where('status', 'paid')
                    ->sum('amount');
            }

            // Saldo kas = base cash - expenses - paid taxes
            $cashBalance = max(0, $baseCash - $expensesAfterShift - $paidTaxesAfterShift); // Pastikan tidak negatif

            // Get recent transactions (orders)
            $recentTransactions = Order::with(['customer', 'employee.user', 'payments'])
                ->where('business_id', $businessId)
                ->where('payment_status', 'paid')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                })
                ->latest()
                ->take(10)
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'transaction_number' => $order->order_number,
                        'customer_name' => $order->customer->name ?? 'Walk-in',
                        'customer' => $order->customer->name ?? 'Walk-in',
                        'amount' => $order->total,
                        'total_amount' => $order->total,
                        'payment_method' => $order->payments->first()->payment_method ?? 'cash',
                        'created_at' => $order->created_at,
                        'status' => $order->status,
                        'cashier' => $order->employee->user->name ?? 'Unknown',
                    ];
                });

            // Get recent expenses
            $recentExpenses = Expense::where('business_id', $businessId)
                ->whereBetween('expense_date', [$startDate, $endDate])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                })
                ->latest('expense_date')
                ->take(10)
                ->get()
                ->map(function ($expense) {
                    return [
                        'id' => $expense->id,
                        'transaction_number' => $expense->reference_number ?? 'EXP-' . $expense->id,
                        'description' => $expense->description,
                        'amount' => $expense->amount,
                        'category' => $expense->category,
                        'payment_method' => $expense->payment_method ?? 'Cash',
                        'created_at' => $expense->expense_date,
                        'status' => 'completed',
                        'supplier' => $expense->supplier ?? '-',
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'income' => [
                        'today' => $displayIncomeToday, // Use range-based calculation if today
                        'this_week' => $incomeWeek,
                        'this_month' => $incomeMonth,
                        'growth' => round($incomeGrowth, 2),
                    ],
                    'expense' => [
                        'today' => $displayExpenseToday, // Use range-based calculation if today
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
                    'recent_expenses' => $recentExpenses,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('FinanceController: getFinancialSummary failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch financial summary',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get cash flow report
     * Returns detailed cash in and cash out
     */
    public function getCashFlow(Request $request)
    {
        try {
            $user = Auth::user();
            $businessId = $request->header('X-Business-Id') ?? $user->businesses->first()?->id;
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
            $endDate = $request->input('end_date', now()->endOfDay()->toDateString());

            // ✅ FIX: Cash In based on payment date, not order creation date
            $cashInQuery = Order::where('business_id', $businessId)
                ->where('payment_status', 'paid')
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('created_at', [$startDate, $endDate])
                      ->orWhere(function ($qq) use ($startDate, $endDate) {
                          $qq->where('payment_status', 'paid')
                             ->whereBetween('updated_at', [$startDate, $endDate]);
                      })
                      ->orWhereHas('payments', function ($p) use ($startDate, $endDate) {
                          $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                            ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$startDate, $endDate]);
                      });
                });

            if ($outletId) {
                $cashInQuery->where('outlet_id', $outletId);
            }

            $totalCashIn = $cashInQuery->sum('total');

            // Cash Out (from expenses)
            $cashOutQuery = Expense::where('business_id', $businessId)
                ->whereBetween('expense_date', [$startDate, $endDate]);

            if ($outletId) {
                $cashOutQuery->where('outlet_id', $outletId);
            }

            $totalCashOut = $cashOutQuery->sum('amount');

            // Net Cash Flow
            $netCashFlow = $totalCashIn - $totalCashOut;

            return response()->json([
                'success' => true,
                'data' => [
                    'cash_in' => $totalCashIn,
                    'cash_out' => $totalCashOut,
                    'net_cash_flow' => $netCashFlow,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                    ],
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('FinanceController: getCashFlow failed', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch cash flow',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get profit and loss statement
     */
    public function getProfitLoss(Request $request)
    {
        try {
            $user = Auth::user();
            $businessId = $request->header('X-Business-Id') ?? $user->businesses->first()?->id;
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
            $endDate = $request->input('end_date', now()->endOfDay()->toDateString());

            // ✅ FIX: Revenue based on payment date, not order creation date
            $revenue = Order::where('business_id', $businessId)
                ->where('payment_status', 'paid')
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('created_at', [$startDate, $endDate])
                      ->orWhere(function ($qq) use ($startDate, $endDate) {
                          $qq->where('payment_status', 'paid')
                             ->whereBetween('updated_at', [$startDate, $endDate]);
                      })
                      ->orWhereHas('payments', function ($p) use ($startDate, $endDate) {
                          $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                            ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$startDate, $endDate]);
                      });
                })
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                })
                ->sum('total');

            // Expenses grouped by category
            $expensesByCategory = Expense::where('business_id', $businessId)
                ->whereBetween('expense_date', [$startDate, $endDate])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('outlet_id', $outletId);
                })
                ->select('category', DB::raw('SUM(amount) as total'))
                ->groupBy('category')
                ->get();

            $totalExpenses = $expensesByCategory->sum('total');

            // Gross Profit
            $grossProfit = $revenue - $totalExpenses;

            // Profit Margin
            $profitMargin = $revenue > 0 ? ($grossProfit / $revenue) * 100 : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'revenue' => $revenue,
                    'total_expenses' => $totalExpenses,
                    'gross_profit' => $grossProfit,
                    'profit_margin' => round($profitMargin, 2),
                    'expenses_by_category' => $expensesByCategory,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                    ],
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('FinanceController: getProfitLoss failed', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch profit and loss statement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment method breakdown
     */
    public function getPaymentMethodBreakdown(Request $request)
    {
        try {
            $user = Auth::user();
            $businessId = $request->header('X-Business-Id') ?? $user->businesses->first()?->id;
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID not found'
                ], 400);
            }

            $startDate = $request->input('start_date', now()->startOfDay()->toDateString());
            $endDate = $request->input('end_date', now()->endOfDay()->toDateString());

            $paymentBreakdown = DB::table('payments')
                ->join('orders', 'payments.order_id', '=', 'orders.id')
                ->where('orders.business_id', $businessId)
                ->whereBetween('payments.created_at', [$startDate, $endDate])
                ->when($outletId, function ($query) use ($outletId) {
                    return $query->where('orders.outlet_id', $outletId);
                })
                ->select(
                    'payments.payment_method',
                    DB::raw('COUNT(*) as transaction_count'),
                    DB::raw('SUM(payments.amount) as total_amount')
                )
                ->groupBy('payments.payment_method')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $paymentBreakdown
            ]);
        } catch (\Exception $e) {
            Log::error('FinanceController: getPaymentMethodBreakdown failed', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment method breakdown',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
