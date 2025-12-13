# ⚡ Quick Fix - Network Error

## ❌ Error yang Muncul

```
Network error: Tidak dapat terhubung ke server. Periksa koneksi internet Anda.
```

---

## ✅ Solusi Cepat (3 Langkah)

### 1. Pastikan Backend Running

```bash
cd app/backend
php artisan serve
```

**Expected output:**
```
Laravel development server started: http://127.0.0.1:8000
```

### 2. Cek Backend Accessible

Buka di browser: **http://localhost:8000**

Harus muncul halaman Laravel atau API response.

### 3. Restart Frontend (Jika Perlu)

```bash
cd app/frontend
npm start
```

Atau jika pakai production build:
```bash
npm run serve:production
```

---

## 🔍 Verifikasi

### Cek Backend Running:
```bash
# Windows
netstat -ano | findstr :8000

# Harus muncul: LISTENING
```

### Cek Frontend Running:
```bash
# Windows
netstat -ano | findstr :3000

# Harus muncul: LISTENING
```

---

## 🐛 Jika Masih Error

### Error: "Connection Refused"
→ Backend tidak running. Start dengan `php artisan serve`

### Error: "CORS Policy"
→ Backend tidak mengizinkan origin. Cek `app/backend/config/cors.php`

### Error: "Timeout"
→ Backend terlalu lama response. Cek log backend untuk error.

---

## 📝 Checklist

- [ ] Backend running di `http://localhost:8000`
- [ ] Frontend running di `http://localhost:3000`
- [ ] Bisa akses `http://localhost:8000` di browser
- [ ] Tidak ada error di console browser (F12)

---

**Setelah fix, test lagi PWA!** 🚀

