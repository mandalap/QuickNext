# Debug Files Guide

Dokumen ini menjelaskan file-file debug/test yang ada di proyek dan mana yang bisa dihapus.

## 📁 Kategori File Debug/Test

### 1. File Check (check_*.php)
File-file ini digunakan untuk mengecek data atau status tertentu di database.

**Lokasi:**
- Root directory: `check_*.php`
- `app/backend/check_*.php`

**Status:**
- ✅ **Bisa dihapus** jika tidak diperlukan lagi
- ⚠️ **Simpan** jika masih digunakan untuk debugging production issues

**Contoh:**
- `check_active_cashiers.php` - Cek kasir yang sedang aktif
- `check_shift_data.php` - Cek data shift
- `check_subscription_status.php` - Cek status subscription

### 2. File Debug (debug_*.php)
File-file ini digunakan untuk debugging masalah spesifik.

**Lokasi:**
- Root directory: `debug_*.php`
- `app/backend/debug_*.php`

**Status:**
- ✅ **Bisa dihapus** jika masalah sudah teratasi
- ⚠️ **Simpan** jika masih relevan untuk referensi

**Contoh:**
- `debug_shift_data.php` - Debug masalah shift
- `debug_subscription_data.php` - Debug subscription
- `debug_employees_data.php` - Debug employee data

### 3. File Test (test_*.php)
File-file ini digunakan untuk testing API atau functionality.

**Lokasi:**
- Root directory: `test_*.php`
- `app/backend/test_*.php`

**Status:**
- ✅ **Bisa dihapus** jika sudah tidak digunakan
- ⚠️ **Pindahkan ke tests/** jika masih diperlukan untuk automated testing

**Contoh:**
- `test_api_connection.php` - Test koneksi API
- `test_subscription_api.php` - Test subscription API
- `test_rate_limiting.php` - Test rate limiting

### 4. File Fix (fix_*.php)
File-file ini digunakan untuk memperbaiki data atau masalah tertentu.

**Lokasi:**
- Root directory: `fix_*.php`
- `app/backend/fix_*.php`

**Status:**
- ⚠️ **Simpan** sebagai dokumentasi perbaikan
- ✅ **Bisa dihapus** jika sudah tidak diperlukan lagi

**Contoh:**
- `fix_shift_orders.php` - Fix orders yang tidak terhubung dengan shift
- `fix_employee_outlet_assignment.php` - Fix employee assignment

## 🗑️ Rekomendasi Pembersihan

### File yang Aman Dihapus

1. **File check yang sudah tidak relevan:**
   - `check_orders_today.php`
   - `check_shift_transactions.php`
   - `check_database_script.php`

2. **File debug yang masalahnya sudah teratasi:**
   - `debug_shift_data.php` (jika shift sudah fixed)
   - `debug_subscription_data.php` (jika subscription sudah fixed)

3. **File test yang sudah tidak digunakan:**
   - `test_api_connection.php`
   - `test_api_direct.php`

### File yang Harus Disimpan

1. **File fix yang penting:**
   - `fix_shift_orders.php` - Dokumentasi perbaikan
   - `fix_employee_outlet_assignment.php` - Referensi perbaikan

2. **File check yang masih berguna:**
   - `check_active_cashiers.php` - Berguna untuk monitoring
   - `check_subscription_status.php` - Berguna untuk troubleshooting

## 📝 Cara Membersihkan

### Option 1: Hapus Manual
Hapus file-file yang tidak diperlukan secara manual.

### Option 2: Pindahkan ke Archive
Buat folder `archive/` dan pindahkan file-file yang tidak aktif:

```bash
mkdir archive
mv check_*.php archive/
mv debug_*.php archive/
mv test_*.php archive/
```

### Option 3: Git Ignore
Tambahkan pattern ke `.gitignore` untuk tidak commit file debug/test baru:

```gitignore
# Debug files
check_*.php
debug_*.php
test_*.php
fix_*.php
```

## ⚠️ Peringatan

**JANGAN HAPUS** file-file berikut karena masih digunakan:
- File di `app/backend/vendor/` (dependencies)
- File di `app/backend/tests/` (automated tests)
- File yang masih direferensi di dokumentasi

## 📚 Dokumentasi Terkait

- `ISSUES_TO_FIX.md` - Daftar issues yang sudah diperbaiki
- `TESTSPRITE_ISSUES_AND_FIXES.md` - Issues dari automated testing
- `ALL_FIXES_SUMMARY.md` - Ringkasan semua perbaikan

---

**Last Updated:** 2025-01-XX
**Status:** Active

