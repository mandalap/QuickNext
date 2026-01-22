# 🚀 Struktur Deployment quickKasir

## 📋 Overview Arsitektur

Sistem quickKasir terdiri dari 3 komponen utama:

1. **Landing Page** (Next.js) - Marketing & SEO
2. **POS Application** (React) - Aplikasi utama untuk user
3. **Backend API** (Laravel) - REST API untuk semua operasi

---

## 🎯 Rekomendasi Struktur Deployment

### **Opsi 1: Subdomain (RECOMMENDED) ⭐**

Struktur terbaik untuk scalability dan maintenance:

```
https://quickkasir.com          → Landing Page (Next.js)
https://app.quickkasir.com     → POS Application (React)
https://api.quickkasir.com     → Backend API (Laravel)
```

**Keuntungan:**
- ✅ Pemisahan jelas antara marketing dan aplikasi
- ✅ Mudah di-scale secara terpisah
- ✅ Cookie dan session terisolasi
- ✅ SEO lebih baik (landing page terpisah)
- ✅ CDN bisa dioptimalkan per subdomain

**Struktur Folder di Server:**
```
/var/www/
├── quickkasir.com/              # Landing Page (Next.js)
│   ├── .next/                   # Build output
│   ├── public/
│   └── package.json
│
├── app.quickkasir.com/          # POS App (React)
│   ├── build/                   # Build output
│   ├── public/
│   └── package.json
│
└── api.quickkasir.com/          # Backend API (Laravel)
    ├── app/
    ├── public/
    ├── storage/
    └── .env
```

---

### **Opsi 2: Path-based (Alternatif)**

Jika tidak ingin menggunakan subdomain:

```
https://quickkasir.com           → Landing Page
https://quickkasir.com/app       → POS Application (via reverse proxy)
https://quickkasir.com/api       → Backend API (via reverse proxy)
```

**Struktur Nginx:**
```nginx
server {
    server_name quickkasir.com;
    
    # Landing Page
    location / {
        root /var/www/quickkasir.com/.next;
        try_files $uri $uri/ /index.html;
    }
    
    # POS Application
    location /app {
        alias /var/www/app.quickkasir.com/build;
        try_files $uri $uri/ /app/index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📁 Struktur File di Server

### **1. Landing Page (Next.js)**

**Path:** `/var/www/quickkasir.com/` atau `/home/quickkasir/landing/`

```
quickkasir.com/
├── .next/                      # Build output (generated)
├── public/
│   ├── logo-qk.png
│   ├── logi-qk-full.png
│   └── favicon.ico
├── app/
│   ├── layout.js
│   └── page.js
├── package.json
├── next.config.js
└── .env.production
```

**Environment Variables:**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.quickkasir.com
```

**Build Command:**
```bash
cd /var/www/quickkasir.com
npm run build
pm2 start npm --name "quickkasir-landing" -- start
```

---

### **2. POS Application (React)**

**Path:** `/var/www/app.quickkasir.com/` atau `/home/quickkasir/app/`

```
app.quickkasir.com/
├── build/                      # Build output
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   ├── index.html
│   └── manifest.json
├── public/
│   ├── logo-qk.png
│   └── favicon.ico
├── src/
├── package.json
└── .env.production
```

**Environment Variables:**
```env
REACT_APP_BACKEND_URL=https://api.quickkasir.com
REACT_APP_ENV=production
```

**Build Command:**
```bash
cd /var/www/app.quickkasir.com
npm run build
# Serve dengan Nginx atau PM2
```

**Nginx Config untuk React:**
```nginx
server {
    server_name app.quickkasir.com;
    root /var/www/app.quickkasir.com/build;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /static {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

### **3. Backend API (Laravel)**

**Path:** `/var/www/api.quickkasir.com/` atau `/home/quickkasir/api/`

```
api.quickkasir.com/
├── app/
├── bootstrap/
├── config/
├── database/
├── public/
│   └── index.php              # Entry point
├── storage/
│   └── app/
│       └── public/            # Uploaded files
├── .env
└── composer.json
```

**Environment Variables:**
```env
APP_ENV=production
APP_URL=https://api.quickkasir.com
APP_DEBUG=false

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=quickkasir_db
DB_USERNAME=quickkasir_user
DB_PASSWORD=your_password

CORS_ALLOWED_ORIGINS=https://app.quickkasir.com,https://quickkasir.com
```

**Nginx Config untuk Laravel:**
```nginx
server {
    server_name api.quickkasir.com;
    root /var/www/api.quickkasir.com/public;
    
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

---

## 🔧 Konfigurasi CORS

**File:** `app/backend/config/cors.php`

```php
<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'https://app.quickkasir.com',
        'https://quickkasir.com',
        'http://localhost:3000', // Development
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

---

## 🌐 Konfigurasi DNS

**A Record:**
```
quickkasir.com        → IP Server (misal: 123.45.67.89)
app.quickkasir.com   → IP Server (sama)
api.quickkasir.com    → IP Server (sama)
```

**Atau CNAME (jika menggunakan CDN):**
```
quickkasir.com        → CNAME ke CDN
app.quickkasir.com   → CNAME ke CDN
api.quickkasir.com    → CNAME ke CDN
```

---

## 📦 Proses Deployment

### **1. Build Landing Page**
```bash
cd /var/www/quickkasir.com
npm install
npm run build
pm2 start npm --name "quickkasir-landing" -- start
```

### **2. Build POS Application**
```bash
cd /var/www/app.quickkasir.com
npm install
npm run build
# Copy build folder ke web root
```

### **3. Deploy Backend API**
```bash
cd /var/www/api.quickkasir.com
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

---

## 🔐 SSL Certificate (Let's Encrypt)

**Install Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
```

**Generate SSL untuk semua subdomain:**
```bash
sudo certbot --nginx -d quickkasir.com -d app.quickkasir.com -d api.quickkasir.com
```

**Auto-renewal:**
```bash
sudo certbot renew --dry-run
```

---

## 🗄️ Database

**Struktur Database:**
- Database: `quickkasir_db`
- User: `quickkasir_user`
- Host: `localhost` atau `127.0.0.1`

**Backup Script:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u quickkasir_user -p quickkasir_db > /backup/quickkasir_$DATE.sql
```

---

## 📊 Monitoring & Logs

### **PM2 untuk Landing Page:**
```bash
pm2 logs quickkasir-landing
pm2 monit
```

### **Nginx Logs:**
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **Laravel Logs:**
```bash
tail -f /var/www/api.quickkasir.com/storage/logs/laravel.log
```

---

## 🚀 Quick Start Deployment Script

Buat file `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying quickKasir..."

# 1. Landing Page
echo "📄 Building Landing Page..."
cd /var/www/quickkasir.com
npm install
npm run build
pm2 restart quickkasir-landing

# 2. POS App
echo "💻 Building POS Application..."
cd /var/www/app.quickkasir.com
npm install
npm run build

# 3. Backend API
echo "🔧 Deploying Backend API..."
cd /var/www/api.quickkasir.com
composer install --no-dev
php artisan config:cache
php artisan route:cache
php artisan migrate --force

echo "✅ Deployment Complete!"
```

---

## 📝 Checklist Deployment

- [ ] Domain dan subdomain sudah di-point ke server
- [ ] SSL certificate sudah di-install
- [ ] Environment variables sudah dikonfigurasi
- [ ] Database sudah dibuat dan migrated
- [ ] CORS sudah dikonfigurasi
- [ ] Nginx config sudah dibuat untuk semua subdomain
- [ ] PM2 sudah di-setup untuk landing page
- [ ] File permissions sudah benar (storage, cache)
- [ ] Backup database sudah di-setup
- [ ] Monitoring sudah di-setup

---

## 🔄 Update Process

### **Update Landing Page:**
```bash
cd /var/www/quickkasir.com
git pull
npm install
npm run build
pm2 restart quickkasir-landing
```

### **Update POS App:**
```bash
cd /var/www/app.quickkasir.com
git pull
npm install
npm run build
# Restart Nginx atau reload
```

### **Update Backend:**
```bash
cd /var/www/api.quickkasir.com
git pull
composer install
php artisan migrate
php artisan config:cache
php artisan route:cache
```

---

## 💡 Tips & Best Practices

1. **Gunakan CDN** untuk static assets (logo, images)
2. **Enable Gzip** di Nginx untuk kompresi
3. **Setup Redis** untuk session dan cache
4. **Monitor** dengan tools seperti New Relic atau Sentry
5. **Backup** database secara rutin (daily)
6. **Use Queue** untuk heavy operations (Laravel Queue)
7. **Enable HTTPS** untuk semua subdomain
8. **Rate Limiting** untuk API endpoints

---

## 📞 Support

Jika ada pertanyaan tentang deployment, silakan hubungi tim development.

