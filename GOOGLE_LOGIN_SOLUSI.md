# 🔧 SOLUSI: Gagal Login dengan Google

## ✅ Penyebab Utama

Berdasarkan analisis kode, ada **beberapa kemungkinan penyebab**:

1. **Environment Variables tidak loaded di SocialAuthController**
2. **CORS issue** - Frontend tidak bisa connect ke Laravel backend
3. **Redirect URI mismatch** di Google Cloud Console
4. **OAuth consent screen belum verified** di Google Cloud
5. **Rate limiting** dari Google (terlalu banyak attempt)
6. **Session/State issue** di Socialite

---

## 🔍 Diagnosis: Cek Error Message

### Step 1: Lihat Error di Browser

```
1. Buka aplikasi: http://localhost:3000/login
2. Klik tombol "Lanjutkan dengan Google"
3. Tekan F12 → Console → Lihat error apa
```

### Step 2: Lihat Error di Backend

```bash
# Terminal di app/backend folder
tail -100 storage/logs/laravel.log

# Cari string: "Google", "oauth", "error"
```

### Step 3: Cek Network di Browser

```
1. F12 → Network tab
2. Klik "Lanjutkan dengan Google"
3. Lihat request ke:
   - http://localhost:8000/auth/google/redirect
   - Lihat response-nya apa
```

---

## 🛠️ Solusi Step-by-Step

### Solusi 1: Cek Konfigurasi Google Cloud Console

**Login ke:** https://console.cloud.google.com/

#### A. Cek OAuth Consent Screen

```
1. Menu → APIs & Services → OAuth consent screen
2. User Type: Pilih "Internal" (untuk testing)
3. Jika "External": Submit untuk verification (tunggu 1-2 minggu)
4. Jika test users: Pastikan akun test sudah ditambahkan
```

#### B. Cek OAuth 2.0 Credentials

```
1. Menu → APIs & Services → Credentials
2. Pilih OAuth 2.0 Client ID untuk Web Application
3. Cek "Authorized redirect URIs":
   ✅ http://localhost:8000/auth/google/callback

4. Cek "Authorized JavaScript origins":
   ✅ http://localhost:8000
   ✅ http://localhost:3000
```

**Jika belum ada, TAMBAHKAN:**

```
1. Klik edit OAuth client
2. Scroll ke "Authorized redirect URIs"
3. Tambah: http://localhost:8000/auth/google/callback
4. Scroll ke "Authorized JavaScript origins"
5. Tambah: http://localhost:8000
6. Tambah: http://localhost:3000
7. Klik Save
```

---

### Solusi 2: Update .env File

File: `app/backend/.env`

**Pastikan sudah ada:**

```env
# Google OAuth
GOOGLE_CLIENT_ID=95469432852-ai28jan13dh8p77m2jvokar97tk5fqbr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

**Catatan:**

- ⚠️ Credentials sudah terekspos! REGENERATE di Google Cloud
- Jangan commit `.env` ke git

---

### Solusi 3: Pastikan Laravel Socialite Terinstall

```bash
# Terminal di app/backend folder
composer require laravel/socialite

# Jika sudah ada
composer dump-autoload
```

---

### Solusi 4: Clear Cache & Restart Server

```bash
# Terminal di app/backend folder
php artisan optimize:clear
php artisan cache:clear
php artisan config:clear
php artisan route:cache

# Restart server
php artisan serve
```

---

### Solusi 5: Cek SocialAuthController

File: `app/backend/app/Http/Controllers/Api/SocialAuthController.php`

**Pastikan ada method `redirectToGoogle`:**

```php
public function redirectToGoogle(): RedirectResponse
{
    return Socialite::driver('google')->redirect();
}
```

**Pastikan ada method `handleGoogleCallback`:**

```php
public function handleGoogleCallback()
{
    try {
        $googleUser = Socialite::driver('google')->stateless()->user();

        // ... rest of code

    } catch (\Throwable $e) {
        Log::error('Google OAuth failed', ['error' => $e->getMessage()]);
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        return redirect()->away($frontendUrl . '/login?oauth_error=1');
    }
}
```

---

### Solusi 6: Cek Routes

File: `app/backend/routes/web.php`

**Pastikan ada:**

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SocialAuthController;

Route::get('/auth/google/redirect', [SocialAuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [SocialAuthController::class, 'handleGoogleCallback']);

// ... rest of routes
```

---

### Solusi 7: Cek Frontend Login Component

File: `app/frontend/src/components/Auth/Login.jsx`

**Pastikan ada button:**

```jsx
<Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={() => {
    window.location.href = "http://localhost:8000/auth/google/redirect";
  }}
>
  Lanjutkan dengan Google
</Button>
```

---

### Solusi 8: Cek CORS Configuration

File: `app/backend/config/cors.php`

**Pastikan allowed_origins:**

```php
'allowed_origins' => [
    'http://localhost:3000',
    'http://localhost:3001',
],
```

**Atau di middleware:**

```php
// app/backend/app/Http/Middleware/HandleCors.php

if (in_array($origin, [
    'http://localhost:3000',
    'http://localhost:8000',
])) {
    return $next($request)
        ->header('Access-Control-Allow-Origin', $origin)
        ->header('Access-Control-Allow-Credentials', 'true')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
```

---

## 🧪 Testing Google OAuth

### Test 1: Test Redirect URL

```bash
# Buka di browser
http://localhost:8000/auth/google/redirect

# Seharusnya redirect ke Google login
# Jika error, cek response di browser
```

### Test 2: Test dengan Console

```javascript
// Buka browser console (F12)
// Copy paste ini:
window.location.href = "http://localhost:8000/auth/google/redirect";

// Lihat apakah redirect berfungsi
```

### Test 3: Test dengan curl

```bash
# Terminal
curl -v "http://localhost:8000/auth/google/redirect"

# Lihat response header
```

---

## 🚨 Common Errors & Solutions

### Error 1: "This app isn't verified"

```
Penyebab: OAuth consent screen belum verified
Solusi:
1. Buka Google Cloud Console
2. OAuth consent screen → User Type: Internal
3. Atau submit untuk verification (tunggu 1-2 minggu)
```

### Error 2: "Redirect URI mismatch"

```
Penyebab: URI di kode tidak match dengan Google Cloud
Solusi:
1. Di Google Cloud: Tambah http://localhost:8000/auth/google/callback
2. Di .env: GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
3. Restart Laravel server
```

### Error 3: "Invalid client ID"

```
Penyebab: Client ID atau Secret salah
Solusi:
1. Copy dari Google Cloud Console yang benar
2. Update .env dengan nilai yang benar
3. Restart Laravel server
```

### Error 4: "Too many requests"

```
Penyebab: Rate limiting dari Google
Solusi:
1. Tunggu 30 menit
2. Coba di incognito/private window
3. Jangan test berulang kali dengan cepat
```

### Error 5: "CORS Error"

```
Penyebab: Frontend dan Backend origin berbeda
Solusi:
1. Cek config/cors.php
2. Tambah http://localhost:3000 ke allowed_origins
3. Restart Laravel server
```

### Error 6: "InvalidStateException"

```
Penyebab: State parameter tidak valid
Solusi:
1. Clear browser cookies untuk localhost
2. Clear Laravel session: php artisan session:clear
3. Restart server
4. Coba login lagi
```

---

## 📋 Full Checklist

- [ ] .env file sudah lengkap (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, FRONTEND_URL)
- [ ] Google Cloud Console - OAuth Consent Screen verified/internal
- [ ] Google Cloud Console - Authorized redirect URIs includes http://localhost:8000/auth/google/callback
- [ ] Google Cloud Console - Authorized JavaScript origins includes http://localhost:8000 dan http://localhost:3000
- [ ] Laravel Socialite diinstall: composer require laravel/socialite
- [ ] SocialAuthController ada di app/backend/app/Http/Controllers/Api/
- [ ] Routes di app/backend/routes/web.php sudah registered
- [ ] Frontend button "Lanjutkan dengan Google" sudah ada
- [ ] Laravel cache cleared: php artisan optimize:clear
- [ ] Laravel server running: php artisan serve
- [ ] React server running: npm start
- [ ] Kedua server berjalan di port 8000 dan 3000

---

## 🔗 Resources

- **Google Cloud Console:** https://console.cloud.google.com/
- **Google OAuth Documentation:** https://developers.google.com/identity/protocols/oauth2
- **Laravel Socialite Docs:** https://laravel.com/docs/socialite
- **OAuth 2.0 Playground:** https://developers.google.com/oauthplayground

---

## 🆘 Jika Masih Error

Silakan share:

1. **Error message yang muncul** di browser console
2. **Browser console log** (F12 → Console)
3. **Laravel log** dari `storage/logs/laravel.log`
4. **Network request/response** (F12 → Network)
5. **Sudah coba step mana saja**

Dengan informasi ini, bisa di-debug lebih spesifik!
