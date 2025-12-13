# 📱 Persyaratan Nomor WhatsApp

## 📋 Overview

Nomor WhatsApp **WAJIB** diisi di **Profil Owner (User)** sebelum membuat bisnis:
1. **Saat Registrasi** - Verifikasi WhatsApp dengan OTP (wajib)
2. **Lengkapi Profil Owner** - Nama, Email, Alamat, Telepon/WA, Avatar (wajib sebelum buat bisnis)
3. **Saat Membuat Bisnis** - Phone bisnis optional (bisa pakai phone owner)

---

## 🔐 1. Registrasi (WAJIB)

### Kapan:
Saat user pertama kali mendaftar akun QuickKasir.

### Validasi:
- ✅ **Phone** (required): Nomor WhatsApp wajib diisi
- ✅ **Email** (required): Email wajib diisi
- ✅ **WhatsApp Verified** (required): Harus verifikasi WhatsApp dengan OTP sebelum registrasi

### Flow:
1. User input nomor WhatsApp
2. Sistem kirim OTP via WhatsApp
3. User input kode OTP
4. Sistem verifikasi OTP
5. Setelah verifikasi berhasil, user bisa lanjut registrasi
6. Registrasi akan gagal jika `whatsapp_verified: false`

### Endpoint:
- `POST /api/whatsapp/send-otp` - Kirim OTP
- `POST /api/whatsapp/verify-otp` - Verifikasi OTP
- `POST /api/register` - Registrasi (wajib `whatsapp_verified: true`)

### Validasi:
```php
'phone' => 'required|string|max:20|regex:/^(\+62|62|0)[0-9]{9,12}$/',
'whatsapp_verified' => 'required|boolean',
```

---

## 👤 2. Lengkapi Profil Owner (WAJIB SEBELUM BUAT BISNIS)

### Kapan:
Setelah registrasi, sebelum membuat bisnis pertama.

### Validasi:
- ✅ **Name** (required): Nama lengkap owner
- ✅ **Email** (required): Email owner
- ✅ **Phone** (required): Nomor WhatsApp owner (harus diverifikasi)
- ✅ **Address** (required): Alamat owner
- ✅ **Avatar** (optional): Foto profil owner
- ✅ **WhatsApp Verified** (required): Nomor WhatsApp harus sudah diverifikasi

### Flow:
1. User registrasi dan verifikasi WhatsApp
2. User pilih paket subscription
3. **WAJIB** lengkapi profil owner dulu:
   - Nama lengkap
   - Email
   - Nomor WhatsApp (harus sudah diverifikasi)
   - Alamat
   - Avatar (optional)
4. Setelah profil lengkap, baru bisa buat bisnis

### Endpoint:
- `POST /api/v1/user/profile/complete` - Lengkapi profil owner
- `GET /api/v1/user/profile/check` - Cek apakah profil sudah lengkap

### Validasi:
```php
'name' => 'required|string|max:255',
'email' => 'required|string|email|max:255',
'phone' => 'required|string|max:20|regex:/^(\+62|62|0)[0-9]{9,12}$/',
'address' => 'required|string|max:500',
'avatar' => 'nullable|string',
'whatsapp_verified' => 'required|boolean', // Harus true
```

---

## 🏢 3. Membuat Bisnis (SETELAH PROFIL LENGKAP)

### Kapan:
Setelah profil owner lengkap dan WhatsApp terverifikasi.

### Validasi:
- ✅ **Name** (required): Nama bisnis wajib diisi
- ⚠️ **Phone** (optional): Nomor WhatsApp bisnis (jika kosong, pakai phone owner)
- ⚠️ **Email** (optional): Email bisnis (jika kosong, pakai email owner)
- ⚠️ **Address** (optional): Alamat bisnis (jika kosong, pakai alamat owner)

### Flow:
1. Sistem cek apakah profil owner sudah lengkap
2. Jika belum lengkap → return error dengan daftar field yang kurang
3. Jika sudah lengkap → bisa buat bisnis
4. Phone/Email/Address bisnis optional (fallback ke owner)

### Endpoint:
- `POST /api/v1/businesses` - Create business (cek profil owner dulu)

### Validasi:
```php
'name' => 'required|string|max:255',
'phone' => 'nullable|string|max:20|regex:/^(\+62|62|0)[0-9]{9,12}$/',
'email' => 'nullable|email|max:255',
'address' => 'nullable|string',
```

### Auto Fallback:
Jika phone/email/address bisnis kosong, akan pakai data owner:
```php
$phone = $request->phone ? formatPhone($request->phone) : $user->phone;
$email = $request->email ?? $user->email;
$address = $request->address ?? $user->address;
```

---

## 📍 Di Mana Nomor WhatsApp Disimpan?

### 1. User Table (`users`) - **WAJIB LENGKAPI SEBELUM BUAT BISNIS**
- Field: `phone`, `name`, `email`, `address`, `avatar`
- Wajib: ✅ Ya (sebelum membuat bisnis)
- Format: `62xxxxxxxxxx`
- Digunakan untuk: 
  - Notifikasi subscription
  - Pengingat perpanjangan
  - Data owner
  - Fallback untuk bisnis jika tidak diisi

### 2. Business Table (`businesses`)
- Field: `phone`, `email`, `address`
- Wajib: ❌ Tidak (optional, fallback ke owner)
- Format: `62xxxxxxxxxx`
- Digunakan untuk: Kontak bisnis spesifik (jika berbeda dari owner)

### 3. Outlet Table (`outlets`)
- Field: `phone`
- Wajib: ❌ Tidak (optional)
- Format: `62xxxxxxxxxx`
- Digunakan untuk: Kontak outlet spesifik

---

## 🔄 Flow Lengkap

### Step 1: Registrasi
```
User → Input Phone → Send OTP → Verify OTP → Register
✅ Phone wajib diisi dan diverifikasi
✅ Email wajib diisi
```

### Step 2: Pilih Paket Subscription
```
User → Pilih Paket → Bayar → Subscription Aktif
```

### Step 3: Lengkapi Profil Owner (WAJIB)
```
User → Lengkapi Profil → Input Name, Email, Phone, Address, Avatar
✅ Name wajib
✅ Email wajib
✅ Phone wajib (harus sudah diverifikasi)
✅ Address wajib
✅ Avatar optional
```

### Step 4: Buat Bisnis Pertama
```
User → Buat Bisnis → Sistem cek profil owner lengkap
✅ Jika profil lengkap → Bisnis Created
❌ Jika profil belum lengkap → Error, minta lengkapi dulu
⚠️ Phone/Email/Address bisnis optional (fallback ke owner)
```

---

## ⚠️ Validasi dan Error Messages

### Registrasi:
- **Phone kosong**: "Nomor WhatsApp wajib diisi"
- **Phone tidak valid**: "Format nomor WhatsApp tidak valid"
- **Phone sudah terdaftar**: "Nomor WhatsApp ini sudah terdaftar"
- **WhatsApp belum diverifikasi**: "Nomor WhatsApp harus diverifikasi terlebih dahulu"

### Lengkapi Profil Owner:
- **Name kosong**: "Nama lengkap wajib diisi"
- **Email kosong**: "Email wajib diisi"
- **Phone kosong**: "Nomor WhatsApp wajib diisi"
- **Phone tidak valid**: "Format nomor WhatsApp tidak valid"
- **Address kosong**: "Alamat wajib diisi"
- **WhatsApp belum diverifikasi**: "Nomor WhatsApp harus diverifikasi terlebih dahulu"

### Membuat Bisnis:
- **Profil belum lengkap**: "Profil owner belum lengkap. Silakan lengkapi profil Anda terlebih dahulu."
- **Name kosong**: "Nama bisnis wajib diisi"
- **Phone tidak valid** (jika diisi): "Format nomor WhatsApp tidak valid"

---

## 🎯 Kesimpulan

### Nomor WhatsApp WAJIB diisi di:
1. ✅ **Registrasi** - Dengan verifikasi OTP
2. ✅ **Profil Owner** - Lengkapi sebelum buat bisnis (Name, Email, Phone, Address, Avatar)

### Nomor WhatsApp TIDAK wajib di:
- ❌ **Bisnis** (optional, fallback ke phone owner)
- ❌ **Outlet** (optional)

### Prioritas:
1. **Registrasi**: Phone + Email (wajib, dengan verifikasi WA)
2. **Lengkapi Profil Owner**: Name + Email + Phone (verified) + Address + Avatar (wajib sebelum buat bisnis)
3. **Bisnis**: Name (wajib), Phone/Email/Address (optional, fallback ke owner)

---

## 📝 Catatan Penting

1. **Format Otomatis**: Semua nomor otomatis di-format ke `62xxxxxxxxxx`
2. **Uniqueness**: Nomor WhatsApp tidak bisa digunakan untuk multiple account
3. **Verifikasi**: Hanya saat registrasi yang perlu verifikasi OTP
4. **Bisnis**: Phone bisnis langsung digunakan tanpa verifikasi tambahan
5. **Auto Sync**: Jika user belum punya phone, phone bisnis di-copy ke user

---

## 🔧 Testing

### Test Registrasi dengan Phone:
```bash
# 1. Send OTP
curl -X POST http://localhost:8000/api/whatsapp/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "081234567890"}'

# 2. Verify OTP (gunakan kode yang diterima)
curl -X POST http://localhost:8000/api/whatsapp/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "081234567890", "code": "123456"}'

# 3. Register
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "081234567890",
    "password": "password123",
    "password_confirmation": "password123",
    "whatsapp_verified": true
  }'
```

### Test Create Business dengan Phone:
```bash
curl -X POST http://localhost:8000/api/v1/businesses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Business",
    "email": "business@example.com",
    "phone": "081234567890",
    "address": "Jl. Test No. 123",
    "business_type_id": 1
  }'
```

---

**⚠️ PENTING: Nomor WhatsApp WAJIB diisi saat Registrasi dan Membuat Bisnis!**

