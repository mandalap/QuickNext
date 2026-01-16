# 🔧 Fix Issues VPS - QuickKasir

## ❌ Masalah yang Ditemukan

1. **Landing page login redirect ke localhost** → Harus ke `app.quickkasir.com`
2. **admin.quickkasir.com error 500** → Server error
3. **app.quickkasir.com hanya loading** → Frontend tidak accessible

---

## ✅ SOLUSI 1: Fix Login Redirect di Landing Page

### Problem:

Button "Login" / "Coba Gratis" mengarah ke `http://localhost:3000/login` padahal harus ke `http://app.quickkasir.com/login`

### Fix:

File sudah di-update: `app/beranda/app/page.js`

**Perubahan:**

- Menggunakan `NEXT_PUBLIC_APP_URL` dari environment
- Fallback ke `app.quickkasir.com` untuk production
- Fallback ke `localhost:3000` hanya untuk development

### Di VPS, rebuild landing page:

```bash
cd /var/www/quickkasir/app/beranda

# Pastikan .env.production sudah benar
cat .env.production
# Harus ada: NEXT_PUBLIC_APP_URL=http://app.quickkasir.com

# Opsi 1: Build langsung (biasanya cukup)
npm run build

# Opsi 2: Clear build lama jika ada masalah (optional)
# rm -rf .next
# npm run build

# Restart PM2
pm2 restart quickkasir-landing
```

---

## ✅ SOLUSI 2: Fix admin.quickkasir.com Error 500

### Problem:

Error 500 biasanya karena:

- Permission issues
- PHP-FPM tidak running
- Laravel error
- Nginx config salah

### Debug Steps:

#### 2.1 Cek Nginx Error Log

```bash
sudo tail -f /var/log/nginx/error.log
```

#### 2.2 Cek Laravel Log

```bash
tail -f /var/www/quickkasir/app/backend/storage/logs/laravel.log
```

#### 2.3 Cek PHP-FPM Status

```bash
sudo systemctl status php8.3-fpm
sudo systemctl restart php8.3-fpm
```

#### 2.4 Cek Nginx Config

```bash
sudo nginx -t
```

#### 2.5 Cek Permissions

```bash
cd /var/www/quickkasir/app/backend
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

#### 2.6 Test PHP-FPM Connection

```bash
# Test apakah PHP-FPM bisa diakses
ls -la /var/run/php/php8.3-fpm.sock

# Jika tidak ada, restart PHP-FPM
sudo systemctl restart php8.3-fpm
```

#### 2.7 Cek Laravel .env

```bash
cd /var/www/quickkasir/app/backend
cat .env | grep APP_URL
# Harus: APP_URL=http://admin.quickkasir.com

# Clear cache
php artisan config:clear
php artisan config:cache
```

---

## ✅ SOLUSI 3: Fix app.quickkasir.com Loading

### Problem:

Frontend hanya loading, tidak muncul. Kemungkinan:

- PM2 tidak running
- Port 3000 tidak accessible
- Nginx proxy tidak bekerja
- Frontend build error

### Debug Steps:

#### 3.1 Cek PM2 Status

```bash
pm2 status
pm2 logs quickkasir-frontend
```

**Jika tidak running:**

```bash
cd /var/www/quickkasir
pm2 start ecosystem.config.js
pm2 save
```

#### 3.2 Cek Port 3000

```bash
# Cek apakah port 3000 listening
sudo netstat -tulpn | grep :3000

# Atau
sudo ss -tulpn | grep :3000
```

**Jika tidak ada, restart PM2:**

```bash
pm2 restart quickkasir-frontend
```

#### 3.3 Cek Nginx Proxy

```bash
# Test nginx config
sudo nginx -t

# Cek config untuk app.quickkasir.com
sudo cat /etc/nginx/sites-available/quickkasir-app

# Reload nginx
sudo systemctl reload nginx
```

#### 3.4 Test Direct Access

```bash
# Test apakah frontend bisa diakses langsung via localhost
curl http://127.0.0.1:3000

# Jika error, cek PM2 logs
pm2 logs quickkasir-frontend --lines 50
```

#### 3.5 Cek Environment Variables

```bash
cd /var/www/quickkasir/app/frontend
cat .env.production

# Pastikan ada:
# REACT_APP_BACKEND_URL=http://api.quickkasir.com
# REACT_APP_API_BASE_URL=http://api.quickkasir.com/api
```

#### 3.6 Rebuild Frontend

```bash
cd /var/www/quickkasir/app/frontend

# Opsi 1: Build langsung (biasanya cukup)
npm run build

# Opsi 2: Clear build lama jika ada masalah (optional)
# rm -rf build
# npm run build

# Restart PM2
pm2 restart quickkasir-frontend
```

---

## 🔍 Quick Diagnostic Commands

Jalankan semua command ini untuk diagnostic lengkap:

```bash
# 1. Cek semua services
sudo systemctl status nginx
sudo systemctl status php8.3-fpm
sudo systemctl status mysql
pm2 status

# 2. Cek ports
sudo netstat -tulpn | grep -E ':(80|3000|3001)'

# 3. Cek Nginx configs
sudo nginx -t
ls -la /etc/nginx/sites-enabled/

# 4. Cek PM2 logs
pm2 logs --lines 20

# 5. Cek Laravel logs
tail -20 /var/www/quickkasir/app/backend/storage/logs/laravel.log

# 6. Test direct access
curl -I http://127.0.0.1:3000  # Frontend
curl -I http://127.0.0.1:3001  # Landing
curl -I http://127.0.0.1/api   # API (via Nginx)
```

---

## 📝 Checklist Fix

### Untuk Landing Page Login Redirect:

- [ ] File `app/beranda/app/page.js` sudah di-update (✅ Done)
- [ ] `.env.production` di VPS sudah ada `NEXT_PUBLIC_APP_URL=http://app.quickkasir.com`
- [ ] Rebuild landing page: `npm run build`
- [ ] Restart PM2: `pm2 restart quickkasir-landing`

### Untuk admin.quickkasir.com Error 500:

- [ ] Cek Nginx error log
- [ ] Cek Laravel log
- [ ] Cek PHP-FPM status
- [ ] Fix permissions (storage, bootstrap/cache)
- [ ] Clear Laravel cache
- [ ] Test PHP-FPM socket

### Untuk app.quickkasir.com Loading:

- [ ] Cek PM2 status (harus running)
- [ ] Cek port 3000 (harus listening)
- [ ] Cek Nginx proxy config
- [ ] Cek environment variables
- [ ] Rebuild frontend jika perlu
- [ ] Restart PM2

---

## 🚀 Quick Fix Commands (Jalankan di VPS)

```bash
# 1. Fix Landing Page (rebuild dengan env baru)
cd /var/www/quickkasir/app/beranda
echo "NEXT_PUBLIC_APP_URL=http://app.quickkasir.com" >> .env.production
# Build langsung (tidak perlu hapus .next, Next.js akan overwrite)
npm run build
pm2 restart quickkasir-landing

# 2. Fix Admin 500 Error
cd /var/www/quickkasir/app/backend
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
sudo systemctl restart php8.3-fpm
php artisan config:clear
php artisan config:cache

# 3. Fix Frontend Loading
pm2 restart quickkasir-frontend
pm2 logs quickkasir-frontend --lines 50

# 4. Reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎯 Expected Results

Setelah fix:

1. **www.quickkasir.com** → Landing page muncul ✅
2. **Klik Login** → Redirect ke `http://app.quickkasir.com/login` ✅
3. **admin.quickkasir.com** → Laravel admin panel muncul (bukan 500) ✅
4. **app.quickkasir.com** → Frontend React muncul (bukan loading) ✅
5. **api.quickkasir.com** → API accessible ✅

---

**Last Updated:** 15 Januari 2026
