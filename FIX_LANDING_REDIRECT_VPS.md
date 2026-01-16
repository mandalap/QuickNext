# 🔧 Fix Landing Page Login Redirect di VPS

## ❌ Masalah Ditemukan

Code di VPS masih **versi lama**! Masih menggunakan:

```javascript
process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
```

Padahal code terbaru sudah menggunakan `NEXT_PUBLIC_APP_URL`.

---

## ✅ SOLUSI: Update Code dan Rebuild

Jalankan command berikut di VPS:

```bash
# 1. Pull code terbaru dari GitHub
cd /var/www/quickkasir
git pull origin main

# 2. Verifikasi code sudah ter-update
cd app/beranda
grep -A 5 "redirectToLogin" app/page.js
# Harus muncul: NEXT_PUBLIC_APP_URL (bukan NEXT_PUBLIC_FRONTEND_URL)

# 3. Pastikan environment variables
cat .env.production
# Harus ada: NEXT_PUBLIC_APP_URL=http://app.quickkasir.com

# 4. Clear build lama dan rebuild
rm -rf .next
npm run build

# 5. Restart PM2
pm2 restart quickkasir-landing

# 6. Cek logs
pm2 logs quickkasir-landing --lines 10 --nostream
```

---

## 🔍 Verifikasi Setelah Fix

Setelah menjalankan command di atas:

1. **Cek code sudah ter-update:**

```bash
cd /var/www/quickkasir/app/beranda
grep -A 5 "redirectToLogin" app/page.js
```

**Expected output:**

```javascript
const frontendUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  ...
```

2. **Test di browser:**
   - Buka `https://www.quickkasir.com`
   - Klik button "Login" atau "Coba Gratis"
   - Harus redirect ke `http://app.quickkasir.com/login` (bukan localhost)

---

## 📝 Checklist

- [ ] `git pull origin main` - Code terbaru sudah di-pull
- [ ] Code sudah ter-update (cek dengan grep)
- [ ] `.env.production` sudah ada `NEXT_PUBLIC_APP_URL`
- [ ] Build sudah di-rebuild (rm -rf .next && npm run build)
- [ ] PM2 sudah di-restart
- [ ] Test di browser - redirect sudah benar

---

**Jalankan command di atas, lalu test lagi di browser!**
