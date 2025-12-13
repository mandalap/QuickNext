# Manual Testing Guide - QuickKasir POS System

## 📋 Daftar Test Users

Semua test users menggunakan password: `password123`

| Email | Role | Password | Status |
|-------|------|----------|--------|
| `super_admin@test.com` | Super Admin | `password123` | ✅ Active |
| `admin@test.com` | Admin | `password123` | ✅ Active |
| `kasir@test.com` | Kasir | `password123` | ✅ Active |
| `kitchen@test.com` | Kitchen | `password123` | ✅ Active |
| `waiter@test.com` | Waiter | `password123` | ✅ Active |
| `juli23man@gmail.com` | Owner | `password123` | ✅ Active |

---

## 🧪 Test Cases Manual

### TC001: Login Success with Valid Credentials

**Test Steps:**
1. Buka aplikasi di `http://localhost:3000`
2. Masukkan email dan password untuk setiap role:
   - `super_admin@test.com` / `password123`
   - `admin@test.com` / `password123`
   - `kasir@test.com` / `password123`
   - `kitchen@test.com` / `password123`
   - `waiter@test.com` / `password123`
   - `juli23man@gmail.com` / `password123`
3. Klik "Login"
4. **Expected Result:** User berhasil login dan diarahkan ke dashboard

**Checklist:**
- [ ] Super Admin bisa login
- [ ] Admin bisa login
- [ ] Kasir bisa login
- [ ] Kitchen bisa login
- [ ] Waiter bisa login
- [ ] Owner bisa login
- [ ] Dashboard muncul setelah login

---

### TC002: Login Failure with Invalid Credentials

**Test Steps:**
1. Buka aplikasi di `http://localhost:3000`
2. Masukkan email: `invalid@test.com`
3. Masukkan password: `wrongpassword`
4. Klik "Login"
5. **Expected Result:** Error message muncul: "The provided credentials are incorrect."

**Checklist:**
- [ ] Error message muncul
- [ ] User tidak bisa login
- [ ] Form tidak submit

---

### TC003: Role-Based Access Control

**Test Steps:**
1. Login dengan setiap role
2. Cek menu yang tersedia di sidebar
3. Coba akses halaman yang tidak diizinkan

**Expected Menu Access:**

#### Super Admin
- [ ] Dashboard
- [ ] Kasir (POS)
- [ ] Dapur (Kitchen)
- [ ] Karyawan (Employees)
- [ ] Bisnis & Outlet
- [ ] Semua menu tersedia

#### Admin
- [ ] Dashboard
- [ ] Kasir (POS)
- [ ] Dapur (Kitchen)
- [ ] Karyawan (Employees)
- [ ] Tidak bisa akses Bisnis & Outlet (kecuali sebagai member)

#### Kasir
- [ ] Dashboard
- [ ] Kasir (POS)
- [ ] Tidak bisa akses Dapur
- [ ] Tidak bisa akses Karyawan
- [ ] Tidak bisa akses Bisnis & Outlet

#### Kitchen
- [ ] Dashboard
- [ ] Dapur (Kitchen)
- [ ] Tidak bisa akses Kasir
- [ ] Tidak bisa akses Karyawan
- [ ] Tidak bisa akses Bisnis & Outlet

#### Waiter
- [ ] Dashboard
- [ ] Waiter Dashboard
- [ ] Tidak bisa akses Kasir
- [ ] Tidak bisa akses Dapur
- [ ] Tidak bisa akses Karyawan

---

### TC004: Business Creation

**Test Steps:**
1. Login dengan `juli23man@gmail.com` atau `super_admin@test.com`
2. Jika belum punya business, akan muncul form "Business Setup"
3. Isi form:
   - Nama Bisnis: "Test Business"
   - Jenis Bisnis: Pilih salah satu
   - Email: (opsional)
   - Telepon: (opsional)
   - Alamat: (opsional)
4. Klik "Buat Bisnis & Mulai"
5. **Expected Result:** Business berhasil dibuat dan user diarahkan ke dashboard

**Checklist:**
- [ ] Form validation bekerja
- [ ] Business berhasil dibuat
- [ ] Outlet otomatis dibuat dengan slug
- [ ] User diarahkan ke dashboard
- [ ] Tidak ada error "Field 'slug' doesn't have a default value"

---

### TC005: POS Transaction Flow

**Test Steps:**
1. Login dengan role `kasir@test.com` atau `owner`
2. Buka halaman "Kasir" (POS)
3. Pilih produk dari daftar
4. Tambahkan ke cart
5. Atur quantity
6. Pilih customer (walk-in atau registered)
7. Klik "Pembayaran"
8. Pilih metode pembayaran (Cash, Card, QRIS, Transfer)
9. Klik "Bayar"
10. **Expected Result:** Order berhasil dibuat dan receipt muncul

**Checklist:**
- [ ] Produk bisa ditambahkan ke cart
- [ ] Quantity bisa diubah
- [ ] Customer bisa dipilih
- [ ] Metode pembayaran bisa dipilih
- [ ] Order berhasil dibuat
- [ ] Receipt muncul
- [ ] WhatsApp notification terkirim (jika dikonfigurasi)

---

### TC006: Product Management CRUD

**Test Steps:**
1. Login dengan role `owner` atau `admin`
2. Buka halaman "Produk"
3. **Create:**
   - Klik "Tambah Produk"
   - Isi form (nama, harga, stok, kategori)
   - Klik "Simpan"
4. **Read:**
   - Cek produk muncul di daftar
5. **Update:**
   - Klik edit pada produk
   - Ubah data
   - Klik "Simpan"
6. **Delete:**
   - Klik hapus pada produk
   - Konfirmasi hapus

**Checklist:**
- [ ] Produk bisa dibuat
- [ ] Produk muncul di daftar
- [ ] Produk bisa di-edit
- [ ] Produk bisa dihapus
- [ ] Stok per outlet bekerja

---

### TC007: Employee Management

**Test Steps:**
1. Login dengan role `owner` atau `admin`
2. Buka halaman "Karyawan"
3. **Create Employee:**
   - Klik "Tambah Karyawan"
   - Isi form (nama, email, role, outlet)
   - Klik "Simpan"
4. **View Employee:**
   - Cek employee muncul di daftar
5. **Update Employee:**
   - Klik edit
   - Ubah data
   - Klik "Simpan"
6. **Delete Employee:**
   - Klik hapus
   - Konfirmasi

**Checklist:**
- [ ] Employee bisa dibuat
- [ ] Employee muncul di daftar
- [ ] Employee bisa di-edit
- [ ] Employee bisa dihapus
- [ ] Role assignment bekerja

---

### TC008: Attendance System

**Test Steps:**
1. Login dengan role `kasir@test.com`, `kitchen@test.com`, atau `waiter@test.com`
2. Buka halaman "Absensi"
3. **Clock In:**
   - Pilih shift (Pagi, Siang, Malam, atau Custom)
   - Klik "Clock In"
   - Allow GPS access
   - **Expected Result:** Clock in berhasil jika dalam radius outlet
4. **Clock Out:**
   - Setelah clock in, klik "Clock Out"
   - **Expected Result:** Clock out berhasil
5. **View Attendance History:**
   - Cek riwayat absensi
   - Cek status (Tepat Waktu, Terlambat, Absen)

**Checklist:**
- [ ] Clock In bekerja
- [ ] GPS validation bekerja
- [ ] Clock Out bekerja
- [ ] Riwayat absensi muncul
- [ ] Status terlambat/tidak hadir terhitung benar

---

### TC009: Financial Management

**Test Steps:**
1. Login dengan role `owner` atau `admin`
2. Buka halaman "Manajemen Keuangan"
3. **Cash Flow:**
   - Cek saldo kas
   - Cek pemasukan
   - Cek pengeluaran
4. **Tax Management:**
   - Klik tab "Pajak"
   - Klik "Tambah Pajak"
   - Isi form (nama, jumlah, tanggal jatuh tempo)
   - Klik "Simpan"
   - Edit pajak
   - Hapus pajak
5. **Expense Management:**
   - Klik tab "Pengeluaran"
   - Tambah pengeluaran
   - Edit pengeluaran
   - Hapus pengeluaran

**Checklist:**
- [ ] Saldo kas terhitung benar
- [ ] Pajak bisa ditambah
- [ ] Pajak bisa di-edit
- [ ] Pajak bisa dihapus
- [ ] Pengeluaran bisa dikelola
- [ ] Paid taxes mengurangi saldo kas

---

### TC010: Report Generation

**Test Steps:**
1. Login dengan role `owner` atau `admin`
2. Buka halaman "Laporan"
3. **Sales Report:**
   - Pilih filter tanggal (Hari Ini, Kemarin, Minggu, Bulan, Tahun, Custom)
   - Cek grafik penjualan muncul
   - Cek tren per jam muncul
   - Cek top products muncul
4. **Export:**
   - Klik "Export Excel" atau "Export PDF"
   - **Expected Result:** File terunduh

**Checklist:**
- [ ] Filter tanggal bekerja
- [ ] Grafik penjualan muncul
- [ ] Tren per jam muncul
- [ ] Top products muncul
- [ ] Export Excel bekerja
- [ ] Export PDF bekerja

---

### TC011: Dashboard Functionality

**Test Steps:**
1. Login dengan role apapun
2. Buka halaman Dashboard
3. Cek elemen yang muncul:
   - Statistik penjualan (hari ini, kemarin, minggu, bulan)
   - Grafik penjualan
   - Top products
   - Recent orders
4. Ubah filter tanggal
5. **Expected Result:** Data update sesuai filter

**Checklist:**
- [ ] Statistik muncul
- [ ] Grafik muncul
- [ ] Top products muncul
- [ ] Recent orders muncul
- [ ] Filter tanggal bekerja
- [ ] Tidak ada error 404 untuk `/v1/dashboard/top-products`

---

### TC012: WhatsApp Integration

**Test Steps:**
1. Login dengan role `owner` atau `admin`
2. Buka halaman "Bisnis & Outlet"
3. Edit outlet
4. Buka tab "WhatsApp Settings"
5. **Configure WhatsApp:**
   - Pilih provider (Wablitz, Fonnte, dll)
   - Masukkan API Key
   - Masukkan Phone Number
   - Enable WhatsApp
   - Klik "Simpan"
6. **Test Message:**
   - Klik "Test Pengiriman"
   - Masukkan nomor tujuan
   - Klik "Kirim"
   - **Expected Result:** Pesan test terkirim

**Checklist:**
- [ ] WhatsApp settings bisa disimpan
- [ ] API Key terenkripsi
- [ ] Test message bisa dikirim
- [ ] Notification otomatis setelah payment bekerja

---

## 🐛 Known Issues & Fixes Applied

### ✅ Fixed Issues

1. **Rate Limiting (429 Too Many Requests)**
   - **Status:** ✅ FIXED
   - **Fix:** Rate limit cleared using `RateLimiter::clear('login')`

2. **Business Creation Failure - Missing Slug**
   - **Status:** ✅ FIXED
   - **Fix:** Automatic slug generation added to `OutletController`

3. **Password Reset**
   - **Status:** ✅ FIXED
   - **Fix:** Password untuk `juli23man@gmail.com` sudah direset ke `password123`

### ⚠️ Issues to Monitor

1. **Dashboard API Endpoint**
   - **Issue:** `/v1/dashboard/top-products` mungkin masih error dengan parameter `date_range=today:0`
   - **Action:** Monitor saat testing dashboard

2. **Subscription Check Timeout**
   - **Issue:** `/api/v1/subscriptions/current` mungkin timeout
   - **Action:** Monitor saat business creation

---

## 📝 Test Results Template

Gunakan template ini untuk mencatat hasil testing:

```markdown
## Test Results - [Date]

### TC001: Login Success
- [ ] Super Admin: PASS / FAIL
- [ ] Admin: PASS / FAIL
- [ ] Kasir: PASS / FAIL
- [ ] Kitchen: PASS / FAIL
- [ ] Waiter: PASS / FAIL
- [ ] Owner: PASS / FAIL

### TC002: Login Failure
- [ ] Invalid credentials rejected: PASS / FAIL

### TC003: Role-Based Access
- [ ] Super Admin access: PASS / FAIL
- [ ] Admin access: PASS / FAIL
- [ ] Kasir access: PASS / FAIL
- [ ] Kitchen access: PASS / FAIL
- [ ] Waiter access: PASS / FAIL

### TC004: Business Creation
- [ ] Business created: PASS / FAIL
- [ ] Outlet created with slug: PASS / FAIL
- [ ] No slug error: PASS / FAIL

### TC005: POS Transaction
- [ ] Product selection: PASS / FAIL
- [ ] Cart management: PASS / FAIL
- [ ] Payment processing: PASS / FAIL
- [ ] Receipt generation: PASS / FAIL

### TC006: Product CRUD
- [ ] Create: PASS / FAIL
- [ ] Read: PASS / FAIL
- [ ] Update: PASS / FAIL
- [ ] Delete: PASS / FAIL

### TC007: Employee Management
- [ ] Create: PASS / FAIL
- [ ] Read: PASS / FAIL
- [ ] Update: PASS / FAIL
- [ ] Delete: PASS / FAIL

### TC008: Attendance
- [ ] Clock In: PASS / FAIL
- [ ] GPS validation: PASS / FAIL
- [ ] Clock Out: PASS / FAIL
- [ ] History: PASS / FAIL

### TC009: Financial Management
- [ ] Cash flow: PASS / FAIL
- [ ] Tax CRUD: PASS / FAIL
- [ ] Expense CRUD: PASS / FAIL

### TC010: Reports
- [ ] Sales report: PASS / FAIL
- [ ] Date filters: PASS / FAIL
- [ ] Export Excel: PASS / FAIL
- [ ] Export PDF: PASS / FAIL

### TC011: Dashboard
- [ ] Statistics: PASS / FAIL
- [ ] Charts: PASS / FAIL
- [ ] Filters: PASS / FAIL

### TC012: WhatsApp
- [ ] Configuration: PASS / FAIL
- [ ] Test message: PASS / FAIL
- [ ] Auto notification: PASS / FAIL

## Summary
- Total Tests: X
- Passed: X
- Failed: X
- Issues Found: [List issues]
```

---

## 🚀 Quick Start Testing

1. **Start Backend:**
   ```bash
   cd app/backend
   php artisan serve
   ```

2. **Start Frontend:**
   ```bash
   cd app/frontend
   npm start
   ```

3. **Access Application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

4. **Login dengan test users:**
   - Gunakan salah satu test user dari tabel di atas
   - Password: `password123`

---

## 📞 Support

Jika menemukan bug atau issue saat manual testing:
1. Catat langkah-langkah untuk reproduce
2. Screenshot error message
3. Catat browser dan versi
4. Catat role yang digunakan
5. Laporkan ke tim development

---

**Last Updated:** 2025-11-16  
**Test Users Created:** ✅  
**Bug Fixes Applied:** ✅

