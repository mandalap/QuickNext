# 🔍 Cek Landing Page Login Redirect - VPS Diagnostic

## 📋 Command untuk Cek di VPS

Jalankan command berikut di VPS dan kirimkan hasilnya:

---

## ✅ STEP 1: Cek Code Terbaru

```bash
cd /var/www/quickkasir
git log --oneline -5
git status
```

**Expected:** Harus ada commit terbaru dengan message "fix: Update landing page login redirect"

---

## ✅ STEP 2: Cek File Code

```bash
cd /var/www/quickkasir/app/beranda/app
grep -A 5 "redirectToLogin" page.js
```

**Expected:** Harus ada `NEXT_PUBLIC_APP_URL` atau `app.quickkasir.com`

---

## ✅ STEP 3: Cek Environment Variables

```bash
cd /var/www/quickkasir/app/beranda
cat .env.production
echo "---"
cat .env.local 2>/dev/null || echo "No .env.local"
```

**Expected:** Harus ada `NEXT_PUBLIC_APP_URL=http://app.quickkasir.com`

---

## ✅ STEP 4: Cek Build Output

```bash
cd /var/www/quickkasir/app/beranda
# Cek apakah ada file build
ls -la .next/static/chunks/ | head -5

# Cek environment di build (jika bisa)
grep -r "localhost:3000" .next/static 2>/dev/null | head -3 || echo "No localhost found in build"
```

---

## ✅ STEP 5: Cek PM2 Status

```bash
pm2 status
pm2 info quickkasir-landing
pm2 logs quickkasir-landing --lines 20 --nostream
```

---

## ✅ STEP 6: Test Build dengan Env Baru

```bash
cd /var/www/quickkasir/app/beranda

# Pastikan env ada
echo "NEXT_PUBLIC_APP_URL=http://app.quickkasir.com" > .env.production
echo "NEXT_PUBLIC_API_URL=http://api.quickkasir.com" >> .env.production
cat .env.production

# Rebuild
npm run build

# Restart PM2
pm2 restart quickkasir-landing
```

---

## ✅ STEP 7: Cek Browser Console (Setelah Rebuild)

Setelah rebuild, buka browser:
1. Buka `https://www.quickkasir.com`
2. Tekan F12 (Developer Tools)
3. Buka tab "Console"
4. Klik button "Login" atau "Coba Gratis"
5. Lihat di console apakah ada log atau error
6. Lihat Network tab, cek redirect URL

---

## 🔧 Quick Fix (Jalankan Semua)

```bash
# 1. Pull latest code
cd /var/www/quickkasir
git pull origin main

# 2. Update environment
cd app/beranda
cat > .env.production << EOF
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://api.quickkasir.com
NEXT_PUBLIC_APP_URL=http://app.quickkasir.com
EOF

# 3. Clear build dan rebuild
rm -rf .next
npm run build

# 4. Restart PM2
pm2 restart quickkasir-landing

# 5. Cek logs
pm2 logs quickkasir-landing --lines 10
```

---

## 📝 Kirimkan Hasil Command Ini:

Jalankan command berikut dan kirimkan hasilnya:

```bash
cd /var/www/quickkasir/app/beranda

echo "=== 1. Git Status ==="
cd /var/www/quickkasir
git log --oneline -3
git status

echo ""
echo "=== 2. Environment Variables ==="
cd /var/www/quickkasir/app/beranda
cat .env.production 2>/dev/null || echo "No .env.production"
cat .env.local 2>/dev/null || echo "No .env.local"

echo ""
echo "=== 3. Code Check ==="
grep -A 3 "redirectToLogin" app/page.js | head -10

echo ""
echo "=== 4. PM2 Status ==="
pm2 status
pm2 info quickkasir-landing | grep -E "status|restarts|uptime"

echo ""
echo "=== 5. Build Check ==="
ls -la .next/static/chunks/ 2>/dev/null | head -3 || echo "No .next folder"
```

---

## 🎯 Expected Fix

Setelah semua command di atas, login redirect harus mengarah ke:
- ✅ `http://app.quickkasir.com/login` (production)
- ❌ Bukan `http://localhost:3000/login`

---

**Kirimkan hasil command di atas, saya akan analisis lebih lanjut!**
