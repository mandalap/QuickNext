# 🔧 Fix Next.js Static Files 404 Error

## ❌ Masalah

Landing page (`www.quickkasir.com`) error:
- CSS tidak load (404)
- JavaScript tidak load (404)
- Font files tidak load (404)
- MIME type error (text/plain instead of proper MIME types)

**Error contoh:**
```
GET https://www.quickkasir.com/_next/static/media/e4af272ccee01ff0-s.p.woff2 404
GET https://www.quickkasir.com/_next/static/css/045b228d7ca22e68.css 404
Refused to apply style because MIME type ('text/plain') is not supported
```

---

## ✅ SOLUSI: Update Nginx Config untuk Next.js Standalone

### Step 1: Cek Struktur Build Next.js

```bash
cd /var/www/quickkasir/app/beranda
ls -la .next/static/ | head -10
```

**Pastikan folder `.next/static/` ada dan berisi file CSS, JS, dll.**

---

### Step 2: Update Nginx Config untuk Landing Page

```bash
sudo nano /etc/nginx/sites-available/quickkasir-landing
```

**Ganti dengan config ini:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name www.quickkasir.com quickkasir.com;

    # Redirect non-www to www
    if ($host = quickkasir.com) {
        return 301 http://www.quickkasir.com$request_uri;
    }

    # Root untuk Next.js standalone
    root /var/www/quickkasir/app/beranda/.next;
    index index.html;

    # Serve static files directly (CSS, JS, fonts, images)
    location /_next/static {
        alias /var/www/quickkasir/app/beranda/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Serve public files (logo, images, etc)
    location /logo-qk.png {
        alias /var/www/quickkasir/app/beranda/public/logo-qk.png;
        expires 30d;
        add_header Cache-Control "public";
    }

    location /favicon.ico {
        alias /var/www/quickkasir/app/beranda/public/favicon.ico;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Proxy API requests to Next.js server
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

### Step 3: Test Nginx Config

```bash
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

### Step 4: Reload Nginx

```bash
sudo systemctl reload nginx
```

---

### Step 5: Verifikasi File Static Bisa Diakses

```bash
# Test apakah file static bisa diakses
curl -I http://www.quickkasir.com/_next/static/css/app.css 2>&1 | head -5

# Cek apakah file ada
ls -la /var/www/quickkasir/app/beranda/.next/static/css/ | head -5
```

---

## 🔍 Troubleshooting

### Error: "File not found" untuk static files

**Cek apakah path benar:**

```bash
# Cek struktur folder
ls -la /var/www/quickkasir/app/beranda/.next/static/

# Cek apakah file CSS ada
find /var/www/quickkasir/app/beranda/.next/static -name "*.css" | head -3

# Cek permissions
ls -la /var/www/quickkasir/app/beranda/.next/static/
```

**Fix permissions jika perlu:**

```bash
sudo chown -R www-data:www-data /var/www/quickkasir/app/beranda/.next
sudo chmod -R 755 /var/www/quickkasir/app/beranda/.next
```

---

### Error: "MIME type error"

**Pastikan Nginx serve dengan MIME type yang benar:**

Nginx biasanya sudah otomatis detect MIME type, tapi jika masih error, tambahkan:

```nginx
location /_next/static {
    alias /var/www/quickkasir/app/beranda/.next/static;
    expires 1y;
    add_header Cache-Control "public, immutable";
    
    # Explicit MIME types
    types {
        text/css css;
        application/javascript js;
        font/woff2 woff2;
        font/woff woff;
        image/png png;
        image/jpeg jpg jpeg;
    }
}
```

---

### Error: "404 Not Found" untuk semua static files

**Kemungkinan Next.js build belum benar:**

```bash
cd /var/www/quickkasir/app/beranda

# Rebuild Next.js
npm run build

# Verifikasi build output
ls -la .next/static/ | head -10

# Restart PM2
pm2 restart quickkasir-landing
```

---

## 📝 Checklist

- [ ] Nginx config sudah di-update (serve static files langsung)
- [ ] Path `/var/www/quickkasir/app/beranda/.next/static/` ada dan berisi file
- [ ] Permissions benar (www-data:www-data, 755)
- [ ] Nginx config test berhasil (`nginx -t`)
- [ ] Nginx sudah di-reload
- [ ] Test di browser - CSS dan JS harus load

---

## 🧪 Test Final

1. **Buka browser:** `https://www.quickkasir.com`
2. **Buka Developer Tools (F12)** → Network tab
3. **Reload page**
4. **Cek apakah semua file static load:**
   - ✅ CSS files (status 200)
   - ✅ JS files (status 200)
   - ✅ Font files (status 200)
   - ✅ Images (status 200)

**Jika semua 200 OK, berarti sudah fix!**

---

**Jalankan command di atas untuk fix masalah static files!**
