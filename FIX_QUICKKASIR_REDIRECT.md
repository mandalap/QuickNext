# 🔧 Fix quickkasir.com 301 Redirect Issue

## ❌ Masalah

- ✅ Next.js server merespons dengan benar (HTTP 200 OK)
- ❌ `quickkasir.com` return 301 redirect tapi tidak follow
- ❌ `www.quickkasir.com` mungkin tidak ter-handle dengan benar

---

## ✅ SOLUSI: Test www.quickkasir.com & Fix Redirect

```bash
# 1. Test www.quickkasir.com (follow redirect)
echo "=== Testing www.quickkasir.com ==="
curl -L -s http://www.quickkasir.com | head -50

# 2. Test quickkasir.com dengan follow redirect
echo ""
echo "=== Testing quickkasir.com (with follow redirect) ==="
curl -L -s http://quickkasir.com | head -50

# 3. Cek apakah ada "QuickKasir" di response
echo ""
echo "=== Checking for QuickKasir ==="
curl -L -s http://www.quickkasir.com | grep -i "quickkasir" | head -5

# 4. Cek response headers dengan follow redirect
echo ""
echo "=== Response Headers (with follow) ==="
curl -L -I http://quickkasir.com 2>&1 | head -10

# 5. Cek apakah ada SSL redirect yang mengganggu
echo ""
echo "=== Checking SSL Redirect ==="
curl -I https://quickkasir.com 2>&1 | head -10
curl -I https://www.quickkasir.com 2>&1 | head -10
```

---

## 🔍 Analisis

Jika `curl -L` (follow redirect) return "QuickKasir", berarti:
- ✅ Config sudah benar
- ✅ Masalahnya di browser yang tidak follow redirect dengan benar
- ✅ Atau ada SSL redirect yang mengganggu

---

## 🔧 Fix: Update Nginx Config untuk Handle Both

Jika perlu, update config untuk handle `quickkasir.com` langsung tanpa redirect:

```bash
sudo nano /etc/nginx/sites-available/quickkasir-landing
```

**Atau gunakan config yang handle kedua domain langsung:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name www.quickkasir.com quickkasir.com;

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

    # Serve public files
    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
        root /var/www/quickkasir/app/beranda/public;
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    # Proxy ke Next.js server
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

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Hapus bagian redirect non-www to www** jika ingin handle kedua domain langsung.

---

**Jalankan test command di atas dulu untuk verifikasi!**
