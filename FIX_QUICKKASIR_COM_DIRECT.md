# 🔧 Fix quickkasir.com - Direct Check & Fix

## 🔍 Cek Config Landing Page Secara Langsung

Jalankan command ini untuk cek config lengkap:

```bash
# 1. Cek config landing page lengkap
echo "=== Full Landing Page Config ==="
sudo cat /etc/nginx/sites-available/quickkasir-landing

# 2. Cek apakah proxy_pass ke port 3001
echo ""
echo "=== Checking proxy_pass ==="
sudo grep "proxy_pass" /etc/nginx/sites-available/quickkasir-landing

# 3. Cek location / block
echo ""
echo "=== Location / Block ==="
sudo sed -n '/location \//,/^[[:space:]]*}/p' /etc/nginx/sites-available/quickkasir-landing
```

---

## ✅ Fix Langsung

Jika `proxy_pass` masih ke port 8000, fix dengan:

```bash
# Fix proxy_pass ke port 3001
sudo sed -i 's|proxy_pass http://127.0.0.1:8000|proxy_pass http://127.0.0.1:3001|g' /etc/nginx/sites-available/quickkasir-landing

# Verifikasi
sudo grep "proxy_pass" /etc/nginx/sites-available/quickkasir-landing

# Test & Reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🧪 Test Setelah Fix

```bash
# Test dengan curl
curl -I http://quickkasir.com 2>&1 | head -10

# Cek response body
curl -s http://quickkasir.com | head -20
```

**Expected:** Harus ada "QuickKasir" di response, bukan "Laravel"

---

**Jalankan command di atas dan kirim hasilnya!**
