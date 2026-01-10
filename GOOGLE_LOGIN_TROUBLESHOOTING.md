# 🔍 Google Login Troubleshooting Guide

## ⚠️ SECURITY ALERT

Credentials Anda sudah terekspos! **SEGERA:**

1. ❌ Regenerate Google Client Secret di Google Cloud Console
2. ❌ Regenerate credentials di `.env` file
3. ❌ Jangan share credentials lagi di public

---

## 🔧 Checklist Debugging

### 1. **Cek Environment Variables**

File: `app/backend/.env`

```bash
✅ GOOGLE_CLIENT_ID=95469432852-ai28jan13dh8p77m2jvokar97tk5fqbr.apps.googleusercontent.com
✅ GOOGLE_CLIENT_SECRET=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
✅ GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
✅ FRONTEND_URL=http://localhost:3000
```

**Periksa:**

- ❓ Apakah semua nilai sudah set di `.env` file?
- ❓ Apakah GOOGLE_REDIRECT_URI sesuai dengan Google Cloud Console?

---

### 2. **Cek Google Cloud Console**

Buka: https://console.cloud.google.com/

**Authorized redirect URIs:**

- `http://localhost:8000/auth/google/callback` ✅

**Authorized JavaScript origins:**

- `http://localhost:8000` ✅
- `http://localhost:3000` ✅

**Periksa:**

- ❓ Apakah redirect URI sudah ditambahkan di Google Cloud?
- ❓ Apakah JavaScript origins sudah ditambahkan?
- ❓ Apakah OAuth 2.0 Client ID sudah dibuat untuk Web Application?

---

### 3. **Cek Browser Console**

Buka aplikasi → Developer Tools (F12) → Console

**Kemungkinan error:**

```
❌ "This app is not verified" - OAuth app belum verified
❌ "Redirect URI mismatch" - URI tidak cocok dengan Google Cloud
❌ "Invalid client" - Client ID atau Secret salah
❌ "Too many requests" - Rate limiting dari Google
❌ "CORS error" - CORS policy issue
```

---

### 4. **Cek Backend Logs**

File: `app/backend/storage/logs/laravel.log`

```bash
# Di terminal
tail -100 app/backend/storage/logs/laravel.log | grep -i google
```

**Kemungkinan error:**

```
❌ "InvalidStateException" - State parameter tidak valid
❌ "IdentityValueException" - Google ID invalid
❌ "CURL error" - Network issue
```

---

### 5. **Cek Frontend Login Component**

File: `app/frontend/src/components/Auth/Login.jsx`

```jsx
// Line ~275
<Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={() => {
    window.location.href = "http://localhost:8000/auth/google/redirect"; // ✅ Benar
  }}
>
  Lanjutkan dengan Google
</Button>
```

**Periksa:**

- ❓ Apakah URL redirect sudah benar?
- ❓ Apakah button clickable?

---

### 6. **Cek Routes**

File: `app/backend/routes/web.php`

```php
Route::get('/auth/google/redirect', [SocialAuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [SocialAuthController::class, 'handleGoogleCallback']);
```

**Periksa:**

- ❓ Apakah routes sudah registered?
- ❓ Apakah SocialAuthController ada?

---

### 7. **Cek Socialite Configuration**

File: `config/services.php`

```php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect' => env('GOOGLE_REDIRECT_URI', 'http://localhost:8000/auth/google/callback'),
],
```

**Periksa:**

- ❓ Apakah `Laravel\Socialite` sudah diinstall?

```bash
composer require laravel/socialite
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "This app isn't verified"

**Penyebab:** OAuth app belum diverifikasi oleh Google

**Solusi:**

1. Buka Google Cloud Console
2. OAuth consent screen → User Type: Internal/External
3. Jika test: Pilih "Internal" atau tambahkan test users
4. Jika production: Submit untuk verification (bisa 1-2 minggu)

---

### Issue 2: "Redirect URI mismatch"

**Penyebab:** URI di kode tidak cocok dengan Google Cloud

**Solusi:**

1. Buka Google Cloud Console → OAuth 2.0 Client IDs
2. Authorized redirect URIs:
   - Localhost: `http://localhost:8000/auth/google/callback`
   - Production: `https://api.yourdomain.com/auth/google/callback`
3. Pastikan di `.env`:
   ```
   GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
   ```

---

### Issue 3: "Invalid client ID"

**Penyebab:** Client ID atau Secret salah

**Solusi:**

1. Buka Google Cloud Console → Credentials
2. Copy Client ID dan Client Secret yang benar
3. Update di `.env`:
   ```
   GOOGLE_CLIENT_ID=xxx
   GOOGLE_CLIENT_SECRET=xxx
   ```
4. Restart Laravel server

---

### Issue 4: "Too many requests"

**Penyebab:** Rate limiting dari Google (atau test dengan banyak akun)

**Solusi:**

1. Tunggu beberapa menit
2. Coba di inkognito tab
3. Pastikan tidak ada loop redirect

---

### Issue 5: "CORS Error"

**Penyebab:** Frontend dan Backend origin berbeda

**Solusi:**

1. Tambah di `app/backend/config/cors.php`:
   ```php
   'allowed_origins' => ['http://localhost:3000', 'http://localhost:3001'],
   ```
2. Pastikan middleware CORS aktif di `app/backend/app/Http/Middleware/Cors.php`

---

## 🧪 Testing Steps

### 1. **Test Redirect ke Google**

```bash
# Di browser, buka:
http://localhost:8000/auth/google/redirect

# Seharusnya redirect ke Google login page
```

### 2. **Test Backend Log**

```bash
# Terminal di backend folder
tail -f storage/logs/laravel.log

# Lalu coba login, lihat error log
```

### 3. **Test dengan curl**

```bash
curl -v "http://localhost:8000/auth/google/redirect"
```

### 4. **Test Frontend Button**

```bash
# Buka browser console (F12)
# Klik "Lanjutkan dengan Google" button
# Lihat apakah ada error di console
```

---

## 📋 Checklist Perbaikan

- [ ] Cek `.env` file sudah lengkap
- [ ] Cek Google Cloud Console configuration
- [ ] Cek browser console untuk error
- [ ] Cek backend logs untuk error
- [ ] Cek routes di `web.php`
- [ ] Cek frontend button onClick handler
- [ ] Test dengan curl command
- [ ] Test redirect flow
- [ ] Clear cache: `php artisan optimize:clear`
- [ ] Restart Laravel server
- [ ] Restart frontend dev server

---

## 🔗 Useful Links

- Google Cloud Console: https://console.cloud.google.com/
- OAuth 2.0 Credentials: https://console.cloud.google.com/apis/credentials
- Laravel Socialite Docs: https://laravel.com/docs/socialite
- Google OAuth Playground: https://developers.google.com/oauthplayground

---

## 📝 Next Steps

1. **Regenerate credentials** di Google Cloud (karena sudah terekspos)
2. **Update `.env`** dengan credentials baru
3. **Test login flow** step by step
4. **Check logs** untuk exact error message
5. **Debug di browser** menggunakan F12
