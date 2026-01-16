# 🔧 Fix quickkasir.com - Reload & Verify

## ✅ Status Saat Ini

- ✅ Config sudah benar: `proxy_pass http://127.0.0.1:3001;`
- ✅ Next.js server running (PM2: online)
- ❌ Tapi masih tidak menampilkan QuickKasir

**Kemungkinan masalah:**
1. Nginx belum reload setelah config diubah
2. Next.js server tidak merespons dengan benar
3. Browser cache

---

## ✅ SOLUSI: Reload & Test

```bash
# 1. Test Nginx config
sudo nginx -t

# 2. Reload Nginx (pastikan config ter-apply)
sudo systemctl reload nginx

# 3. Atau restart jika reload tidak cukup
sudo systemctl restart nginx

# 4. Test direct ke Next.js server
echo "=== Testing Next.js Direct ==="
curl -s http://127.0.0.1:3001 | head -20

# 5. Test melalui Nginx (quickkasir.com)
echo ""
echo "=== Testing via Nginx (quickkasir.com) ==="
curl -s http://quickkasir.com | head -20

# 6. Test www.quickkasir.com
echo ""
echo "=== Testing via Nginx (www.quickkasir.com) ==="
curl -s http://www.quickkasir.com | head -20

# 7. Cek apakah Next.js merespons dengan benar
echo ""
echo "=== Checking Next.js Response ==="
curl -s http://127.0.0.1:3001 | grep -i "quickkasir" | head -3

# 8. Cek Nginx error log
echo ""
echo "=== Nginx Error Log (Last 5 lines) ==="
sudo tail -5 /var/log/nginx/error.log
```

---

## 🔍 Jika Masih Tidak Bekerja

### Cek Apakah Next.js Server Merespons dengan Benar

```bash
# Test apakah Next.js return HTML yang benar
curl -s http://127.0.0.1:3001 | grep -i "quickkasir\|laravel" | head -5
```

**Jika return "Laravel":**
- Next.js server mungkin tidak running dengan benar
- Atau Next.js build tidak benar

**Jika return "QuickKasir":**
- Masalah di Nginx config atau cache

---

## 🧪 Test di Browser

1. **Clear browser cache:**
   - Chrome: `Ctrl+Shift+Delete` → Clear cache
   - Atau buka Incognito mode

2. **Buka:** `http://quickkasir.com` atau `http://www.quickkasir.com`

3. **Harus menampilkan:** Landing page QuickKasir

---

**Jalankan command di atas dan kirim hasilnya!**
