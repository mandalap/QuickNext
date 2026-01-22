<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\CashierShift;
use App\Models\Employee;
use App\Models\EmployeeShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class CashierShiftController extends Controller
{
    /**
     * Get active shift for current user
     */
    public function getActiveShift(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');
        $userId = auth()->id();

        Log::info('CashierShiftController: getActiveShift called', [
            'user_id' => $userId,
            'business_id' => $businessId,
            'outlet_id' => $outletId,
        ]);

        if (!$businessId || !$outletId) {
            Log::warning('CashierShiftController: Missing headers', [
                'has_business_id' => !empty($businessId),
                'has_outlet_id' => !empty($outletId),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Business ID and Outlet ID required'
            ], 400);
        }

        // Debug: Check all open shifts for this user
        $allUserOpenShifts = CashierShift::where('user_id', $userId)
            ->where('status', 'open')
            ->get();

        Log::info('CashierShiftController: All open shifts for user', [
            'user_id' => $userId,
            'count' => $allUserOpenShifts->count(),
            'shifts' => $allUserOpenShifts->map(function($shift) {
                return [
                    'id' => $shift->id,
                    'business_id' => $shift->business_id,
                    'outlet_id' => $shift->outlet_id,
                    'status' => $shift->status,
                ];
            })->toArray(),
        ]);

        // ✅ FIX: Use same query logic as POSController::createOrder for consistency
        // Don't check business_id explicitly - outlet already belongs to business
        // This matches the query used when creating orders
        $activeShift = CashierShift::open()
            ->forUser($userId)
            ->forOutlet($outletId)
            ->with(['user', 'outlet'])
            ->first();

        // ✅ DEBUG: Log query details for troubleshooting
        Log::info('CashierShiftController: Query result', [
            'found_shift' => $activeShift ? true : false,
            'shift_id' => $activeShift?->id,
            'user_id' => $userId,
            'outlet_id' => $outletId,
            'business_id' => $businessId,
            'shift_business_id' => $activeShift?->business_id,
        ]);

        if (!$activeShift) {
            // Additional check: maybe shift exists but with different business/outlet
            $shiftWithDifferentBusiness = CashierShift::open()
                ->forUser($userId)
                ->first();

            if ($shiftWithDifferentBusiness) {
                Log::warning('CashierShiftController: User has active shift but different business/outlet', [
                    'shift_id' => $shiftWithDifferentBusiness->id,
                    'shift_business_id' => $shiftWithDifferentBusiness->business_id,
                    'shift_outlet_id' => $shiftWithDifferentBusiness->outlet_id,
                    'requested_business_id' => $businessId,
                    'requested_outlet_id' => $outletId,
                ]);
            }

            return response()->json([
                'success' => false,
                'has_active_shift' => false,
                'message' => 'No active shift found'
            ]);
        }

        // ✅ OPTIMIZATION: Cache shift data (tanpa recalculate untuk initial load yang lebih cepat)
        $cacheKey = "shift_data_{$activeShift->id}_" . now()->format('YmdHi'); // Cache per menit

        // Untuk initial load, gunakan data langsung tanpa recalculate (lebih cepat)
        // Recalculate hanya dilakukan saat diperlukan (misalnya saat refresh manual)
        $requestWantsRecalculate = $request->query('recalculate', false);

        if ($requestWantsRecalculate) {
            // Jika diminta recalculate, lakukan perhitungan lengkap
            $shiftData = \Illuminate\Support\Facades\Cache::remember($cacheKey, 30, function() use ($activeShift) {
                $activeShift->calculateExpectedTotals();
                $activeShift->refresh();

                $data = $activeShift->toArray();
                $data['cash_sales'] = $activeShift->cash_sales;
                $data['total_expected_cash'] = $activeShift->total_expected_cash;

                return $data;
            });
        } else {
            // Untuk initial load, gunakan data dari cache/database langsung (tanpa recalculate)
            // Ini lebih cepat karena tidak perlu query orders
            $shiftData = $activeShift->toArray();
            $shiftData['cash_sales'] = $activeShift->cash_sales ?? 0;
            $shiftData['total_expected_cash'] = $activeShift->total_expected_cash ?? 0;

            // Cache data sederhana ini juga
            \Illuminate\Support\Facades\Cache::put($cacheKey, $shiftData, 30);
        }

        return response()->json([
            'success' => true,
            'has_active_shift' => true,
            'data' => $shiftData
        ]);
    }

    /**
     * Open new shift
     */
    public function openShift(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if (!$businessId || !$outletId) {
            return response()->json([
                'success' => false,
                'message' => 'Business ID and Outlet ID required'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'shift_name' => 'nullable|string|max:255',
            'opening_balance' => 'required|numeric|min:0',
            'opening_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if user already has an open shift
        $existingShift = CashierShift::open()
            ->forUser(auth()->id())
            ->forOutlet($outletId)
            ->first();

        if ($existingShift) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah memiliki shift yang terbuka. Tutup shift sebelumnya terlebih dahulu.'
            ], 400);
        }

        // ✅ NEW: Check if business requires attendance before opening shift
        $business = Business::find($businessId);
        
        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business tidak ditemukan.'
            ], 404);
        }
        
        // ✅ FIX: Get settings with proper null check and logging
        // Handle both null and empty array cases
        $settings = $business->settings;
        if ($settings === null || !is_array($settings)) {
            $settings = [];
        }
        
        // ✅ FIX: Convert to boolean explicitly (handle string "true"/"false" or 1/0)
        $requireAttendanceValue = $settings['require_attendance_for_pos'] ?? false;
        $requireAttendance = filter_var($requireAttendanceValue, FILTER_VALIDATE_BOOLEAN);
        
        // ✅ DEBUG: Log setting value for troubleshooting
        Log::info('Checking attendance requirement for shift opening', [
            'business_id' => $businessId,
            'user_id' => auth()->id(),
            'outlet_id' => $outletId,
            'settings' => $settings,
            'require_attendance_for_pos_raw' => $requireAttendanceValue,
            'require_attendance_for_pos' => $requireAttendance,
            'settings_type' => gettype($settings),
            'raw_value_type' => gettype($requireAttendanceValue),
        ]);

        if ($requireAttendance === true) {
            // Check if user has clocked in today
            $todayShift = EmployeeShift::where('user_id', auth()->id())
                ->where('outlet_id', $outletId)
                ->whereDate('shift_date', now()->toDateString())
                ->whereNotNull('clock_in')
                ->first();

            if (!$todayShift) {
                return response()->json([
                    'success' => false,
                    'message' => '⚠️ Anda belum melakukan absensi hari ini. Silakan lakukan absensi (clock in) terlebih dahulu sebelum membuka shift.',
                    'requires_attendance' => true,
                    'error' => 'Absensi diperlukan sebelum membuka shift',
                    'toast' => [
                        'type' => 'error',
                        'title' => 'Absensi Diperlukan',
                        'message' => 'Silakan lakukan absensi terlebih dahulu di halaman Absensi',
                        'duration' => 6000
                    ]
                ], 400);
            }

            Log::info('Attendance check passed for shift opening', [
                'user_id' => auth()->id(),
                'outlet_id' => $outletId,
                'attendance_id' => $todayShift->id
            ]);
        }

        // Get employee record
        $employee = Employee::where('user_id', auth()->id())
            ->where('business_id', $businessId)
            ->first();

        DB::beginTransaction();

        try {
            // Generate shift name if not provided
            $shiftName = $request->shift_name ?? 'Shift ' . now()->format('d M Y H:i');

            $shift = CashierShift::create([
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'user_id' => auth()->id(),
                'employee_id' => $employee?->id,
                'shift_name' => $shiftName,
                'opened_at' => now(),
                'opening_balance' => $request->opening_balance,
                'opening_notes' => $request->opening_notes,
                'status' => 'open',
            ]);

            DB::commit();

            Log::info('Shift opened successfully', [
                'shift_id' => $shift->id,
                'user_id' => auth()->id(),
                'outlet_id' => $outletId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Shift berhasil dibuka',
                'data' => $shift->load(['user', 'outlet']),
                'toast' => [
                    'type' => 'success',
                    'title' => 'Shift Dibuka',
                    'message' => "Shift {$shiftName} berhasil dibuka dengan modal awal Rp " . number_format($request->opening_balance, 0, ',', '.'),
                    'duration' => 3000
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to open shift', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuka shift',
                'error' => $e->getMessage(),
                'toast' => [
                    'type' => 'error',
                    'title' => 'Gagal Membuka Shift',
                    'message' => 'Terjadi kesalahan saat membuka shift. Silakan coba lagi.',
                    'duration' => 5000
                ]
            ], 500);
        }
    }

    /**
     * Close shift
     */
    public function closeShift(Request $request, $shiftId)
    {
        $validator = Validator::make($request->all(), [
            'actual_cash' => 'required|numeric|min:0',
            'closing_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $shift = CashierShift::find($shiftId);

        if (!$shift) {
            return response()->json([
                'success' => false,
                'message' => 'Shift not found'
            ], 404);
        }

        // Validate ownership
        if ($shift->user_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses ke shift ini'
            ], 403);
        }

        if ($shift->isClosed()) {
            return response()->json([
                'success' => false,
                'message' => 'Shift sudah ditutup'
            ], 400);
        }

        DB::beginTransaction();

        try {
            // Close shift and calculate everything
            $shift->closeShift(
                $request->actual_cash,
                $request->closing_notes,
                auth()->id()
            );

            DB::commit();

            Log::info('Shift closed successfully', [
                'shift_id' => $shift->id,
                'user_id' => auth()->id(),
                'cash_difference' => $shift->cash_difference
            ]);

            // Prepare toast notification based on cash difference
            $cashDiff = $shift->cash_difference;
            $toastType = 'success';
            $toastTitle = 'Shift Ditutup';
            $toastMessage = "Shift berhasil ditutup. ";

            if ($cashDiff == 0) {
                $toastMessage .= "Uang kas pas, tidak ada selisih.";
            } elseif ($cashDiff > 0) {
                $toastType = 'warning';
                $toastTitle = 'Shift Ditutup - Ada Kelebihan';
                $toastMessage .= "Terdapat kelebihan kas sebesar Rp " . number_format(abs($cashDiff), 0, ',', '.');
            } else {
                $toastType = 'error';
                $toastTitle = 'Shift Ditutup - Ada Kekurangan';
                $toastMessage .= "Terdapat kekurangan kas sebesar Rp " . number_format(abs($cashDiff), 0, ',', '.');
            }

            return response()->json([
                'success' => true,
                'message' => 'Shift berhasil ditutup',
                'data' => $shift->load(['user', 'outlet', 'orders']),
                'toast' => [
                    'type' => $toastType,
                    'title' => $toastTitle,
                    'message' => $toastMessage,
                    'duration' => 5000
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to close shift', [
                'error' => $e->getMessage(),
                'shift_id' => $shiftId
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menutup shift',
                'error' => $e->getMessage(),
                'toast' => [
                    'type' => 'error',
                    'title' => 'Gagal Menutup Shift',
                    'message' => 'Terjadi kesalahan saat menutup shift. Silakan coba lagi.',
                    'duration' => 5000
                ]
            ], 500);
        }
    }

    /**
     * Get shift history
     */
    public function getHistory(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        $query = CashierShift::with(['user', 'outlet', 'closedByUser'])
            ->forBusiness($businessId);

        // Filter by outlet if provided
        if ($outletId) {
            $query->forOutlet($outletId);
        }

        // Filter by user if not admin/owner
        $user = auth()->user();
        if (!in_array($user->role, ['owner', 'admin'])) {
            $query->forUser(auth()->id());
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->whereDate('opened_at', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('opened_at', '<=', $request->end_date);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $shifts = $query->orderBy('opened_at', 'desc')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $shifts
        ]);
    }

    /**
     * Get shift detail with full report
     */
    public function getShiftDetail($shiftId)
    {
        $shift = CashierShift::with([
            'user',
            'outlet',
            'closedByUser',
            'orders' => function($query) {
                $query->with(['orderItems.product', 'payments', 'customer']);
            }
        ])->find($shiftId);

        // ✅ NEW: Jika shift masih open, cari dan assign order self-service yang sudah dibayar tapi belum punya shift_id
        // Ini memastikan order self-service yang sudah dibayar via Midtrans masuk ke shift
        if ($shift && $shift->status === 'open') {
            $selfServiceOrders = \App\Models\Order::where('business_id', $shift->business_id)
                ->where('outlet_id', $shift->outlet_id)
                ->where('type', 'self_service')
                ->where('payment_status', 'paid')
                ->whereNull('shift_id')
                ->whereBetween('created_at', [$shift->opened_at, now()])
                ->get();

            if ($selfServiceOrders->count() > 0) {
                foreach ($selfServiceOrders as $selfServiceOrder) {
                    $selfServiceOrder->shift_id = $shift->id;
                    $selfServiceOrder->save();
                    Log::info("CashierShiftController: Assigned shift_id to self-service order (getShiftDetail)", [
                        'order_id' => $selfServiceOrder->id,
                        'order_number' => $selfServiceOrder->order_number,
                        'shift_id' => $shift->id,
                        'reason' => 'Self-service order paid via Midtrans, assigned to active shift'
                    ]);
                }
                // Reload orders relation setelah assign
                $shift->load(['orders' => function($query) {
                    $query->with(['orderItems.product', 'payments', 'customer']);
                }]);
            }
        }

        if (!$shift) {
            return response()->json([
                'success' => false,
                'message' => 'Shift not found'
            ], 404);
        }

        // Check access (owner/admin can see all, kasir only their own)
        $user = auth()->user();
        if (!in_array($user->role, ['owner', 'admin']) && $shift->user_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses ke shift ini'
            ], 403);
        }

        // Recalculate to ensure data is up to date
        if ($shift->status === 'open') {
            $shift->calculateExpectedTotals();
            $shift->refresh();
            // ✅ NEW: Reload orders relation setelah calculateExpectedTotals
            // Ini memastikan order self-service yang baru di-assign juga ter-load
            $shift->load(['orders' => function($query) {
                $query->with(['orderItems.product', 'payments', 'customer']);
            }]);
        }

        // ✅ FIX: Transform orders untuk memastikan format konsisten dengan getOrders API
        // Orders dari shift->orders sudah di-filter payment_status = 'paid' di calculateExpectedTotals
        // ✅ NEW: Order self-service yang sudah dibayar via Midtrans juga sudah di-assign shift_id
        $transformedOrders = $shift->orders->map(function ($order) {
            // Ambil payment method dari payments
            $lastPayment = $order->payments
                ->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                ->sortByDesc('created_at')
                ->first();

            $paidAt = $lastPayment?->paid_at
                ? $lastPayment->paid_at->format('Y-m-d H:i')
                : ($lastPayment?->created_at ? $lastPayment->created_at->format('Y-m-d H:i') : null);

            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer' => $order->customer ? $order->customer->name : 'Walk-in Customer',
                'customer_name' => $order->customer ? $order->customer->name : 'Walk-in Customer',
                'total' => $order->total,
                'total_amount' => $order->total,
                'amount' => $order->total,
                'payment_status' => $order->payment_status ?? 'paid',
                'payment_method' => $lastPayment?->payment_method ?? 'cash',
                'status' => $order->status,
                'created_at' => $order->created_at->format('Y-m-d H:i'),
                'updated_at' => $order->updated_at->format('Y-m-d H:i'),
                'paid_at' => $paidAt,
                'completed_at' => $order->status === 'completed' ? $order->updated_at->format('Y-m-d H:i') : null,
                'time' => $order->created_at->format('Y-m-d H:i'),
                'items' => $order->orderItems->map(function ($item) {
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
                })->toArray(),
                'payments' => $order->payments->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'payment_method' => $payment->payment_method,
                        'amount' => $payment->amount,
                        'status' => $payment->status,
                        'paid_at' => $payment->paid_at ? $payment->paid_at->format('Y-m-d H:i') : null,
                        'created_at' => $payment->created_at->format('Y-m-d H:i'),
                    ];
                })->toArray(),
                'notes' => $order->notes ?? '',
            ];
        });

        // Generate detailed report
        $report = [
            'shift' => $shift,
            'summary' => [
                'duration' => $shift->getShiftDuration(),
                'total_transactions' => $shift->total_transactions,
                'total_revenue' => $shift->expected_total,
            ],
            'payment_breakdown' => [
                'cash' => [
                    'transactions' => $shift->cash_transactions,
                    'opening_balance' => $shift->opening_balance,
                    'cash_sales' => $shift->cash_sales,
                    'expected' => $shift->expected_cash, // Fixed: was 'expected_total', should be 'expected'
                    'actual' => $shift->actual_cash,
                    'difference' => $shift->cash_difference,
                ],
                'card' => [
                    'transactions' => $shift->card_transactions,
                    'amount' => $shift->expected_card,
                ],
                'transfer' => [
                    'transactions' => $shift->transfer_transactions,
                    'amount' => $shift->expected_transfer,
                ],
                'qris' => [
                    'transactions' => $shift->qris_transactions,
                    'amount' => $shift->expected_qris,
                ],
            ],
            'orders' => $transformedOrders, // ✅ FIX: Gunakan transformed orders
        ];

        // Debug log untuk memastikan data yang dikirim benar
        Log::info("Shift detail report for shift {$shiftId}:", [
            'shift_data' => [
                'id' => $shift->id,
                'total_transactions' => $shift->total_transactions,
                'expected_total' => $shift->expected_total,
                'expected_cash' => $shift->expected_cash,
                'opening_balance' => $shift->opening_balance,
            ],
            'payment_breakdown' => $report['payment_breakdown']
        ]);

        return response()->json([
            'success' => true,
            'data' => $report
        ]);
    }

    /**
     * Get shift closing report with sold items for printing
     */
    public function getShiftClosingReport(Request $request, $shiftId)
    {
        $shift = CashierShift::with(['user', 'outlet', 'orders.orderItems.product', 'orders.payments'])
            ->find($shiftId);

        if (!$shift) {
            return response()->json([
                'success' => false,
                'message' => 'Shift tidak ditemukan'
            ], 404);
        }

        // Check access
        $user = auth()->user();
        if (!in_array($user->role, ['owner', 'admin']) && $shift->user_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses ke shift ini'
            ], 403);
        }

        // Get all sold items from orders in this shift
        $soldItems = [];
        $orderItems = \App\Models\OrderItem::whereHas('order', function ($query) use ($shiftId) {
            $query->where('shift_id', $shiftId);
        })
        ->with('product')
        ->get();

        // Group by product
        $itemsGrouped = $orderItems->groupBy(function ($item) {
            return $item->product_id . '-' . ($item->variant_name ?? 'default');
        });

        foreach ($itemsGrouped as $group => $items) {
            $firstItem = $items->first();
            $totalQuantity = $items->sum('quantity');
            $totalRevenue = $items->sum('subtotal');

            $soldItems[] = [
                'product_id' => $firstItem->product_id,
                'product_name' => $firstItem->product_name ?? $firstItem->product->name ?? 'Unknown',
                'variant_name' => $firstItem->variant_name,
                'quantity' => $totalQuantity,
                'unit_price' => $firstItem->price,
                'total_revenue' => $totalRevenue,
            ];
        }

        // Sort by product name
        usort($soldItems, function ($a, $b) {
            return strcmp($a['product_name'], $b['product_name']);
        });

        // Calculate payment breakdown
        $totalCash = $shift->expected_cash - $shift->opening_balance; // Cash sales only
        $cashOut = 0; // Will be calculated from expenses if available

        $report = [
            'shift' => [
                'id' => $shift->id,
                'shift_name' => $shift->shift_name,
                'user' => [
                    'name' => $shift->user->name,
                    'email' => $shift->user->email,
                ],
                'outlet' => [
                    'name' => $shift->outlet->name ?? 'Main Outlet',
                ],
                'opened_at' => $shift->opened_at->format('Y-m-d H:i:s'),
                'closed_at' => $shift->closed_at ? $shift->closed_at->format('Y-m-d H:i:s') : null,
            ],
            'summary' => [
                'opening_balance' => (float) $shift->opening_balance,
                'total_received' => (float) $shift->expected_total,
                'cash_out' => (float) $cashOut,
                'ending_balance' => (float) ($shift->opening_balance + $totalCash - $cashOut),
                'total_transactions_completed' => $shift->total_transactions,
                'total_transactions_unpaid' => 0,
                'system_cash_total' => (float) ($shift->opening_balance + $totalCash),
                'actual_cash_total' => (float) ($shift->actual_cash ?? ($shift->opening_balance + $totalCash)),
                'cash_difference' => (float) ($shift->cash_difference ?? 0),
            ],
            'payment_breakdown' => [
                'cash' => [
                    'transactions' => $shift->cash_transactions,
                    'amount' => (float) $totalCash,
                ],
                'card' => [
                    'transactions' => $shift->card_transactions,
                    'amount' => (float) $shift->expected_card,
                ],
                'transfer' => [
                    'transactions' => $shift->transfer_transactions,
                    'amount' => (float) $shift->expected_transfer,
                ],
                'qris' => [
                    'transactions' => $shift->qris_transactions,
                    'amount' => (float) $shift->expected_qris,
                ],
            ],
            'sold_items' => $soldItems,
            'total_items_sold' => array_sum(array_column($soldItems, 'quantity')),
            'total_items_revenue' => array_sum(array_column($soldItems, 'total_revenue')),
        ];

        return response()->json([
            'success' => true,
            'data' => $report
        ]);
    }

    /**
     * Get shift summary (for dashboard)
     */
    public function getShiftSummary(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        // Get active shift
        $activeShift = CashierShift::open()
            ->forUser(auth()->id())
            ->forBusiness($businessId)
            ->forOutlet($outletId)
            ->first();

        // Get today's closed shifts for this user
        $todayShifts = CashierShift::forUser(auth()->id())
            ->forBusiness($businessId)
            ->forOutlet($outletId)
            ->today()
            ->get();

        $summary = [
            'has_active_shift' => $activeShift ? true : false,
            'active_shift' => $activeShift,
            'today_shifts_count' => $todayShifts->count(),
            'today_total_revenue' => $todayShifts->sum('expected_total'),
            'today_total_transactions' => $todayShifts->sum('total_transactions'),
        ];

        return response()->json([
            'success' => true,
            'data' => $summary
        ]);
    }

    /**
     * Recalculate shift data
     */
    public function recalculateShift(Request $request, $shiftId)
    {
        $shift = CashierShift::find($shiftId);

        if (!$shift) {
            return response()->json([
                'success' => false,
                'message' => 'Shift not found'
            ], 404);
        }

        // Check if user has permission to access this shift
        if ($shift->user_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this shift'
            ], 403);
        }

        try {
            // Recalculate expected totals
            $shift->calculateExpectedTotals();

            \Log::info('Shift recalculated', [
                'shift_id' => $shift->id,
                'total_transactions' => $shift->total_transactions,
                'expected_total' => $shift->expected_total,
                'expected_cash' => $shift->expected_cash,
                'expected_card' => $shift->expected_card,
                'expected_transfer' => $shift->expected_transfer,
                'expected_qris' => $shift->expected_qris,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Shift data recalculated successfully',
                'data' => [
                    'shift_id' => $shift->id,
                    'total_transactions' => $shift->total_transactions,
                    'expected_total' => $shift->expected_total,
                    'expected_cash' => $shift->expected_cash,
                    'expected_card' => $shift->expected_card,
                    'expected_transfer' => $shift->expected_transfer,
                    'expected_qris' => $shift->expected_qris,
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to recalculate shift', [
                'shift_id' => $shift->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to recalculate shift data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active shifts (for monitoring by owner/admin)
     */
    public function getAllActiveShifts(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if (!$businessId) {
            return response()->json([
                'success' => false,
                'message' => 'Business ID required'
            ], 400);
        }

        // Check if user has permission (owner/admin only)
        $user = auth()->user();
        if (!in_array($user->role, ['owner', 'admin', 'super_admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access'
            ], 403);
        }

        try {
            // Debug logging
            Log::info('getAllActiveShifts called', [
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'user_id' => auth()->id(),
                'user_role' => auth()->user()->role
            ]);

            // Get all active shifts with employee, user, and outlet data
            $query = CashierShift::with(['employee.user', 'user', 'outlet'])
                ->where('business_id', $businessId)
                ->where('status', 'open');

            // Filter by outlet if provided
            if ($outletId) {
                $query->where('outlet_id', $outletId);
            }

            $activeShifts = $query->get();

            Log::info('Active shifts found', [
                'count' => $activeShifts->count(),
                'shifts' => $activeShifts->map(function($shift) {
                    return [
                        'id' => $shift->id,
                        'employee_id' => $shift->employee_id,
                        'user_id' => $shift->user_id,
                        'has_employee' => $shift->employee ? true : false,
                        'has_employee_user' => $shift->employee && $shift->employee->user ? true : false,
                        'has_user' => $shift->user ? true : false,
                    ];
                })->toArray()
            ]);

            // Transform data and add today's statistics
            $transformedShifts = $activeShifts->map(function ($shift) {
                // Get statistics for this cashier from shift opening time - use shift_id as primary
                $todayStats = $this->getTodayStatsForCashier($shift->id, $shift->employee_id, $shift->business_id, $shift->outlet_id, $shift->opened_at);

                // Get user info - prefer from employee, fallback to direct user relation
                $userInfo = null;
                if ($shift->employee && $shift->employee->user) {
                    // Use employee's user
                    $userInfo = [
                        'id' => $shift->employee->user->id,
                        'name' => $shift->employee->user->name,
                        'email' => $shift->employee->user->email,
                    ];
                } elseif ($shift->user) {
                    // Fallback to direct user relation
                    $userInfo = [
                        'id' => $shift->user->id,
                        'name' => $shift->user->name,
                        'email' => $shift->user->email,
                    ];
                }

                return [
                    'id' => $shift->id,
                    'shift_name' => $shift->shift_name,
                    'opened_at' => $shift->opened_at,
                    'opening_balance' => $shift->opening_balance,
                    'expected_cash' => $shift->expected_cash,
                    'actual_cash' => $shift->actual_cash,
                    'employee' => $shift->employee ? [
                        'id' => $shift->employee->id,
                        'user' => $userInfo
                    ] : [
                        'id' => null,
                        'user' => $userInfo
                    ],
                    'outlet' => [
                        'id' => $shift->outlet->id,
                        'name' => $shift->outlet->name,
                    ],
                    // Today's statistics
                    'today_transactions' => $todayStats['transactions'],
                    'today_sales' => $todayStats['sales'],
                    'today_items' => $todayStats['items'],
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $transformedShifts
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch active shifts', [
                'error' => $e->getMessage(),
                'business_id' => $businessId
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active shifts',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get statistics for a specific cashier from shift opening time
     * Priority: shift_id > employee_id
     */
    private function getTodayStatsForCashier($shiftId, $employeeId, $businessId, $outletId = null, $openedAt = null)
    {
        // Use shift opening time if provided, otherwise use today
        $startDate = $openedAt ? \Carbon\Carbon::parse($openedAt) : \Carbon\Carbon::today('Asia/Jakarta');
        $endDate = \Carbon\Carbon::now('Asia/Jakarta');

        Log::info('getTodayStatsForCashier called', [
            'shift_id' => $shiftId,
            'employee_id' => $employeeId,
            'business_id' => $businessId,
            'outlet_id' => $outletId,
            'start_date' => $startDate->toDateTimeString(),
            'end_date' => $endDate->toDateTimeString()
        ]);

        // Priority 1: Get orders by shift_id (most accurate)
        // Get orders from shift opening time until now
        $query = \App\Models\Order::where('business_id', $businessId)
            ->where('payment_status', 'paid') // Use payment_status instead of status
            ->whereBetween('created_at', [$startDate, $endDate]);

        // Filter by outlet if provided
        if ($outletId) {
            $query->where('outlet_id', $outletId);
        }

        // Priority: Use shift_id if available, otherwise fallback to employee_id
        if ($shiftId) {
            // First try orders with shift_id
            $ordersByShift = $query->where('shift_id', $shiftId)->with('items')->get();
            
            // Also get orders without shift_id but with matching employee_id and date range
            // This handles orders created before shift_id was assigned
            if ($employeeId !== null) {
                $ordersByEmployee = \App\Models\Order::where('business_id', $businessId)
                    ->where('payment_status', 'paid')
                    ->whereBetween('created_at', [$startDate, $endDate])
                    ->where('employee_id', $employeeId)
                    ->whereNull('shift_id')
                    ->when($outletId, function ($q) use ($outletId) {
                        return $q->where('outlet_id', $outletId);
                    })
                    ->with('items')
                    ->get();
                
                // Merge both sets of orders
                $todayOrders = $ordersByShift->merge($ordersByEmployee)->unique('id');
            } else {
                $todayOrders = $ordersByShift;
            }
        } elseif ($employeeId !== null) {
            $query->where('employee_id', $employeeId);
            $todayOrders = $query->with('items')->get();
        } else {
            // If both are null, try to find orders by user_id from shift
            // This will be handled by the shift's user_id if needed
            $query->whereNull('shift_id')->whereNull('employee_id');
            $todayOrders = $query->with('items')->get();
        }

        Log::info('Orders found for shift', [
            'shift_id' => $shiftId,
            'employee_id' => $employeeId,
            'orders_count' => $todayOrders->count(),
            'order_ids' => $todayOrders->pluck('id')->toArray(),
            'date_range' => $startDate->toDateTimeString() . ' to ' . $endDate->toDateTimeString()
        ]);

        // Calculate statistics
        $transactions = $todayOrders->count();
        $sales = $todayOrders->sum('total') ?? 0;
        $items = $todayOrders->sum(function ($order) {
            if ($order->items && $order->items->count() > 0) {
                return $order->items->sum('quantity');
            }
            return 0;
        });

        $stats = [
            'transactions' => $transactions,
            'sales' => $sales,
            'items' => $items,
        ];

        Log::info('Shift stats calculated', [
            'shift_id' => $shiftId,
            'employee_id' => $employeeId,
            'stats' => $stats
        ]);

        return $stats;
    }
}
