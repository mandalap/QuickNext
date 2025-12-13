# 📱 WhatsApp Verification API Documentation

## Overview

Sistem verifikasi WhatsApp menggunakan OTP (One-Time Password) untuk memastikan nomor WhatsApp yang dimasukkan benar dan terdaftar. OTP dikirim via WhatsApp dan berlaku selama 10 menit.

---

## 🔐 Endpoints

### 1. Send WhatsApp OTP

**Endpoint:** `POST /api/whatsapp/send-otp`

**Description:** Mengirim kode OTP 6 digit ke nomor WhatsApp yang dimasukkan.

**Request:**
```json
{
  "phone": "081234567890"
}
```

**Request Validation:**
- `phone` (required): Nomor WhatsApp (format: +62, 62, atau 0 diikuti 9-12 digit)

**Response Success (200):**
```json
{
  "success": true,
  "message": "Kode verifikasi telah dikirim ke WhatsApp Anda.",
  "expires_in": 10
}
```

**Response Error (422):**
```json
{
  "success": false,
  "message": "Nomor WhatsApp ini sudah terdaftar."
}
```

**Response Error (500):**
```json
{
  "success": false,
  "message": "Gagal mengirim kode verifikasi. Pastikan nomor WhatsApp Anda benar dan aktif."
}
```

**Rate Limit:** 5 requests per minute

---

### 2. Verify WhatsApp OTP

**Endpoint:** `POST /api/whatsapp/verify-otp`

**Description:** Memverifikasi kode OTP yang diterima via WhatsApp.

**Request:**
```json
{
  "phone": "081234567890",
  "code": "123456"
}
```

**Request Validation:**
- `phone` (required): Nomor WhatsApp yang sama dengan saat kirim OTP
- `code` (required): Kode OTP 6 digit yang diterima

**Response Success (200):**
```json
{
  "success": true,
  "message": "Nomor WhatsApp berhasil diverifikasi.",
  "verified": true
}
```

**Response Error (422):**
```json
{
  "success": false,
  "message": "Kode verifikasi tidak valid atau sudah kadaluarsa. Silakan minta kode baru."
}
```

**Rate Limit:** 10 requests per minute

**Security:**
- OTP berlaku 10 menit
- Maksimal 5 percobaan verifikasi
- Setelah 5 percobaan gagal, OTP dihapus dan harus minta baru

---

### 3. Register (Updated)

**Endpoint:** `POST /api/register`

**Description:** Registrasi user baru dengan email dan WhatsApp yang sudah diverifikasi.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "081234567890",
  "password": "password123",
  "password_confirmation": "password123",
  "whatsapp_verified": true
}
```

**Request Validation:**
- `name` (required): Nama lengkap
- `email` (required): Email (unique)
- `phone` (required): Nomor WhatsApp (format: +62, 62, atau 0 diikuti 9-12 digit)
- `password` (required): Password minimal 8 karakter
- `password_confirmation` (required): Konfirmasi password
- `whatsapp_verified` (required): Boolean, harus `true` jika sudah verifikasi

**Response Success (201):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "6281234567890",
    "role": "owner"
  },
  "token": "1|xxxxxxxxxxxxx",
  "requires_subscription": true,
  "email_verification_sent": true,
  "whatsapp_verified": true,
  "message": "Registrasi berhasil. Email dan WhatsApp Anda sudah terverifikasi. Silakan pilih paket subscription untuk melanjutkan."
}
```

**Response Error (422):**
```json
{
  "success": false,
  "message": "Nomor WhatsApp belum diverifikasi. Silakan verifikasi terlebih dahulu.",
  "errors": {
    "whatsapp_verified": ["Nomor WhatsApp harus diverifikasi terlebih dahulu."]
  }
}
```

---

## 🔄 Flow Registrasi

### Step 1: User Input Phone Number
User memasukkan nomor WhatsApp di form registrasi.

### Step 2: Send OTP
Frontend memanggil `POST /api/whatsapp/send-otp` dengan nomor WhatsApp.

### Step 3: User Receives OTP
User menerima kode OTP 6 digit via WhatsApp.

### Step 4: User Input OTP
User memasukkan kode OTP di form verifikasi.

### Step 5: Verify OTP
Frontend memanggil `POST /api/whatsapp/verify-otp` dengan nomor dan kode OTP.

### Step 6: Complete Registration
Jika verifikasi berhasil, frontend bisa lanjut ke form registrasi lengkap dengan `whatsapp_verified: true`.

---

## 📝 Frontend Implementation Example

### React/Next.js Example:

```javascript
// Step 1: Send OTP
const sendOTP = async (phone) => {
  try {
    const response = await axios.post('/api/whatsapp/send-otp', {
      phone: phone
    });
    
    if (response.data.success) {
      // Show success message
      // Start countdown timer (10 minutes)
      return true;
    }
  } catch (error) {
    // Handle error
    console.error('Failed to send OTP:', error.response?.data?.message);
    return false;
  }
};

// Step 2: Verify OTP
const verifyOTP = async (phone, code) => {
  try {
    const response = await axios.post('/api/whatsapp/verify-otp', {
      phone: phone,
      code: code
    });
    
    if (response.data.success) {
      // Mark WhatsApp as verified
      // Enable registration form
      return true;
    }
  } catch (error) {
    // Handle error
    console.error('Failed to verify OTP:', error.response?.data?.message);
    return false;
  }
};

// Step 3: Register
const register = async (formData) => {
  try {
    const response = await axios.post('/api/register', {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      password_confirmation: formData.password_confirmation,
      whatsapp_verified: true // Must be true
    });
    
    if (response.data.success) {
      // Registration successful
      // Redirect to subscription page
      return response.data;
    }
  } catch (error) {
    // Handle error
    console.error('Registration failed:', error.response?.data?.message);
    return null;
  }
};
```

---

## 🔒 Security Features

1. **OTP Expiration**: OTP berlaku 10 menit
2. **Max Attempts**: Maksimal 5 percobaan verifikasi
3. **Rate Limiting**: 
   - Send OTP: 5 requests/minute
   - Verify OTP: 10 requests/minute
4. **Phone Uniqueness**: Nomor WhatsApp tidak bisa digunakan untuk multiple account
5. **Auto Cleanup**: OTP yang expired otomatis dihapus

---

## ⚠️ Important Notes

1. **WhatsApp Config Required**: Pastikan ada konfigurasi WhatsApp yang aktif di Filament Admin Panel
2. **Phone Format**: Nomor akan otomatis di-format ke `62xxxxxxxxxx`
3. **Verification Required**: Registrasi akan gagal jika `whatsapp_verified` tidak `true`
4. **OTP Storage**: OTP disimpan di database dengan hash untuk security

---

## 🧪 Testing

### Test Send OTP:
```bash
curl -X POST http://localhost:8000/api/whatsapp/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "081234567890"}'
```

### Test Verify OTP:
```bash
curl -X POST http://localhost:8000/api/whatsapp/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "081234567890", "code": "123456"}'
```

### Test Register:
```bash
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

---

## 📞 Support

Jika ada masalah:
1. Cek log: `storage/logs/laravel.log`
2. Pastikan WhatsApp config aktif di Filament
3. Test manual via Postman/Insomnia
4. Cek rate limiting tidak terblokir

