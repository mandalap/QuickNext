# 🔧 Fix CORS Error - PWA Testing

## ❌ Error yang Muncul

```
Access to XMLHttpRequest at 'http://localhost:8000/api/login' from origin 'http://localhost:51293' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 Penyebab

Frontend running di port **51293** (karena port 3000 sudah digunakan), tapi backend CORS config hanya mengizinkan port **3000**.

---

## ✅ Solusi

### 1. Update CORS Configuration

**File:** `app/backend/config/cors.php`

Sudah di-update untuk mengizinkan:
- ✅ `localhost` dengan port apapun (regex pattern)
- ✅ `127.0.0.1` dengan port apapun
- ✅ Local network IP (192.168.x.x) dengan port apapun

### 2. Clear Config Cache

```bash
cd app/backend
php artisan config:clear
php artisan cache:clear
```

### 3. Restart Backend Server

```bash
# Stop backend (Ctrl+C)
# Start lagi
php artisan serve
```

---

## 🧪 Testing

### 1. Cek CORS Config

**File:** `app/backend/config/cors.php`

Pastikan ada:
```php
'allowed_origins_patterns' => [
    '#^http://localhost:\d+$#',
    '#^http://127\.0\.0\.1:\d+$#',
    '#^http://192\.168\.\d+\.\d+:\d+$#',
],
```

### 2. Test Login

1. Buka frontend: `http://localhost:51293` (atau port yang digunakan)
2. Coba login
3. Cek console (F12) - tidak ada CORS error

### 3. Cek Network Tab

1. Buka DevTools > Network
2. Coba login
3. Cek request ke `/api/login`
4. Response headers harus ada: `Access-Control-Allow-Origin: http://localhost:51293`

---

## 🐛 Troubleshooting

### Masih Error CORS?

1. **Clear cache:**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

2. **Restart backend:**
   ```bash
   php artisan serve
   ```

3. **Cek browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) atau `Cmd+Shift+R` (Mac)
   - Atau clear browser cache

### Error: "Config cache not cleared"

```bash
# Force clear
php artisan config:clear --force
php artisan cache:clear --force
```

### Error: "Port already in use"

```bash
# Cek port yang digunakan
netstat -ano | findstr :8000

# Kill process jika perlu
taskkill /PID <PID> /F
```

---

## ✅ Quick Fix Checklist

- [ ] CORS config updated dengan patterns
- [ ] Config cache cleared
- [ ] Backend restarted
- [ ] Frontend bisa login tanpa CORS error

---

## 📝 Notes

**Untuk Development:**
- ✅ Pattern mengizinkan localhost dengan port apapun
- ✅ Safe untuk development
- ⚠️ Untuk production, gunakan specific origins (bukan pattern)

**Untuk Production:**
- Update `allowed_origins` dengan production URL
- Jangan gunakan wildcard patterns
- Gunakan specific domains

---

**Setelah fix, test login lagi!** 🚀

