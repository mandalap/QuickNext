# 🔧 Fix quickkasir.com Masih Menampilkan Laravel

## ❌ Masalah

Setelah rebuild, `quickkasir.com` masih menampilkan halaman Laravel (bukan Next.js QuickKasir).

---

## ✅ SOLUSI: Diagnosis Lengkap

```bash
# 1. Cek apakah Next.js server merespons dengan benar
echo "=== Testing Next.js Direct (127.0.0.1:3001) ==="
curl -s http://127.0.0.1:3001 | head -50

# 2. Cek apakah ada "Laravel" di response Next.js
echo ""
echo "=== Checking for Laravel in Next.js Response ==="
curl -s http://127.0.0.1:3001 | grep -i "laravel" | head -5

# 3. Cek apakah ada "QuickKasir" di response Next.js
echo ""
echo "=== Checking for QuickKasir in Next.js Response ==="
curl -s http://127.0.0.1:3001 | grep -i "quickkasir" | head -5

# 4. Cek response melalui Nginx
echo ""
echo "=== Testing via Nginx (www.quickkasir.com) ==="
curl -s http://www.quickkasir.com | head -50

# 5. Cek apakah Nginx proxy ke port yang benar
echo ""
echo "=== Checking Nginx proxy_pass ==="
sudo grep "proxy_pass" /etc/nginx/sites-available/quickkasir-landing

# 6. Cek apakah ada config lain yang handle quickkasir.com
echo ""
echo "=== Checking for other configs handling quickkasir.com ==="
sudo grep -r "server_name.*quickkasir.com" /etc/nginx/sites-available/ /etc/nginx/sites-enabled/ 2>/dev/null

# 7. Cek PM2 status
echo ""
echo "=== PM2 Status ==="
pm2 status | grep landing

# 8. Cek apakah port 3001 listening
echo ""
echo "=== Checking Port 3001 ==="
sudo ss -tlnp | grep 3001 || sudo netstat -tlnp | grep 3001 || echo "Command not available"

# 9. Cek Nginx error log
echo ""
echo "=== Nginx Error Log (Last 10 lines) ==="
sudo tail -10 /var/log/nginx/error.log
```

---

## 🔍 Analisis Hasil

### Jika Next.js Direct Return "Laravel":
- ❌ **Next.js server salah** → Next.js mungkin tidak running dengan benar atau build salah

### Jika Next.js Direct Return "QuickKasir" tapi Nginx Return "Laravel":
- ❌ **Nginx config salah** → Masih proxy ke Laravel (port 8000) atau ada config lain yang override

### Jika Keduanya Return "Laravel":
- ❌ **Next.js build salah** → Perlu rebuild ulang atau cek source code

---

## 🔧 Fix Berdasarkan Hasil

### Fix 1: Pastikan Next.js Server Running dengan Benar

```bash
cd /var/www/quickkasir/app/beranda

# Stop PM2
pm2 stop quickkasir-landing

# Cek apakah .next folder ada dan benar
ls -la .next/ | head -10

# Restart PM2
pm2 restart quickkasir-landing

# Cek logs
pm2 logs quickkasir-landing --lines 20 --nostream
```

### Fix 2: Pastikan Nginx Proxy ke Port 3001

```bash
# Cek config
sudo cat /etc/nginx/sites-available/quickkasir-landing | grep -A 10 "location /"

# Pastikan proxy_pass ke port 3001
sudo sed -i 's|proxy_pass http://127.0.0.1:8000|proxy_pass http://127.0.0.1:3001|g' /etc/nginx/sites-available/quickkasir-landing

# Test & Reload
sudo nginx -t && sudo systemctl reload nginx
```

### Fix 3: Cek Apakah Ada Config Lain yang Override

```bash
# Cek semua config yang aktif
sudo nginx -T 2>/dev/null | grep -B 5 -A 10 "server_name.*quickkasir.com"

# Jika ada config lain, disable atau hapus
```

---

**Jalankan diagnosis command di atas dan kirim hasilnya!**
