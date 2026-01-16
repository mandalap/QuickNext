# 🔧 Fix: Google OAuth Error (oauth_error=1)

## ❌ Masalah

Setelah klik "Lanjutkan dengan Google", redirect ke `https://app.quickkasir.com/login?oauth_error=1`

---

## 🔍 Root Cause

Error terjadi di `SocialAuthController::handleGoogleCallback()`. Kemungkinan penyebab:

1. **Google OAuth credentials salah** (Client ID/Secret)
2. **Redirect URI tidak match** dengan Google Cloud Console
3. **Database error** saat create/update user
4. **Missing required fields** di User model
5. **Config cache** belum di-update setelah ubah `.env`

---

## ✅ Solusi

### STEP 1: Debug Error (Cek Logs)

```bash
cd /var/www/quickkasir

# Pull latest code
git pull origin main

# Buat script executable
chmod +x debug-google-oauth-vps.sh

# Jalankan debug script
./debug-google-oauth-vps.sh
```

Script akan menampilkan:
- Error detail dari Laravel logs
- Environment variables
- Services config
- Database connection
- User table structure

### STEP 2: Check Laravel Logs Manual

```bash
cd /var/www/quickkasir/app/backend

# Check recent errors
tail -50 storage/logs/laravel.log | grep -A 10 "Google OAuth failed"

# Or check all recent errors
tail -100 storage/logs/laravel.log
```

### STEP 3: Verify Google Cloud Console

Pastikan di [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. **Authorized JavaScript origins:**
   - `https://app.quickkasir.com`
   - `https://quickkasir.com`
   - `https://api.quickkasir.com`

2. **Authorized redirect URIs:**
   - `https://api.quickkasir.com/auth/google/callback`

### STEP 4: Verify Backend .env

```bash
cd /var/www/quickkasir/app/backend

# Check .env file
grep -E "GOOGLE_|FRONTEND_URL" .env

# Expected output:
# GOOGLE_CLIENT_ID=95469432852-...
# GOOGLE_CLIENT_SECRET=GOCSPX-...
# GOOGLE_REDIRECT_URI=https://api.quickkasir.com/auth/google/callback
# FRONTEND_URL=https://app.quickkasir.com
```

### STEP 5: Clear & Re-cache Config

```bash
cd /var/www/quickkasir/app/backend

# Clear all cache
php artisan config:clear
php artisan route:clear
php artisan cache:clear

# Re-cache
php artisan config:cache
php artisan route:cache

# Verify
php artisan tinker --execute="
echo 'GOOGLE_CLIENT_ID: ' . config('services.google.client_id') . PHP_EOL;
echo 'GOOGLE_REDIRECT_URI: ' . config('services.google.redirect') . PHP_EOL;
"
```

### STEP 6: Test OAuth Redirect

```bash
# Test redirect endpoint
curl -I "https://api.quickkasir.com/auth/google/redirect"

# Expected: HTTP 302 redirect to Google OAuth
```

### STEP 7: Check Database

```bash
cd /var/www/quickkasir/app/backend

# Check if users table has google_id column
php artisan tinker --execute="
\$columns = DB::select('DESCRIBE users');
foreach (\$columns as \$col) {
    if (\$col->Field === 'google_id') {
        echo '✅ google_id column exists' . PHP_EOL;
        break;
    }
}
"
```

Jika `google_id` tidak ada, jalankan migration:
```bash
php artisan migrate
```

---

## 🧪 Testing

1. **Test di browser:**
   - Buka: `https://app.quickkasir.com/login`
   - Klik: "Lanjutkan dengan Google"
   - Harus redirect ke Google OAuth consent screen
   - Setelah approve, harus redirect ke `https://app.quickkasir.com/login/sso?token=...` (bukan `oauth_error=1`)

2. **Monitor logs:**
   ```bash
   tail -f /var/www/quickkasir/app/backend/storage/logs/laravel.log
   ```
   - Coba login dengan Google
   - Lihat error detail di log

---

## 🔍 Common Errors & Fixes

### Error 1: "Invalid client credentials"

**Fix:**
- Pastikan `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` benar di `.env`
- Clear config cache: `php artisan config:clear && php artisan config:cache`

### Error 2: "Redirect URI mismatch"

**Fix:**
- Pastikan `GOOGLE_REDIRECT_URI` di `.env` sama dengan di Google Cloud Console
- Harus: `https://api.quickkasir.com/auth/google/callback`

### Error 3: "Database error" atau "Column not found"

**Fix:**
- Pastikan migration sudah dijalankan: `php artisan migrate`
- Pastikan `users` table punya column `google_id`

### Error 4: "Missing required field"

**Fix:**
- Check User model untuk required fields
- Pastikan semua required fields ada saat create user

---

## 📝 Checklist

- [ ] Debug script dijalankan dan error detail diketahui
- [ ] Google Cloud Console config benar (origins & redirect URIs)
- [ ] Backend `.env` punya `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- [ ] Config cache sudah di-clear dan di-rebuild
- [ ] Database connection OK
- [ ] `users` table punya column `google_id`
- [ ] Test OAuth redirect berhasil
- [ ] Login dengan Google berhasil (tidak ada `oauth_error=1`)
