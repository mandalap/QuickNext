# Update Perhitungan Kas - Modal Awal Termasuk

## 🔍 Masalah Sebelumnya

```
Modal Awal:        Rp 0        ❌ Tidak ditampilkan
Penjualan Tunai:   Rp 305,000
Expected Cash:     Rp 305,000  ❌ Tidak termasuk modal awal
```

## ✅ Solusi

Sekarang Expected Cash dihitung dengan formula:

```
Expected Cash = Modal Awal + Penjualan Tunai
```

## 📊 Contoh Perhitungan

### Sebelum Perbaikan:
```
Opening Balance:   Rp 100,000  (tidak digunakan dalam perhitungan)
Cash Sales:        Rp 305,000
Expected Cash:     Rp 305,000  ❌ SALAH!
```

### Setelah Perbaikan:
```
Opening Balance:   Rp 100,000
Cash Sales:        Rp 305,000
Expected Cash:     Rp 405,000  ✅ BENAR!
                   ^^^^^^^^^^
                   (100,000 + 305,000)
```

## 🔧 Perubahan Code

### 1. CashierShift Model (`app/Models/CashierShift.php`)

**Method `calculateExpectedTotals()` - Line 136-182**:

```php
// BEFORE
$this->expected_cash = 0;
foreach ($orders as $order) {
    foreach ($order->payments as $payment) {
        if ($payment->payment_method === 'cash') {
            $this->expected_cash += $payment->amount;
        }
    }
}

// AFTER
$cashSales = 0;
foreach ($orders as $order) {
    foreach ($order->payments as $payment) {
        if ($payment->payment_method === 'cash') {
            $cashSales += $payment->amount;
        }
    }
}
// Expected Cash = Modal Awal + Penjualan Tunai
$this->expected_cash = $this->opening_balance + $cashSales;
```

**Accessor baru untuk UI - Line 227-241**:

```php
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
```

### 2. CashierShiftController (`app/Http/Controllers/Api/CashierShiftController.php`)

**Method `getActiveShift()` - Line 48-51**:

```php
// Add computed fields for better frontend display
$shiftData = $activeShift->toArray();
$shiftData['cash_sales'] = $activeShift->cash_sales;
$shiftData['total_expected_cash'] = $activeShift->total_expected_cash;
```

**Method `getShiftDetail()` - Line 311-317**:

```php
'cash' => [
    'transactions' => $shift->cash_transactions,
    'opening_balance' => $shift->opening_balance,     // ✅ Baru
    'cash_sales' => $shift->cash_sales,               // ✅ Baru
    'expected_total' => $shift->expected_cash,        // ✅ Updated
    'actual' => $shift->actual_cash,
    'difference' => $shift->cash_difference,
],
```

## 📱 Response API Update

### GET /api/v1/shifts/active

**Response baru**:
```json
{
  "success": true,
  "has_active_shift": true,
  "data": {
    "id": 55,
    "opening_balance": 100000,
    "expected_cash": 405000,           // Modal Awal + Cash Sales
    "cash_sales": 305000,              // ✅ Field baru
    "total_expected_cash": 405000,     // ✅ Field baru (sama dengan expected_cash)
    "cash_transactions": 2,
    "total_transactions": 2,
    ...
  }
}
```

### GET /api/v1/shifts/{id}

**Response baru**:
```json
{
  "success": true,
  "data": {
    "shift": {...},
    "summary": {...},
    "payment_breakdown": {
      "cash": {
        "transactions": 2,
        "opening_balance": 100000,     // ✅ Baru
        "cash_sales": 305000,          // ✅ Baru
        "expected_total": 405000,      // ✅ Updated (termasuk modal)
        "actual": 500000,
        "difference": 95000
      },
      "card": {...},
      "transfer": {...},
      "qris": {...}
    },
    "orders": [...]
  }
}
```

## 🎨 UI Display Format

### Untuk Dashboard / Active Shift:

```
╔════════════════════════════════════╗
║     PERHITUNGAN KAS                ║
╠════════════════════════════════════╣
║ Modal Awal:      Rp    100,000     ║
║ Penjualan Tunai: Rp    305,000     ║
║ ────────────────────────────────   ║
║ Expected Cash:   Rp    405,000     ║
╚════════════════════════════════════╝
```

### Untuk Tutup Shift:

```
╔════════════════════════════════════╗
║     PERHITUNGAN KAS                ║
╠════════════════════════════════════╣
║ Modal Awal:      Rp    100,000     ║
║ Penjualan Tunai: Rp    305,000     ║
║ ────────────────────────────────   ║
║ Expected Cash:   Rp    405,000     ║
║ Actual Cash:     Rp    500,000     ║
║ ────────────────────────────────   ║
║ Selisih:         Rp     95,000 ✅  ║
╚════════════════════════════════════╝
```

## 🧪 Testing

Run test script:
```bash
php test_cash_calculation.php
```

Expected output:
```
✅ Expected Cash calculation CORRECT!
   Expected: Rp405,000

📋 DETAIL BREAKDOWN:
   Opening Balance:  Rp100,000
   Cash Sales:       Rp305,000
   ----------------------------------------
   Expected Cash:    Rp405,000
```

## 📝 Frontend Implementation Guide

### Menggunakan data dari API:

```javascript
// Get active shift
const response = await fetch('/api/v1/shifts/active');
const { data: shift } = await response.json();

// Display
console.log({
  modalAwal: shift.opening_balance,        // 100000
  penjualanTunai: shift.cash_sales,        // 305000
  expectedCash: shift.expected_cash,       // 405000
  // atau
  expectedCash: shift.total_expected_cash  // 405000 (alias)
});

// Verification (optional)
const calculated = shift.opening_balance + shift.cash_sales;
console.assert(calculated === shift.expected_cash, 'Calculation mismatch!');
```

### Format display:

```javascript
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

// UI Component
<div className="cash-calculation">
  <div className="row">
    <span>Modal Awal:</span>
    <span>{formatCurrency(shift.opening_balance)}</span>
  </div>
  <div className="row">
    <span>Penjualan Tunai:</span>
    <span>{formatCurrency(shift.cash_sales)}</span>
  </div>
  <div className="divider"></div>
  <div className="row total">
    <span>Expected Cash:</span>
    <span>{formatCurrency(shift.expected_cash)}</span>
  </div>

  {shift.status === 'closed' && (
    <>
      <div className="row">
        <span>Actual Cash:</span>
        <span>{formatCurrency(shift.actual_cash)}</span>
      </div>
      <div className="row difference">
        <span>Selisih:</span>
        <span className={shift.cash_difference >= 0 ? 'positive' : 'negative'}>
          {formatCurrency(shift.cash_difference)}
        </span>
      </div>
    </>
  )}
</div>
```

## ✅ Checklist

- [x] Update CashierShift Model
- [x] Update calculateExpectedTotals() method
- [x] Add accessor getCashSalesAttribute()
- [x] Add accessor getTotalExpectedCashAttribute()
- [x] Update CashierShiftController responses
- [x] Create test script
- [x] Verify calculation correctness
- [ ] Update frontend to display new fields
- [ ] Test tutup shift dengan perhitungan baru
- [ ] Verify laporan shift menampilkan breakdown dengan benar

## 🔍 Troubleshooting

### Jika expected_cash masih tidak termasuk modal awal:

1. **Clear cache**:
   ```bash
   php artisan cache:clear
   php artisan config:clear
   ```

2. **Trigger recalculate manual**:
   ```
   POST /api/v1/shifts/{shiftId}/recalculate
   ```

3. **Verify dengan script**:
   ```bash
   php test_cash_calculation.php
   ```

### Jika frontend tidak menerima field cash_sales:

Check response:
```bash
curl -X GET "http://localhost/api/v1/shifts/active" \
  -H "Authorization: Bearer {token}" \
  -H "X-Business-Id: 1" \
  -H "X-Outlet-Id: 1"
```

Expected fields:
- `opening_balance`
- `cash_sales` ✅
- `expected_cash`
- `total_expected_cash` ✅

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Check logs: `app/backend/storage/logs/laravel.log`
2. Run test: `php test_cash_calculation.php`
3. Verify database: Check `cashier_shifts.expected_cash` column
