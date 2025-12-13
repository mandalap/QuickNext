# 🚀 Quick Guide: Deployment quickKasir

## 📊 Struktur Deployment (Rekomendasi)

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET                              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              DNS: quickkasir.com                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ quickkasir.  │  │ app.quickkasir│  │ api.quickkasir│  │
│  │    .com      │  │    .com       │  │    .com      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Landing     │  │  POS App     │  │  Backend API │  │
│  │  (Next.js)  │  │  (React)     │  │  (Laravel)   │  │
│  │  Port: 3001 │  │  Port: 3000   │  │  Port: 8000  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    DATABASE                              │
│              MySQL/PostgreSQL                             │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Jawaban Singkat

### **1. Apakah Landing Page dan App POS berbeda URL?**

**YA, DIREKOMENDASIKAN BERBEDA:**

- **Landing Page:** `https://quickkasir.com`
- **POS App:** `https://app.quickkasir.com`
- **Backend API:** `https://api.quickkasir.com`

**Alasan:**
- ✅ SEO lebih baik (landing page terpisah)
- ✅ Mudah di-scale secara terpisah
- ✅ Cookie dan session terisolasi
- ✅ Maintenance lebih mudah

---

### **2. Bagaimana Backend-nya?**

**Backend API terpisah di subdomain sendiri:**

- **URL:** `https://api.quickkasir.com`
- **Framework:** Laravel
- **Port Internal:** 8000 (tidak perlu di-expose)
- **Dilindungi Nginx:** Reverse proxy

**Struktur:**
```
api.quickkasir.com/
├── app/              # Application code
├── public/           # Public folder (entry point)
├── storage/          # Uploaded files
└── .env              # Environment config
```

---

### **3. Apakah dengan Subdomain Masing-masing?**

**YA, REKOMENDASI MENGGUNAKAN SUBDOMAIN:**

| Subdomain | Aplikasi | Framework | Port Internal |
|-----------|----------|-----------|---------------|
| `quickkasir.com` | Landing Page | Next.js | 3001 |
| `app.quickkasir.com` | POS Application | React | 3000 |
| `api.quickkasir.com` | Backend API | Laravel | 8000 |

---

## 📁 Tata Letak File di Server

```
/var/www/
├── quickkasir.com/              # Landing Page
│   ├── .next/                   # Build output
│   ├── public/
│   │   ├── logo-qk.png
│   │   └── favicon.ico
│   └── package.json
│
├── app.quickkasir.com/          # POS App
│   ├── build/                   # Build output
│   │   ├── static/
│   │   └── index.html
│   └── package.json
│
└── api.quickkasir.com/          # Backend API
    ├── app/
    ├── public/
    │   └── index.php
    ├── storage/
    └── .env
```

---

## 🔧 Setup Cepat

### **1. DNS Configuration**

Tambahkan A Record di DNS provider:

```
quickkasir.com        → IP Server (misal: 123.45.67.89)
app.quickkasir.com   → IP Server (sama)
api.quickkasir.com    → IP Server (sama)
```

### **2. Environment Variables**

**Landing Page** (`app/beranda/.env.production`):
```env
NEXT_PUBLIC_API_URL=https://api.quickkasir.com
```

**POS App** (`app/frontend/.env.production`):
```env
REACT_APP_BACKEND_URL=https://api.quickkasir.com
```

**Backend** (`app/backend/.env`):
```env
APP_URL=https://api.quickkasir.com
FRONTEND_URL=https://app.quickkasir.com
LANDING_URL=https://quickkasir.com
```

### **3. Build & Deploy**

```bash
# Landing Page
cd app/beranda
npm run build
pm2 start npm --name "quickkasir-landing" -- start

# POS App
cd app/frontend
npm run build
# Copy build/ ke server

# Backend
cd app/backend
composer install --no-dev
php artisan config:cache
php artisan migrate --force
```

---

## 📚 Dokumentasi Lengkap

Untuk detail lengkap, lihat:
- `DEPLOYMENT_ARCHITECTURE.md` - Arsitektur lengkap
- `NGINX_CONFIG_EXAMPLES.md` - Konfigurasi Nginx
- `DEPLOYMENT_ENV_EXAMPLES.md` - Environment variables

---

## ❓ FAQ

**Q: Bisa pakai path-based (quickkasir.com/app) saja?**  
A: Bisa, tapi subdomain lebih direkomendasikan untuk scalability.

**Q: Perlu server terpisah untuk masing-masing?**  
A: Tidak perlu, bisa di 1 server dengan Nginx sebagai reverse proxy.

**Q: Bagaimana dengan SSL?**  
A: Gunakan Let's Encrypt (gratis) untuk semua subdomain.

**Q: Apakah perlu CDN?**  
A: Opsional, tapi direkomendasikan untuk static assets.

---

## 🎯 Kesimpulan

**Struktur Deployment yang Direkomendasikan:**

✅ **3 Subdomain terpisah:**
- `quickkasir.com` → Landing Page
- `app.quickkasir.com` → POS Application  
- `api.quickkasir.com` → Backend API

✅ **1 Server** dengan Nginx sebagai reverse proxy

✅ **1 Database** untuk semua aplikasi

✅ **SSL Certificate** untuk semua subdomain

