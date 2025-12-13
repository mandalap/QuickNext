# Debug Guide: Shift Belum Tutup tapi Harus Buka Kasir Dulu

## Masalah

User mengatakan shift belum tutup, tapi sistem meminta untuk membuka shift lagi.

## Kemungkinan Penyebab

1. **Shift ada di business/outlet yang berbeda**

   - User memiliki shift aktif di business/outlet lain
   - Frontend sedang menggunakan business/outlet yang berbeda
   - Shift tidak terdeteksi karena mismatch business_id atau outlet_id

2. **Headers tidak terkirim dengan benar**

   - X-Business-Id atau X-Outlet-Id tidak ada di localStorage
   - Headers tidak ter-attach ke request API

3. **Shift memang belum ditutup dengan benar**
   - Shift masih status 'open' di database
   - Tapi tidak cocok dengan business/outlet saat ini

## Cara Debug

### 1. Cek Log Backend

Jalankan backend dan cek log Laravel saat dashboard kasir di-load:

```bash
php artisan serve
# Lihat log di storage/logs/laravel.log
```

Log akan menampilkan:

- User ID yang melakukan request
- Business ID dan Outlet ID dari headers
- Semua shift aktif untuk user tersebut
- Hasil query shift

### 2. Cek Database Langsung

Jalankan script debug:

```bash
php check_active_shift_debug.php
```

Script ini akan menampilkan:

- Semua user dengan role kasir
- Semua shift (10 terakhir) untuk setiap user
- Semua shift dengan status 'open'

### 3. Cek Browser Console

Buka browser console saat membuka dashboard kasir. Log akan menampilkan:

- Business ID dan Outlet ID dari localStorage
- Response dari API shift
- Detail error jika ada

### 4. Cek localStorage di Browser

Buka Developer Tools > Application > Local Storage, cek:

- `currentBusinessId` - harus ada dan sesuai
- `currentOutletId` - harus ada dan sesuai
- `userId` - harus ada

## Solusi

### Solusi 1: Tutup Shift yang Lama

Jika user memiliki shift aktif di business/outlet lain:

1. Pilih business/outlet yang memiliki shift aktif
2. Buka halaman Kasir Dashboard
3. Klik "Tutup Shift"
4. Kembali ke business/outlet yang diinginkan
5. Buka shift baru

### Solusi 2: Auto-detect dan Warning

Sistem sudah menambahkan logging untuk mendeteksi jika user punya shift aktif di business/outlet lain. Backend akan log warning jika ditemukan mismatch.

### Solusi 3: Pastikan Headers Terkirim

Pastikan saat membuka dashboard kasir:

- User sudah login
- Business sudah dipilih (ada di localStorage)
- Outlet sudah dipilih (ada di localStorage)
- Headers ter-attach ke request (cek di Network tab browser)

## Perbaikan yang Sudah Ditambahkan

1. **Logging di Backend (CashierShiftController.php)**

   - Log semua shift aktif untuk user
   - Log jika shift ditemukan tapi business/outlet berbeda
   - Log hasil query

2. **Logging di Frontend (KasirDashboard.jsx)**

   - Log Business ID, Outlet ID, User ID dari localStorage
   - Log detail response dari API
   - Log detail error jika ada

3. **Debug Script (check_active_shift_debug.php)**
   - Script untuk cek semua shift aktif di database
   - Menampilkan detail shift untuk setiap user kasir

## Next Steps

1. Buka dashboard kasir dan cek console browser
2. Cek log backend untuk melihat detail shift yang ditemukan
3. Jika shift ada di business/outlet lain, tutup shift tersebut dulu
4. Jika shift tidak ada sama sekali, buka shift baru
