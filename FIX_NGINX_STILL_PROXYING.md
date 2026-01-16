# 🔧 Fix Nginx Masih Proxy ke Port 3000

## ❌ Masalah

Error log menunjukkan:
```
upstream: "http://127.0.0.1:3000/"
```

**Nginx masih mencoba proxy ke port 3000**, padahal seharusnya serve static files langsung dari build folder!

---

## ✅ SOLUSI: Pastikan Config Sudah Benar

### Step 1: Cek Config Saat Ini

```bash
sudo cat /etc/nginx/sites-available/quickkasir-app
```

**Pastikan TIDAK ada `proxy_pass`**, harusnya seperti ini:
```nginx
server {
    listen 80;
    server_name app.quickkasir.com;

    root /var/www/quickkasir/app/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
    # ... tidak ada proxy_pass!
}
```

### Step 2: Jika Masih Ada proxy_pass, Hapus

```bash
sudo nano /etc/nginx/sites-available/quickkasir-app
```

**Hapus semua baris yang ada `proxy_pass`**, pastikan config seperti ini:

```nginx
server {
    listen 80;
    server_name app.quickkasir.com;

    root /var/www/quickkasir/app/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /manifest.json {
        add_header Cache-Control "public, max-age=3600";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### Step 3: Test & Reload Nginx

```bash
# Test config
sudo nginx -t

# Jika OK, reload
sudo systemctl reload nginx

# Atau restart untuk memastikan
sudo systemctl restart nginx
```

### Step 4: Verifikasi Config Sudah Ter-apply

```bash
# Cek apakah masih ada proxy_pass di config aktif
sudo grep -r "proxy_pass" /etc/nginx/sites-enabled/quickkasir-app

# Jika masih ada output, berarti masih ada proxy_pass (salah!)
# Jika tidak ada output, berarti sudah benar
```

### Step 5: Test di Browser

```bash
# Test dari server
curl -I http://app.quickkasir.com

# Harus return 200 OK, bukan 502/504
```

---

## 🔍 Cek Apakah Ada Config Lain yang Override

```bash
# Cek semua config yang aktif
sudo ls -la /etc/nginx/sites-enabled/

# Cek apakah ada config lain untuk app.quickkasir.com
sudo grep -r "app.quickkasir.com" /etc/nginx/sites-available/
sudo grep -r "app.quickkasir.com" /etc/nginx/sites-enabled/
```

**Jika ada lebih dari 1 config untuk `app.quickkasir.com`, disable yang salah:**

```bash
# Disable config yang salah
sudo rm /etc/nginx/sites-enabled/config-yang-salah

# Test & reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📋 Quick Fix (Copy-Paste)

```bash
# 1. Cek config saat ini
echo "=== 1. Current Config ==="
sudo cat /etc/nginx/sites-available/quickkasir-app

# 2. Cek apakah ada proxy_pass
echo ""
echo "=== 2. Check proxy_pass ==="
sudo grep "proxy_pass" /etc/nginx/sites-available/quickkasir-app && echo "❌ Masih ada proxy_pass!" || echo "✅ Tidak ada proxy_pass"

# 3. Jika masih ada, edit config
echo ""
echo "=== 3. Edit Config (jika perlu) ==="
echo "Jalankan: sudo nano /etc/nginx/sites-available/quickkasir-app"
echo "Pastikan tidak ada proxy_pass, hanya root dan try_files"

# 4. Test & reload
echo ""
echo "=== 4. Test & Reload ==="
sudo nginx -t && sudo systemctl restart nginx

# 5. Cek error log (harus tidak ada error baru)
echo ""
echo "=== 5. Check Error Log ==="
sudo tail -5 /var/log/nginx/error.log
```

---

## ✅ Expected Result

Setelah fix:
- ✅ Config tidak ada `proxy_pass`
- ✅ Config menggunakan `root` dan `try_files`
- ✅ Nginx test OK
- ✅ Error log tidak ada error baru
- ✅ Browser bisa akses `app.quickkasir.com` (200 OK)

---

**Jalankan command di atas untuk pastikan config sudah benar dan tidak ada proxy_pass!**
