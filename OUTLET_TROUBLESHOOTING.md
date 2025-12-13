# Troubleshooting: Outlet Tidak Muncul di Modal

## Masalah

Modal "Buat Meja Baru" tidak menampilkan daftar outlet di dropdown.

## Penyebab Umum

### 1. **Tidak Ada Outlet di Database**

- Database belum di-seed dengan data outlet
- Outlet belum dibuat untuk business yang sedang aktif

### 2. **Business ID Tidak Diset**

- User belum memilih business
- Header `X-Business-Id` tidak dikirim ke API

### 3. **Role User Tidak Memiliki Akses**

- User dengan role `kasir` hanya bisa melihat outlet yang di-assign
- User belum di-assign ke outlet manapun

## Solusi

### 1. **Buat Sample Outlet (Recommended)**

```bash
cd app/backend
php create_sample_outlets.php
```

### 2. **Jalankan Seeder Outlet**

```bash
cd app/backend
php artisan db:seed --class=OutletSeeder
```

### 3. **Buat Outlet Manual**

1. Buka halaman **Business Management**
2. Klik **"Tambah Outlet"**
3. Isi data outlet:
   - Nama: "Outlet Pusat"
   - Alamat: "Alamat outlet"
   - Telepon: "081234567890"
4. Klik **"Simpan"**

### 4. **Pastikan Business Sudah Dipilih**

1. Login ke sistem
2. Pastikan business sudah dipilih di dropdown business switcher
3. Jika belum ada business, buat business terlebih dahulu

### 5. **Assign User ke Outlet (untuk role kasir)**

1. Buka halaman **Employee Outlet Management**
2. Pilih employee (user kasir)
3. Assign ke outlet yang diinginkan
4. Set sebagai primary outlet

## Debugging

### 1. **Cek Console Browser**

Buka Developer Tools (F12) dan lihat console untuk pesan:

```
CreateTableModal opened, outlets available: [...]
```

### 2. **Cek Network Tab**

Lihat apakah request ke `/api/outlets` berhasil:

- Status: 200 OK
- Response: Array outlet

### 3. **Cek Local Storage**

Pastikan ada data di localStorage:

```javascript
console.log("Business ID:", localStorage.getItem("currentBusinessId"));
console.log("Outlet ID:", localStorage.getItem("currentOutletId"));
```

## Verifikasi

### 1. **Cek Database**

```sql
-- Cek apakah ada outlet
SELECT * FROM outlets;

-- Cek business
SELECT * FROM businesses;

-- Cek employee outlet assignment
SELECT * FROM employee_outlets;
```

### 2. **Test API Endpoint**

```bash
curl -H "X-Business-Id: 1" http://localhost:8000/api/outlets
```

## Status Modal

Modal akan menampilkan status berikut:

- **"Memuat outlet..."** - Sedang loading
- **"Tidak ada outlet tersedia"** - Tidak ada outlet di database
- **Daftar outlet** - Outlet tersedia dan bisa dipilih

## Next Steps

Setelah outlet tersedia:

1. Modal akan menampilkan daftar outlet
2. Pilih outlet yang diinginkan
3. Isi nama meja dan kapasitas
4. Klik "Buat Meja"
5. QR code akan otomatis dibuat




















































































