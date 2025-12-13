# 🔧 Fix Network Error - PWA Testing

## ❌ Error yang Muncul

```
Network error: Tidak dapat terhubung ke server. Periksa koneksi internet Anda.
```

## 🔍 Penyebab

Error ini muncul ketika:
1. **Backend server tidak running** - Laravel server belum di-start
2. **Port berbeda** - Backend running di port lain (bukan 8000)
3. **CORS issue** - Backend tidak mengizinkan request dari frontend
4. **Production build** - Frontend production build tidak bisa connect ke localhost

---

## ✅ Solusi

### 1. Pastikan Backend Server Running

**Cek apakah backend running:**
```bash
# Windows
netstat -ano | findstr :8000

# Atau cek di browser
# Buka: http://localhost:8000
```

**Jika tidak running, start backend:**
```bash
cd app/backend
php artisan serve
```

Backend harus running di: **http://localhost:8000**

---

### 2. Cek API Configuration

**File:** `app/frontend/src/config/api.config.js**

Default API URL:
```javascript
BASE_URL: 'http://localhost:8000/api'
```

**Jika backend di port lain, update:**
```javascript
BASE_URL: 'http://localhost:8001/api' // contoh
```

---

### 3. Cek Environment Variables

**File:** `app/frontend/.env.local` (atau `.env`)

Pastikan ada:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

**Jika tidak ada, buat file `.env.local`:**
```bash
cd app/frontend
echo REACT_APP_BACKEND_URL=http://localhost:8000 > .env.local
```

---

### 4. Rebuild Frontend (Jika Perlu)

Jika sudah update environment variables, rebuild:

```bash
cd app/frontend
npm run build
npm run serve:production
```

---

### 5. Cek CORS Configuration

**File:** `app/backend/config/cors.php`

Pastikan frontend URL diizinkan:
```php
'allowed_origins' => [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3000', // untuk production build
],
```

**Jika perlu, clear cache:**
```bash
cd app/backend
php artisan config:clear
php artisan cache:clear
```

---

## 🧪 Testing

### 1. Test Backend Connection

**Buka di browser:**
```
http://localhost:8000/api
```

**Expected:** JSON response atau error message (bukan "connection refused")

### 2. Test Frontend Connection

**Buka di browser:**
```
http://localhost:3000
```

**Cek Console (F12):**
- Tidak ada error "Network Error"
- API calls berhasil (status 200 atau 401/403, bukan timeout)

### 3. Test PWA Production Build

**Build dan serve:**
```bash
cd app/frontend
npm run build
npm run serve:production
```

**Buka:** `http://localhost:3000`

**Cek:**
- Backend masih running di port 8000
- Frontend bisa connect ke backend

---

## 🐛 Troubleshooting

### Error: "Connection Refused"

**Penyebab:** Backend tidak running

**Solusi:**
```bash
cd app/backend
php artisan serve
```

---

### Error: "CORS Policy"

**Penyebab:** Backend tidak mengizinkan origin frontend

**Solusi:**
1. Update `app/backend/config/cors.php`
2. Clear cache: `php artisan config:clear`
3. Restart backend server

---

### Error: "Timeout"

**Penyebab:** Backend terlalu lama response

**Solusi:**
1. Cek apakah backend benar-benar running
2. Cek log backend untuk error
3. Increase timeout di `api.config.js` (temporary)

---

### Error di Production Build

**Penyebab:** Production build menggunakan hardcoded URL

**Solusi:**
1. Pastikan `.env.local` ada dengan `REACT_APP_BACKEND_URL`
2. Rebuild: `npm run build`
3. Atau gunakan development mode untuk testing: `npm start`

---

## ✅ Quick Fix Checklist

- [ ] Backend running di `http://localhost:8000`
- [ ] Frontend bisa akses `http://localhost:8000/api`
- [ ] Environment variable `REACT_APP_BACKEND_URL` set
- [ ] CORS configuration benar
- [ ] Rebuild frontend jika perlu

---

## 📝 Notes

**Untuk PWA Testing:**
- Development mode (`npm start`) lebih mudah untuk testing
- Production build (`npm run build`) perlu pastikan backend accessible
- Jika testing di mobile, pastikan PC dan mobile di network yang sama

**Untuk Production:**
- Update `REACT_APP_BACKEND_URL` ke production URL
- Pastikan CORS mengizinkan production domain
- Rebuild frontend dengan production environment

---

**Setelah fix, test lagi PWA features!** 🚀

