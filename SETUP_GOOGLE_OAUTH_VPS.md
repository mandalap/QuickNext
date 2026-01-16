# 🔧 Setup Google OAuth di VPS

## 📋 Informasi Credentials

**Google OAuth Credentials:**
- Client ID: `95469432852-geuf75mjjppn3hr93o8eue1aiuvdj18d.apps.googleusercontent.com`
- Client Secret: `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`

**Production URLs:**
- Backend API: `https://api.quickkasir.com`
- Frontend App: `https://app.quickkasir.com`

---

## 🚀 Step-by-Step Setup

### Step 1: Edit Backend .env File

```bash
cd /var/www/quickkasir/app/backend
nano .env
```

### Step 2: Tambahkan Google OAuth Configuration

Scroll ke bagian bawah file `.env` dan tambahkan:

```env
# ==========================================
# Google OAuth Configuration
# ==========================================
GOOGLE_CLIENT_ID=95469432852-geuf75mjjppn3hr93o8eue1aiuvdj18d.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://api.quickkasir.com/auth/google/callback

# ==========================================
# Frontend URL (for OAuth redirects)
# ==========================================
FRONTEND_URL=https://app.quickkasir.com
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

---

### Step 3: Verifikasi .env File

```bash
# Cek apakah variabel sudah ada
grep -E "GOOGLE_|FRONTEND_URL" .env
```

**Expected output:**
```
GOOGLE_CLIENT_ID=95469432852-geuf75mjjppn3hr93o8eue1aiuvdj18d.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://api.quickkasir.com/auth/google/callback
FRONTEND_URL=https://app.quickkasir.com
```

---

### Step 4: Clear Laravel Config Cache

```bash
cd /var/www/quickkasir/app/backend

# Clear semua cache
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Rebuild config cache
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

### Step 5: Verifikasi Config

```bash
# Test apakah config sudah ter-load
php artisan tinker --execute="echo config('services.google.client_id');"
```

**Expected output:**
```
95469432852-geuf75mjjppn3hr93o8eue1aiuvdj18d.apps.googleusercontent.com
```

---

### Step 6: Restart Backend (Jika Menggunakan PM2)

```bash
# Cek apakah backend running dengan PM2
pm2 list | grep backend

# Jika ada, restart
pm2 restart quickkasir-backend

# Atau restart semua
pm2 restart all
```

---

## ✅ Verifikasi Final

### 1. Cek Environment Variables

```bash
cd /var/www/quickkasir/app/backend
php artisan tinker --execute="
echo 'GOOGLE_CLIENT_ID: ' . config('services.google.client_id') . PHP_EOL;
echo 'GOOGLE_REDIRECT_URI: ' . config('services.google.redirect') . PHP_EOL;
echo 'FRONTEND_URL: ' . env('FRONTEND_URL') . PHP_EOL;
"
```

**Expected output:**
```
GOOGLE_CLIENT_ID: 95469432852-geuf75mjjppn3hr93o8eue1aiuvdj18d.apps.googleusercontent.com
GOOGLE_REDIRECT_URI: https://api.quickkasir.com/auth/google/callback
FRONTEND_URL: https://app.quickkasir.com
```

### 2. Test OAuth Endpoint

```bash
# Test redirect endpoint (harus redirect ke Google)
curl -I https://api.quickkasir.com/auth/google/redirect
```

**Expected:** HTTP 302 redirect ke Google OAuth

---

## 🔍 Troubleshooting

### Error: "Config cache not cleared"

```bash
# Hapus manual cache files
rm -f bootstrap/cache/config.php
rm -f bootstrap/cache/routes-v7.php
rm -f bootstrap/cache/services.php

# Rebuild
php artisan config:cache
php artisan route:cache
```

### Error: "Permission denied"

```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/quickkasir/app/backend
sudo chmod -R 775 /var/www/quickkasir/app/backend/storage
sudo chmod -R 775 /var/www/quickkasir/app/backend/bootstrap/cache
```

### Error: "Environment variable not found"

1. Pastikan `.env` file ada di `/var/www/quickkasir/app/backend/.env`
2. Pastikan tidak ada typo di nama variabel
3. Pastikan tidak ada spasi sebelum/t setelah `=`
4. Clear config cache: `php artisan config:clear`

---

## 📝 Checklist

- [ ] Google OAuth credentials ditambahkan ke `.env`
- [ ] `GOOGLE_REDIRECT_URI` set ke `https://api.quickkasir.com/auth/google/callback`
- [ ] `FRONTEND_URL` set ke `https://app.quickkasir.com`
- [ ] Config cache sudah di-clear dan di-rebuild
- [ ] Backend sudah di-restart (jika perlu)
- [ ] Test OAuth endpoint berhasil

---

## 🔐 Security Notes

1. **Jangan** commit `.env` file ke git
2. **Jangan** share credentials di public
3. **Regenerate** credentials jika ter-expose
4. **Gunakan** HTTPS untuk semua production URLs

---

**Setelah setup, test login dengan Google di `https://app.quickkasir.com/login`!**
