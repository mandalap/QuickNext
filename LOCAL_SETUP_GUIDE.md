# 🚀 Panduan Setup Local Development - QuickKasir POS System

## 📋 Prerequisites

Pastikan sudah terinstall:
- ✅ **PHP >= 8.2** (dengan extension: pdo, pdo_mysql, mbstring, openssl, tokenizer, xml, ctype, json, bcmath)
- ✅ **Composer** (PHP package manager)
- ✅ **Node.js >= 18.x** dan **npm/yarn**
- ✅ **MySQL** (atau SQLite untuk development)
- ✅ **Git**

---

## 🔧 STEP 1: Setup Backend (Laravel)

### **1.1 Install Dependencies**

```bash
cd app/backend
composer install
```

### **1.2 Setup Environment File**

```bash
# Copy template (jika ada)
# Atau buat file .env manual

# Generate APP_KEY
php artisan key:generate
```

**Isi file `.env` minimal:**

```env
APP_NAME="QuickKasir POS System"
APP_ENV=local
APP_KEY=base64:... (akan di-generate otomatis)
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database - Opsi 1: SQLite (Paling mudah untuk development)
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# Database - Opsi 2: MySQL
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=quickkasir_db
# DB_USERNAME=root
# DB_PASSWORD=

# Frontend URLs
FRONTEND_URL=http://localhost:3000
LANDING_URL=http://localhost:3001

# CORS (untuk development)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### **1.3 Setup Database**

```bash
# Jika pakai SQLite, pastikan file database ada
touch database/database.sqlite

# Run migrations
php artisan migrate

# (Optional) Seed database dengan data dummy
php artisan db:seed
```

### **1.4 Test Backend**

```bash
# Start Laravel server
php artisan serve

# Buka browser: http://localhost:8000
# Harus muncul halaman Laravel atau API response
```

---

## 🎨 STEP 2: Setup Frontend (React)

### **2.1 Install Dependencies**

```bash
cd app/frontend
npm install
# atau
yarn install
```

### **2.2 Setup Environment File**

Buat file `.env.local` di `app/frontend/`:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_VAPID_PUBLIC_KEY=
```

### **2.3 Test Frontend**

```bash
# Start React dev server
npm start
# atau
yarn start

# Buka browser: http://localhost:3000
```

---

## 🌐 STEP 3: Setup Landing Page (Next.js) - Optional

### **3.1 Install Dependencies**

```bash
cd app/beranda
npm install
# atau
yarn install
```

### **3.2 Setup Environment File**

Buat file `.env.local` di `app/beranda/`:

```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

### **3.3 Test Landing Page**

```bash
# Start Next.js dev server
npm run dev
# atau
yarn dev

# Buka browser: http://localhost:3001
```

---

## 🚀 STEP 4: Menjalankan Semua Services

### **Cara 1: Manual (3 Terminal Terpisah)**

#### Terminal 1 - Backend:
```bash
cd app/backend
php artisan serve
```

#### Terminal 2 - Frontend:
```bash
cd app/frontend
npm start
```

#### Terminal 3 - Landing (Optional):
```bash
cd app/beranda
npm run dev
```

### **Cara 2: Menggunakan Script**

#### Windows:
```bash
# Double-click atau jalankan:
start_servers.bat
```

#### PowerShell:
```powershell
.\start_servers.ps1
```

---

## 🔍 Troubleshooting

### **Error: Database Connection Failed**

**Solusi:**
1. **Jika pakai SQLite:**
   ```bash
   cd app/backend
   touch database/database.sqlite
   php artisan migrate
   ```

2. **Jika pakai MySQL:**
   - Pastikan MySQL service running
   - Cek credentials di `.env`
   - Buat database: `CREATE DATABASE quickkasir_db;`
   - Run: `php artisan migrate`

### **Error: Port Already in Use**

**Solusi:**
```bash
# Windows - Cek port
netstat -ano | findstr :8000
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F

# Atau ubah port di:
# Backend: php artisan serve --port=8001
# Frontend: set PORT=3001 di .env.local
```

### **Error: Module Not Found / Dependencies Missing**

**Solusi:**
```bash
# Backend
cd app/backend
composer install

# Frontend
cd app/frontend
rm -rf node_modules package-lock.json
npm install

# Landing
cd app/beranda
rm -rf node_modules package-lock.json
npm install
```

### **Error: APP_KEY Missing**

**Solusi:**
```bash
cd app/backend
php artisan key:generate
```

### **Error: CORS Error**

**Solusi:**
1. Pastikan `FRONTEND_URL` di backend `.env` benar
2. Clear config cache:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

### **Error: Cannot Find Module**

**Solusi:**
```bash
# Hapus node_modules dan reinstall
rm -rf node_modules
npm install
```

---

## ✅ Checklist Setup

- [ ] PHP >= 8.2 terinstall
- [ ] Composer terinstall
- [ ] Node.js >= 18.x terinstall
- [ ] MySQL/SQLite ready
- [ ] Backend dependencies installed (`composer install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Landing dependencies installed (`npm install`)
- [ ] Backend `.env` file created
- [ ] Frontend `.env.local` file created
- [ ] Landing `.env.local` file created
- [ ] APP_KEY generated (`php artisan key:generate`)
- [ ] Database migrations run (`php artisan migrate`)
- [ ] Backend server running (`php artisan serve`)
- [ ] Frontend server running (`npm start`)
- [ ] Landing server running (`npm run dev`)

---

## 📝 Port yang Digunakan

| Service | Port | URL | Framework |
|---------|------|-----|-----------|
| Backend | 8000 | http://localhost:8000 | Laravel |
| Frontend | 3000 | http://localhost:3000 | React |
| Landing | 3001 | http://localhost:3001 | Next.js |

---

## 🎯 Quick Start Commands

```bash
# 1. Setup Backend
cd app/backend
composer install
php artisan key:generate
php artisan migrate
php artisan serve

# 2. Setup Frontend (Terminal baru)
cd app/frontend
npm install
npm start

# 3. Setup Landing (Terminal baru - Optional)
cd app/beranda
npm install
npm run dev
```

---

## 🔗 Akses Aplikasi

- **Frontend:** http://localhost:3000
- **Landing Page:** http://localhost:3001
- **Backend API:** http://localhost:8000/api
- **Filament Admin:** http://localhost:8000/admin

---

## 📚 Dokumentasi Tambahan

- `README.md` - Dokumentasi utama
- `ENVIRONMENT_VARIABLES_GUIDE.md` - Panduan environment variables
- `BACKEND_FRONTEND_CONNECTION_GUIDE.md` - Panduan koneksi backend-frontend
- `CARA_JALANKAN_FRONTEND_BERANDA.md` - Panduan menjalankan frontend & beranda

---

**Selamat coding! 🚀**
