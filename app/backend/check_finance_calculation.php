<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Order;
use App\Models\Expense;
use App\Models\CashierShift;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

echo "========================================\n";
echo "  CHECK FINANCE CALCULATION\n";
echo "========================================\n\n";

// Get business ID from command line or use first business
$businessId = $argv[1] ?? null;
if (!$businessId) {
    $business = \App\Models\Business::first();
    if (!$business) {
        echo "❌ No business found!\n";
        exit(1);
    }
    $businessId = $business->id;
    echo "Using Business ID: {$businessId}\n";
}

$outletId = $argv[2] ?? null;
if ($outletId) {
    echo "Using Outlet ID: {$outletId}\n";
}

echo "\n";

// ==========================================
// 1. CHECK TOTAL PENDAPATAN (INCOME)
// ==========================================
echo "1. TOTAL PENDAPATAN (INCOME)\n";
echo "----------------------------------------\n";

$todayStart = Carbon::today()->startOfDay();
$todayEnd = Carbon::today()->endOfDay();

// Old way (only created_at)
$incomeOld = Order::where('business_id', $businessId)
    ->where('payment_status', 'paid')
    ->whereBetween('created_at', [$todayStart, $todayEnd])
    ->when($outletId, function($q) use ($outletId) {
        return $q->where('outlet_id', $outletId);
    })
    ->sum('total');

echo "   Old way (created_at only): Rp " . number_format($incomeOld, 0, ',', '.') . "\n";

// New way (payment date)
$incomeNew = Order::where('business_id', $businessId)
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

echo "   New way (payment date): Rp " . number_format($incomeNew, 0, ',', '.') . "\n";

// Breakdown by payment method
echo "\n   Breakdown by payment method:\n";
$paymentsToday = DB::table('payments')
    ->join('orders', 'payments.order_id', '=', 'orders.id')
    ->where('orders.business_id', $businessId)
    ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture'])
    ->whereBetween(DB::raw('COALESCE(payments.paid_at, payments.created_at)'), [$todayStart, $todayEnd])
    ->when($outletId, function($q) use ($outletId) {
        return $q->where('orders.outlet_id', $outletId);
    })
    ->select('payments.payment_method', DB::raw('SUM(payments.amount) as total'))
    ->groupBy('payments.payment_method')
    ->get();

foreach ($paymentsToday as $payment) {
    echo "      - {$payment->payment_method}: Rp " . number_format($payment->total, 0, ',', '.') . "\n";
}

// ==========================================
// 2. CHECK TOTAL PENGELUARAN (EXPENSE)
// ==========================================
echo "\n2. TOTAL PENGELUARAN (EXPENSE)\n";
echo "----------------------------------------\n";

$expenseToday = Expense::where('business_id', $businessId)
    ->whereDate('expense_date', $todayStart)
    ->when($outletId, function($q) use ($outletId) {
        return $q->where('outlet_id', $outletId);
    })
    ->sum('amount');

echo "   Total pengeluaran hari ini: Rp " . number_format($expenseToday, 0, ',', '.') . "\n";

// Breakdown by category
$expensesByCategory = Expense::where('business_id', $businessId)
    ->whereDate('expense_date', $todayStart)
    ->when($outletId, function($q) use ($outletId) {
        return $q->where('outlet_id', $outletId);
    })
    ->select('category', DB::raw('SUM(amount) as total'))
    ->groupBy('category')
    ->get();

if ($expensesByCategory->count() > 0) {
    echo "\n   Breakdown by category:\n";
    foreach ($expensesByCategory as $expense) {
        echo "      - {$expense->category}: Rp " . number_format($expense->total, 0, ',', '.') . "\n";
    }
} else {
    echo "   (Tidak ada pengeluaran hari ini)\n";
}

// ==========================================
// 3. CHECK LABA BERSIH (NET INCOME)
// ==========================================
echo "\n3. LABA BERSIH (NET INCOME)\n";
echo "----------------------------------------\n";

$netIncome = $incomeNew - $expenseToday;
echo "   Total Pendapatan: Rp " . number_format($incomeNew, 0, ',', '.') . "\n";
echo "   Total Pengeluaran: Rp " . number_format($expenseToday, 0, ',', '.') . "\n";
echo "   Laba Bersih: Rp " . number_format($netIncome, 0, ',', '.') . "\n";

// ==========================================
// 4. CHECK SALDO KAS (CASH BALANCE)
// ==========================================
echo "\n4. SALDO KAS (CASH BALANCE)\n";
echo "----------------------------------------\n";

// Get last closed shift
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
    echo "   Last closed shift:\n";
    echo "      - ID: {$lastClosedShift->id}\n";
    echo "      - Closed at: {$lastClosedShift->closed_at}\n";
    echo "      - Actual cash: Rp " . number_format($baseCash, 0, ',', '.') . "\n";
} else {
    echo "   (Tidak ada shift yang ditutup)\n";
}

// Get open shift
$openShift = CashierShift::where('business_id', $businessId)
    ->where('status', 'open')
    ->when($outletId, function ($query) use ($outletId) {
        return $query->where('outlet_id', $outletId);
    })
    ->latest('opened_at')
    ->first();

if ($openShift) {
    $openShiftCashSales = ($openShift->expected_cash ?? $openShift->opening_balance) - ($openShift->opening_balance ?? 0);
    echo "\n   Open shift:\n";
    echo "      - ID: {$openShift->id}\n";
    echo "      - Opened at: {$openShift->opened_at}\n";
    echo "      - Opening balance: Rp " . number_format($openShift->opening_balance ?? 0, 0, ',', '.') . "\n";
    echo "      - Expected cash: Rp " . number_format($openShift->expected_cash ?? 0, 0, ',', '.') . "\n";
    echo "      - Cash sales: Rp " . number_format(max(0, $openShiftCashSales), 0, ',', '.') . "\n";
    
    $baseCash += max(0, $openShiftCashSales);
    
    if (!$lastClosedShift) {
        $baseCash = ($openShift->opening_balance ?? 0) + max(0, $openShiftCashSales);
    }
    
    if (!$lastShiftDate) {
        $lastShiftDate = $openShift->opened_at;
    }
} else {
    echo "   (Tidak ada shift yang terbuka)\n";
}

// Calculate expenses after shift
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
    
    echo "\n   Expenses after shift (cash only):\n";
    echo "      - Since: {$lastShiftDate->toDateString()}\n";
    echo "      - Total: Rp " . number_format($expensesAfterShift, 0, ',', '.') . "\n";
} else {
    $expensesAfterShift = Expense::where('business_id', $businessId)
        ->when($outletId, function ($query) use ($outletId) {
            return $query->where('outlet_id', $outletId);
        })
        ->where(function ($query) {
            $query->where('payment_method', 'cash')
                ->orWhereNull('payment_method');
        })
        ->sum('amount');
    
    echo "\n   All cash expenses: Rp " . number_format($expensesAfterShift, 0, ',', '.') . "\n";
}

$cashBalance = max(0, $baseCash - $expensesAfterShift);

echo "\n   Calculation:\n";
echo "      - Base cash: Rp " . number_format($baseCash, 0, ',', '.') . "\n";
echo "      - Cash expenses: Rp " . number_format($expensesAfterShift, 0, ',', '.') . "\n";
echo "      - Cash balance: Rp " . number_format($cashBalance, 0, ',', '.') . "\n";

// ==========================================
// SUMMARY
// ==========================================
echo "\n========================================\n";
echo "  SUMMARY\n";
echo "========================================\n";
echo "Total Pendapatan (hari ini): Rp " . number_format($incomeNew, 0, ',', '.') . "\n";
echo "Total Pengeluaran (hari ini): Rp " . number_format($expenseToday, 0, ',', '.') . "\n";
echo "Laba Bersih (hari ini): Rp " . number_format($netIncome, 0, ',', '.') . "\n";
echo "Saldo Kas: Rp " . number_format($cashBalance, 0, ',', '.') . "\n";
echo "\n";

// ==========================================
// NOTES
// ==========================================
echo "NOTES:\n";
echo "- Total Pendapatan: Semua order yang dibayar hari ini (tidak peduli kapan dibuat)\n";
echo "- Total Pengeluaran: Semua expense yang dibuat hari ini\n";
echo "- Laba Bersih: Pendapatan - Pengeluaran\n";
echo "- Saldo Kas: Uang cash fisik di kasir (dari shift) dikurangi pengeluaran cash\n";
echo "  (TIDAK termasuk card, transfer, QRIS - hanya cash fisik)\n";
echo "\n";





















