# 🚀 Panduan Deployment ke VPS - QuickKasir POS System

Panduan lengkap untuk deploy aplikasi QuickKasir dari GitHub ke VPS.

---

## 📋 Prerequisites VPS

Sebelum deploy, pastikan VPS sudah memiliki:

- ✅ **Ubuntu 20.04+** atau **Debian 11+**
- ✅ **Root access** atau **sudo privileges**
- ✅ **Domain name** (optional tapi recommended)
- ✅ **SSH access** ke VPS

---

## 🎯 Quick Deployment (Cara Cepat)

### **Option 1: Menggunakan Script Otomatis** ⭐ (RECOMMENDED)

**1. SSH ke VPS:**
```bash
ssh root@your-vps-ip
# atau
ssh user@your-vps-ip
```

**2. Clone repository:**
```bash
cd /var/www
git clone https://github.com/mandalap/QuickNext.git kasir-pos
cd kasir-pos
```

**3. Jalankan script deployment:**
```bash
sudo bash scripts/deploy-to-vps.sh
```

Script ini akan otomatis:
- ✅ Install semua dependencies (PHP, Composer, Node.js, MySQL, Nginx)
- ✅ Clone/update repository dari GitHub
- ✅ Setup Backend Laravel
- ✅ Build Frontend React
- ✅ Build Landing Page Next.js
- ✅ Setup Redis (jika tersedia)
- ✅ Run migrations
- ✅ Cache configuration

---

## 📝 Manual Deployment (Step-by-Step)

Jika script otomatis tidak berjalan, ikuti langkah manual:

---

### **Step 1: SSH ke VPS**

```bash
ssh root@your-vps-ip
# atau dengan user biasa
ssh user@your-vps-ip
```

---

### **Step 2: Install Dependencies**

#### **2.1. Update System**
```bash
sudo apt update
sudo apt upgrade -y
```

#### **2.2. Install PHP 8.2**
```bash
sudo apt install -y php8.2 php8.2-cli php8.2-fpm php8.2-mysql \
    php8.2-mbstring php8.2-xml php8.2-curl php8.2-zip php8.2-gd
```

#### **2.3. Install Composer**
```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
```

#### **2.4. Install Node.js 18**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

#### **2.5. Install MySQL**
```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

#### **2.6. Install Nginx**
```bash
sudo apt install -y nginx
```

#### **2.7. Install PM2 (Process Manager)**
```bash
sudo npm install -g pm2
```

---

### **Step 3: Clone Repository**

```bash
# Buat directory
sudo mkdir -p /var/www
cd /var/www

# Clone repository
sudo git clone https://github.com/mandalap/QuickNext.git kasir-pos
cd kasir-pos

# Checkout branch yang diinginkan
sudo git checkout development  # atau main untuk production
```

---

### **Step 4: Setup Backend (Laravel)**

```bash
cd /var/www/kasir-pos/app/backend

# Install dependencies
sudo composer install --optimize-autoloader --no-dev

# Copy .env
sudo cp .env.example .env

# Generate key
sudo php artisan key:generate

# Edit .env (penting!)
sudo nano .env
```

**Update .env untuk production:**
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.quickkasir.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kasir_pos
DB_USERNAME=kasir_user
DB_PASSWORD=your_secure_password

# Redis (jika sudah install)
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Frontend URLs
FRONTEND_URL=https://app.quickkasir.com
LANDING_URL=https://quickkasir.com
```

**Set permissions:**
```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

---

### **Step 5: Setup Database**

```bash
# Login ke MySQL
sudo mysql -u root -p

# Di dalam MySQL:
CREATE DATABASE kasir_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kasir_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON kasir_pos.* TO 'kasir_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Run migrations:**
```bash
cd /var/www/kasir-pos/app/backend
sudo php artisan migrate --force
```

**Seed database (optional):**
```bash
sudo php artisan db:seed --force
```

---

### **Step 6: Setup Frontend (React)**

```bash
cd /var/www/kasir-pos/app/frontend

# Install dependencies
sudo npm install --production

# Buat .env.production
sudo nano .env.production
```

**Isi .env.production:**
```env
REACT_APP_BACKEND_URL=https://api.quickkasir.com
REACT_APP_API_BASE_URL=https://api.quickkasir.com/api
REACT_APP_API_URL=https://api.quickkasir.com/api
NODE_ENV=production
```

**Build production:**
```bash
sudo npm run build
```

---

### **Step 7: Setup Landing Page (Next.js) - Optional**

```bash
cd /var/www/kasir-pos/app/beranda

# Install dependencies
sudo npm install --production

# Build production
sudo npm run build
```

---

### **Step 8: Setup Redis (Optional tapi Recommended)**

```bash
cd /var/www/kasir-pos

# Install Redis
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Setup Redis untuk Laravel
sudo bash scripts/setup-redis-vps.sh
```

---

### **Step 9: Configure Nginx**

#### **9.1. Backend API (api.quickkasir.com)**

```bash
sudo nano /etc/nginx/sites-available/api.quickkasir.com
```

**Isi dengan:**
```nginx
server {
    listen 80;
    server_name api.quickkasir.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.quickkasir.com;
    
    root /var/www/kasir-pos/app/backend/public;
    index index.php;
    
    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.quickkasir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.quickkasir.com/privkey.pem;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/api.quickkasir.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### **9.2. Frontend App (app.quickkasir.com)**

```bash
sudo nano /etc/nginx/sites-available/app.quickkasir.com
```

**Isi dengan:**
```nginx
server {
    listen 80;
    server_name app.quickkasir.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.quickkasir.com;
    
    root /var/www/kasir-pos/app/frontend/build;
    index index.html;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.quickkasir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.quickkasir.com/privkey.pem;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Static assets caching
    location /static {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/app.quickkasir.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### **9.3. Landing Page (quickkasir.com)**

```bash
sudo nano /etc/nginx/sites-available/quickkasir.com
```

**Isi dengan:**
```nginx
server {
    listen 80;
    server_name quickkasir.com www.quickkasir.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name quickkasir.com www.quickkasir.com;
    
    root /var/www/kasir-pos/app/beranda/.next;
    index index.html;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/quickkasir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quickkasir.com/privkey.pem;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/quickkasir.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### **Step 10: Setup SSL (Let's Encrypt)**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d api.quickkasir.com
sudo certbot --nginx -d app.quickkasir.com
sudo certbot --nginx -d quickkasir.com -d www.quickkasir.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

### **Step 11: Start Services**

#### **11.1. Backend dengan PM2 (Optional)**

```bash
cd /var/www/kasir-pos/app/backend

# Start dengan PM2
pm2 start "php artisan serve --host=0.0.0.0 --port=8000" --name "quickkasir-api"

# Save PM2 config
pm2 save
pm2 startup
```

**Atau gunakan Nginx + PHP-FPM (Recommended):**
- Nginx sudah dikonfigurasi di Step 9
- PHP-FPM sudah running otomatis

#### **11.2. Landing Page dengan PM2**

```bash
cd /var/www/kasir-pos/app/beranda
pm2 start npm --name "quickkasir-landing" -- start
pm2 save
```

---

### **Step 12: Cache Laravel Configuration**

```bash
cd /var/www/kasir-pos/app/backend

php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## ✅ Verification

### **1. Test Backend API**

```bash
curl https://api.quickkasir.com/api/health
```

### **2. Test Frontend**

Buka browser:
- Frontend: https://app.quickkasir.com
- Backend: https://api.quickkasir.com/api
- Landing: https://quickkasir.com

### **3. Check Services**

```bash
# Check Nginx
sudo systemctl status nginx

# Check PHP-FPM
sudo systemctl status php8.2-fpm

# Check MySQL
sudo systemctl status mysql

# Check Redis
sudo systemctl status redis-server

# Check PM2
pm2 list
pm2 logs
```

---

## 🔄 Update Deployment

Untuk update aplikasi setelah ada perubahan:

```bash
cd /var/www/kasir-pos

# Pull latest changes
sudo git pull origin development  # atau main

# Backend
cd app/backend
sudo composer install --optimize-autoloader --no-dev
sudo php artisan migrate --force
sudo php artisan config:cache
sudo php artisan route:cache

# Frontend
cd ../frontend
sudo npm install --production
sudo npm run build

# Landing (jika ada)
cd ../beranda
sudo npm install --production
sudo npm run build

# Restart services
sudo systemctl reload nginx
pm2 restart all
```

---

## 🔧 Troubleshooting

### **Problem 1: Permission Denied**

```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/kasir-pos
sudo chmod -R 775 /var/www/kasir-pos/app/backend/storage
sudo chmod -R 775 /var/www/kasir-pos/app/backend/bootstrap/cache
```

### **Problem 2: Database Connection Error**

```bash
# Check MySQL service
sudo systemctl status mysql

# Test connection
mysql -u kasir_user -p kasir_pos
```

### **Problem 3: Nginx 502 Bad Gateway**

```bash
# Check PHP-FPM
sudo systemctl status php8.2-fpm

# Check PHP-FPM socket
ls -la /var/run/php/php8.2-fpm.sock

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm
```

### **Problem 4: SSL Certificate Error**

```bash
# Renew certificate
sudo certbot renew

# Check certificate
sudo certbot certificates
```

---

## 📊 Checklist Deployment

Setelah deployment, pastikan semua ini ✅:

- [ ] Repository cloned dari GitHub
- [ ] PHP 8.2 installed
- [ ] Composer installed
- [ ] Node.js 18 installed
- [ ] MySQL installed & database created
- [ ] Nginx installed & configured
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] .env file configured
- [ ] Database migrations run
- [ ] Frontend built (npm run build)
- [ ] Landing page built (jika ada)
- [ ] Nginx virtual hosts configured
- [ ] SSL certificates installed
- [ ] Services running (Nginx, PHP-FPM, MySQL)
- [ ] Backend API accessible
- [ ] Frontend accessible
- [ ] Landing page accessible (jika ada)
- [ ] Login works
- [ ] No errors in logs

---

## 📚 Related Documentation

- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `DEPLOYMENT_QUICK_GUIDE.md` - Quick deployment reference
- `ENVIRONMENT_VARIABLES_GUIDE.md` - Environment variables
- `REDIS_DOCKER_SETUP.md` - Redis setup (untuk local)
- `scripts/setup-redis-vps.sh` - Redis setup untuk VPS

---

**Selamat Deployment! 🚀**
