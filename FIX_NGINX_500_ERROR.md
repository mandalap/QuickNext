# 🔧 Fix Nginx 500 Error untuk Frontend App

## ❌ Masalah

Nginx config sudah OK, tapi masih **500 Server Error** di `app.quickkasir.com`.

Kemungkinan penyebab:
1. Build folder tidak ada atau tidak accessible
2. Permission issue (Nginx tidak bisa baca file)
3. File index.html tidak ada

---

## ✅ SOLUSI: Diagnose & Fix

### Step 1: Cek Build Folder

```bash
# Cek apakah build folder ada
ls -la /var/www/quickkasir/app/frontend/build/

# Cek apakah index.html ada
ls -la /var/www/quickkasir/app/frontend/build/index.html
```

### Step 2: Cek Permission

```bash
# Cek ownership dan permission
ls -ld /var/www/quickkasir/app/frontend/build
ls -la /var/www/quickkasir/app/frontend/build/index.html
```

**Expected:**
- Folder harus readable oleh Nginx user (`www-data`)
- File harus readable oleh Nginx user

### Step 3: Fix Permission

```bash
# Set ownership ke www-data (Nginx user)
sudo chown -R www-data:www-data /var/www/quickkasir/app/frontend/build

# Set permission yang benar
sudo chmod -R 755 /var/www/quickkasir/app/frontend/build
sudo chmod 644 /var/www/quickkasir/app/frontend/build/index.html
```

### Step 4: Cek Nginx Error Logs

```bash
# Cek error log untuk detail error
sudo tail -f /var/log/nginx/error.log
```

**Atau cek log terakhir:**
```bash
sudo tail -20 /var/log/nginx/error.log
```

### Step 5: Test Nginx Config Path

```bash
# Test apakah Nginx bisa akses file
sudo -u www-data cat /var/www/quickkasir/app/frontend/build/index.html | head -5
```

**Jika error "Permission denied" atau "No such file", berarti permission issue.**

---

## 🔧 Quick Fix (Copy-Paste)

Jalankan semua command ini:

```bash
# 1. Cek build folder
echo "=== 1. Build Folder Check ==="
ls -la /var/www/quickkasir/app/frontend/build/index.html 2>/dev/null || echo "❌ Build tidak ada!"

# 2. Fix permission
echo ""
echo "=== 2. Fix Permission ==="
sudo chown -R www-data:www-data /var/www/quickkasir/app/frontend/build
sudo chmod -R 755 /var/www/quickkasir/app/frontend/build
sudo chmod 644 /var/www/quickkasir/app/frontend/build/index.html

# 3. Test Nginx access
echo ""
echo "=== 3. Test Nginx Access ==="
sudo -u www-data cat /var/www/quickkasir/app/frontend/build/index.html > /dev/null 2>&1 && echo "✅ Nginx bisa akses file" || echo "❌ Nginx tidak bisa akses file"

# 4. Cek error log
echo ""
echo "=== 4. Nginx Error Log (Last 10 lines) ==="
sudo tail -10 /var/log/nginx/error.log

# 5. Reload Nginx
echo ""
echo "=== 5. Reload Nginx ==="
sudo systemctl reload nginx
```

---

## 🔍 Jika Build Tidak Ada

Jika build folder tidak ada, rebuild:

```bash
cd /var/www/quickkasir/app/frontend

# Rebuild
npm run build

# Fix permission setelah build
sudo chown -R www-data:www-data build
sudo chmod -R 755 build
```

---

## 🔍 Jika Masih 500 Error

### Cek Error Log Detail

```bash
sudo tail -30 /var/log/nginx/error.log | grep -A 5 "app.quickkasir.com"
```

**Common errors:**
- `Permission denied` → Fix permission (sudah di atas)
- `No such file or directory` → Build tidak ada, perlu rebuild
- `Directory index of ... is forbidden` → Cek index directive di Nginx config

### Test Manual dengan curl

```bash
# Test dari server sendiri
curl -I http://127.0.0.1/

# Atau test dengan domain
curl -I http://app.quickkasir.com
```

---

## 📋 Checklist

- [ ] Build folder ada (`ls -la build/index.html`)
- [ ] Permission sudah benar (`chown www-data:www-data`)
- [ ] Nginx bisa akses file (`sudo -u www-data cat index.html`)
- [ ] Nginx error log tidak ada error baru
- [ ] Test di browser - tidak ada 500 error

---

**Jalankan quick fix commands di atas, lalu test lagi di browser!**
