# Frontend Integration Guide - Shift Kasir

## 🔍 Masalah yang Dilaporkan

```
Nama Shift:              Shift Tidak Diketahui  ❌
Total Transaksi:         2 order                ✅
Tunai:                   Rp 0 (2x)              ❌
Modal Awal:              Rp 0                   ❌
Penjualan Tunai:         Rp 0                   ❌
Expected Cash:           Rp 0                   ❌
```

## ✅ Data yang Benar dari Backend

Backend **SUDAH** mengirim data dengan benar:

```json
{
  "success": true,
  "has_active_shift": true,
  "data": {
    "id": 55,
    "shift_name": "Shift Pagi",
    "opening_balance": "100000.00",
    "expected_cash": "405000.00",
    "cash_sales": 305000,
    "total_expected_cash": "405000.00",
    "total_transactions": 2,
    "cash_transactions": 2,
    "expected_card": "0.00",
    "expected_transfer": "0.00",
    "expected_qris": "0.00",
    "expected_total": "288200.00"
  }
}
```

## 🎯 Field Mapping

### Nama Shift
```javascript
// ❌ SALAH
const shiftName = data.name || "Shift Tidak Diketahui";

// ✅ BENAR
const shiftName = data.shift_name || "Shift Tidak Diketahui";
```

### Modal Awal
```javascript
// ✅ BENAR
const modalAwal = parseFloat(data.opening_balance);
```

### Penjualan Tunai
```javascript
// ❌ SALAH - Field ini tidak ada di response lama
const penjualanTunai = data.cash_total;

// ✅ BENAR - Field baru yang sudah ditambahkan
const penjualanTunai = data.cash_sales;
```

### Expected Cash
```javascript
// ✅ BENAR
const expectedCash = parseFloat(data.expected_cash);

// atau gunakan alias
const expectedCash = parseFloat(data.total_expected_cash);
```

### Cash Transactions
```javascript
// ❌ SALAH
const cashCount = data.cash_count;

// ✅ BENAR
const cashCount = data.cash_transactions;
```

## 📱 Complete Implementation Example

### React/Next.js

```typescript
interface ShiftData {
  id: number;
  shift_name: string;
  opening_balance: string;
  expected_cash: string;
  cash_sales: number;
  total_expected_cash: string;
  total_transactions: number;
  cash_transactions: number;
  card_transactions: number;
  transfer_transactions: number;
  qris_transactions: number;
  expected_card: string;
  expected_transfer: string;
  expected_qris: string;
  expected_total: string;
  actual_cash?: string;
  cash_difference?: string;
  status: 'open' | 'closed';
}

interface ApiResponse {
  success: boolean;
  has_active_shift: boolean;
  data: ShiftData;
}

// Fetch active shift
async function getActiveShift(): Promise<ShiftData | null> {
  const response = await fetch('/api/v1/shifts/active', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Business-Id': businessId,
      'X-Outlet-Id': outletId,
    }
  });

  const result: ApiResponse = await response.json();

  if (result.success && result.has_active_shift) {
    return result.data;
  }

  return null;
}

// Display component
function ShiftSummary({ shift }: { shift: ShiftData }) {
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="shift-summary">
      {/* Nama Shift */}
      <h2>{shift.shift_name || 'Shift Tidak Diketahui'}</h2>

      {/* Total Transaksi */}
      <div className="stat">
        <label>Total Transaksi:</label>
        <value>{shift.total_transactions} order</value>
      </div>

      {/* Ringkasan Transaksi */}
      <div className="payment-summary">
        <h3>Ringkasan Transaksi (Expected)</h3>

        <div className="payment-row">
          <label>Tunai:</label>
          <value>
            {formatCurrency(shift.expected_cash)}
            ({shift.cash_transactions}x)
          </value>
        </div>

        <div className="payment-row">
          <label>Kartu:</label>
          <value>
            {formatCurrency(shift.expected_card)}
            ({shift.card_transactions}x)
          </value>
        </div>

        <div className="payment-row">
          <label>Transfer:</label>
          <value>
            {formatCurrency(shift.expected_transfer)}
            ({shift.transfer_transactions}x)
          </value>
        </div>

        <div className="payment-row">
          <label>QRIS:</label>
          <value>
            {formatCurrency(shift.expected_qris)}
            ({shift.qris_transactions}x)
          </value>
        </div>

        <div className="payment-row total">
          <label>Total Penjualan:</label>
          <value>{formatCurrency(shift.expected_total)}</value>
        </div>
      </div>

      {/* Perhitungan Kas */}
      <div className="cash-calculation">
        <h3>Perhitungan Kas</h3>

        <div className="cash-row">
          <label>Modal Awal:</label>
          <value>{formatCurrency(shift.opening_balance)}</value>
        </div>

        <div className="cash-row">
          <label>Penjualan Tunai:</label>
          <value>{formatCurrency(shift.cash_sales)}</value>
        </div>

        <div className="divider"></div>

        <div className="cash-row total">
          <label>Expected Cash:</label>
          <value>{formatCurrency(shift.expected_cash)}</value>
        </div>

        {shift.status === 'closed' && (
          <>
            <div className="cash-row">
              <label>Actual Cash:</label>
              <value>{formatCurrency(shift.actual_cash || 0)}</value>
            </div>

            <div className={`cash-row difference ${
              parseFloat(shift.cash_difference || '0') >= 0 ? 'positive' : 'negative'
            }`}>
              <label>Selisih:</label>
              <value>{formatCurrency(shift.cash_difference || 0)}</value>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

### Vue.js

```vue
<template>
  <div class="shift-summary">
    <!-- Nama Shift -->
    <h2>{{ shift.shift_name || 'Shift Tidak Diketahui' }}</h2>

    <!-- Total Transaksi -->
    <div class="stat">
      <label>Total Transaksi:</label>
      <span>{{ shift.total_transactions }} order</span>
    </div>

    <!-- Perhitungan Kas -->
    <div class="cash-calculation">
      <h3>Perhitungan Kas</h3>

      <div class="cash-row">
        <label>Modal Awal:</label>
        <span>{{ formatCurrency(shift.opening_balance) }}</span>
      </div>

      <div class="cash-row">
        <label>Penjualan Tunai:</label>
        <span>{{ formatCurrency(shift.cash_sales) }}</span>
      </div>

      <div class="divider"></div>

      <div class="cash-row total">
        <label>Expected Cash:</label>
        <span>{{ formatCurrency(shift.expected_cash) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface ShiftData {
  id: number;
  shift_name: string;
  opening_balance: string;
  expected_cash: string;
  cash_sales: number;
  total_transactions: number;
  cash_transactions: number;
  // ... other fields
}

const shift = ref<ShiftData | null>(null);

const formatCurrency = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(num);
};

const fetchActiveShift = async () => {
  const response = await fetch('/api/v1/shifts/active', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Business-Id': businessId,
      'X-Outlet-Id': outletId,
    }
  });

  const result = await response.json();

  if (result.success && result.has_active_shift) {
    shift.value = result.data;
  }
};

onMounted(() => {
  fetchActiveShift();
});
</script>
```

### Vanilla JavaScript

```javascript
// Fetch active shift
async function getActiveShift() {
  try {
    const response = await fetch('/api/v1/shifts/active', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Business-Id': localStorage.getItem('businessId'),
        'X-Outlet-Id': localStorage.getItem('outletId'),
      }
    });

    const result = await response.json();

    if (result.success && result.has_active_shift) {
      displayShiftData(result.data);
    } else {
      displayNoShift();
    }
  } catch (error) {
    console.error('Failed to fetch shift:', error);
  }
}

// Display shift data
function displayShiftData(shift) {
  // Helper function
  const formatCurrency = (value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  // Update DOM
  document.getElementById('shift-name').textContent =
    shift.shift_name || 'Shift Tidak Diketahui';

  document.getElementById('total-transactions').textContent =
    `${shift.total_transactions} order`;

  document.getElementById('cash-count').textContent =
    `${shift.cash_transactions}x`;

  document.getElementById('opening-balance').textContent =
    formatCurrency(shift.opening_balance);

  document.getElementById('cash-sales').textContent =
    formatCurrency(shift.cash_sales);

  document.getElementById('expected-cash').textContent =
    formatCurrency(shift.expected_cash);

  // Payment breakdown
  document.getElementById('cash-amount').textContent =
    `${formatCurrency(shift.expected_cash)} (${shift.cash_transactions}x)`;

  document.getElementById('card-amount').textContent =
    `${formatCurrency(shift.expected_card)} (${shift.card_transactions}x)`;

  document.getElementById('transfer-amount').textContent =
    `${formatCurrency(shift.expected_transfer)} (${shift.transfer_transactions}x)`;

  document.getElementById('qris-amount').textContent =
    `${formatCurrency(shift.expected_qris)} (${shift.qris_transactions}x)`;

  document.getElementById('total-revenue').textContent =
    formatCurrency(shift.expected_total);
}

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
  getActiveShift();

  // Refresh every 30 seconds
  setInterval(getActiveShift, 30000);
});
```

## 🔧 Troubleshooting

### 1. Data masih tampil "Shift Tidak Diketahui"

**Check:**
```javascript
console.log('Shift data:', shift);
console.log('Shift name:', shift.shift_name);
```

**Penyebab:**
- Menggunakan field `name` instead of `shift_name`
- Data tidak di-refresh setelah update

**Solusi:**
```javascript
// Gunakan field yang benar
const shiftName = shift.shift_name;

// atau dengan fallback
const shiftName = shift.shift_name || shift.name || 'Shift Tidak Diketahui';
```

### 2. Semua nilai masih Rp 0

**Check:**
```javascript
console.log('Raw response:', response);
console.log('Expected cash:', shift.expected_cash);
console.log('Cash sales:', shift.cash_sales);
console.log('Opening balance:', shift.opening_balance);
```

**Penyebab:**
- Cache di browser/frontend
- Menggunakan field lama yang deprecated
- Data type conversion error

**Solusi:**
```javascript
// Clear cache dan reload
localStorage.clear();
sessionStorage.clear();
location.reload(true);

// Atau force refresh API call
const response = await fetch('/api/v1/shifts/active', {
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Parse number correctly
const expectedCash = parseFloat(shift.expected_cash);
const cashSales = typeof shift.cash_sales === 'number'
  ? shift.cash_sales
  : parseFloat(shift.cash_sales);
```

### 3. Backend sudah fix tapi frontend masih error

**Steps:**
1. **Clear browser cache**: Ctrl+Shift+Del
2. **Hard reload**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. **Check network tab**: Verify API response
4. **Restart dev server**: If using webpack/vite dev server

## 🎨 UI Mockup

```
╔════════════════════════════════════════╗
║  Shift Pagi                     [Open] ║
╠════════════════════════════════════════╣
║  Total Transaksi: 2 order              ║
╠════════════════════════════════════════╣
║  RINGKASAN TRANSAKSI (EXPECTED)        ║
║  • Tunai:     Rp 405.000 (2x)          ║
║  • Kartu:     Rp       0 (0x)          ║
║  • Transfer:  Rp       0 (0x)          ║
║  • QRIS:      Rp       0 (0x)          ║
║  ────────────────────────────────────  ║
║  Total Penjualan: Rp 288.200           ║
╠════════════════════════════════════════╣
║  PERHITUNGAN KAS                       ║
║  Modal Awal:      Rp 100.000           ║
║  Penjualan Tunai: Rp 305.000           ║
║  ────────────────────────────────────  ║
║  Expected Cash:   Rp 405.000           ║
╚════════════════════════════════════════╝
```

## ✅ Checklist Integration

- [ ] Update field dari `name` ke `shift_name`
- [ ] Update field dari `cash_total` ke `cash_sales`
- [ ] Update field dari `cash_count` ke `cash_transactions`
- [ ] Parse `opening_balance` dengan benar
- [ ] Parse `expected_cash` dengan benar
- [ ] Clear cache browser
- [ ] Hard reload aplikasi
- [ ] Test dengan shift baru
- [ ] Verify semua data tampil dengan benar
- [ ] Test tutup shift dan cek laporan

## 📞 Need Help?

Jika masih ada masalah:
1. Check browser console untuk error
2. Check network tab untuk verify API response
3. Run backend test: `php test_api_response.php`
4. Compare expected vs actual response
