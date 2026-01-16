# 🔧 Fix: manifest.json 404 Error

## ❌ Masalah

```
GET https://app.quickkasir.com/manifest.json 404 (Not Found)
Manifest fetch from https://app.quickkasir.com/manifest.json failed, code 404
```

File `manifest.json` tidak ditemukan di production build.

---

## 🔍 Root Cause

1. **File `manifest.json` tidak di-copy ke build folder** saat `npm run build`
2. **Nginx config tidak serve file `manifest.json` dengan benar**
3. **Build folder tidak memiliki file `manifest.json`**

---

## ✅ Solusi

### STEP 1: Verifikasi File manifest.json Ada di Source

```bash
cd /var/www/quickkasir/app/frontend

# Cek apakah file ada di public folder
ls -la public/manifest.json

# Jika tidak ada, copy dari source
# File seharusnya ada di: app/frontend/public/manifest.json
```

### STEP 2: Rebuild Frontend (Pastikan manifest.json Ter-copy)

```bash
cd /var/www/quickkasir/app/frontend

# Stop PM2 (jika running)
pm2 stop quickkasir-frontend 2>/dev/null || echo "Frontend tidak running"

# Backup build lama
if [ -d build ]; then
    cp -r build build.backup.$(date +%Y%m%d_%H%M%S)
fi

# Remove old build
rm -rf build

# Rebuild
npm run build

# Verifikasi manifest.json ada di build folder
echo "=== Checking manifest.json in build ==="
ls -la build/manifest.json

# Jika tidak ada, copy manual
if [ ! -f build/manifest.json ]; then
    echo "⚠️ manifest.json tidak ada di build, copying from public..."
    cp public/manifest.json build/manifest.json
    echo "✅ manifest.json copied"
fi

# Fix permissions
sudo chown -R www-data:www-data build
sudo chmod -R 755 build
```

### STEP 3: Verifikasi Nginx Config

```bash
# Cek Nginx config untuk app.quickkasir.com
sudo cat /etc/nginx/sites-available/quickkasir-app | grep -A 5 "manifest.json"
```

**Pastikan ada location block untuk manifest.json:**

```nginx
location /manifest.json {
    add_header Cache-Control "public, max-age=3600";
    add_header Content-Type "application/manifest+json";
}
```

### STEP 4: Update Nginx Config (Jika Perlu)

```bash
sudo nano /etc/nginx/sites-available/quickkasir-app
```

**Pastikan config lengkap seperti ini:**

```nginx
server {
    listen 80;
    server_name app.quickkasir.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.quickkasir.com;

    ssl_certificate /etc/letsencrypt/live/app.quickkasir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.quickkasir.com/privkey.pem;

    root /var/www/quickkasir/app/frontend/build;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Manifest.json - PWA support
    location = /manifest.json {
        add_header Cache-Control "public, max-age=3600";
        add_header Content-Type "application/manifest+json";
        try_files $uri =404;
    }

    # Service worker - no cache
    location = /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Content-Type "application/javascript";
        try_files $uri =404;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### STEP 5: Test & Reload Nginx

```bash
# Test config
sudo nginx -t

# Jika OK, reload
sudo systemctl reload nginx
```

### STEP 6: Verifikasi File Ada

```bash
# Cek file di build folder
ls -la /var/www/quickkasir/app/frontend/build/manifest.json

# Test dengan curl
curl -I https://app.quickkasir.com/manifest.json

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: application/manifest+json
```

---

## 🧪 Testing

1. **Test di browser:**
   - Buka: `https://app.quickkasir.com/manifest.json`
   - Harus return JSON (bukan 404)

2. **Check browser console:**
   - Tidak ada error `Manifest fetch failed`
   - PWA install prompt bisa muncul (jika support)

3. **Check Network tab:**
   - Request ke `/manifest.json` harus return `200 OK`
   - Content-Type harus `application/manifest+json`

---

## 🔍 Troubleshooting

### Masalah: File masih 404 setelah rebuild

**Solusi:**
```bash
# Pastikan file benar-benar ada
ls -la /var/www/quickkasir/app/frontend/build/manifest.json

# Jika tidak ada, copy manual
cp /var/www/quickkasir/app/frontend/public/manifest.json /var/www/quickkasir/app/frontend/build/manifest.json

# Fix permissions
sudo chown www-data:www-data /var/www/quickkasir/app/frontend/build/manifest.json
sudo chmod 644 /var/www/quickkasir/app/frontend/build/manifest.json

# Reload Nginx
sudo systemctl reload nginx
```

### Masalah: Nginx masih return 404

**Solusi:**
```bash
# Cek Nginx error log
sudo tail -20 /var/log/nginx/error.log

# Cek apakah root path benar
sudo nginx -T | grep -A 10 "server_name app.quickkasir.com" | grep "root"

# Pastikan root path: /var/www/quickkasir/app/frontend/build
```

### Masalah: Content-Type salah

**Solusi:**
```bash
# Update Nginx config dengan explicit Content-Type
sudo nano /etc/nginx/sites-available/quickkasir-app

# Tambahkan di location /manifest.json:
add_header Content-Type "application/manifest+json";

# Reload
sudo systemctl reload nginx
```

---

## 📝 Checklist

- [ ] File `manifest.json` ada di `app/frontend/public/manifest.json`
- [ ] File `manifest.json` ada di `app/frontend/build/manifest.json` setelah build
- [ ] Nginx config punya location block untuk `/manifest.json`
- [ ] Nginx config set Content-Type ke `application/manifest+json`
- [ ] File permissions benar (www-data:www-data, 644)
- [ ] Nginx sudah di-reload setelah config update
- [ ] Test di browser return 200 OK (bukan 404)
- [ ] Browser console tidak ada error manifest fetch
