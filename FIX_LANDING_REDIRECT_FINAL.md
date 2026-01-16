# ✅ Fix Landing Page Login Redirect - Final Step

## ✅ Status Saat Ini

- ✅ Code sudah ter-update (menggunakan `NEXT_PUBLIC_APP_URL`)
- ✅ Environment variable sudah benar (`NEXT_PUBLIC_APP_URL=http://app.quickkasir.com`)
- ⚠️ **Build masih lama** - Perlu rebuild!

---

## 🔧 SOLUSI: Rebuild dan Restart

Jalankan command berikut di VPS:

```bash
cd /var/www/quickkasir/app/beranda

# 1. Hapus build lama (penting untuk pastikan env ter-update)
rm -rf .next

# 2. Rebuild dengan environment terbaru
npm run build

# 3. Restart PM2 agar menggunakan build baru
pm2 restart quickkasir-landing

# 4. Cek logs untuk memastikan tidak ada error
pm2 logs quickkasir-landing --lines 20 --nostream

# 5. Verifikasi build sudah ter-update
ls -la .next/static/chunks/ | head -3
```

---

## 🔍 Verifikasi

Setelah rebuild, test di browser:

1. **Hard refresh browser:**
   - Chrome/Edge: `Ctrl+Shift+R` atau `Ctrl+F5`
   - Firefox: `Ctrl+Shift+R`
   - Atau buka di Incognito/Private mode

2. **Buka:** `https://www.quickkasir.com`

3. **Klik button "Login" atau "Coba Gratis"**

4. **Harus redirect ke:** `http://app.quickkasir.com/login` ✅

---

## 🐛 Jika Masih Redirect ke Localhost

### Opsi 1: Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R`
- Atau buka di Incognito mode

### Opsi 2: Cek Build Output
```bash
cd /var/www/quickkasir/app/beranda

# Cek apakah env ter-bundle di build
grep -r "app.quickkasir.com" .next/static 2>/dev/null | head -3

# Atau cek apakah masih ada localhost
grep -r "localhost:3000" .next/static 2>/dev/null | head -3
```

### Opsi 3: Force Rebuild dengan Clear Cache
```bash
cd /var/www/quickkasir/app/beranda

# Clear semua
rm -rf .next node_modules/.cache

# Rebuild
npm run build

# Restart
pm2 restart quickkasir-landing
```

---

## 📝 Checklist Final

- [x] Code sudah ter-update ✅
- [x] Environment variable sudah benar ✅
- [ ] Build sudah di-rebuild (rm -rf .next && npm run build)
- [ ] PM2 sudah di-restart
- [ ] Browser cache sudah di-clear (hard refresh)
- [ ] Test redirect - harus ke app.quickkasir.com

---

**Jalankan rebuild command di atas, lalu test lagi dengan hard refresh browser!**
