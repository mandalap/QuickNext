# 🔧 Fix SSL Config untuk Landing Page

## ❌ Masalah

- ✅ HTTP (`http://quickkasir.com`) → QuickKasir ✅
- ❌ HTTPS (`https://quickkasir.com`) → Laravel ❌

**Penyebab:** Tidak ada config SSL untuk `quickkasir-landing`!

Dari output `nginx -T`, config `quickkasir-landing` hanya punya `listen 80` (HTTP), tidak ada `listen 443` (HTTPS).

Ketika user akses `https://quickkasir.com`, Nginx tidak menemukan config SSL untuk landing page, dan kemungkinan fallback ke config lain (admin/api) yang menggunakan Laravel.

---

## ✅ SOLUSI: Tambahkan SSL Config untuk Landing Page

### Step 1: Cek Config Landing Saat Ini

```bash
sudo cat /etc/nginx/sites-available/quickkasir-landing
```

**Pastikan hanya ada `listen 80`, tidak ada `listen 443`.**

---

### Step 2: Tambahkan SSL Config

```bash
sudo nano /etc/nginx/sites-available/quickkasir-landing
```

**Tambahkan config SSL setelah config HTTP:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name www.quickkasir.com quickkasir.com;

    # Serve static files directly (CSS, JS, fonts, images)
    location /_next/static {
        alias /var/www/quickkasir/app/beranda/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        
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

    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
        root /var/www/quickkasir/app/beranda/public;
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}

# SSL Config untuk HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.quickkasir.com quickkasir.com;

    # SSL Configuration (menggunakan certificate yang sudah ada)
    ssl_certificate /etc/letsencrypt/live/www.quickkasir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.quickkasir.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Serve static files directly
    location /_next/static {
        alias /var/www/quickkasir/app/beranda/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        
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

    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
        root /var/www/quickkasir/app/beranda/public;
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    # Proxy ke Next.js server (port 3001)
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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

---

### Step 3: Test & Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 4: Verifikasi

```bash
# Test HTTPS
curl -s https://quickkasir.com | grep -i "quickkasir\|laravel" | head -3

# Harus return "QuickKasir", bukan "Laravel"
```

---

**Jalankan command di atas untuk fix SSL config!**
