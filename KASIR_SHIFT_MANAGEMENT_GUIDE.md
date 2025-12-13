# 🏪 Panduan Fitur Buka Tutup Shift Kasir

## ✅ Status: SUDAH TERSEDIA & TERINTEGRASI

Fitur buka tutup shift kasir **sudah lengkap dan siap digunakan** di sistem POS Anda!

---

## 📍 Lokasi Fitur

### Untuk Role Kasir:

- **Dashboard Kasir**: http://localhost:3000/cashier
- **Login Redirect**: Kasir otomatis diarahkan ke dashboard kasir setelah login
- **Menu Navigasi**: Klik "Kasir" di sidebar untuk akses dashboard

### Untuk Role Owner/Admin:

- Bisa akses dashboard kasir melalui menu "Kasir" di sidebar
- Bisa melihat semua shift dari semua kasir
- Bisa akses laporan shift history

---

## 🎯 Fitur Lengkap yang Tersedia

### 1. **Dashboard Kasir** (`/cashier`)

- ✅ Status shift aktif/tidak aktif dengan visual yang jelas
- ✅ Tombol "Buka Shift" jika belum ada shift aktif
- ✅ Tombol "Tutup Shift" jika ada shift aktif
- ✅ Tombol "Buka Kasir" untuk akses POS
- ✅ Statistik transaksi hari ini
- ✅ Transaksi terakhir
- ✅ Tips untuk kasir

### 2. **Modal Buka Shift**

- ✅ Input nama shift (opsional, auto-generate jika kosong)
- ✅ Input modal awal (wajib) dengan validasi
- ✅ Quick amount buttons (100rb, 200rb, 500rb, 1jt)
- ✅ Catatan pembukaan (opsional)
- ✅ Preview modal awal sebelum submit
- ✅ Validasi input real-time

### 3. **Modal Tutup Shift**

- ✅ Informasi shift (nama, total transaksi)
- ✅ Ringkasan transaksi expected per metode pembayaran
- ✅ Perhitungan kas otomatis (modal awal + penjualan tunai)
- ✅ Input actual cash dengan validasi
- ✅ Perhitungan selisih real-time
- ✅ Status indicator dengan color coding:
  - **✓ Sesuai** (hijau) - Selisih = 0
  - **↑ Lebih** (biru) - Actual > Expected
  - **↓ Kurang** (merah) - Actual < Expected
- ✅ Catatan penutupan (opsional)

### 4. **Backend API**

- ✅ `GET /api/v1/shifts/active` - Cek shift aktif
- ✅ `GET /api/v1/shifts/{id}` - Detail shift
- ✅ `POST /api/v1/shifts/open` - Buka shift baru
- ✅ `POST /api/v1/shifts/{id}/close` - Tutup shift
- ✅ `GET /api/v1/shifts/history` - Riwayat shift
- ✅ `GET /api/v1/shifts/summary` - Summary shift

---

## 🚀 Cara Menggunakan

### Langkah 1: Login sebagai Kasir

1. Akses http://localhost:3000/login
2. Login dengan kredensial kasir
3. Sistem otomatis redirect ke dashboard kasir (`/cashier`)

### Langkah 2: Buka Shift

1. Di dashboard kasir, klik tombol **"Buka Shift"**
2. Isi form buka shift:
   - Nama shift (opsional, contoh: "Shift Pagi")
   - Modal awal (wajib, contoh: Rp 500.000)
   - Catatan (opsional)
3. Klik **"Buka Shift"** untuk konfirmasi
4. Dashboard akan update menampilkan status **"Shift Aktif"**

### Langkah 3: Lakukan Transaksi

1. Klik tombol **"Buka Kasir"** untuk akses POS
2. Lakukan transaksi seperti biasa
3. Klik "Kasir" di menu untuk kembali ke dashboard

### Langkah 4: Tutup Shift

1. Di dashboard kasir, klik tombol **"Tutup Shift"**
2. Review ringkasan transaksi:
   - Total transaksi
   - Penjualan per metode pembayaran
   - Expected cash (modal awal + penjualan tunai)
3. Masukkan **actual cash** (uang tunai fisik di kasir)
4. Sistem otomatis hitung selisih
5. Tambahkan catatan jika ada selisih atau kejadian khusus
6. Klik **"Tutup Shift"** untuk konfirmasi
7. Dashboard kembali ke status **"Belum Buka Shift"**

---

## 💰 Perhitungan Otomatis

### Expected Cash

```
Expected Cash = Modal Awal + Penjualan Tunai
```

### Actual Cash

```
Input dari kasir (jumlah uang tunai fisik yang dihitung)
```

### Selisih

```
Selisih = Actual Cash - Expected Cash
```

### Status Indicator

- **Selisih = 0** → ✓ Sesuai (hijau)
- **Selisih > 0** → ↑ Lebih (biru)
- **Selisih < 0** → ↓ Kurang (merah)

---

## 📱 Responsive Design

Fitur shift management sudah responsive untuk:

- **Mobile** (< 640px) - Touch-friendly, stack layout
- **Tablet** (640px - 1024px) - Balanced layout
- **Desktop** (> 1024px) - Full feature layout

---

## 🔒 Security & Validation

### Validasi Input

- ✅ Modal awal harus angka positif
- ✅ Actual cash harus angka positif
- ✅ Tidak bisa buka shift jika sudah ada shift aktif
- ✅ Hanya pemilik shift yang bisa tutup shift tersebut

### Authorization

- ✅ Kasir hanya bisa lihat dan kelola shift sendiri
- ✅ Owner/Admin bisa lihat semua shift
- ✅ Token authentication untuk semua API calls

---

## 📊 Data yang Tersimpan

Setiap shift menyimpan:

- ID shift
- User ID (kasir yang buka)
- Business ID & Outlet ID
- Nama shift
- Status (open/closed)
- Waktu buka & tutup
- Modal awal
- Expected cash/card/transfer/QRIS per metode
- Actual cash/card/transfer/QRIS per metode
- Selisih per metode
- Total transaksi
- Jumlah transaksi per metode
- Catatan pembukaan & penutupan
- User ID yang tutup shift

---

## 🎨 UI/UX Features

### Visual Feedback

- ✅ Loading states saat fetch data
- ✅ Toast notifications untuk success/error
- ✅ Color coding untuk status
- ✅ Icons yang intuitif
- ✅ Hover effects untuk interaktivitas

### User Experience

- ✅ Quick amount buttons untuk input cepat
- ✅ Real-time calculation tanpa delay
- ✅ Auto-format currency
- ✅ Clear error messages
- ✅ Confirmation sebelum action penting

---

## 🧪 Testing

### Manual Testing

1. Login sebagai kasir
2. Buka shift dengan modal Rp 500.000
3. Lakukan 3-5 transaksi dengan berbagai metode pembayaran
4. Tutup shift dan cek perhitungan
5. Verifikasi data di database

### Test Scenarios

- ✅ Shift normal (selisih = 0)
- ✅ Shift dengan selisih lebih
- ✅ Shift dengan selisih kurang
- ✅ Shift tanpa transaksi
- ✅ Shift dengan banyak transaksi

---

## 🛠️ Troubleshooting

### Masalah Umum

#### 1. Dashboard tidak load

**Solusi**:

- Pastikan backend running di port 8000
- Pastikan frontend running di port 3000
- Cek console browser untuk error

#### 2. Modal tidak terbuka

**Solusi**:

- Refresh halaman
- Clear browser cache
- Cek console untuk error

#### 3. API Error 401

**Solusi**:

- Login ulang
- Pastikan token valid
- Cek network tab di browser

#### 4. API Error 403

**Solusi**:

- Pastikan user adalah pemilik shift
- Cek business/outlet assignment
- Login ulang

#### 5. Perhitungan salah

**Solusi**:

- Cek data transaksi di database
- Pastikan payment method correct
- Recalculate shift totals

---

## 📈 Future Enhancements

### Planned Features

1. **Print Shift Report** - Cetak laporan shift
2. **Shift History** - Riwayat shift dengan filter
3. **Auto-close Timer** - Auto close setelah waktu tertentu
4. **Photo Evidence** - Upload foto kasir saat tutup
5. **Manager Approval** - Persetujuan manager untuk selisih besar
6. **Export to Excel** - Export data shift ke Excel
7. **Shift Analytics** - Grafik dan analisis performa shift

---

## 🎊 Kesimpulan

**✅ Fitur buka tutup shift kasir sudah 100% siap digunakan!**

### Yang Sudah Tersedia:

- ✅ Dashboard kasir dengan shift management lengkap
- ✅ Modal buka shift dengan validasi
- ✅ Modal tutup shift dengan perhitungan otomatis
- ✅ Real-time calculation dan feedback
- ✅ Responsive design untuk semua device
- ✅ Backend API yang robust
- ✅ Security dan authorization
- ✅ Data persistence di database

### Cara Akses:

1. Login sebagai kasir
2. Otomatis redirect ke http://localhost:3000/cashier
3. Klik "Buka Shift" untuk memulai
4. Lakukan transaksi
5. Klik "Tutup Shift" untuk selesai

**Sistem siap untuk production use!** 🚀

---

**Dibuat oleh**: AI Assistant  
**Tanggal**: 18 Oktober 2025  
**Versi**: 1.0.0  
**Status**: ✅ PRODUCTION READY
