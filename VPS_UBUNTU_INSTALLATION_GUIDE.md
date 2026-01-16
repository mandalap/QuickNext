# 🚀 Panduan Instalasi QuickKasir di VPS Ubuntu

**IP VPS:** 210.79.191.219  
**OS:** Ubuntu  
**Repository:** https://github.com/mandalap/QuickNext.git

---

## 📋 Prerequisites

Sebelum memulai, pastikan VPS sudah memiliki:

- ✅ Ubuntu 20.04 LTS atau lebih baru
- ✅ Akses root atau user dengan sudo privileges
- ✅ Koneksi internet yang stabil
- ✅ Minimal 2GB RAM (recommended: 4GB+)
- ✅ Minimal 20GB storage

---

## 🔧 STEP 1: Persiapan Server

### 1.1 Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Install Dependencies Dasar

```bash
sudo apt install -y curl wget git build-essential software-properties-common
```

---

## 🗄️ STEP 2: Install Database (MySQL/MariaDB)

### 2.1 Install MySQL

```bash
sudo apt install -y mysql-server
```

### 2.2 Secure MySQL Installation

```bash
sudo mysql_secure_installation
```

**Jawab pertanyaan:**

- Set root password? **Y** (buat password yang kuat)
- Remove anonymous users? **Y**
- Disallow root login remotely? **Y**
- Remove test database? **Y**
- Reload privilege tables? **Y**

### 2.3 Buat Database dan User

```bash
sudo mysql -u root -p
```

**Di dalam MySQL, jalankan:**

```sql
-- Buat database
CREATE DATABASE quickkasir_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Buat user
CREATE USER 'quickkasir_user'@'localhost' IDENTIFIED BY 'mandala123';

-- Berikan privileges
GRANT ALL PRIVILEGES ON quickkasir_db.* TO 'quickkasir_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

**⚠️ Catatan:** Ganti `GANTI_DENGAN_PASSWORD_KUAT` dengan password yang kuat!

---

## 🐘 STEP 3: Install PHP 8.3

### 3.1 Add PHP Repository

```bash
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
```

### 3.2 Install PHP dan Extensions

```bash
sudo apt install -y php8.3 php8.3-fpm php8.3-mysql php8.3-xml php8.3-mbstring \
php8.3-curl php8.3-zip php8.3-gd php8.3-bcmath php8.3-intl php8.3-redis
```

### 3.3 Verifikasi PHP

```bash
php -v
```

**Expected output:** PHP 8.3.x

---

## 📦 STEP 4: Install Composer

```bash
cd ~
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
composer --version
```

---

## 🟢 STEP 5: Install Node.js dan NPM

### 5.1 Install Node.js 18.x (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 5.2 Verifikasi

```bash
node -v  # Should show v18.x.x
npm -v   # Should show 9.x.x
```

### 5.3 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## 🌐 STEP 6: Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Test:** Buka browser ke `http://210.79.191.219` - harus muncul halaman default Nginx

---

## 🔴 STEP 7: Install Redis (Optional tapi Recommended)

```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

---

## 📥 STEP 8: Clone Repository dari GitHub

### 8.1 Buat Direktori untuk Aplikasi

```bash
sudo mkdir -p /var/www
cd /var/www
```

### 8.2 Clone Repository

```bash
sudo git clone https://github.com/mandalap/QuickNext.git quickkasir
sudo chown -R $USER:$USER /var/www/quickkasir
cd /var/www/quickkasir
```

---

## ⚙️ STEP 9: Setup Backend (Laravel)

### 9.1 Install Dependencies

```bash
cd /var/www/quickkasir/app/backend
composer install --no-dev --optimize-autoloader
```

### 9.2 Setup Environment

```bash
cp .env.example .env
nano .env
```

**Edit file `.env` dengan konfigurasi berikut:**

```env
APP_NAME="QuickKasir POS System"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://admin.quickkasir.com

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=quickkasir_db
DB_USERNAME=quickkasir_user
DB_PASSWORD=GANTI_DENGAN_PASSWORD_DATABASE

BROADCAST_DRIVER=log
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

FRONTEND_URL=http://app.quickkasir.com
LANDING_URL=http://www.quickkasir.com

FILESYSTEM_DISK=local

# Midtrans (isi dengan credentials Anda)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=true
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true

# VAPID Keys (generate jika perlu push notifications)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@quickkasir.com
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### 9.3 Generate App Key

```bash
php artisan key:generate
```

### 9.4 Run Migrations

```bash
php artisan migrate --force
```

### 9.5 Setup Storage Link

```bash
php artisan storage:link
```

### 9.6 Set Permissions

```bash
# Set ownership ke www-data (user web server)
sudo chown -R www-data:www-data /var/www/quickkasir/app/backend/storage
sudo chown -R www-data:www-data /var/www/quickkasir/app/backend/bootstrap/cache

# Set permissions (775 = rwxrwxr-x)
sudo chmod -R 775 /var/www/quickkasir/app/backend/storage
sudo chmod -R 775 /var/www/quickkasir/app/backend/bootstrap/cache

# Jika masih ada masalah, tambahkan user saat ini ke group www-data
sudo usermod -a -G www-data $USER

# Atau set ownership ke user saat ini (alternatif)
# sudo chown -R $USER:www-data /var/www/quickkasir/app/backend/storage
# sudo chown -R $USER:www-data /var/www/quickkasir/app/backend/bootstrap/cache
# sudo chmod -R 775 /var/www/quickkasir/app/backend/storage
# sudo chmod -R 775 /var/www/quickkasir/app/backend/bootstrap/cache
```

### 9.7 Update CORS Configuration

```bash
nano config/cors.php
```

**Update `allowed_origins` menjadi:**

```php
'allowed_origins' => array_filter([
    env('APP_URL', 'http://admin.quickkasir.com'),
    env('FRONTEND_URL', 'http://app.quickkasir.com'),
    env('LANDING_URL', 'http://www.quickkasir.com'),
    'http://www.quickkasir.com',
    'https://www.quickkasir.com',
    'http://app.quickkasir.com',
    'https://app.quickkasir.com',
    'http://admin.quickkasir.com',
    'https://admin.quickkasir.com',
]),
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### 9.8 Optimize Laravel

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## ⚛️ STEP 10: Setup Frontend (React)

### 10.1 Install Dependencies

```bash
cd /var/www/quickkasir/app/frontend
npm install
```

### 10.2 Setup Environment

```bash
nano .env.production
```

**Isi dengan:**

```env
REACT_APP_BACKEND_URL=http://api.quickkasir.com
REACT_APP_API_BASE_URL=http://api.quickkasir.com/api
REACT_APP_API_URL=http://api.quickkasir.com/api
NODE_ENV=production
```

### 10.3 Build Production

```bash
npm run build
```

---

## 🌐 STEP 11: Setup Landing Page (Next.js)

### 11.1 Install Dependencies

```bash
cd /var/www/quickkasir/app/beranda
npm install
```

### 11.2 Setup Environment

```bash
nano .env.production
```

**Isi dengan:**

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://api.quickkasir.com
NEXT_PUBLIC_APP_URL=http://app.quickkasir.com
```

### 11.3 Build Production

```bash
npm run build
```

---

## 🔧 STEP 12: Setup Nginx Configuration untuk Subdomain

**Subdomain Mapping:**

- `www.quickkasir.com` → Next.js (Landing Page) - Port 3001
- `app.quickkasir.com` → React.js (Frontend) - Port 3000
- `admin.quickkasir.com` → Laravel (Backend Admin) - Port 80
- `api.quickkasir.com` → Laravel API - Port 80

### 12.1 Hapus Default Site

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 12.2 Buat Config untuk Landing Page (www.quickkasir.com)

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

### 12.3 Buat Config untuk Frontend App (app.quickkasir.com)

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

### 12.4 Buat Config untuk Admin (admin.quickkasir.com)

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

### 12.5 Buat Config untuk API (api.quickkasir.com)

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

### 12.6 Enable Semua Sites

```bash
sudo ln -s /etc/nginx/sites-available/quickkasir-landing /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/quickkasir-app /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/quickkasir-admin /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/quickkasir-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🚀 STEP 13: Setup PM2 untuk Frontend & Landing Page

### 13.1 Buat PM2 Ecosystem File

```bash
cd /var/www/quickkasir
nano ecosystem.config.js
```

**Isi dengan:**

```javascript
module.exports = {
  apps: [
    {
      name: "quickkasir-frontend",
      cwd: "/var/www/quickkasir/app/frontend",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        REACT_APP_BACKEND_URL: "http://api.quickkasir.com",
        REACT_APP_API_BASE_URL: "http://api.quickkasir.com/api",
      },
      error_file: "/var/log/pm2/frontend-error.log",
      out_file: "/var/log/pm2/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "quickkasir-landing",
      cwd: "/var/www/quickkasir/app/beranda",
      script: "node",
      args: ".next/standalone/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        NEXT_PUBLIC_API_URL: "http://api.quickkasir.com",
        NEXT_PUBLIC_APP_URL: "http://app.quickkasir.com",
      },
      error_file: "/var/log/pm2/landing-error.log",
      out_file: "/var/log/pm2/landing-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
```

**Save:** `Ctrl+X`, lalu `Y`, lalu `Enter`

### 13.2 Buat Log Directory

```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 13.3 Start dengan PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Copy dan jalankan command yang muncul**, contoh:

```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u mandala --hp /home/mandala
```

**⚠️ Catatan:** Ganti `mandala` dengan username Anda jika berbeda. Command ini akan membuat PM2 auto-start saat server reboot.

---

## 🔥 STEP 14: Setup Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (jika pakai SSL)
sudo ufw allow 3000/tcp  # Frontend React
sudo ufw allow 3001/tcp  # Landing Page
sudo ufw enable
```

---

## ✅ STEP 15: Verifikasi Instalasi

### 15.1 Cek Status Services

```bash
# Nginx
sudo systemctl status nginx

# MySQL
sudo systemctl status mysql

# PHP-FPM
sudo systemctl status php8.3-fpm

# Redis
sudo systemctl status redis-server

# PM2
pm2 status
pm2 logs
```

### 15.2 Test Aplikasi

1. **Landing Page:** `http://www.quickkasir.com`
2. **Frontend App:** `http://app.quickkasir.com`
3. **Admin Panel:** `http://admin.quickkasir.com`
4. **Backend API:** `http://api.quickkasir.com/api/health` (atau endpoint lain)

---

## 🔒 STEP 16: Setup SSL dengan Let's Encrypt (Optional tapi Recommended)

### 16.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 16.2 Generate SSL Certificate untuk Semua Subdomain

```bash
sudo certbot --nginx -d www.quickkasir.com -d quickkasir.com -d app.quickkasir.com -d admin.quickkasir.com -d api.quickkasir.com
```

**Follow prompts:**

- Email: masukkan email Anda
- Agree to terms: Y
- Share email: N (atau Y sesuai preferensi)
- Redirect HTTP to HTTPS: 2 (Redirect)

### 16.3 Auto-renewal Test

```bash
sudo certbot renew --dry-run
```

---

## 📝 STEP 17: Setup Queue Worker (Laravel)

```bash
cd /var/www/quickkasir/app/backend
pm2 start "php artisan queue:work" --name quickkasir-queue
pm2 save
```

---

## 🔄 STEP 18: Setup Auto-Update dari GitHub

### 18.1 Buat Update Script

```bash
nano /var/www/quickkasir/update.sh
```

**Isi dengan:**

```bash
#!/bin/bash
cd /var/www/quickkasir
git pull origin main

# Backend
cd app/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Frontend
cd ../frontend
npm install
npm run build

# Landing
cd ../beranda
npm install
npm run build

# Restart PM2
pm2 restart all
```

**Save dan berikan permission:**

```bash
chmod +x /var/www/quickkasir/update.sh
```

---

## 🐛 Troubleshooting

### Problem: Port sudah digunakan

```bash
sudo netstat -tulpn | grep :3000
sudo kill -9 <PID>
```

### Problem: Permission denied

```bash
sudo chown -R www-data:www-data /var/www/quickkasir
sudo chmod -R 755 /var/www/quickkasir
```

### Problem: PM2 tidak start otomatis

```bash
pm2 startup
# Jalankan command yang muncul
pm2 save
```

### Problem: Nginx 502 Bad Gateway

```bash
# Cek PHP-FPM
sudo systemctl status php8.3-fpm
sudo systemctl restart php8.3-fpm
```

### Problem: Database connection error

```bash
# Cek MySQL
sudo systemctl status mysql
# Test connection
mysql -u quickkasir_user -p quickkasir_db
```

---

## 📊 Monitoring

### Cek Logs

```bash
# PM2 Logs
pm2 logs

# Nginx Logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Laravel Logs
tail -f /var/www/quickkasir/app/backend/storage/logs/laravel.log
```

### Cek Resources

```bash
# CPU & Memory
htop

# Disk Usage
df -h

# PM2 Monitoring
pm2 monit
```

---

## ✅ Checklist Final

- [ ] Database created dan user configured
- [ ] Backend .env configured dengan subdomain (admin.quickkasir.com)
- [ ] Frontend .env.production configured dengan subdomain (api.quickkasir.com)
- [ ] Landing .env.production configured dengan subdomain (api.quickkasir.com, app.quickkasir.com)
- [ ] CORS configuration updated di backend
- [ ] Migrations run successfully
- [ ] Nginx configured untuk semua subdomain (4 configs: landing, app, admin, api)
- [ ] Semua Nginx sites enabled
- [ ] PM2 ecosystem.config.js updated dengan subdomain
- [ ] PM2 apps running (frontend, landing, queue)
- [ ] Firewall configured
- [ ] All services running
- [ ] Semua subdomain accessible di browser
- [ ] SSL certificates installed (optional tapi recommended)

---

## 🎯 Akses Aplikasi

Setelah semua setup selesai:

- **Landing Page:** http://www.quickkasir.com
- **POS App (Frontend):** http://app.quickkasir.com
- **Admin Panel:** http://admin.quickkasir.com
- **Backend API:** http://api.quickkasir.com/api

**Dengan SSL (setelah setup Let's Encrypt):**

- **Landing Page:** https://www.quickkasir.com
- **POS App:** https://app.quickkasir.com
- **Admin Panel:** https://admin.quickkasir.com
- **API:** https://api.quickkasir.com/api

---

## 📞 Support

Jika ada masalah, cek:

1. Logs (PM2, Nginx, Laravel)
2. Service status (systemctl status)
3. Port accessibility (netstat)
4. Firewall rules (ufw status)

---

**Last Updated:** 15 Januari 2026  
**Repository:** https://github.com/mandalap/QuickNext.git
