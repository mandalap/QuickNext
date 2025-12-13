# Contoh Perhitungan Kas Lengkap

## Skenario 1: Shift dengan Modal Awal Rp 100.000

### 1. Buka Shift
```
Modal Awal (Opening Balance): Rp 100.000
```

### 2. Transaksi Hari Ini

**Transaksi 1**: Order #001
- 2x Nasi Goreng @ Rp 25.000 = Rp 50.000
- Payment: Cash Rp 50.000

**Transaksi 2**: Order #002
- 1x Es Teh @ Rp 5.000 = Rp 5.000
- Payment: Cash Rp 10.000 (kembalian Rp 5.000)

**Transaksi 3**: Order #003
- 1x Ayam Bakar @ Rp 35.000 = Rp 35.000
- Payment: Card Rp 35.000

**Transaksi 4**: Order #004
- 3x Kopi @ Rp 10.000 = Rp 30.000
- Payment: QRIS Rp 30.000

**Transaksi 5**: Order #005
- 2x Mie Goreng @ Rp 20.000 = Rp 40.000
- Payment: Cash Rp 50.000 (kembalian Rp 10.000)

**Transaksi 6**: Order #006
- 1x Nasi Uduk @ Rp 15.000 = Rp 15.000
- 1x Es Jeruk @ Rp 8.000 = Rp 8.000
- Total: Rp 23.000
- Payment: Transfer Rp 23.000

**Transaksi 7**: Order #007
- 5x Bakso @ Rp 18.000 = Rp 90.000
- Payment: Cash Rp 100.000 (kembalian Rp 10.000)

### 3. Perhitungan Expected Totals

#### Penjualan per Payment Method:
```
Cash Transactions:
- Order #001: Rp  50.000
- Order #002: Rp   5.000 (dibayar Rp 10.000, kembalian Rp 5.000)
- Order #005: Rp  40.000 (dibayar Rp 50.000, kembalian Rp 10.000)
- Order #007: Rp  90.000 (dibayar Rp 100.000, kembalian Rp 10.000)
──────────────────────────
Total Cash Sales: Rp 185.000

Card Transactions:
- Order #003: Rp  35.000
──────────────────────────
Total Card: Rp 35.000

Transfer Transactions:
- Order #006: Rp  23.000
──────────────────────────
Total Transfer: Rp 23.000

QRIS Transactions:
- Order #004: Rp  30.000
──────────────────────────
Total QRIS: Rp 30.000
```

#### Expected Cash:
```
Modal Awal:      Rp 100.000
Penjualan Tunai: Rp 185.000
────────────────────────────
Expected Cash:   Rp 285.000
```

#### Total Revenue:
```
Cash Sales:    Rp 185.000
Card:          Rp  35.000
Transfer:      Rp  23.000
QRIS:          Rp  30.000
────────────────────────────
Total Revenue: Rp 273.000
```

### 4. Tutup Shift

Kasir menghitung uang tunai di laci:
```
Actual Cash Count: Rp 290.000
```

#### Perhitungan Selisih:
```
Expected Cash:     Rp 285.000
Actual Cash:       Rp 290.000
────────────────────────────
Cash Difference:   Rp   5.000 ✅ (Lebih)
```

### 5. Laporan Penutupan Shift

```
╔═══════════════════════════════════════════╗
║        LAPORAN PENUTUPAN SHIFT            ║
╠═══════════════════════════════════════════╣
║ Shift ID: #55                             ║
║ Kasir: John Doe                           ║
║ Opened: 2025-10-22 08:00:00               ║
║ Closed: 2025-10-22 17:00:00               ║
║ Duration: 9 jam                           ║
╠═══════════════════════════════════════════╣
║ TRANSAKSI                                 ║
╠═══════════════════════════════════════════╣
║ Total Orders:           7                 ║
║ Cash Transactions:      4                 ║
║ Card Transactions:      1                 ║
║ Transfer Transactions:  1                 ║
║ QRIS Transactions:      1                 ║
╠═══════════════════════════════════════════╣
║ PENJUALAN                                 ║
╠═══════════════════════════════════════════╣
║ Cash Sales:       Rp     185.000          ║
║ Card Sales:       Rp      35.000          ║
║ Transfer Sales:   Rp      23.000          ║
║ QRIS Sales:       Rp      30.000          ║
║ ─────────────────────────────────────     ║
║ Total Revenue:    Rp     273.000          ║
╠═══════════════════════════════════════════╣
║ PERHITUNGAN KAS                           ║
╠═══════════════════════════════════════════╣
║ Modal Awal:       Rp     100.000          ║
║ Penjualan Tunai:  Rp     185.000          ║
║ ─────────────────────────────────────     ║
║ Expected Cash:    Rp     285.000          ║
║ Actual Cash:      Rp     290.000          ║
║ ─────────────────────────────────────     ║
║ Selisih:          Rp       5.000 ✅       ║
║                   (Lebih Rp 5.000)        ║
╠═══════════════════════════════════════════╣
║ NON-CASH PAYMENTS                         ║
╠═══════════════════════════════════════════╣
║ Card:             Rp      35.000          ║
║ Transfer:         Rp      23.000          ║
║ QRIS:             Rp      30.000          ║
║ ─────────────────────────────────────     ║
║ Total Non-Cash:   Rp      88.000          ║
╠═══════════════════════════════════════════╣
║ TOTAL KESELURUHAN                         ║
╠═══════════════════════════════════════════╣
║ Expected Total:   Rp     373.000          ║
║                   (Expected Cash + Non-Cash)
║ Actual Total:     Rp     378.000          ║
║                   (Actual Cash + Non-Cash)
║ Total Difference: Rp       5.000 ✅       ║
╚═══════════════════════════════════════════╝
```

---

## Skenario 2: Shift dengan Selisih Kurang

### Setup:
```
Modal Awal:      Rp 150.000
Penjualan Tunai: Rp 420.000
Expected Cash:   Rp 570.000
```

### Tutup Shift:
```
Actual Cash Count: Rp 565.000
```

### Perhitungan:
```
Expected Cash:     Rp 570.000
Actual Cash:       Rp 565.000
────────────────────────────
Cash Difference:   Rp  -5.000 ❌ (Kurang)
```

### Interpretation:
- ❌ Ada kekurangan Rp 5.000
- Kemungkinan penyebab:
  1. Salah hitung kembalian
  2. Uang hilang/dicuri
  3. Transaksi tidak tercatat
  4. Kesalahan input

---

## Skenario 3: Shift Tanpa Modal Awal

### Setup:
```
Modal Awal:      Rp       0
Penjualan Tunai: Rp 125.000
Expected Cash:   Rp 125.000
```

### Tutup Shift:
```
Actual Cash Count: Rp 125.000
```

### Perhitungan:
```
Expected Cash:     Rp 125.000
Actual Cash:       Rp 125.000
────────────────────────────
Cash Difference:   Rp       0 ✅ (Pas)
```

---

## Formula Lengkap

### 1. Expected Cash
```
Expected Cash = Opening Balance + Cash Sales

Dimana:
- Opening Balance = Modal awal saat buka shift
- Cash Sales = Total payment dengan method "cash"
```

### 2. Cash Difference
```
Cash Difference = Actual Cash - Expected Cash

Interpretasi:
- Positif (+) = Uang lebih dari yang seharusnya
- Nol (0)     = Pas, tidak ada selisih
- Negatif (-) = Uang kurang dari yang seharusnya
```

### 3. Total Expected
```
Total Expected = Expected Cash + Expected Card + Expected Transfer + Expected QRIS

atau

Total Expected = Total Revenue (semua payment methods)
```

### 4. Total Actual
```
Total Actual = Actual Cash + Expected Card + Expected Transfer + Expected QRIS

Catatan:
- Card, Transfer, QRIS tidak perlu dihitung actual karena sudah pasti sesuai sistem
- Hanya Cash yang perlu dihitung manual (Actual Cash)
```

### 5. Total Difference
```
Total Difference = Total Actual - Total Expected
                 = Actual Cash - Expected Cash
                 = Cash Difference

(Karena non-cash payments selalu match)
```

---

## Checklist Tutup Shift

### ✅ Sebelum Tutup Shift:
- [ ] Pastikan semua transaksi sudah diinput
- [ ] Cek tidak ada order pending yang belum dibayar
- [ ] Verifikasi tidak ada order yang perlu dibatalkan/refund
- [ ] Pastikan semua pembayaran split/partial sudah completed

### ✅ Saat Menghitung Kas:
- [ ] Hitung semua uang kertas
- [ ] Hitung semua uang koin
- [ ] Pisahkan modal awal (jika diketahui jumlahnya)
- [ ] Catat jumlah total di laci (Actual Cash)

### ✅ Input Tutup Shift:
- [ ] Masukkan jumlah Actual Cash yang dihitung
- [ ] Tambahkan catatan jika ada selisih signifikan
- [ ] Review laporan sebelum confirm
- [ ] Simpan/print laporan untuk arsip

### ✅ Analisa Selisih:
- [ ] Jika selisih > Rp 10.000: Investigasi wajib
- [ ] Jika selisih ± Rp 1.000-10.000: Catat di notes
- [ ] Jika selisih = Rp 0: Perfect! ✅
- [ ] Jika sering selisih: Training ulang kasir

---

## Tips Menghindari Selisih

1. **Selalu beri kembalian yang tepat**
   - Gunakan kalkulator jika perlu
   - Hitung kembalian 2x sebelum diserahkan

2. **Catat transaksi segera**
   - Jangan tunda input ke sistem
   - Hindari transaksi manual/offline

3. **Organisir uang di laci**
   - Pisahkan per denominasi
   - Rapikan berkala

4. **Jangan campur uang pribadi**
   - Modal awal terpisah
   - Uang kasir pribadi di tempat lain

5. **Double check sebelum tutup shift**
   - Review semua transaksi
   - Hitung ulang jika ada keraguan

---

## Format JSON Response API

```json
{
  "success": true,
  "data": {
    "shift": {
      "id": 55,
      "status": "closed",
      "opened_at": "2025-10-22 08:00:00",
      "closed_at": "2025-10-22 17:00:00"
    },
    "summary": {
      "duration": "9 jam",
      "total_transactions": 7,
      "total_revenue": 273000
    },
    "payment_breakdown": {
      "cash": {
        "transactions": 4,
        "opening_balance": 100000,
        "cash_sales": 185000,
        "expected_total": 285000,
        "actual": 290000,
        "difference": 5000
      },
      "card": {
        "transactions": 1,
        "amount": 35000
      },
      "transfer": {
        "transactions": 1,
        "amount": 23000
      },
      "qris": {
        "transactions": 1,
        "amount": 30000
      }
    }
  }
}
```
