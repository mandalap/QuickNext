# 📋 Seeder dan Flow Registrasi

## ⚠️ PENTING: Seeder Hanya untuk Data Test

### DummyDataSeeder
- **Tujuan**: Membuat data dummy/testing untuk development
- **TIDAK akan menghapus**: User yang sudah terdaftar melalui aplikasi
- **Hanya menghapus**: Data test dengan email `@bintanglima.com` dan business `restoran-bintang-lima`

### Data Test yang Dibuat:
- User: `owner@bintanglima.com`, `admin@bintanglima.com`, `kasir@bintanglima.com`, dll
- Business: `Restoran Bintang Lima`
- Outlet, Products, Orders, Customers, dll untuk testing

### Cara Menjalankan Seeder:
```bash
# Hanya untuk development/testing
php artisan db:seed --class=DummyDataSeeder
```

---

## 🔄 Flow Registrasi User Baru

### 1. **Registrasi (Register)**
**Endpoint**: `POST /api/v1/auth/register`

**Yang Terjadi**:
- ✅ User dibuat di database
- ✅ Email verification dikirim
- ✅ WhatsApp verification dilakukan
- ❌ **TIDAK ada bisnis yang dibuat**
- ❌ **TIDAK ada outlet yang dibuat**

**Response**:
```json
{
  "user": {...},
  "token": "...",
  "requires_subscription": true,
  "requires_profile_completion": true
}
```

**Setelah Registrasi**:
- User diarahkan ke halaman `/complete-profile` (jika profil belum lengkap)
- Atau ke halaman `/subscription-plans` (jika profil sudah lengkap)

---

### 2. **Lengkapi Profil (Complete Profile)**
**Endpoint**: `POST /api/v1/user/profile/complete`

**Yang Diperlukan**:
- ✅ Nama lengkap
- ✅ Email
- ✅ Nomor WhatsApp (harus sudah diverifikasi)
- ✅ Alamat

**Setelah Profil Lengkap**:
- User diarahkan ke halaman `/subscription-plans`

---

### 3. **Pilih Paket Subscription**
**Endpoint**: `POST /api/v1/subscriptions/subscribe`

**Yang Terjadi**:
- ✅ Subscription dibuat (trial atau paid)
- ❌ **TIDAK ada bisnis yang dibuat**
- ❌ **TIDAK ada outlet yang dibuat**

**Setelah Subscribe**:
- Jika trial: Langsung ke `/business-setup`
- Jika paid: Proses pembayaran dulu, lalu ke `/business-setup`

---

### 4. **Buat Bisnis Pertama (Business Setup)**
**Endpoint**: `POST /api/v1/businesses`

**Yang Terjadi**:
- ✅ **Bisnis dibuat** (user harus membuat sendiri)
- ✅ **Outlet default dibuat OTOMATIS** oleh `BusinessObserver`
- ✅ Owner ditambahkan sebagai admin di bisnis

**BusinessObserver**:
- Otomatis membuat outlet default dengan nama: `{Business Name} - Main Outlet`
- Outlet code: `OUT-{RANDOM}`
- Outlet slug: `{business-name}-main-outlet`

**Setelah Bisnis Dibuat**:
- User diarahkan ke dashboard `/`
- Bisnis dan outlet sudah siap digunakan

---

## 📊 Ringkasan Flow

```
1. Register
   └─> User dibuat
   └─> NO Business
   └─> NO Outlet

2. Complete Profile
   └─> Profil user dilengkapi
   └─> NO Business
   └─> NO Outlet

3. Subscribe
   └─> Subscription dibuat
   └─> NO Business
   └─> NO Outlet

4. Create Business (User harus buat sendiri!)
   └─> Business dibuat
   └─> Outlet default dibuat OTOMATIS oleh BusinessObserver
   └─> User bisa mulai menggunakan sistem
```

---

## ✅ Kesimpulan

### Seeder:
- ✅ Hanya untuk data test
- ✅ Tidak menghapus user yang sudah terdaftar
- ✅ Aman untuk dijalankan di development

### Registrasi:
- ❌ **Bisnis TIDAK dibuat otomatis** saat registrasi
- ❌ **Outlet TIDAK dibuat otomatis** saat registrasi
- ✅ **Bisnis harus dibuat manual** oleh user di halaman `/business-setup`
- ✅ **Outlet default dibuat OTOMATIS** saat bisnis dibuat (oleh BusinessObserver)

---

## 🔧 Troubleshooting

### Q: Apakah seeder akan menghapus user yang sudah daftar?
**A**: Tidak. Seeder hanya menghapus data test dengan email `@bintanglima.com`.

### Q: Apakah bisnis dan outlet dibuat otomatis saat registrasi?
**A**: Tidak. User harus membuat bisnis sendiri di halaman `/business-setup`. Outlet default akan dibuat otomatis saat bisnis dibuat.

### Q: Bagaimana cara membuat bisnis?
**A**: Setelah subscribe, user akan diarahkan ke `/business-setup` untuk membuat bisnis pertama.

### Q: Apakah outlet dibuat otomatis?
**A**: Ya, outlet default dibuat otomatis oleh `BusinessObserver` saat bisnis dibuat. User tidak perlu membuat outlet secara manual untuk pertama kali.

