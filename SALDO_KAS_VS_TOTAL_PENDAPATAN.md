# 💰 Penjelasan: Saldo Kas vs Total Pendapatan

## ❓ Pertanyaan

**Kenapa Saldo Kas hanya Rp 265.000 padahal Total Pendapatan Rp 535.700 dan tidak ada pengeluaran?**

## ✅ Jawaban

**Saldo Kas ≠ Total Pendapatan**

### 1. Saldo Kas (Cash Balance)

**Apa itu:**
- Uang **cash fisik** yang ada di laci kasir
- Hanya menghitung pembayaran dengan metode **CASH**
- Diambil dari shift yang ditutup

**Cara Perhitungan:**
```
Saldo Kas = Base Cash - Cash Expenses

Base Cash:
- actual_cash dari shift terakhir yang ditutup
+ cash sales dari shift terbuka (jika ada)

Cash Expenses:
- Pengeluaran dengan payment_method = 'cash'
```

**TIDAK termasuk:**
- ❌ Card (kartu debit/kredit)
- ❌ Transfer bank
- ❌ QRIS/Midtrans
- ❌ E-wallet lainnya

**Kenapa?**
- Uang dari card/transfer/QRIS masuk ke **rekening bank**, bukan ke laci kasir
- Saldo Kas menunjukkan uang **fisik** yang bisa diambil dari kasir

---

### 2. Total Pendapatan (Total Revenue)

**Apa itu:**
- Semua uang yang masuk dari penjualan
- Termasuk **semua metode pembayaran**: cash, card, transfer, QRIS

**Cara Perhitungan:**
```
Total Pendapatan = 
  Cash + Card + Transfer + QRIS + Other
```

---

## 📊 Contoh Kasus

**Total Pendapatan: Rp 535.700**
- Cash: Rp 265.000 ✅ (masuk ke kasir)
- Card: Rp 150.000 ❌ (masuk ke rekening bank)
- Transfer: Rp 50.000 ❌ (masuk ke rekening bank)
- QRIS: Rp 70.700 ❌ (masuk ke rekening bank)

**Saldo Kas: Rp 265.000**
- Hanya cash yang masuk ke kasir
- Card/transfer/QRIS tidak masuk ke kasir

**Kesimpulan:**
- Saldo Kas = Rp 265.000 (hanya cash)
- Total Pendapatan = Rp 535.700 (semua metode)
- **Selisih Rp 270.700 adalah pendapatan non-cash yang masuk ke rekening bank**

---

## 🔍 Cara Cek

### 1. Cek Breakdown Pendapatan

Jalankan script:
```bash
cd app/backend
php check_cash_balance.php [business_id] [outlet_id] [start_date] [end_date]
```

Script akan menampilkan:
- Total Pendapatan by payment method
- Cash vs Non-cash breakdown
- Saldo Kas dari shift
- Perbandingan

### 2. Cek di Database

```sql
-- Total pendapatan by payment method
SELECT 
    payment_method,
    SUM(amount) as total
FROM payments
JOIN orders ON payments.order_id = orders.id
WHERE orders.business_id = 1
  AND payments.status IN ('success', 'paid', 'settlement', 'capture')
  AND DATE(COALESCE(payments.paid_at, payments.created_at)) BETWEEN '2025-09-01' AND '2025-11-13'
GROUP BY payment_method;
```

---

## ⚠️ Kesalahan Umum

### ❌ SALAH:
```
Saldo Kas = Total Pendapatan
```

### ✅ BENAR:
```
Saldo Kas = Total Pendapatan (CASH ONLY)
Total Pendapatan = Cash + Card + Transfer + QRIS
```

---

## 💡 Kapan Saldo Kas = Total Pendapatan?

**Hanya jika:**
1. **Semua pembayaran adalah CASH**
2. Tidak ada card, transfer, QRIS
3. Tidak ada pengeluaran cash

**Contoh:**
- Total Pendapatan: Rp 100.000 (semua cash)
- Pengeluaran: Rp 0
- **Saldo Kas: Rp 100.000** ✅

---

## 🔧 Jika Ingin Saldo Kas = Total Pendapatan

**Tidak mungkin** jika ada pembayaran non-cash, karena:
- Card/transfer/QRIS masuk ke rekening bank
- Bukan uang fisik di kasir

**Solusi:**
1. **Terima saja** bahwa Saldo Kas hanya cash
2. **Cek rekening bank** untuk pendapatan non-cash
3. **Total Pendapatan** sudah benar (termasuk semua metode)

---

## 📝 Kesimpulan

1. **Saldo Kas (Rp 265.000)** = Uang cash fisik di kasir
2. **Total Pendapatan (Rp 535.700)** = Semua uang yang masuk (cash + non-cash)
3. **Selisih (Rp 270.700)** = Pendapatan non-cash yang masuk ke rekening bank
4. **Ini NORMAL** jika ada pembayaran dengan card/transfer/QRIS

**Tidak ada masalah!** Saldo Kas memang hanya menghitung cash, bukan semua pendapatan.

---

**Last Updated:** 2025-11-13





















