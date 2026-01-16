# 🔧 Fix Landing Page Static Files - Complete Solution

## ❌ Masalah yang Ditemukan

1. **404 Error**: File `app.css` tidak ditemukan (Next.js menggunakan hash di nama file)
2. **Permission Issue**: Folder `.next/static/` owned by `root:root` (seharusnya `www-data:www-data`)
3. **Nginx Config**: Tidak handle file dengan hash dengan benar

---

## ✅ SOLUSI 1: Fix Permissions

```bash
cd /var/www/quickkasir/app/beranda

# Fix ownership
sudo chown -R www-data:www-data .next
sudo chmod -R 755 .next

# Verifikasi
ls -la .next/static/ | head -5
```

---

## ✅ SOLUSI 2: Cek Nama File CSS yang Sebenarnya

Next.js menggunakan hash di nama file, jadi tidak ada `app.css` langsung.

```bash
# Cek file CSS yang ada
find /var/www/quickkasir/app/beranda/.next/static/css -name "*.css" | head -3

# Cek struktur folder
ls -la /var/www/quickkasir/app/beranda/.next/static/css/
```

---

## ✅ SOLUSI 3: Update Nginx Config untuk Handle File dengan Hash

```bash
sudo nano /etc/nginx/sites-available/quickkasir-landing
```

**Update config menjadi:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name www.quickkasir.com quickkasir.com;

    # Redirect non-www to www
    if ($host = quickkasir.com) {
        return 301 http://www.quickkasir.com$request_uri;
    }

    # Serve static files directly (CSS, JS, fonts, images)
    # Next.js menggunakan hash di nama file, jadi kita serve semua file di _next/static
    location /_next/static {
        alias /var/www/quickkasir/app/beranda/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        
        # Explicit MIME types untuk menghindari MIME type error
        types {
            text/css css;
            application/javascript js;
            font/woff2 woff2;
            font/woff woff;
            font/ttf ttf;
            image/png png;
            image/jpeg jpg jpeg;
            image/svg+xml svg;
        }
        default_type application/octet-stream;
    }

    # Serve public files (logo, images, etc)
    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
        root /var/www/quickkasir/app/beranda/public;
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    # Proxy semua request lainnya ke Next.js server
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

---

## ✅ SOLUSI 4: Test & Reload Nginx

```bash
# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

---

## ✅ SOLUSI 5: Verifikasi

```bash
# Cek apakah file CSS ada
ls -la /var/www/quickkasir/app/beranda/.next/static/css/

# Test access ke folder static (harus return 200 atau 403, bukan 404)
curl -I http://www.quickkasir.com/_next/static/css/ 2>&1 | head -3

# Cek file yang ada
find /var/www/quickkasir/app/beranda/.next/static -type f | head -5
```

---

## 🧪 Test di Browser

1. Buka: `https://www.quickkasir.com`
2. Developer Tools (F12) → Network tab
3. Reload page
4. Cek apakah file di `/_next/static/` status **200** (bukan 404)

---

## 📝 Checklist

- [ ] Permissions fixed (www-data:www-data)
- [ ] Nginx config updated (handle file dengan hash)
- [ ] Nginx config test berhasil
- [ ] Nginx reloaded
- [ ] Test di browser - static files load dengan benar

---

**Jalankan command di atas untuk fix masalah static files!**
