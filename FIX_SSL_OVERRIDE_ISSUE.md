# 🔧 Fix SSL Override Issue - Masih Menampilkan Laravel

## ❌ Masalah

Meskipun:
- ✅ Next.js server sudah benar (return QuickKasir)
- ✅ Nginx HTTP config sudah benar
- ✅ Sudah coba di browser lain (bukan cache)

**Masih menampilkan Laravel!**

**Kemungkinan penyebab:**
1. **SSL config override** - Config HTTPS mengarah ke Laravel
2. **Config admin/api handle quickkasir.com** - Ada config lain yang override
3. **Nginx belum reload dengan benar** - Config lama masih aktif

---

## ✅ SOLUSI: Cek & Fix SSL Config

### Step 1: Cek Config SSL untuk quickkasir.com

```bash
# Cek apakah ada config SSL untuk quickkasir.com
sudo grep -r "quickkasir.com" /etc/nginx/sites-available/ | grep -i "listen 443"

# Cek config SSL lengkap
sudo grep -A 20 "server_name.*quickkasir.com" /etc/nginx/sites-available/* | grep -A 20 "listen 443"
```

### Step 2: Cek Apakah Ada Config Lain yang Handle quickkasir.com

```bash
# Cek semua config yang handle quickkasir.com
sudo nginx -T 2>/dev/null | grep -B 10 -A 20 "server_name.*quickkasir.com"
```

### Step 3: Cek Config Admin/API

```bash
# Cek apakah config admin/api juga handle quickkasir.com
sudo cat /etc/nginx/sites-available/quickkasir-admin | grep -A 5 "server_name"
sudo cat /etc/nginx/sites-available/quickkasir-api | grep -A 5 "server_name"
```

---

## 🔧 Fix: Update SSL Config untuk Landing Page

Jika ada config SSL untuk quickkasir.com yang masih mengarah ke Laravel:

```bash
# Cek apakah ada config SSL
sudo ls -la /etc/nginx/sites-enabled/ | grep landing

# Cek config SSL (jika ada)
sudo cat /etc/nginx/sites-available/quickkasir-landing | grep -A 30 "listen 443"
```

**Jika ada config SSL yang salah, update:**

```bash
sudo nano /etc/nginx/sites-available/quickkasir-landing
```

**Pastikan config SSL juga proxy ke port 3001:**

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.quickkasir.com quickkasir.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/www.quickkasir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.quickkasir.com/privkey.pem;

    # Serve static files
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

---

## 🔍 Diagnosis Lengkap

```bash
# 1. Cek semua config yang handle quickkasir.com
echo "=== All configs handling quickkasir.com ==="
sudo nginx -T 2>/dev/null | grep -B 5 -A 30 "server_name.*quickkasir.com"

# 2. Cek apakah ada default config
echo ""
echo "=== Checking for default config ==="
ls -la /etc/nginx/sites-enabled/ | grep default

# 3. Test HTTP vs HTTPS
echo ""
echo "=== Testing HTTP ==="
curl -s http://quickkasir.com | grep -i "quickkasir\|laravel" | head -3

echo ""
echo "=== Testing HTTPS ==="
curl -s https://quickkasir.com | grep -i "quickkasir\|laravel" | head -3

# 4. Cek SSL certificate
echo ""
echo "=== Checking SSL Certificate ==="
sudo certbot certificates | grep -A 5 "quickkasir.com"
```

---

**Jalankan diagnosis command di atas untuk menemukan masalahnya!**
