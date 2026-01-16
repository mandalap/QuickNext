# 🔧 Fix Frontend Google OAuth - Masih Mengarah ke localhost

## ❌ Masalah

Ketika klik "Lanjutkan dengan Google" di `https://app.quickkasir.com/login`:
- ❌ Mengarah ke `http://localhost:3000/login?oauth_error=1`
- ❌ Tidak langsung ke Google OAuth

**Penyebab:** Frontend masih menggunakan `localhost` karena:
1. `REACT_APP_BACKEND_URL` belum di-set di production
2. Frontend build belum menggunakan environment variable yang benar

---

## ✅ SOLUSI: Fix Environment Variables & Rebuild

### Step 1: Cek Environment Variables Frontend

```bash
cd /var/www/quickkasir/app/frontend

# Cek apakah .env.production ada
ls -la .env.production 2>/dev/null || echo "⚠️ .env.production tidak ada!"

# Cek isinya
cat .env.production 2>/dev/null || echo "⚠️ File tidak ada!"
```

---

### Step 2: Buat/Update .env.production

```bash
cd /var/www/quickkasir/app/frontend

# Buat atau update .env.production
cat > .env.production << 'EOF'
NODE_ENV=production
REACT_APP_BACKEND_URL=https://api.quickkasir.com
REACT_APP_API_BASE_URL=https://api.quickkasir.com/api
REACT_APP_API_URL=https://api.quickkasir.com/api
EOF

# Verifikasi
cat .env.production
```

---

### Step 3: Rebuild Frontend

```bash
cd /var/www/quickkasir/app/frontend

# Stop PM2 (jika running)
pm2 stop quickkasir-frontend 2>/dev/null || echo "Frontend tidak running"

# Backup build lama (optional)
cp -r build build.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "No build to backup"

# Remove old build
rm -rf build

# Rebuild dengan production env
npm run build

# Fix permissions
sudo chown -R www-data:www-data build
sudo chmod -R 755 build

# Restart PM2 (jika perlu)
# pm2 restart quickkasir-frontend
```

---

### Step 4: Verifikasi Backend .env

```bash
cd /var/www/quickkasir/app/backend

# Cek FRONTEND_URL
grep "FRONTEND_URL" .env

# Harus ada:
# FRONTEND_URL=https://app.quickkasir.com
```

**Jika belum ada, tambahkan:**

```bash
echo "FRONTEND_URL=https://app.quickkasir.com" >> .env

# Clear cache
php artisan config:clear
php artisan config:cache
```

---

### Step 5: Test

1. **Buka:** `https://app.quickkasir.com/login`
2. **Klik:** "Lanjutkan dengan Google"
3. **Harus:** Redirect langsung ke Google OAuth (bukan localhost)

---

## 🔍 Troubleshooting

### Masih Mengarah ke localhost?

1. **Cek apakah build menggunakan env yang benar:**
   ```bash
   # Cek di build/static/js/ apakah ada localhost
   grep -r "localhost" /var/www/quickkasir/app/frontend/build/static/js/ | head -3
   ```

2. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R`
   - Atau buka Incognito

3. **Cek apakah Nginx serve build yang benar:**
   ```bash
   # Cek apakah build folder ada
   ls -la /var/www/quickkasir/app/frontend/build/
   ```

---

**Jalankan command di atas untuk fix Google OAuth redirect!**
