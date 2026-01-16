# 🔧 Fix: Google OAuth Redirect ke localhost

## ❌ Masalah

Setelah login dengan Google, redirect masih mengarah ke `http://localhost:3000/login?oauth_error=1` padahal seharusnya ke `https://app.quickkasir.com/login`.

## 🔍 Root Cause

1. **Backend `.env` belum di-update** dengan `FRONTEND_URL=https://app.quickkasir.com`
2. **Config cache belum di-clear** setelah update `.env`
3. **Frontend build masih menggunakan environment variable lama**

## ✅ Solusi

### STEP 1: Update Backend .env

```bash
cd /var/www/quickkasir/app/backend

# Backup .env dulu
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update FRONTEND_URL
sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://app.quickkasir.com|g' .env

# Verifikasi
echo "=== FRONTEND_URL ==="
grep "FRONTEND_URL" .env
```

### STEP 2: Clear Laravel Config Cache

```bash
cd /var/www/quickkasir/app/backend

# Clear semua cache
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# Re-cache config (ini akan membaca .env yang baru)
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### STEP 3: Verifikasi Backend Config

```bash
cd /var/www/quickkasir/app/backend

# Test dengan tinker
php artisan tinker --execute="
echo 'FRONTEND_URL: ' . env('FRONTEND_URL') . PHP_EOL;
echo 'APP_ENV: ' . env('APP_ENV') . PHP_EOL;
"
```

**Expected output:**
```
FRONTEND_URL: https://app.quickkasir.com
APP_ENV: production
```

### STEP 4: Update Frontend .env.production

```bash
cd /var/www/quickkasir/app/frontend

# Buat/update .env.production
cat > .env.production << 'EOF'
NODE_ENV=production
REACT_APP_BACKEND_URL=https://api.quickkasir.com
REACT_APP_API_BASE_URL=https://api.quickkasir.com/api
REACT_APP_API_URL=https://api.quickkasir.com/api
EOF

# Verifikasi
echo "=== Frontend .env.production ==="
cat .env.production
```

### STEP 5: Rebuild Frontend

```bash
cd /var/www/quickkasir/app/frontend

# Stop PM2 (jika running)
pm2 stop quickkasir-frontend 2>/dev/null || echo "Frontend tidak running"

# Backup build lama
cp -r build build.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "No build to backup"

# Remove old build
rm -rf build

# Rebuild dengan production env
npm run build

# Fix permissions
sudo chown -R www-data:www-data build
sudo chmod -R 755 build
```

### STEP 6: Pull Latest Code dari GitHub

```bash
cd /var/www/quickkasir

# Pull latest code (termasuk fix SocialAuthController.php)
git pull origin main

# Atau jika branch berbeda
git pull origin master
```

### STEP 7: Restart Services

```bash
# Restart PHP-FPM (jika perlu)
sudo systemctl restart php8.3-fpm

# Restart Nginx (jika perlu)
sudo systemctl restart nginx

# Restart PM2 (jika frontend dijalankan dengan PM2)
pm2 restart all
```

## 🧪 Testing

1. **Test di browser:**
   - Buka: `https://app.quickkasir.com/login`
   - Klik: "Lanjutkan dengan Google"
   - Harus redirect ke Google OAuth consent screen
   - Setelah approve, harus redirect ke `https://app.quickkasir.com/login/sso?token=...` (bukan localhost)

2. **Check backend logs:**
   ```bash
   tail -f /var/www/quickkasir/app/backend/storage/logs/laravel.log | grep -i "oauth\|google"
   ```

3. **Check frontend console:**
   - Buka browser DevTools (F12)
   - Check Console untuk error
   - Check Network tab untuk request ke backend

## 🔍 Troubleshooting

### Masalah: Masih redirect ke localhost

**Solusi:**
1. Pastikan `.env` sudah di-update dengan benar
2. Pastikan config cache sudah di-clear dan di-rebuild
3. Check apakah ada hardcoded `localhost` di kode:
   ```bash
   grep -r "localhost:3000" /var/www/quickkasir/app/backend/app/
   ```

### Masalah: Config cache tidak ter-update

**Solusi:**
```bash
cd /var/www/quickkasir/app/backend

# Force clear semua cache
php artisan optimize:clear

# Re-cache
php artisan optimize
```

### Masalah: Frontend build masih menggunakan env lama

**Solusi:**
```bash
cd /var/www/quickkasir/app/frontend

# Pastikan .env.production ada dan benar
cat .env.production

# Rebuild dengan force
rm -rf build node_modules/.cache
npm run build
```

## 📝 Checklist

- [ ] Backend `.env` sudah di-update dengan `FRONTEND_URL=https://app.quickkasir.com`
- [ ] Laravel config cache sudah di-clear dan di-rebuild
- [ ] Frontend `.env.production` sudah di-set dengan benar
- [ ] Frontend sudah di-rebuild dengan environment variable baru
- [ ] Latest code sudah di-pull dari GitHub
- [ ] Services sudah di-restart
- [ ] Test di browser berhasil redirect ke `https://app.quickkasir.com` (bukan localhost)
