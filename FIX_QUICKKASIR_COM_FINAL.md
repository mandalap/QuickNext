# 🔧 Fix quickkasir.com - Final Solution

## ✅ Diagnosis Hasil

- ✅ Config landing page ada dan sudah di-enable
- ✅ Next.js server running (PM2: online)
- ✅ Next.js bisa diakses langsung (curl: 200 OK)
- ✅ Tidak ada config lain yang handle `quickkasir.com`

**Tapi masih menampilkan Laravel!**

---

## 🔍 Cek Config Lengkap

Jalankan command ini untuk cek apakah `proxy_pass` sudah benar:

```bash
# Cek proxy_pass di config landing
sudo grep -A 10 "location /" /etc/nginx/sites-available/quickkasir-landing | grep proxy_pass
```

**Harus muncul:** `proxy_pass http://127.0.0.1:3001;`

**Jika muncul:** `proxy_pass http://127.0.0.1:8000;` → **INI MASALAHNYA!**

---

## ✅ SOLUSI: Fix Config & Reload

```bash
# 1. Cek config lengkap
sudo cat /etc/nginx/sites-available/quickkasir-landing

# 2. Pastikan proxy_pass ke port 3001 (Next.js), bukan 8000 (Laravel)
sudo sed -i 's|proxy_pass http://127.0.0.1:8000|proxy_pass http://127.0.0.1:3001|g' /etc/nginx/sites-available/quickkasir-landing

# 3. Verifikasi perubahan
echo "=== Verifying proxy_pass ==="
sudo grep "proxy_pass" /etc/nginx/sites-available/quickkasir-landing

# 4. Test Nginx config
sudo nginx -t

# 5. Reload Nginx (bukan restart, reload lebih aman)
sudo systemctl reload nginx

# 6. Atau restart jika reload tidak cukup
sudo systemctl restart nginx

# 7. Verifikasi
echo ""
echo "=== Testing ==="
curl -I http://quickkasir.com 2>&1 | head -10
```

---

## 🧪 Test di Browser

1. **Clear browser cache:**
   - Chrome: `Ctrl+Shift+Delete` → Clear cache
   - Atau buka Incognito mode

2. **Buka:** `http://quickkasir.com` atau `https://www.quickkasir.com`

3. **Harus menampilkan:** Landing page QuickKasir (bukan Laravel)

---

## 🔍 Jika Masih Menampilkan Laravel

### Cek Nginx Error Log

```bash
sudo tail -20 /var/log/nginx/error.log
```

### Cek Apakah Ada Default Config

```bash
ls -la /etc/nginx/sites-enabled/ | grep default
# Jika ada, hapus: sudo rm /etc/nginx/sites-enabled/default
```

### Cek Nginx Config Priority

```bash
# Nginx akan menggunakan config pertama yang match
# Pastikan landing config di-load sebelum config lain
sudo nginx -T 2>/dev/null | grep -A 5 "server_name.*quickkasir.com" | head -20
```

---

## 📝 Checklist

- [ ] Config `proxy_pass` mengarah ke `http://127.0.0.1:3001` (Next.js)
- [ ] Nginx config test berhasil
- [ ] Nginx reloaded/restarted
- [ ] Browser cache cleared
- [ ] Test di browser - harus menampilkan landing page QuickKasir

---

**Jalankan command di atas untuk fix!**
