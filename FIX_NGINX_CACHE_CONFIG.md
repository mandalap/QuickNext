# 🔧 Fix Nginx Masih Pakai Config Lama (Cached)

## ❌ Masalah

Config sudah benar (tidak ada `proxy_pass`), tapi error log masih menunjukkan Nginx mencoba proxy ke port 3000.

**Kemungkinan:**
1. Nginx masih menggunakan config lama yang cached
2. Ada config lain yang override
3. Nginx belum benar-benar reload

---

## ✅ SOLUSI: Force Restart & Clear Cache

### Step 1: Cek Semua Config yang Aktif

```bash
# Cek semua sites-enabled
echo "=== Sites Enabled ==="
sudo ls -la /etc/nginx/sites-enabled/

# Cek apakah ada config lain untuk app.quickkasir.com
echo ""
echo "=== Check for duplicate configs ==="
sudo grep -r "app.quickkasir.com" /etc/nginx/sites-enabled/
```

### Step 2: Restart Nginx (Bukan Reload)

```bash
# Stop Nginx
sudo systemctl stop nginx

# Start Nginx (ini akan load config baru)
sudo systemctl start nginx

# Cek status
sudo systemctl status nginx
```

### Step 3: Verifikasi Config Aktif

```bash
# Test config
sudo nginx -t

# Cek config yang benar-benar aktif
sudo nginx -T | grep -A 20 "server_name app.quickkasir.com"
```

**Ini akan menunjukkan config yang benar-benar digunakan oleh Nginx.**

### Step 4: Test Connection

```bash
# Test dari server
curl -I http://app.quickkasir.com

# Atau test local
curl -I http://127.0.0.1 -H "Host: app.quickkasir.com"
```

### Step 5: Cek Error Log Setelah Restart

```bash
# Clear error log dulu
sudo truncate -s 0 /var/log/nginx/error.log

# Test di browser, lalu cek log
sudo tail -10 /var/log/nginx/error.log
```

---

## 🔍 Jika Masih Ada Error

### Cek Apakah Ada Config di sites-enabled yang Berbeda

```bash
# Cek symlink
ls -la /etc/nginx/sites-enabled/quickkasir-app

# Cek apakah file yang di-link benar
cat /etc/nginx/sites-enabled/quickkasir-app | head -20
```

**Pastikan symlink mengarah ke file yang benar.**

### Cek Apakah Ada Config di nginx.conf yang Override

```bash
# Cek main config
sudo grep -r "app.quickkasir.com" /etc/nginx/nginx.conf
sudo grep -r "proxy_pass.*3000" /etc/nginx/
```

---

## 📋 Quick Fix (Copy-Paste)

```bash
# 1. Stop Nginx
echo "=== 1. Stop Nginx ==="
sudo systemctl stop nginx

# 2. Cek semua config aktif
echo ""
echo "=== 2. Check Active Configs ==="
sudo ls -la /etc/nginx/sites-enabled/

# 3. Test config
echo ""
echo "=== 3. Test Config ==="
sudo nginx -t

# 4. Start Nginx
echo ""
echo "=== 4. Start Nginx ==="
sudo systemctl start nginx

# 5. Cek status
echo ""
echo "=== 5. Check Status ==="
sudo systemctl status nginx | head -10

# 6. Cek config yang aktif
echo ""
echo "=== 6. Check Active Config ==="
sudo nginx -T 2>/dev/null | grep -A 20 "server_name app.quickkasir.com" | head -25

# 7. Test connection
echo ""
echo "=== 7. Test Connection ==="
curl -I http://127.0.0.1 -H "Host: app.quickkasir.com" 2>&1 | head -5

# 8. Clear error log dan cek
echo ""
echo "=== 8. Check Error Log ==="
sudo truncate -s 0 /var/log/nginx/error.log
echo "Error log cleared. Test di browser, lalu jalankan: sudo tail -10 /var/log/nginx/error.log"
```

---

## ✅ Expected Result

Setelah restart:
- ✅ Nginx status `active (running)`
- ✅ Config test OK
- ✅ `nginx -T` menunjukkan config tanpa `proxy_pass`
- ✅ `curl` return 200 OK
- ✅ Error log tidak ada error baru

---

**Jalankan quick fix commands di atas, lalu test lagi di browser!**
