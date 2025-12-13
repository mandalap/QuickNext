# 🔐 Environment Variables untuk Production

## 📋 File Environment yang Diperlukan

### 1. Landing Page (Next.js)

**File:** `app/beranda/.env.production`

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.quickkasir.com
NEXT_PUBLIC_APP_URL=https://app.quickkasir.com
```

---

### 2. POS Application (React)

**File:** `app/frontend/.env.production`

```env
REACT_APP_BACKEND_URL=https://api.quickkasir.com
REACT_APP_ENV=production
REACT_APP_APP_URL=https://app.quickkasir.com
REACT_APP_LANDING_URL=https://quickkasir.com
```

---

### 3. Backend API (Laravel)

**File:** `app/backend/.env`

```env
APP_NAME=quickKasir
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=false
APP_URL=https://api.quickkasir.com

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=quickkasir_db
DB_USERNAME=quickkasir_user
DB_PASSWORD=your_secure_password_here

BROADCAST_DRIVER=log
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@quickkasir.com"
MAIL_FROM_NAME="${APP_NAME}"

# CORS Configuration
FRONTEND_URL=https://app.quickkasir.com
LANDING_URL=https://quickkasir.com

# File Storage
FILESYSTEM_DISK=local
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

# Payment Gateway (Midtrans)
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_IS_PRODUCTION=true
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true

# Queue Configuration
QUEUE_CONNECTION=redis
```

---

## 🔧 Setup Environment di Server

### **1. Generate App Key (Laravel)**

```bash
cd /var/www/api.quickkasir.com
php artisan key:generate
```

### **2. Setup Environment Files**

```bash
# Copy example files
cp app/backend/.env.example app/backend/.env
cp app/frontend/.env.example app/frontend/.env.production
cp app/beranda/.env.example app/beranda/.env.production

# Edit dengan nano atau vim
nano app/backend/.env
nano app/frontend/.env.production
nano app/beranda/.env.production
```

---

## 🔒 Security Checklist

- [ ] `APP_DEBUG=false` di production
- [ ] `APP_KEY` sudah di-generate
- [ ] Database password kuat dan unik
- [ ] Redis password di-set (jika perlu)
- [ ] CORS origins hanya domain production
- [ ] SSL certificate sudah terpasang
- [ ] File `.env` tidak di-commit ke git
- [ ] File permissions `.env` adalah 600

---

## 📝 Notes

- Jangan pernah commit file `.env` ke repository
- Gunakan environment variables untuk semua konfigurasi sensitif
- Rotate credentials secara berkala
- Backup file `.env` di tempat aman

