# 📊 Penjelasan Perhitungan Keuangan

## 1. Total Pendapatan (Income)

**Cara Perhitungan:**
- Menghitung semua order yang **dibayar** dalam rentang tanggal
- Menggunakan **waktu pembayaran** (`paid_at` dari payments table), bukan waktu order dibuat
- Status payment: `success`, `paid`, `settlement`, `capture`

**Contoh:**
- Order dibuat kemarin, dibayar hari ini → **TERHITUNG** hari ini ✅
- Order dibuat hari ini, dibayar hari ini → **TERHITUNG** hari ini ✅
- Order dibuat hari ini, belum dibayar → **TIDAK TERHITUNG** ❌

**Query:**
```sql
SELECT SUM(total) FROM orders
WHERE payment_status = 'paid'
AND (
  created_at BETWEEN start AND end OR
  updated_at BETWEEN start AND end OR
  EXISTS (
    SELECT 1 FROM payments
    WHERE payments.order_id = orders.id
    AND payments.status IN ('success', 'paid', 'settlement', 'capture')
    AND COALESCE(payments.paid_at, payments.created_at) BETWEEN start AND end
  )
)
```

---

## 2. Total Pengeluaran (Expense)

**Cara Perhitungan:**
- Menghitung semua expense yang dibuat dalam rentang tanggal
- Menggunakan `expense_date` dari tabel `expenses`

**Query:**
```sql
SELECT SUM(amount) FROM expenses
WHERE expense_date BETWEEN start AND end
```

---

## 3. Laba Bersih (Net Income / Profit)

**Cara Perhitungan:**
```
Laba Bersih = Total Pendapatan - Total Pengeluaran
```

**Contoh:**
- Total Pendapatan: Rp 1.000.000
- Total Pengeluaran: Rp 200.000
- **Laba Bersih: Rp 800.000**

---

## 4. Saldo Kas (Cash Balance)

**Cara Perhitungan:**
```
Saldo Kas = Base Cash - Cash Expenses
```

### Base Cash:
1. **Jika ada shift yang ditutup:**
   - Base Cash = `actual_cash` dari shift terakhir yang ditutup
   
2. **Jika ada shift yang masih terbuka:**
   - Tambahkan cash sales dari shift terbuka
   - Cash Sales = `expected_cash - opening_balance`
   - Jika tidak ada shift closed, Base Cash = `opening_balance + cash_sales`

### Cash Expenses:
- Semua pengeluaran dengan `payment_method = 'cash'` atau `NULL`
- Setelah tanggal shift terakhir ditutup (atau shift terbuka)

**Contoh:**
```
Shift terakhir ditutup:
  - Actual cash: Rp 500.000

Shift terbuka:
  - Opening balance: Rp 100.000
  - Expected cash: Rp 350.000
  - Cash sales: Rp 250.000

Cash expenses setelah shift: Rp 50.000

Base Cash = 500.000 + 250.000 = 750.000
Saldo Kas = 750.000 - 50.000 = 700.000
```

**⚠️ PENTING:**
- Saldo Kas **HANYA** menghitung uang **cash fisik** di kasir
- **TIDAK** termasuk:
  - Card (kartu debit/kredit)
  - Transfer bank
  - QRIS/Midtrans
  - E-wallet lainnya

**Kenapa hanya cash?**
- Saldo Kas menunjukkan uang fisik yang ada di laci kasir
- Uang dari card/transfer/QRIS masuk ke rekening bank, bukan ke kasir

---

## 5. Total Profit vs Laba Bersih

**Total Profit** di halaman Keuangan = **Laba Bersih (Net Income)**

**Rumus:**
```
Total Profit = Total Pendapatan - Total Pengeluaran
```

**Catatan:**
- Total Profit bisa negatif jika pengeluaran lebih besar dari pendapatan
- Total Profit tidak sama dengan Saldo Kas (karena Saldo Kas hanya cash)

---

## 🔍 Troubleshooting

### Masalah: Total Pendapatan hanya sedikit

**Penyebab:**
1. Order belum dibayar (masih `pending`)
2. Payment status belum `paid`/`success`
3. Waktu pembayaran tidak dalam rentang tanggal yang dipilih

**Solusi:**
1. Cek status payment order
2. Pastikan order sudah dibayar
3. Cek `paid_at` di tabel `payments`

### Masalah: Saldo Kas hanya sedikit

**Penyebab:**
1. Tidak ada shift yang ditutup
2. Shift belum di-close dengan benar
3. Banyak pengeluaran cash
4. Hanya menghitung cash, tidak termasuk card/transfer/QRIS

**Solusi:**
1. Pastikan shift sudah ditutup dengan benar
2. Cek `actual_cash` di shift terakhir
3. Cek pengeluaran cash setelah shift
4. Ingat: Saldo Kas hanya cash fisik, bukan semua pendapatan

### Masalah: Laba Bersih tidak sesuai

**Penyebab:**
1. Total Pendapatan salah
2. Total Pengeluaran salah
3. Rentang tanggal tidak sesuai

**Solusi:**
1. Cek perhitungan Total Pendapatan
2. Cek perhitungan Total Pengeluaran
3. Pastikan rentang tanggal benar

---

## 📝 Catatan Penting

1. **Total Pendapatan** = Semua uang yang masuk (cash + card + transfer + QRIS)
2. **Saldo Kas** = Hanya uang cash fisik di kasir
3. **Laba Bersih** = Pendapatan - Pengeluaran (semua metode pembayaran)
4. **Total Profit** = Sama dengan Laba Bersih

---

**Last Updated:** 2025-11-13





















