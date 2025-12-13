# 📋 Penjelasan Sistem Pajak di QuickKasir

## 🔍 **Masalah yang Ditemukan**

Di halaman **Laporan > Penjualan Produk**, ada perbedaan antara:
- **Total Revenue**: Rp 68.000 (subtotal produk, sebelum pajak)
- **Total yang Dibayar**: Rp 74.000 (termasuk pajak)

**Selisih Rp 6.000 adalah pajak yang dikenakan.**

---

## 💡 **Bagaimana Sistem Pajak Bekerja**

### 1. **Pajak Otomatis Terpisah** ✅

Sistem pajak di QuickKasir **OTOMATIS terpisah** dan **TIDAK perlu ditambahkan manual**. Berikut cara kerjanya:

#### A. **Saat Membuat Order (POS)**
1. Sistem menghitung **subtotal** dari semua produk
2. Sistem mengambil **tax rate** dari:
   - Outlet settings (`outlet.tax_rate`) - jika ada
   - Business settings (`business.tax_rate`) - jika outlet tidak punya
3. Sistem menghitung **tax_amount** = subtotal × tax_rate
4. Sistem menghitung **total** = subtotal + tax_amount - discount

#### B. **Data Disimpan Terpisah di Database**
```sql
orders table:
- subtotal: 68000 (harga produk sebelum pajak)
- tax_amount: 6000 (pajak yang dikenakan)
- discount_amount: 0 (diskon jika ada)
- total: 74000 (total yang dibayar customer)
```

### 2. **Dimana Pajak Ditampilkan?**

#### A. **Laporan Penjualan Produk** (Baru Ditambahkan)
Sekarang menampilkan:
- ✅ **Total Revenue**: Rp 68.000 (subtotal produk, sebelum pajak)
- ✅ **Total Pajak**: Rp 6.000 (pajak yang dikenakan)
- ✅ **Total Dibayar**: Rp 74.000 (total yang dibayar customer)

#### B. **Laporan Pajak Terpisah**
Menu: **Laporan > Laporan Pajak** (`/reports?category=tax`)

Laporan ini menampilkan:
- Daftar semua pajak yang harus dibayar
- Periode pajak (bulanan)
- Status pembayaran (pending, paid, overdue)
- Detail per jenis pajak (PPN, PPh, dll)

#### C. **Halaman Keuangan**
Menu: **Keuangan > Pajak**

Fitur:
- Manajemen pajak
- Tambah/edit pajak manual
- Mark pajak sebagai sudah dibayar
- Tracking jatuh tempo

---

## 📊 **Struktur Data Pajak**

### 1. **Order Level (Per Transaksi)**
Setiap order menyimpan:
- `subtotal`: Harga produk sebelum pajak
- `tax_amount`: Pajak yang dikenakan pada order ini
- `total`: Total yang dibayar (subtotal + tax - discount)

### 2. **Tax Table (Laporan Pajak)**
Table `taxes` untuk tracking pajak yang harus dibayar:
- `type`: Jenis pajak (PPN, PPh 21, PPh 23, dll)
- `rate`: Tarif pajak (%)
- `base`: Dasar pengenaan pajak
- `amount`: Jumlah pajak yang harus dibayar
- `period`: Periode (bulanan)
- `status`: Status pembayaran (pending, paid, overdue)

---

## 🔧 **Cara Kerja Sistem**

### **Flow Pajak:**

```
1. Customer Order Produk
   ↓
2. Sistem Hitung Subtotal (harga produk)
   ↓
3. Sistem Ambil Tax Rate dari Outlet/Business
   ↓
4. Sistem Hitung Tax Amount = Subtotal × Tax Rate
   ↓
5. Sistem Hitung Total = Subtotal + Tax - Discount
   ↓
6. Data Disimpan:
   - subtotal: 68000
   - tax_amount: 6000
   - total: 74000
   ↓
7. Pajak Otomatis Terpisah ✅
```

### **Laporan:**

```
Laporan Penjualan Produk:
- Total Revenue: 68000 (subtotal)
- Total Pajak: 6000 (tax_amount)
- Total Dibayar: 74000 (total)

Laporan Pajak:
- Menampilkan semua tax_amount yang terkumpul
- Dikelompokkan per periode (bulanan)
- Untuk keperluan pembayaran pajak ke pemerintah
```

---

## ✅ **Kesimpulan**

1. **Pajak OTOMATIS terpisah** - Tidak perlu ditambahkan manual
2. **Data tersimpan terpisah** - `subtotal` dan `tax_amount` disimpan terpisah
3. **Laporan terpisah** - Ada laporan khusus untuk pajak di menu Laporan > Laporan Pajak
4. **Total Revenue** di laporan produk = subtotal (sebelum pajak)
5. **Total Dibayar** = subtotal + tax - discount

---

## 📝 **Catatan Penting**

- **Total Revenue** di laporan produk = **Subtotal produk** (sebelum pajak)
- **Total Pajak** = Jumlah semua `tax_amount` dari orders
- **Total Dibayar** = Jumlah semua `total` dari orders
- Pajak **otomatis dihitung** berdasarkan `tax_rate` yang diset di Outlet/Business settings
- Untuk melihat detail pajak, gunakan menu **Laporan > Laporan Pajak**

---

**Last Updated:** 2025-01-XX

