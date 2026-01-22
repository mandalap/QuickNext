<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CashierShift extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'business_id',
        'outlet_id',
        'user_id',
        'employee_id',
        'shift_name',
        'status',
        'opened_at',
        'closed_at',
        'opening_balance',
        'expected_cash',
        'expected_card',
        'expected_transfer',
        'expected_qris',
        'expected_total',
        'actual_cash',
        'actual_card',
        'actual_transfer',
        'actual_qris',
        'actual_total',
        'cash_difference',
        'total_difference',
        'total_transactions',
        'cash_transactions',
        'card_transactions',
        'transfer_transactions',
        'qris_transactions',
        'opening_notes',
        'closing_notes',
        'closed_by_user_id',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'opening_balance' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'expected_card' => 'decimal:2',
        'expected_transfer' => 'decimal:2',
        'expected_qris' => 'decimal:2',
        'expected_total' => 'decimal:2',
        'actual_cash' => 'decimal:2',
        'actual_card' => 'decimal:2',
        'actual_transfer' => 'decimal:2',
        'actual_qris' => 'decimal:2',
        'actual_total' => 'decimal:2',
        'cash_difference' => 'decimal:2',
        'total_difference' => 'decimal:2',
    ];

    // Relationships
    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function outlet()
    {
        return $this->belongsTo(Outlet::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function closedByUser()
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'shift_id');
    }

    // Scopes
    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForBusiness($query, $businessId)
    {
        return $query->where('business_id', $businessId);
    }

    public function scopeForOutlet($query, $outletId)
    {
        return $query->where('outlet_id', $outletId);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('opened_at', today());
    }

    // Helper methods
    public function isOpen()
    {
        return $this->status === 'open';
    }

    public function isClosed()
    {
        return $this->status === 'closed';
    }

    public function calculateExpectedTotals($useOutletIdFromRequest = null)
    {
        // Hitung total dari orders yang terkait dengan shift ini
        // PERBAIKAN: Jika orders tidak ada shift_id, gunakan filter berdasarkan employee, outlet, dan date

        // Prioritas:
        // 1. Orders dengan shift_id (relasi langsung)
        // 2. Orders berdasarkan employee_id + outlet + date range

        $ordersViaRelation = $this->orders()
            ->where('payment_status', 'paid')
            ->with('payments')
            ->get();

        // Use outlet from request if provided, otherwise use shift's outlet
        $outletId = $useOutletIdFromRequest ?? $this->outlet_id;

        // ✅ NEW: Gabungkan orders via relation dengan order self-service yang sudah dibayar (tanpa shift_id)
        // Ini memastikan order self-service yang sudah dibayar via Midtrans masuk ke shift
        $selfServiceOrders = Order::where('business_id', $this->business_id)
            ->where('outlet_id', $outletId)
            ->where('type', 'self_service')
            ->where('payment_status', 'paid')
            ->whereNull('shift_id') // ✅ Hanya order self-service yang belum punya shift_id
            ->whereBetween('created_at', [$this->opened_at, now()])
            ->with('payments')
            ->get();

        // ✅ NEW: Assign shift_id ke order self-service yang sudah dibayar tapi belum punya shift_id
        // Ini memastikan order self-service masuk ke shift dan muncul di transaksi kasir
        if ($selfServiceOrders->count() > 0) {
            foreach ($selfServiceOrders as $selfServiceOrder) {
                $selfServiceOrder->shift_id = $this->id;
                $selfServiceOrder->save();
                \Log::info("CashierShift: Assigned shift_id to self-service order", [
                    'order_id' => $selfServiceOrder->id,
                    'order_number' => $selfServiceOrder->order_number,
                    'shift_id' => $this->id,
                    'reason' => 'Self-service order paid via Midtrans, assigned to active shift'
                ]);
            }
        }

        // Gabungkan orders via relation dengan self-service orders yang baru di-assign
        if ($ordersViaRelation->count() > 0) {
            $orders = $ordersViaRelation->merge($selfServiceOrders);
            \Log::info("Using orders via shift relation + self-service: {$orders->count()} orders", [
                'via_relation' => $ordersViaRelation->count(),
                'self_service' => $selfServiceOrders->count()
            ]);
        } else {
            // Fallback: Query orders berdasarkan employee_id, outlet, dan date
            \Log::info("No orders via shift relation, using fallback query");

            $employeeId = $this->employee_id;
            if (!$employeeId) {
                // Get employee from user
                $employee = Employee::where('user_id', $this->user_id)->first();
                $employeeId = $employee?->id;
            }

            \Log::info("Fallback query parameters", [
                'employee_id' => $employeeId,
                'outlet_id' => $outletId,
                'business_id' => $this->business_id,
                'date_from' => $this->opened_at,
                'date_to' => now()
            ]);

            $fallbackOrders = Order::where('business_id', $this->business_id)
                ->where('outlet_id', $outletId)
                ->where('payment_status', 'paid')
                ->whereBetween('created_at', [$this->opened_at, now()])
                ->when($employeeId, function ($query) use ($employeeId) {
                    return $query->where('employee_id', $employeeId);
                })
                ->with('payments')
                ->get();

            // ✅ NEW: Gabungkan fallback orders dengan self-service orders
            $orders = $fallbackOrders->merge($selfServiceOrders);

            \Log::info("Fallback query found {$orders->count()} orders", [
                'fallback' => $fallbackOrders->count(),
                'self_service' => $selfServiceOrders->count()
            ]);
        }

        $this->total_transactions = $orders->count();
        $this->expected_total = $orders->sum('total');

        // Hitung per payment method dari payments (penjualan saja, tanpa modal awal)
        $cashSales = 0;
        $this->expected_card = 0;
        $this->expected_transfer = 0;
        $this->expected_qris = 0;

        $this->cash_transactions = 0;
        $this->card_transactions = 0;
        $this->transfer_transactions = 0;
        $this->qris_transactions = 0;

        $totalCashReceived = 0; // Total uang yang diterima dari customer
        $totalCashChange = 0;   // Total kembalian yang diberikan

        foreach ($orders as $order) {
            // Debug log untuk memastikan payments ter-load
            \Log::info("Order {$order->id} has " . $order->payments->count() . " payments");

            // ✅ FIX: Filter hanya payment yang statusnya valid (paid/success)
            // Ini mencegah payment pending/failed/duplikat ikut terhitung
            $validPayments = $order->payments->filter(function ($payment) {
                return in_array($payment->status, ['success', 'paid', 'settlement', 'capture']);
            });

            // ✅ FIX: Group by payment_method dan ambil yang terakhir (untuk handle retry)
            // Jika ada multiple payments dengan method yang sama, hanya ambil yang terakhir
            $paymentByMethod = [];
            foreach ($validPayments as $payment) {
                $method = $payment->payment_method;
                // Jika sudah ada payment dengan method yang sama, ambil yang terakhir (created_at terbaru)
                if (!isset($paymentByMethod[$method]) || 
                    $payment->created_at > $paymentByMethod[$method]->created_at) {
                    $paymentByMethod[$method] = $payment;
                }
            }

            // Hitung dari payment yang sudah di-filter dan di-deduplicate
            foreach ($paymentByMethod as $method => $payment) {
                \Log::info("Valid Payment: method={$method}, amount={$payment->amount}, status={$payment->status}");

                switch ($method) {
                    case 'cash':
                        $totalCashReceived += $payment->amount;
                        $this->cash_transactions++;
                        break;
                    case 'card':
                        $this->expected_card += $payment->amount;
                        $this->card_transactions++;
                        break;
                    case 'transfer':
                        $this->expected_transfer += $payment->amount;
                        $this->transfer_transactions++;
                        break;
                    case 'qris':
                        $this->expected_qris += $payment->amount;
                        $this->qris_transactions++;
                        break;
                }
            }

            // Hitung total kembalian dari order (hanya untuk cash payment yang valid)
            if (isset($paymentByMethod['cash'])) {
                $totalCashChange += $order->change_amount ?? 0;
            }
        }

        // Net Cash = Cash Received - Change Given
        $cashSales = $totalCashReceived - $totalCashChange;

        // Expected Cash = Modal Awal + Net Cash Sales
        $this->expected_cash = $this->opening_balance + $cashSales;

        // ✅ VALIDATION: Hitung total dari payment methods untuk validasi
        $totalFromPayments = $cashSales + $this->expected_card + $this->expected_transfer + $this->expected_qris;
        
        // ✅ FIX: Jika ada perbedaan signifikan, log warning
        // expected_total dari orders adalah source of truth
        $difference = abs($this->expected_total - $totalFromPayments);
        if ($difference > 100) { // Toleransi 100 rupiah untuk rounding
            \Log::warning("Shift {$this->id} payment calculation mismatch:", [
                'expected_total_from_orders' => $this->expected_total,
                'total_from_payments' => $totalFromPayments,
                'difference' => $difference,
                'note' => 'expected_total from orders is source of truth'
            ]);
        }

        // Debug log hasil perhitungan
        \Log::info("Shift {$this->id} calculation results:", [
            'total_transactions' => $this->total_transactions,
            'expected_total' => $this->expected_total,
            'total_from_payments' => $totalFromPayments,
            'cash_received' => $totalCashReceived,
            'cash_change' => $totalCashChange,
            'net_cash_sales' => $cashSales,
            'expected_cash' => $this->expected_cash,
            'opening_balance' => $this->opening_balance,
            'cash_transactions' => $this->cash_transactions,
            'card_transactions' => $this->card_transactions,
            'transfer_transactions' => $this->transfer_transactions,
            'qris_transactions' => $this->qris_transactions,
            'expected_card' => $this->expected_card,
            'expected_transfer' => $this->expected_transfer,
            'expected_qris' => $this->expected_qris,
        ]);

        $this->save();
    }

    public function calculateDifferences()
    {
        // Hitung selisih
        $this->cash_difference = ($this->actual_cash ?? 0) - $this->expected_cash;
        $this->total_difference = ($this->actual_total ?? 0) - $this->expected_total;
        $this->save();
    }

    public function closeShift($actualCash, $closingNotes = null, $closedByUserId = null, $outletIdFromRequest = null)
    {
        // Calculate expected totals before closing
        // Pass outlet ID from request to handle cases where frontend outlet differs from shift outlet
        $this->calculateExpectedTotals($outletIdFromRequest);

        // Set actual amounts
        $this->actual_cash = $actualCash;
        $this->actual_card = $this->expected_card; // Card always matches
        $this->actual_transfer = $this->expected_transfer; // Transfer always matches
        $this->actual_qris = $this->expected_qris; // QRIS always matches
        $this->actual_total = $actualCash + $this->actual_card + $this->actual_transfer + $this->actual_qris;

        // Calculate differences
        $this->calculateDifferences();

        // Close the shift
        $this->status = 'closed';
        $this->closed_at = now();
        $this->closing_notes = $closingNotes;
        $this->closed_by_user_id = $closedByUserId ?? auth()->id();

        $this->save();

        return $this;
    }

    public function getShiftDuration()
    {
        if (!$this->closed_at) {
            return $this->opened_at->diffForHumans();
        }

        return $this->opened_at->diffInHours($this->closed_at) . ' jam';
    }

    /**
     * Get cash sales only (without opening balance)
     */
    public function getCashSalesAttribute()
    {
        return $this->expected_cash - $this->opening_balance;
    }

    /**
     * Get total expected cash (opening balance + cash sales)
     */
    public function getTotalExpectedCashAttribute()
    {
        return $this->expected_cash;
    }
}
