# 📋 Flow Lengkapi Profil Owner

## 🎯 Overview

User **WAJIB** melengkapi profil owner sebelum bisa:
- ✅ Memilih paket subscription
- ✅ Membuat bisnis

---

## 🔄 Flow Lengkap

### Step 1: Registrasi
```
User → Input Name, Email, Phone → Send OTP → Verify OTP → Register
✅ Name: Diisi saat registrasi
✅ Email: Diisi saat registrasi  
✅ Phone: Diisi saat registrasi (diverifikasi via OTP)
❌ Address: BELUM diisi (akan diisi saat completeProfile)
❌ Avatar: BELUM diisi (optional)
```

**Response:**
```json
{
  "requires_profile_completion": true,
  "profile_complete": false,
  "message": "Registrasi berhasil. Silakan lengkapi profil Anda terlebih dahulu sebelum memilih paket subscription."
}
```

---

### Step 2: Lengkapi Profil Owner (WAJIB)

**Endpoint:** `POST /api/v1/user/profile/complete`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "081234567890",
  "address": "Jl. Test No. 123, Jakarta",
  "avatar": "https://...",
  "whatsapp_verified": true
}
```

**Validasi:**
- ✅ Name (required)
- ✅ Email (required)
- ✅ Phone (required, harus sudah diverifikasi)
- ✅ Address (required)
- ✅ Avatar (optional)
- ✅ WhatsApp Verified (required: true)

**Response:**
```json
{
  "success": true,
  "message": "Profil berhasil dilengkapi. Anda sekarang bisa membuat bisnis.",
  "profile_complete": true,
  "can_create_business": true
}
```

---

### Step 3: Pilih Paket Subscription

**Endpoint:** `POST /api/v1/subscriptions/subscribe`

**Validasi:**
- ✅ Cek profil owner lengkap (name, email, phone, address)
- ✅ Cek WhatsApp terverifikasi
- ❌ Jika belum lengkap → Error 422 dengan daftar field yang kurang

**Response Error (422):**
```json
{
  "success": false,
  "error": "Profil owner belum lengkap",
  "message": "Silakan lengkapi profil Anda terlebih dahulu sebelum memilih paket subscription.",
  "requires_profile_completion": true,
  "missing_fields": {
    "name": false,
    "phone": false,
    "address": true,
    "whatsapp_verified": false
  }
}
```

---

### Step 4: Buat Bisnis

**Endpoint:** `POST /api/v1/businesses`

**Validasi:**
- ✅ Cek profil owner lengkap (name, email, phone, address)
- ✅ Cek WhatsApp terverifikasi
- ❌ Jika belum lengkap → Error 422 dengan daftar field yang kurang

**Response Error (422):**
```json
{
  "error": "Profil owner belum lengkap",
  "errors": [
    "Alamat belum diisi. Silakan lengkapi profil Anda terlebih dahulu."
  ],
  "requires_profile_completion": true,
  "missing_fields": {
    "name": false,
    "phone": false,
    "address": true,
    "whatsapp_verified": false
  }
}
```

---

## ✅ Checklist Profil Lengkap

Profil dianggap lengkap jika:
- ✅ `name` tidak kosong
- ✅ `email` tidak kosong
- ✅ `phone` tidak kosong
- ✅ `address` tidak kosong
- ✅ `phone` sudah diverifikasi (ada di `whatsapp_verifications` dengan `verified_at` dalam 24 jam terakhir)

---

## 🔍 Endpoint Check Profile

**Endpoint:** `GET /api/v1/user/profile/check`

**Response:**
```json
{
  "profile_complete": false,
  "can_create_business": false,
  "missing_fields": ["address"],
  "whatsapp_verified": true,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "6281234567890",
    "address": null
  }
}
```

---

## ⚠️ Error Handling

### Saat Subscribe (belum lengkapi profil):
```json
{
  "success": false,
  "error": "Profil owner belum lengkap",
  "message": "Silakan lengkapi profil Anda terlebih dahulu sebelum memilih paket subscription.",
  "requires_profile_completion": true
}
```

### Saat Create Business (belum lengkapi profil):
```json
{
  "error": "Profil owner belum lengkap",
  "errors": [
    "Nama lengkap belum diisi. Silakan lengkapi profil Anda terlebih dahulu.",
    "Alamat belum diisi. Silakan lengkapi profil Anda terlebih dahulu."
  ],
  "requires_profile_completion": true
}
```

---

## 📝 Frontend Implementation

### 1. Setelah Registrasi:
```javascript
if (result.requires_profile_completion) {
  // Redirect ke halaman lengkapi profil
  navigate('/complete-profile');
}
```

### 2. Sebelum Subscribe:
```javascript
// Cek profil lengkap dulu
const profileCheck = await axios.get('/api/v1/user/profile/check');
if (!profileCheck.data.profile_complete) {
  // Redirect ke lengkapi profil
  navigate('/complete-profile');
  return;
}
```

### 3. Sebelum Create Business:
```javascript
// Cek profil lengkap dulu
const profileCheck = await axios.get('/api/v1/user/profile/check');
if (!profileCheck.data.profile_complete) {
  // Show error atau redirect
  toast.error('Silakan lengkapi profil Anda terlebih dahulu');
  navigate('/complete-profile');
  return;
}
```

---

## 🎯 Kesimpulan

**Flow yang Benar:**
1. Registrasi → Verifikasi WA → **Lengkapi Profil** → Pilih Plan → Buat Bisnis

**Validasi di:**
- ✅ `POST /api/v1/subscriptions/subscribe` - Cek profil lengkap
- ✅ `POST /api/v1/businesses` - Cek profil lengkap

**Tidak Bisa:**
- ❌ Subscribe tanpa profil lengkap
- ❌ Create business tanpa profil lengkap






