# 📋 Environment Variables Guide - Kasir POS System

## ✅ Dokumentasi Lengkap Environment Variables

Dokumentasi ini mencakup semua environment variables yang digunakan di aplikasi QuickKasir POS System.

---

## 🎯 Frontend Environment Variables

### **File: `app/frontend/.env.local`**

```env
# ==========================================
# API Configuration
# ==========================================
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_API_URL=http://localhost:8000/api

# ==========================================
# Push Notifications (PWA)
# ==========================================
REACT_APP_VAPID_PUBLIC_KEY=<your-vapid-public-key>

# ==========================================
# Environment
# ==========================================
NODE_ENV=development
```

### **Penjelasan:**

| Variable                     | Required | Default                     | Description                                             |
| ---------------------------- | -------- | --------------------------- | ------------------------------------------------------- |
| `REACT_APP_BACKEND_URL`      | ✅       | `http://localhost:8000`     | Backend base URL (tanpa `/api`)                         |
| `REACT_APP_API_BASE_URL`     | ✅       | `http://localhost:8000/api` | Backend API base URL                                    |
| `REACT_APP_API_URL`          | ⚠️       | `http://localhost:8000/api` | Alias untuk API URL (beberapa komponen menggunakan ini) |
| `REACT_APP_VAPID_PUBLIC_KEY` | ⚠️       | -                           | VAPID public key untuk push notifications               |
| `NODE_ENV`                   | ✅       | `development`               | Environment mode (development/production)               |

**Note:** Semua variable yang dimulai dengan `REACT_APP_` akan di-expose ke browser. Jangan simpan sensitive data di sini!

---

## 🎯 Backend Environment Variables

### **File: `app/backend/.env`**

```env
# ==========================================
# Application Configuration
# ==========================================
APP_NAME="QuickKasir POS System"
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

# ==========================================
# Frontend URLs (for CORS & Redirects)
# ==========================================
FRONTEND_URL=http://localhost:3000
LANDING_URL=http://localhost:3001

# ==========================================
# Database Configuration
# ==========================================
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# For MySQL/PostgreSQL (if needed):
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=quickkasir
# DB_USERNAME=root
# DB_PASSWORD=

# ==========================================
# Push Notifications (PWA)
# ==========================================
VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_PRIVATE_KEY=<your-vapid-private-key>
VAPID_SUBJECT=mailto:admin@quickkasir.com

# ==========================================
# Midtrans Payment Gateway
# ==========================================
MIDTRANS_SERVER_KEY=<your-midtrans-server-key>
MIDTRANS_CLIENT_KEY=<your-midtrans-client-key>
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true

# ==========================================
# Mail Configuration (Optional)
# ==========================================
MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@quickkasir.com"
MAIL_FROM_NAME="${APP_NAME}"

# ==========================================
# Queue Configuration (Optional)
# ==========================================
DB_QUEUE_CONNECTION=database
DB_QUEUE_TABLE=jobs
DB_QUEUE=default
DB_QUEUE_RETRY_AFTER=90

# ==========================================
# Maintenance Mode (Optional)
# ==========================================
APP_MAINTENANCE_DRIVER=file
APP_MAINTENANCE_STORE=database
```

### **Penjelasan:**

#### **Application Configuration**

| Variable              | Required | Default            | Description                                                             |
| --------------------- | -------- | ------------------ | ----------------------------------------------------------------------- |
| `APP_NAME`            | ✅       | `Laravel`          | Nama aplikasi                                                           |
| `APP_ENV`             | ✅       | `production`       | Environment (local/production/testing)                                  |
| `APP_KEY`             | ✅       | -                  | Application encryption key (generate dengan `php artisan key:generate`) |
| `APP_DEBUG`           | ✅       | `false`            | Enable debug mode (set `false` di production!)                          |
| `APP_URL`             | ✅       | `http://localhost` | Base URL aplikasi backend                                               |
| `APP_LOCALE`          | ⚠️       | `en`               | Default locale                                                          |
| `APP_FALLBACK_LOCALE` | ⚠️       | `en`               | Fallback locale                                                         |
| `APP_FAKER_LOCALE`    | ⚠️       | `en_US`            | Faker locale untuk seeding                                              |

#### **Frontend URLs**

| Variable       | Required | Default                 | Description                           |
| -------------- | -------- | ----------------------- | ------------------------------------- |
| `FRONTEND_URL` | ✅       | `http://localhost:3000` | Frontend URL (untuk CORS & redirects) |
| `LANDING_URL`  | ⚠️       | `http://localhost:3001` | Landing page URL (jika ada)           |

#### **Database Configuration**

| Variable        | Required | Default                    | Description                                                  |
| --------------- | -------- | -------------------------- | ------------------------------------------------------------ |
| `DB_CONNECTION` | ✅       | `sqlite`                   | Database driver (sqlite/mysql/pgsql)                         |
| `DB_DATABASE`   | ✅       | `database/database.sqlite` | Database file (SQLite) atau database name (MySQL/PostgreSQL) |
| `DB_HOST`       | ⚠️       | `127.0.0.1`                | Database host (untuk MySQL/PostgreSQL)                       |
| `DB_PORT`       | ⚠️       | `3306`                     | Database port (untuk MySQL/PostgreSQL)                       |
| `DB_USERNAME`   | ⚠️       | `root`                     | Database username (untuk MySQL/PostgreSQL)                   |
| `DB_PASSWORD`   | ⚠️       | -                          | Database password (untuk MySQL/PostgreSQL)                   |

#### **Push Notifications**

| Variable            | Required | Default                       | Description                                                       |
| ------------------- | -------- | ----------------------------- | ----------------------------------------------------------------- |
| `VAPID_PUBLIC_KEY`  | ⚠️       | -                             | VAPID public key (generate dengan `php generate-vapid-keys.php`)  |
| `VAPID_PRIVATE_KEY` | ⚠️       | -                             | VAPID private key (generate dengan `php generate-vapid-keys.php`) |
| `VAPID_SUBJECT`     | ⚠️       | `mailto:admin@quickkasir.com` | VAPID subject (email atau URL)                                    |

#### **Midtrans Payment Gateway**

| Variable                 | Required | Default | Description                          |
| ------------------------ | -------- | ------- | ------------------------------------ |
| `MIDTRANS_SERVER_KEY`    | ⚠️       | -       | Midtrans server key (dari dashboard) |
| `MIDTRANS_CLIENT_KEY`    | ⚠️       | -       | Midtrans client key (dari dashboard) |
| `MIDTRANS_IS_PRODUCTION` | ⚠️       | `false` | Set `true` untuk production          |
| `MIDTRANS_IS_SANITIZED`  | ⚠️       | `true`  | Enable input sanitization            |
| `MIDTRANS_IS_3DS`        | ⚠️       | `true`  | Enable 3D Secure                     |

#### **Mail Configuration**

| Variable            | Required | Default                  | Description                         |
| ------------------- | -------- | ------------------------ | ----------------------------------- |
| `MAIL_MAILER`       | ⚠️       | `smtp`                   | Mail driver (smtp/sendmail/mailgun) |
| `MAIL_HOST`         | ⚠️       | `mailhog`                | SMTP host                           |
| `MAIL_PORT`         | ⚠️       | `1025`                   | SMTP port                           |
| `MAIL_USERNAME`     | ⚠️       | `null`                   | SMTP username                       |
| `MAIL_PASSWORD`     | ⚠️       | `null`                   | SMTP password                       |
| `MAIL_ENCRYPTION`   | ⚠️       | `null`                   | SMTP encryption (tls/ssl)           |
| `MAIL_FROM_ADDRESS` | ⚠️       | `noreply@quickkasir.com` | Default from email                  |
| `MAIL_FROM_NAME`    | ⚠️       | `${APP_NAME}`            | Default from name                   |

#### **Queue Configuration**

| Variable               | Required | Default    | Description         |
| ---------------------- | -------- | ---------- | ------------------- |
| `DB_QUEUE_CONNECTION`  | ⚠️       | `database` | Queue connection    |
| `DB_QUEUE_TABLE`       | ⚠️       | `jobs`     | Queue table name    |
| `DB_QUEUE`             | ⚠️       | `default`  | Default queue name  |
| `DB_QUEUE_RETRY_AFTER` | ⚠️       | `90`       | Retry after seconds |

---

## 🚀 Quick Setup

### **Development Setup**

**1. Frontend (`.env.local`):**

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api
NODE_ENV=development
```

**2. Backend (`.env`):**

```env
APP_NAME="QuickKasir POS System"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

### **Production Setup**

**1. Frontend (`.env.production`):**

```env
REACT_APP_BACKEND_URL=https://api.quickkasir.com
REACT_APP_API_BASE_URL=https://api.quickkasir.com/api
REACT_APP_VAPID_PUBLIC_KEY=<production-vapid-public-key>
NODE_ENV=production
```

**2. Backend (`.env`):**

```env
APP_NAME="QuickKasir POS System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.quickkasir.com
FRONTEND_URL=https://app.quickkasir.com
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=quickkasir_prod
DB_USERNAME=quickkasir_user
DB_PASSWORD=<secure-password>
VAPID_PUBLIC_KEY=<production-vapid-public-key>
VAPID_PRIVATE_KEY=<production-vapid-private-key>
VAPID_SUBJECT=mailto:admin@quickkasir.com
MIDTRANS_SERVER_KEY=<production-midtrans-server-key>
MIDTRANS_CLIENT_KEY=<production-midtrans-client-key>
MIDTRANS_IS_PRODUCTION=true
```

---

## 📝 Template Files

### **Frontend `.env.local.example`**

```env
# API Configuration
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api

# Push Notifications (PWA)
REACT_APP_VAPID_PUBLIC_KEY=

# Environment
NODE_ENV=development
```

### **Backend `.env.example`**

```env
APP_NAME="QuickKasir POS System"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

FRONTEND_URL=http://localhost:3000
LANDING_URL=http://localhost:3001

DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@quickkasir.com

MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true

MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="noreply@quickkasir.com"
MAIL_FROM_NAME="${APP_NAME}"
```

---

## ⚠️ Security Notes

1. **Never commit `.env` files** - Tambahkan ke `.gitignore`
2. **Use different keys for development and production**
3. **Keep VAPID private key secret** - Jangan commit ke version control
4. **Set `APP_DEBUG=false` in production** - Untuk security
5. **Use strong passwords** - Untuk database dan services
6. **Rotate keys regularly** - Untuk security best practices

---

## 🔍 How to Find Environment Variables

### **Frontend:**

- Cari `process.env.REACT_APP_*` di codebase
- File utama: `app/frontend/src/config/api.config.js`
- File lain: Semua file yang menggunakan `process.env`

### **Backend:**

- Cari `env('*')` di config files
- File utama: `app/backend/config/*.php`
- Cek semua file di `app/backend/config/` directory

---

## ✅ Checklist

- [x] Dokumentasi lengkap environment variables
- [x] Template `.env.example` untuk frontend
- [x] Template `.env.example` untuk backend
- [x] Security notes
- [x] Quick setup guide
- [ ] Create actual `.env.example` files (manual)

---

## 📚 Related Files

- Frontend Config: `app/frontend/src/config/api.config.js`
- Backend Config: `app/backend/config/*.php`
- API Client: `app/frontend/src/utils/apiClient.js`
- CORS Config: `app/backend/config/cors.php`
- Midtrans Config: `app/backend/config/midtrans.php`

---

## 🎯 Next Steps

1. **Create `.env.example` files** - Copy template di atas
2. **Document production values** - Simpan di secure location (password manager)
3. **Setup CI/CD** - Configure environment variables di deployment platform
4. **Test** - Verify semua env vars bekerja dengan benar
