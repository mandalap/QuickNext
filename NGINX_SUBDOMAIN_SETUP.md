# 🌐 Setup Nginx untuk Subdomain QuickKasir

**Domain:** quickkasir.com  
**IP VPS:** 210.79.191.219

## 📋 Subdomain Configuration

- **www.quickkasir.com** → Next.js (Landing Page) - Port 3001
- **app.quickkasir.com** → React.js (POS Frontend) - Port 3000
- **admin.quickkasir.com** → Laravel (Backend Admin) - Port 80
- **api.quickkasir.com** → Laravel API - Port 80

---

## ✅ STEP 1: Verifikasi DNS Records

Pastikan DNS records sudah terkonfigurasi di IDCloudHost:

- ✅ `www` → A → 210.79.191.219
- ✅ `app` → A → 210.79.191.219
- ✅ `admin` → A → 210.79.191.219
- ✅ `api` → A → 210.79.191.219

**Status:** ✅ Sudah ada di DNS Manager (dari screenshot)

---

## 🔧 STEP 2: Setup Nginx Configuration

### 2.1 Hapus Default Site

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 2.2 Buat Config untuk Landing Page (www.quickkasir.com)

```bash
sudo nano /etc/nginx/sites-available/quickkasir-landing
```

**Isi dengan:**

```nginx
server {
    listen 80;
    server_name www.quickkasir.com quickkasir.com;

    # Redirect non-www to www
    if ($host = quickkasir.com) {
        return 301 http://www.quickkasir.com$request_uri;
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
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### 2.3 Buat Config untuk Frontend App (app.quickkasir.com)

```bash
sudo nano /etc/nginx/sites-available/quickkasir-app
```

**Isi dengan:**

```nginx
server {
    listen 80;
    server_name app.quickkasir.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### 2.4 Buat Config untuk Admin (admin.quickkasir.com)

```bash
sudo nano /etc/nginx/sites-available/quickkasir-admin
```

**Isi dengan:**

```nginx
server {
    listen 80;
    server_name admin.quickkasir.com;

    root /var/www/quickkasir/app/backend/public;
    index index.php index.html;

    client_max_body_size 20M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### 2.5 Buat Config untuk API (api.quickkasir.com)

```bash
sudo nano /etc/nginx/sites-available/quickkasir-api
```

**Isi dengan:**

```nginx
server {
    listen 80;
    server_name api.quickkasir.com;

    root /var/www/quickkasir/app/backend/public;
    index index.php index.html;

    client_max_body_size 20M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # CORS headers (untuk API)
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Requested-With, X-Business-Id, X-Outlet-Id' always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        return 204;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

---

## 🔗 STEP 3: Enable Sites

```bash
# Enable semua sites
sudo ln -s /etc/nginx/sites-available/quickkasir-landing /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/quickkasir-app /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/quickkasir-admin /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/quickkasir-api /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## ⚙️ STEP 4: Update Environment Variables

### 4.1 Update Backend .env

```bash
cd /var/www/quickkasir/app/backend
nano .env
```

**Update:**

```env
APP_URL=http://admin.quickkasir.com
FRONTEND_URL=http://app.quickkasir.com
LANDING_URL=http://www.quickkasir.com
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### 4.2 Update Frontend .env.production

```bash
cd /var/www/quickkasir/app/frontend
nano .env.production
```

**Update:**

```env
REACT_APP_BACKEND_URL=http://api.quickkasir.com
REACT_APP_API_BASE_URL=http://api.quickkasir.com/api
REACT_APP_API_URL=http://api.quickkasir.com/api
NODE_ENV=production
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### 4.3 Update Landing Page .env.production

```bash
cd /var/www/quickkasir/app/beranda
nano .env.production
```

**Update:**

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://api.quickkasir.com
NEXT_PUBLIC_APP_URL=http://app.quickkasir.com
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

---

## 🔄 STEP 5: Update CORS Configuration

```bash
cd /var/www/quickkasir/app/backend
nano config/cors.php
```

**Update `allowed_origins`:**

```php
'allowed_origins' => array_filter([
    'http://www.quickkasir.com',
    'https://www.quickkasir.com',
    'http://app.quickkasir.com',
    'https://app.quickkasir.com',
    'http://admin.quickkasir.com',
    'https://admin.quickkasir.com',
]),
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

---

## 🔄 STEP 6: Rebuild dan Restart

### 6.1 Rebuild Frontend

```bash
cd /var/www/quickkasir/app/frontend
npm run build
```

### 6.2 Rebuild Landing Page

```bash
cd /var/www/quickkasir/app/beranda
npm run build
```

### 6.3 Clear Laravel Cache

```bash
cd /var/www/quickkasir/app/backend
php artisan config:clear
php artisan config:cache
php artisan route:cache
```

### 6.4 Restart PM2

```bash
pm2 restart all
```

---

## 🔒 STEP 7: Setup SSL dengan Let's Encrypt (Recommended)

### 7.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7.2 Generate SSL untuk Semua Subdomain

```bash
sudo certbot --nginx -d www.quickkasir.com -d quickkasir.com -d app.quickkasir.com -d admin.quickkasir.com -d api.quickkasir.com
```

**Follow prompts:**

- Email: masukkan email Anda
- Agree to terms: Y
- Share email: N (atau Y sesuai preferensi)
- Redirect HTTP to HTTPS: 2 (Redirect)

### 7.3 Auto-renewal Test

```bash
sudo certbot renew --dry-run
```

---

## ✅ STEP 8: Verifikasi

### 8.1 Test Semua Subdomain

1. **Landing Page:** http://www.quickkasir.com
2. **Frontend App:** http://app.quickkasir.com
3. **Admin:** http://admin.quickkasir.com
4. **API:** http://api.quickkasir.com/api/health (atau endpoint lain)

### 8.2 Cek Nginx Status

```bash
sudo systemctl status nginx
sudo nginx -t
```

### 8.3 Cek PM2 Status

```bash
pm2 status
pm2 logs
```

---

## 🔥 STEP 9: Update Firewall (Jika Perlu)

```bash
# Port 80 dan 443 sudah di-allow sebelumnya
sudo ufw status

# Jika belum, jalankan:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 📝 Checklist Final

- [ ] DNS records sudah terkonfigurasi (✅ Sudah ada)
- [ ] Nginx config untuk semua subdomain dibuat
- [ ] Semua sites enabled
- [ ] Environment variables updated
- [ ] CORS configuration updated
- [ ] Frontend rebuilt dengan URL baru
- [ ] Landing page rebuilt dengan URL baru
- [ ] Laravel cache cleared
- [ ] PM2 restarted
- [ ] SSL certificates installed (optional)
- [ ] Semua subdomain accessible

---

## 🎯 Akses Aplikasi

Setelah setup selesai:

- **Landing Page:** http://www.quickkasir.com
- **POS App:** http://app.quickkasir.com
- **Admin Panel:** http://admin.quickkasir.com
- **API:** http://api.quickkasir.com/api

**Dengan SSL (setelah setup):**

- **Landing Page:** https://www.quickkasir.com
- **POS App:** https://app.quickkasir.com
- **Admin Panel:** https://admin.quickkasir.com
- **API:** https://api.quickkasir.com/api

---

## 🐛 Troubleshooting

### Problem: 502 Bad Gateway

```bash
# Cek PM2
pm2 status
pm2 logs

# Cek PHP-FPM
sudo systemctl status php8.3-fpm
```

### Problem: DNS tidak resolve

```bash
# Test DNS
nslookup www.quickkasir.com
nslookup app.quickkasir.com
nslookup api.quickkasir.com
nslookup admin.quickkasir.com
```

### Problem: CORS error

```bash
# Pastikan CORS config sudah di-update
cat /var/www/quickkasir/app/backend/config/cors.php

# Clear cache
cd /var/www/quickkasir/app/backend
php artisan config:clear
php artisan config:cache
```

---

**Last Updated:** 15 Januari 2026
