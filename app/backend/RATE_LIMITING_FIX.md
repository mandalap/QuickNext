# Solusi Rate Limiting "Too Many Requests"

## 🔴 Masalah
Banyak test case gagal karena error **"429 Too Many Requests"** saat melakukan login berulang kali selama testing.

## ✅ Solusi yang Sudah Diterapkan

### 1. **Rate Limiting Dinamis Berdasarkan Environment**
Rate limiting sekarang otomatis lebih longgar di development/testing environment:

- **Development/Testing**: 1000 requests per menit untuk login, 100 untuk register
- **Production**: 10 requests per menit untuk login, 5 untuk register

File: `routes/api.php` (baris 47-51)

```php
$loginThrottle = app()->environment(['local', 'testing']) ? 'throttle:1000,1' : 'throttle:10,1';
$registerThrottle = app()->environment(['local', 'testing']) ? 'throttle:100,1' : 'throttle:5,1';
```

### 2. **Script Clear Rate Limit Cache**
Script untuk membersihkan cache rate limiting saat testing:

**Windows (PowerShell):**
```powershell
.\clear-rate-limit.ps1
```

**Windows (CMD):**
```cmd
clear-rate-limit.bat
```

**Manual (PHP):**
```bash
php clear_rate_limit.php
```

**Clear semua cache:**
```bash
php clear_rate_limit.php --all
```

### 3. **Middleware untuk Disable Rate Limiting (Opsional)**
Middleware `DisableRateLimitForTesting` sudah dibuat jika diperlukan di masa depan.

## 📋 Cara Menggunakan

### Untuk Testing Manual:
1. Pastikan environment adalah `local` atau `testing` (cek di `.env`):
   ```
   APP_ENV=local
   ```

2. Jika masih terkena rate limit, jalankan script clear:
   ```bash
   php clear_rate_limit.php
   ```

3. Restart Laravel server jika perlu:
   ```bash
   php artisan serve
   ```

### Untuk Automated Testing (TestSprite):
1. Pastikan environment di-set ke `local` atau `testing`
2. Script clear rate limit akan otomatis membantu jika diperlukan
3. Rate limiting sudah di-set sangat longgar (1000 requests/menit) untuk testing

## 🔧 Troubleshooting

### Masih terkena rate limit?
1. **Cek environment:**
   ```bash
   php artisan tinker
   >>> app()->environment()
   ```
   Harus return `local` atau `testing`

2. **Clear cache manual:**
   ```bash
   php artisan cache:clear
   php clear_rate_limit.php
   ```

3. **Restart server:**
   ```bash
   # Stop server (Ctrl+C)
   php artisan serve
   ```

### Rate limit masih terlalu ketat?
Edit di `routes/api.php`:
```php
$loginThrottle = app()->environment(['local', 'testing']) ? 'throttle:10000,1' : 'throttle:10,1';
```

### Ingin disable rate limiting sepenuhnya untuk testing?
Edit di `routes/api.php`:
```php
// Disable rate limiting untuk local/testing
$loginThrottle = app()->environment(['local', 'testing']) ? null : 'throttle:10,1';
$registerThrottle = app()->environment(['local', 'testing']) ? null : 'throttle:5,1';

Route::post('/register', [AuthController::class, 'register'])
    ->when($registerThrottle, fn($route) => $route->middleware($registerThrottle));
Route::post('/login', [AuthController::class, 'login'])
    ->when($loginThrottle, fn($route) => $route->middleware($loginThrottle));
```

## 📊 Rate Limiting Configuration

| Environment | Login Limit | Register Limit |
|------------|-------------|----------------|
| Local/Testing | 1000/min | 100/min |
| Production | 10/min | 5/min |

## ✅ Verifikasi

Setelah perubahan, test dengan:
```bash
# Test login multiple times
for i in {1..20}; do
  curl -X POST http://localhost:8000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"password"}'
  echo ""
done
```

Tidak boleh ada error 429 setelah perubahan ini di environment local/testing.

## 🎯 Next Steps

1. ✅ Rate limiting sudah di-set lebih longgar untuk development
2. ✅ Script clear rate limit sudah tersedia
3. ⏭️ Re-run TestSprite tests untuk verifikasi
4. ⏭️ Monitor apakah masih ada rate limiting issues

---

**Last Updated:** 2025-11-17
**Status:** ✅ Implemented

