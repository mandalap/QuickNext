# 🔑 VAPID Keys Setup Guide

## ❌ Error: VAPID_PUBLIC_KEY not found

Jika Anda mendapat error ini, berarti VAPID keys belum di-set di environment variables.

---

## 🚀 Cara Setup VAPID Keys

### **Method 1: Menggunakan Node.js (Recommended)**

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

Output akan seperti:
```
Public Key: BKx...xxx
Private Key: yKx...xxx
```

### **Method 2: Menggunakan Backend PHP Script**

```bash
cd app/backend
php generate-vapid-keys.php
```

### **Method 3: Manual dengan OpenSSL**

```bash
# Generate private key
openssl ecparam -genkey -name prime256v1 -noout -out vapid_private.pem

# Extract public key
openssl ec -in vapid_private.pem -pubout -out vapid_public.pem

# Convert to base64 (untuk public key)
cat vapid_public.pem | openssl ec -pubin -outform DER | base64 | tr -d '=' | tr '/+' '_-'

# Convert private key to base64
cat vapid_private.pem | openssl ec -in - -outform DER | base64 | tr -d '=' | tr '/+' '_-'
```

---

## 📝 Setup Environment Variables

### **1. Frontend** (`app/frontend/.env.local`)

Buat file `.env.local` di folder `app/frontend/`:

```env
REACT_APP_VAPID_PUBLIC_KEY=BKx...xxx
```

**⚠️ IMPORTANT:**
- File harus bernama `.env.local` (bukan `.env`)
- Harus menggunakan prefix `REACT_APP_`
- Restart development server setelah menambahkan env variable

### **2. Backend** (`app/backend/.env`)

Tambahkan ke file `.env` di folder `app/backend/`:

```env
VAPID_PUBLIC_KEY=BKx...xxx
VAPID_PRIVATE_KEY=yKx...xxx
VAPID_SUBJECT=mailto:admin@quickkasir.com
```

---

## ✅ Setelah Setup

1. **Restart Frontend Server:**
   ```bash
   cd app/frontend
   npm start
   ```

2. **Restart Backend Server:**
   ```bash
   cd app/backend
   php artisan serve
   ```

3. **Test Push Notification:**
   - Login ke aplikasi
   - Go to Settings → Push Notifications
   - Klik "Aktifkan Notifikasi"
   - Status harus berubah menjadi "Aktif"

---

## 🔍 Troubleshooting

### **Error: VAPID_PUBLIC_KEY not found**

1. ✅ Pastikan file `.env.local` ada di `app/frontend/`
2. ✅ Pastikan menggunakan prefix `REACT_APP_`
3. ✅ Restart development server
4. ✅ Clear browser cache

### **Error: Unable to create the key (Backend)**

1. ✅ Pastikan `minishlink/web-push` sudah terinstall:
   ```bash
   cd app/backend
   composer require minishlink/web-push
   ```

2. ✅ Pastikan OpenSSL extension enabled di PHP:
   ```bash
   php -m | grep openssl
   ```

### **Push Notification tidak muncul**

1. ✅ Pastikan browser mendukung Service Worker
2. ✅ Pastikan aplikasi diinstall sebagai PWA
3. ✅ Cek browser console untuk error
4. ✅ Pastikan VAPID keys sama di frontend dan backend

---

## 📚 Resources

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
- [web-push library](https://github.com/web-push-libs/web-push-php)

