# ✅ Auto-Fill Complete Profile dari Data Registrasi

## 📋 Overview

Data yang sudah diisi saat registrasi (nama, email, nomor telepon) **otomatis terisi** di halaman complete-profile. Nomor WhatsApp juga **otomatis terverifikasi** jika sudah diverifikasi saat registrasi.

---

## ✅ Fitur yang Sudah Diimplementasikan

### 1. **Auto-Fill Data dari Registrasi**

#### **Data yang Auto-Fill**:
- ✅ **Nama Lengkap** - Dari `user.name` (registrasi)
- ✅ **Email** - Dari `user.email` (registrasi)
- ✅ **Nomor WhatsApp** - Dari `user.phone` (registrasi)
- ✅ **Alamat** - Dari `user.address` (jika sudah diisi)
- ✅ **Avatar** - Dari `user.avatar` (jika sudah diisi)

#### **Cara Kerja**:
```javascript
// ✅ Load data dari API response atau user context
const userData = response.data.user || user;

// ✅ Format phone untuk display (62xxxxxxxxxx → 0xxxxxxxxxx)
const formatPhoneForDisplay = (phone) => {
  if (!phone) return '';
  if (phone.startsWith('62')) {
    return '0' + phone.substring(2);
  }
  return phone;
};

// ✅ Set profile data dengan data dari registrasi
setProfileData({
  name: userData.name || user?.name || '',
  email: userData.email || user?.email || '',
  phone: formatPhoneForDisplay(userPhone),
  address: userData.address || user?.address || '',
  avatar: userData.avatar || user?.avatar || '',
  whatsapp_verified: isWhatsappVerified,
});
```

### 2. **Auto-Detect WhatsApp Verification**

#### **Sumber Verifikasi**:
1. ✅ `whatsapp_verified` dari API response
2. ✅ `whatsapp_verified_at` dari API response
3. ✅ `user.whatsapp_verified_at` dari user data

#### **Cara Kerja**:
```javascript
// ✅ Check WhatsApp verification from multiple sources
const isWhatsappVerified = response.data.whatsapp_verified || 
                           response.data.whatsapp_verified_at || 
                           userData.whatsapp_verified_at ||
                           false;

// ✅ Auto-set otpVerified jika sudah verified
setOtpVerified(isWhatsappVerified);

// ✅ Show success message
if (isWhatsappVerified && userPhone) {
  toast.success('Nomor WhatsApp sudah diverifikasi saat registrasi');
}
```

### 3. **UI Behavior**

#### **Jika WhatsApp Sudah Verified**:
- ✅ Phone input **disabled** (tidak bisa diubah)
- ✅ OTP button **tidak muncul** (tidak perlu verifikasi lagi)
- ✅ Status: "Nomor WhatsApp sudah diverifikasi (saat registrasi)" (hijau)
- ✅ User bisa langsung complete profile

#### **Jika WhatsApp Belum Verified**:
- ⚠️ Phone input **enabled** (bisa diubah)
- ⚠️ OTP button **muncul** (perlu verifikasi)
- ⚠️ Status: "Nomor WhatsApp belum diverifikasi" (merah)
- ⚠️ User harus verifikasi OTP dulu

---

## 🎯 Flow yang Benar

### Step 1: User Registrasi
1. User isi form registrasi:
   - Nama: "Haya Safiyya Salamah"
   - Email: "haya@gmai.com"
   - Phone: "085652373501"
   - Verifikasi WhatsApp: ✅
2. Backend simpan:
   - `user.name = "Haya Safiyya Salamah"`
   - `user.email = "haya@gmai.com"`
   - `user.phone = "6285652373501"` (formatted)
   - `user.whatsapp_verified_at = now()`

### Step 2: User Masuk ke Complete Profile
1. Frontend call `/v1/user/profile/check` dengan token
2. Backend return:
   ```json
   {
     "user": {
       "name": "Haya Safiyya Salamah",
       "email": "haya@gmai.com",
       "phone": "6285652373501",
       "whatsapp_verified_at": "2025-11-28 20:45:37"
     },
     "whatsapp_verified": true,
     "whatsapp_verified_at": "2025-11-28 20:45:37"
   }
   ```
3. Frontend auto-fill form:
   - Nama: "Haya Safiyya Salamah" ✅
   - Email: "haya@gmai.com" ✅
   - Phone: "085652373501" ✅ (formatted untuk display)
   - WhatsApp: Verified ✅

### Step 3: User Complete Profile
1. User hanya perlu isi **Alamat** (jika belum ada)
2. User bisa langsung klik "Lengkapi Profil"
3. **Tidak perlu verifikasi OTP lagi** ✅

---

## 📝 File yang Diubah

1. **`app/frontend/src/pages/CompleteProfilePage.jsx`**
   - ✅ Auto-fill data dari registrasi
   - ✅ Format phone untuk display
   - ✅ Auto-detect WhatsApp verification
   - ✅ Disable phone input jika sudah verified
   - ✅ Hide OTP button jika sudah verified
   - ✅ Show success message

2. **`app/backend/app/Http/Controllers/Api/AuthController.php`**
   - ✅ Return `whatsapp_verified_at` di response
   - ✅ Check `whatsapp_verified_at` dari User model
   - ✅ Set `whatsapp_verified_at` saat registrasi

---

## 🧪 Testing

### Test Case 1: User dengan Data Lengkap dari Registrasi
1. User registrasi dengan:
   - Nama: "Haya Safiyya Salamah"
   - Email: "haya@gmai.com"
   - Phone: "085652373501" (verified)
2. User masuk ke complete-profile
3. **Expected**:
   - ✅ Nama otomatis terisi: "Haya Safiyya Salamah"
   - ✅ Email otomatis terisi: "haya@gmai.com"
   - ✅ Phone otomatis terisi: "085652373501"
   - ✅ WhatsApp status: "Sudah diverifikasi (saat registrasi)" (hijau)
   - ✅ Phone input disabled
   - ✅ OTP button tidak muncul
   - ✅ User hanya perlu isi alamat, lalu bisa complete profile

### Test Case 2: User dengan Data Sebagian
1. User registrasi dengan:
   - Nama: "Test User"
   - Email: "test@example.com"
   - Phone: "081234567890" (verified)
   - Alamat: (kosong)
2. User masuk ke complete-profile
3. **Expected**:
   - ✅ Nama, Email, Phone otomatis terisi
   - ✅ WhatsApp sudah verified
   - ✅ User hanya perlu isi alamat

### Test Case 3: User dengan WhatsApp Belum Verified
1. User registrasi dengan:
   - Phone: "081234567890" (tidak verified)
2. User masuk ke complete-profile
3. **Expected**:
   - ✅ Nama, Email, Phone otomatis terisi
   - ⚠️ WhatsApp belum verified
   - ⚠️ OTP button muncul
   - ⚠️ User harus verifikasi OTP dulu

---

## ✅ Checklist

- [x] Auto-fill nama dari registrasi
- [x] Auto-fill email dari registrasi
- [x] Auto-fill phone dari registrasi
- [x] Format phone untuk display (62xxx → 0xxx)
- [x] Auto-detect WhatsApp verification
- [x] Disable phone input jika sudah verified
- [x] Hide OTP button jika sudah verified
- [x] Show success message jika sudah verified
- [x] Load data dari API response atau user context

---

## 📌 Catatan Penting

1. **Phone Format**: 
   - Database: `62xxxxxxxxxx` (formatted)
   - Display: `0xxxxxxxxxx` (user-friendly)
   - Submit: Backend akan format ulang ke `62xxxxxxxxxx`

2. **WhatsApp Verification**:
   - Jika `whatsapp_verified_at` ada → Sudah verified
   - Jika tidak ada → Perlu verifikasi OTP

3. **Data Source Priority**:
   - Priority 1: API response (`response.data.user`)
   - Priority 2: User context (`user` dari AuthContext)
   - Fallback: Empty string

---

## 🔗 Related Files

- `app/frontend/src/pages/CompleteProfilePage.jsx`
- `app/backend/app/Http/Controllers/Api/AuthController.php`
- `app/backend/app/Models/User.php`

