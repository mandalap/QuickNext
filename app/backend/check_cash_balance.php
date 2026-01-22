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
echo "  CHECK CASH BALANCE CALCULATION\n";
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
// 1. CHECK TOTAL PENDAPATAN BY PAYMENT METHOD
// ==========================================
echo "1. TOTAL PENDAPATAN BY PAYMENT METHOD\n";
echo "----------------------------------------\n";

$startDate = $argv[3] ?? '2025-09-01';
$endDate = $argv[4] ?? '2025-11-13';

$startDateObj = Carbon::parse($startDate)->startOfDay();
$endDateObj = Carbon::parse($endDate)->endOfDay();

echo "Period: {$startDate} to {$endDate}\n\n";

// Get total income
$totalIncome = Order::where('business_id', $businessId)
    ->where('payment_status', 'paid')
    ->where(function ($q) use ($startDateObj, $endDateObj) {
        $q->whereBetween('created_at', [$startDateObj, $endDateObj])
          ->orWhere(function ($qq) use ($startDateObj, $endDateObj) {
              $qq->where('payment_status', 'paid')
                 ->whereBetween('updated_at', [$startDateObj, $endDateObj]);
          })
          ->orWhereHas('payments', function ($p) use ($startDateObj, $endDateObj) {
              $p->whereIn('status', ['success', 'paid', 'settlement', 'capture'])
                ->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$startDateObj, $endDateObj]);
          });
    })
    ->when($outletId, function($q) use ($outletId) {
        return $q->where('outlet_id', $outletId);
    })
    ->sum('total');

echo "Total Pendapatan: Rp " . number_format($totalIncome, 0, ',', '.') . "\n\n";

// Breakdown by payment method
echo "Breakdown by payment method:\n";
$payments = DB::table('payments')
    ->join('orders', 'payments.order_id', '=', 'orders.id')
    ->where('orders.business_id', $businessId)
    ->whereIn('payments.status', ['success', 'paid', 'settlement', 'capture'])
    ->whereBetween(DB::raw('COALESCE(payments.paid_at, payments.created_at)'), [$startDateObj, $endDateObj])
    ->when($outletId, function($q) use ($outletId) {
        return $q->where('orders.outlet_id', $outletId);
    })
    ->select('payments.payment_method', DB::raw('SUM(payments.amount) as total'), DB::raw('COUNT(*) as count'))
    ->groupBy('payments.payment_method')
    ->get();

$totalCash = 0;
$totalCard = 0;
$totalTransfer = 0;
$totalQris = 0;
$totalOther = 0;

foreach ($payments as $payment) {
    $method = $payment->payment_method ?? 'unknown';
    $amount = $payment->total ?? 0;
    $count = $payment->count ?? 0;
    
    echo "   - {$method}: Rp " . number_format($amount, 0, ',', '.') . " ({$count} transaksi)\n";
    
    if ($method === 'cash') {
        $totalCash = $amount;
    } elseif ($method === 'card') {
        $totalCard = $amount;
    } elseif ($method === 'transfer') {
        $totalTransfer = $amount;
    } elseif ($method === 'qris') {
        $totalQris = $amount;
    } else {
        $totalOther += $amount;
    }
}

echo "\n";
echo "Summary:\n";
echo "   - Cash: Rp " . number_format($totalCash, 0, ',', '.') . "\n";
echo "   - Card: Rp " . number_format($totalCard, 0, ',', '.') . "\n";
echo "   - Transfer: Rp " . number_format($totalTransfer, 0, ',', '.') . "\n";
echo "   - QRIS: Rp " . number_format($totalQris, 0, ',', '.') . "\n";
echo "   - Other: Rp " . number_format($totalOther, 0, ',', '.') . "\n";
echo "   - Total: Rp " . number_format($totalCash + $totalCard + $totalTransfer + $totalQris + $totalOther, 0, ',', '.') . "\n";

// ==========================================
// 2. CHECK CASHIER SHIFTS
// ==========================================
echo "\n2. CASHIER SHIFTS\n";
echo "----------------------------------------\n";

// Get all closed shifts
$closedShifts = CashierShift::where('business_id', $businessId)
    ->where('status', 'closed')
    ->when($outletId, function ($query) use ($outletId) {
        return $query->where('outlet_id', $outletId);
    })
    ->orderBy('closed_at', 'desc')
    ->get();

echo "Closed shifts: " . $closedShifts->count() . "\n\n";

$totalActualCash = 0;
foreach ($closedShifts as $shift) {
    $actualCash = $shift->actual_cash ?? 0;
    $expectedCash = $shift->expected_cash ?? 0;
    $openingBalance = $shift->opening_balance ?? 0;
    $cashSales = $expectedCash - $openingBalance;
    
    echo "Shift #{$shift->id}:\n";
    echo "   - Opened: {$shift->opened_at}\n";
    echo "   - Closed: {$shift->closed_at}\n";
    echo "   - Opening balance: Rp " . number_format($openingBalance, 0, ',', '.') . "\n";
    echo "   - Expected cash: Rp " . number_format($expectedCash, 0, ',', '.') . "\n";
    echo "   - Cash sales: Rp " . number_format($cashSales, 0, ',', '.') . "\n";
    echo "   - Actual cash: Rp " . number_format($actualCash, 0, ',', '.') . "\n";
    echo "   - Difference: Rp " . number_format($actualCash - $expectedCash, 0, ',', '.') . "\n";
    echo "\n";
    
    $totalActualCash += $actualCash;
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
    $expectedCash = $openShift->expected_cash ?? 0;
    $openingBalance = $openShift->opening_balance ?? 0;
    $cashSales = $expectedCash - $openingBalance;
    
    echo "Open shift:\n";
    echo "   - ID: {$openShift->id}\n";
    echo "   - Opened: {$openShift->opened_at}\n";
    echo "   - Opening balance: Rp " . number_format($openingBalance, 0, ',', '.') . "\n";
    echo "   - Expected cash: Rp " . number_format($expectedCash, 0, ',', '.') . "\n";
    echo "   - Cash sales: Rp " . number_format($cashSales, 0, ',', '.') . "\n";
    echo "\n";
} else {
    echo "No open shift\n\n";
}

// ==========================================
// 3. CHECK CASH EXPENSES
// ==========================================
echo "3. CASH EXPENSES\n";
echo "----------------------------------------\n";

// Get last shift date
$lastShift = CashierShift::where('business_id', $businessId)
    ->when($outletId, function ($query) use ($outletId) {
        return $query->where('outlet_id', $outletId);
    })
    ->where(function($q) {
        $q->where('status', 'closed')
          ->orWhere('status', 'open');
    })
    ->latest('opened_at')
    ->first();

$lastShiftDate = $lastShift ? $lastShift->opened_at : null;

if ($lastShiftDate) {
    $cashExpenses = Expense::where('business_id', $businessId)
        ->when($outletId, function ($query) use ($outletId) {
            return $query->where('outlet_id', $outletId);
        })
        ->where('expense_date', '>=', $lastShiftDate->toDateString())
        ->where(function ($query) {
            $query->where('payment_method', 'cash')
                ->orWhereNull('payment_method');
        })
        ->sum('amount');
    
    echo "Cash expenses since shift: Rp " . number_format($cashExpenses, 0, ',', '.') . "\n";
    echo "Since: {$lastShiftDate->toDateString()}\n";
} else {
    $cashExpenses = Expense::where('business_id', $businessId)
        ->when($outletId, function ($query) use ($outletId) {
            return $query->where('outlet_id', $outletId);
        })
        ->where(function ($query) {
            $query->where('payment_method', 'cash')
                ->orWhereNull('payment_method');
        })
        ->sum('amount');
    
    echo "All cash expenses: Rp " . number_format($cashExpenses, 0, ',', '.') . "\n";
}

// ==========================================
// 4. CALCULATE CASH BALANCE
// ==========================================
echo "\n4. CASH BALANCE CALCULATION\n";
echo "----------------------------------------\n";

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
    echo "Last closed shift actual cash: Rp " . number_format($baseCash, 0, ',', '.') . "\n";
}

if ($openShift) {
    $openShiftCashSales = ($openShift->expected_cash ?? $openShift->opening_balance) - ($openShift->opening_balance ?? 0);
    echo "Open shift cash sales: Rp " . number_format(max(0, $openShiftCashSales), 0, ',', '.') . "\n";
    
    $baseCash += max(0, $openShiftCashSales);
    
    if (!$lastClosedShift) {
        $baseCash = ($openShift->opening_balance ?? 0) + max(0, $openShiftCashSales);
    }
}

$cashBalance = max(0, $baseCash - $cashExpenses);

echo "\nCalculation:\n";
echo "   - Base cash: Rp " . number_format($baseCash, 0, ',', '.') . "\n";
echo "   - Cash expenses: Rp " . number_format($cashExpenses, 0, ',', '.') . "\n";
echo "   - Cash balance: Rp " . number_format($cashBalance, 0, ',', '.') . "\n";

// ==========================================
// 5. COMPARISON
// ==========================================
echo "\n5. COMPARISON\n";
echo "----------------------------------------\n";
echo "Total Pendapatan (all methods): Rp " . number_format($totalIncome, 0, ',', '.') . "\n";
echo "Total Pendapatan (cash only): Rp " . number_format($totalCash, 0, ',', '.') . "\n";
echo "Saldo Kas (from shifts): Rp " . number_format($cashBalance, 0, ',', '.') . "\n";
echo "\n";
echo "Difference:\n";
echo "   - Total Income - Cash Income = Rp " . number_format($totalIncome - $totalCash, 0, ',', '.') . " (card/transfer/QRIS)\n";
echo "   - Cash Income - Cash Balance = Rp " . number_format($totalCash - $cashBalance, 0, ',', '.') . " (difference)\n";
echo "\n";

// ==========================================
// NOTES
// ==========================================
echo "NOTES:\n";
echo "- Saldo Kas hanya menghitung CASH FISIK dari shift\n";
echo "- Tidak termasuk card, transfer, QRIS (masuk ke rekening bank)\n";
echo "- Jika Cash Income > Cash Balance, kemungkinan:\n";
echo "  1. Shift belum ditutup dengan benar\n";
echo "  2. Ada pengeluaran cash yang tidak terhitung\n";
echo "  3. Ada selisih (difference) saat close shift\n";
echo "\n";





















