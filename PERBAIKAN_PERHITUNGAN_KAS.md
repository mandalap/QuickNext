# 🔧 Perbaikan Perhitungan Kas - Duplikasi Modal Awal

## ❌ Masalah yang Ditemukan

User melaporkan selisih kas 100rb lebih, padahal modal awal sudah ditambahkan di atas.

**Dari gambar:**

- Modal Awal: Rp 100.000
- Penjualan Cash: Rp 209.000 (INI SALAH! Seharusnya hanya penjualan, bukan termasuk modal)
- Kas Seharusnya: Rp 309.000 (100.000 + 209.000)
- Kas Aktual: Rp 409.000
- Selisih: Rp 100.000 (Lebih)

## 🔍 Analisis Masalah

### Root Cause:

1. **Backend** sudah benar: `expected_cash = opening_balance + cash_sales`
2. **Backend API** mengirim `payment_breakdown.cash.expected = expected_cash` (sudah termasuk modal awal)
3. **Frontend** melakukan duplikasi:
   - Menggunakan `payment_breakdown.cash.expected` (yang sudah termasuk modal awal)
   - Lalu menambahkan lagi dengan `opening_balance`
   - Hasilnya: `expected = opening + expected` (duplikasi!)

### Contoh Perhitungan yang Salah:

```
Backend mengirim:
- payment_breakdown.cash.expected = 309.000 (sudah termasuk modal 100.000)

Frontend menghitung:
- expected = opening_balance + payment_breakdown.cash.expected
- expected = 100.000 + 309.000 = 409.000 ❌ SALAH!

Seharusnya:
- expected = payment_breakdown.cash.expected = 309.000 ✅ BENAR!
```

## ✅ Perbaikan yang Dilakukan

### 1. **Fix `calculateDifference()` function**

```javascript
// BEFORE (SALAH):
const cashSales = Number(shiftDetail.payment_breakdown?.выз?.expected ?? 0);
const expected = opening + cashSales; // ❌ Duplikasi!

// AFTER (BENAR):
const expected = Number(
  shiftDetail.payment_breakdown?.cash?.expected ??
    shiftDetail.shift?.expected_cash ??
    0
); // ✅ Langsung pakai expected_cash yang sudah benar
```

### 2. **Fix Display "Penjualan Cash"**

```javascript
// BEFORE (SALAH):
formatCurrency(payment_breakdown.cash.expected); // ❌ Ini termasuk modal!

// AFTER (BENAR):
formatCurrency(
  payment_breakdown.cash?.cash_sales ??
    payment_breakdown.cash.expected - opening_balance
); // ✅ Hanya penjualan cash saja
```

### 3. **Fix Display "Kas Seharusnya"**

```javascript
// BEFORE (SALAH):
formatCurrency(opening_balance + payment_breakdown.cash.expected); // ❌ Duplikasi modal awal!

// AFTER (BENAR):
formatCurrency(payment_breakdown.cash.expected); // ✅ Sudah termasuk modal awal
```

### 4. **Fix Pre-fill Expected Cash**

```javascript
// BEFORE (SALAH):
const cashSales = Number(shiftData.payment_breakdown?.cash?.expected || 0);
const initialExpectedCash = openingBalance + cashSales; // ❌ Duplikasi!

// AFTER (BENAR):
const initialExpectedCash = Number(
  shiftData.payment_breakdown?.cash?.expected ??
    shiftData.shift?.expected_cash ??
    openingBalance + (shiftData.payment_breakdown?.cash?.cash_sales ?? 0)
); // ✅ Langsung pakai expected_cash
```

## 📊 Perhitungan yang Benar Sekarang

### Dari Backend:

```
opening_balance = 100.000
cash_sales = 109.000 (dari transaksi)
expected_cash = 100.000 + 109.000 = 209.000 ✅
```

### Di Frontend (Setelah Perbaikan):

```
Penjualan Cash = cash_sales = 109.000 ✅
Kas Seharusnya = expected_cash = 209.000 ✅
Kas Aktual = 409.000 (user input)
Selisih = 409.000 - 209.000 = 200.000 (Lebih) ✅
```

## 🎯 Catatan Penting

1. **`payment_breakdown.cash.expected`** = `expected earlier` = sudah termasuk modal awal
2. **`payment_breakdown.cash.cash_sales`** = hanya penjualan cash, tanpa modal awal
3. **Jangan menambahkan modal awal dua kali!**

## ✅ Status

- ✅ Perbaikan sudah diterapkan
- ✅ Perhitungan sekarang benar
- ✅ Tidak ada duplikasi modal awal
- ✅ Display "Penjualan Cash" sudah benar
- ✅ Display "Kas Seharusnya" sudah benar

## 📝 File yang Diperbaiki

- `app/frontend/src/components/modals/CloseShiftModal.jsx`
  - Function `calculateDifference()` - Line 224-237
  - Display "Penjualan Tunai" - Line 712-720
  - Display "Kas Seharusnya" - Line 722-727
  - PDF generation "Penjualan Cash" - Line 425-434
  - Pre-fill expected cash - Line 142-150

