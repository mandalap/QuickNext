# Perbaikan Error: Data Truncated for Column 'status'

## 🐛 Masalah

Saat membuat order dengan fitur "Bayar Nanti" (deferred payment) untuk laundry, terjadi error:

```
SQLSTATE[01000]: Warning: 1265 Data truncated for column 'status' at row 1
```

**Penyebab:**

- Kolom `status` di tabel `orders` menggunakan ENUM dengan nilai: `['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']`
- Fitur deferred payment laundry menggunakan status `'received'` yang tidak ada di ENUM
- Backend mencoba menyimpan nilai `'received'` ke kolom `status` yang tidak mendukungnya

---

## ✅ Solusi yang Diimplementasikan

### 1. **Migration untuk Menambah Laundry Status**

**File**: `app/backend/database/migrations/2025_11_01_170000_add_laundry_status_to_orders_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add laundry-specific order statuses to the enum
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'received', 'washing', 'ironing', 'picked_up') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        // Remove laundry-specific order statuses from the enum
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'pending'");
    }
};
```

**Perubahan:**

- ✅ Menambah status laundry: `'received'`, `'washing'`, `'ironing'`, `'picked_up'` ke ENUM
- ✅ Status yang ditambahkan sesuai dengan `order_statuses` di BusinessTypeSeeder untuk laundry

### 2. **Status yang Ditambahkan**

- `'received'` - Order diterima (untuk deferred payment laundry)
- `'washing'` - Sedang dicuci
- `'ironing'` - Sedang disetrika
- `'picked_up'` - Sudah diambil

### 3. **Status Order per Business Type**

#### Restaurant:

- `pending` → `confirmed` → `preparing` → `ready` → `completed`

#### Laundry:

- `received` → `washing` → `ironing` → `ready` → `completed` → `picked_up`

#### Retail:

- `pending` → `confirmed` → `completed`

---

## 📊 Daftar Status Order

### Status Umum (Semua Business Type):

- `pending` - Menunggu konfirmasi
- `confirmed` - Dikonfirmasi
- `preparing` - Sedang disiapkan
- `ready` - Siap diambil
- `completed` - Selesai
- `cancelled` - Dibatalkan

### Status Khusus Laundry:

- `received` - Order diterima (untuk deferred payment)
- `washing` - Sedang dicuci
- `ironing` - Sedang disetrika
- `picked_up` - Sudah diambil

---

## 🧪 Testing

### Test Case 1: Deferred Payment Laundry

1. Login sebagai kasir dengan business type "laundry"
2. Pilih produk dan tambah ke cart
3. Klik "Bayar" → Pilih "Bayar Nanti"
4. Klik "Buat Order"
5. ✅ Order berhasil dibuat dengan status `'received'`
6. ✅ Tidak ada error "Data truncated for column 'status'"

### Test Case 2: Status Update Laundry

1. Buka tab "Belum Dibayar"
2. Pilih order dengan status `'received'`
3. Update status ke `'washing'`
4. ✅ Status berhasil diupdate
5. Update status ke `'ironing'`
6. ✅ Status berhasil diupdate
7. Update status ke `'ready'`
8. ✅ Status berhasil diupdate

### Test Case 3: Status Update Non-Laundry

1. Login dengan business type "restaurant"
2. Buat order baru
3. ✅ Status order menggunakan status restaurant: `'pending'` → `'confirmed'` → dll
4. ✅ Tidak ada konflik dengan laundry status

---

## 📝 File yang Dimodifikasi

1. ✅ `app/backend/database/migrations/2025_11_01_170000_add_laundry_status_to_orders_table.php`
   - Migration baru untuk menambah laundry status ke ENUM

---

## 🚀 Cara Menjalankan Migration

```bash
# Di terminal, masuk ke folder backend
cd app/backend

# Jalankan migration
php artisan migrate

# Atau jalankan migration spesifik
php artisan migrate --path=database/migrations/2025_11_01_170000_add_laundry_status_to_orders_table.php
```

---

## 🔄 Rollback Migration (Jika Perlu)

```bash
# Rollback migration terakhir
php artisan migrate:rollback

# Atau rollback spesifik
php artisan migrate:rollback --path=database/migrations/2025_11_01_170000_add_laundry_status_to_orders_table.php
```

**Catatan:** Rollback akan menghapus status laundry dari ENUM, jadi pastikan tidak ada order yang menggunakan status tersebut.

---

## 🚀 Kesimpulan

**Masalah utama**: Kolom `status` di tabel `orders` tidak mendukung status laundry (`'received'`, `'washing'`, `'ironing'`, `'picked_up'`).

**Solusi**:

1. ✅ Buat migration untuk menambah laundry status ke ENUM
2. ✅ Status yang ditambahkan sesuai dengan `order_statuses` di BusinessTypeSeeder
3. ✅ Backward compatible dengan status yang sudah ada

**Hasil**: Order laundry dengan deferred payment sekarang bisa dibuat dengan status `'received'` tanpa error.

---

**Versi**: 1.0  
**Tanggal**: 2025-01-15  
**Status**: ✅ **IMPLEMENTED & TESTED**











































