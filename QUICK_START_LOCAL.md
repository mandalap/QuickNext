# 🚀 Quick Start - Menjalankan Project di Local

## ⚡ Cara Tercepat

### **Opsi 1: Menggunakan Script Setup (Recommended)**

#### Windows:
```bash
# Double-click atau jalankan:
setup-local.bat
```

Script ini akan:
- ✅ Cek prerequisites (PHP, Composer, Node.js)
- ✅ Install semua dependencies
- ✅ Buat file .env jika belum ada
- ✅ Generate APP_KEY
- ✅ Setup database SQLite
- ✅ Run migrations

#### Setelah Setup, Jalankan Servers:
```bash
# Double-click atau jalankan:
start_servers.bat
```

---

## 📋 Setup Manual Step-by-Step

### **STEP 1: Setup Backend**

```bash
cd app/backend

# 1. Install dependencies
composer install

# 2. Buat file .env (copy dari ENV_TEMPLATE.md atau buat manual)
# Minimal isi:
# APP_NAME="QuickKasir POS System"
# APP_ENV=local
# APP_DEBUG=true
# APP_URL=http://localhost:8000
# DB_CONNECTION=sqlite
# DB_DATABASE=database/database.sqlite
# FRONTEND_URL=http://localhost:3000
# LANDING_URL=http://localhost:3001

# 3. Generate APP_KEY
php artisan key:generate

# 4. Buat database SQLite
# Windows: type nul > database\database.sqlite
# Linux/Mac: touch database/database.sqlite

# 5. Run migrations
php artisan migrate

# 6. (Optional) Seed database
php artisan db:seed

# 7. Start server
php artisan serve
```

**Backend akan berjalan di:** http://localhost:8000

---

### **STEP 2: Setup Frontend**

```bash
cd app/frontend

# 1. Install dependencies
npm install

# 2. Buat file .env.local
# Isi:
# REACT_APP_BACKEND_URL=http://localhost:8000
# REACT_APP_API_BASE_URL=http://localhost:8000/api

# 3. Start server
npm start
```

**Frontend akan berjalan di:** http://localhost:3000

---

### **STEP 3: Setup Landing Page (Optional)**

```bash
cd app/beranda

# 1. Install dependencies
npm install

# 2. Buat file .env.local
# Isi:
# NODE_ENV=development
# NEXT_PUBLIC_API_URL=http://localhost:8000/api
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# 3. Start server
npm run dev
```

**Landing akan berjalan di:** http://localhost:3001

---

## 🔍 Troubleshooting

### **Error: "composer: command not found"**
**Solusi:** Install Composer dari https://getcomposer.org/

### **Error: "php: command not found"**
**Solusi:** 
- Install PHP >= 8.2
- Pastikan PHP di PATH
- Windows: Restart terminal setelah install

### **Error: "npm: command not found"**
**Solusi:** Install Node.js >= 18.x dari https://nodejs.org/

### **Error: Database connection failed**
**Solusi:**
```bash
# Jika pakai SQLite:
cd app/backend
type nul > database\database.sqlite  # Windows
# atau
touch database/database.sqlite  # Linux/Mac
php artisan migrate
```

### **Error: Port already in use**
**Solusi:**
```bash
# Windows - Cek port
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F

# Atau ubah port:
# Backend: php artisan serve --port=8001
# Frontend: set PORT=3001 (di .env.local)
```

### **Error: Module not found**
**Solusi:**
```bash
# Hapus node_modules dan reinstall
rm -rf node_modules package-lock.json
npm install
```

### **Error: APP_KEY missing**
**Solusi:**
```bash
cd app/backend
php artisan key:generate
```

---

## ✅ Checklist Setup

- [ ] PHP >= 8.2 terinstall
- [ ] Composer terinstall
- [ ] Node.js >= 18.x terinstall
- [ ] Backend dependencies installed (`composer install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Landing dependencies installed (`npm install`)
- [ ] Backend `.env` file created
- [ ] Frontend `.env.local` file created
- [ ] Landing `.env.local` file created
- [ ] APP_KEY generated
- [ ] Database migrations run
- [ ] Backend server running (`php artisan serve`)
- [ ] Frontend server running (`npm start`)
- [ ] Landing server running (`npm run dev`)

---

## 🎯 Quick Commands

```bash
# Setup semua (Windows)
setup-local.bat

# Start semua servers (Windows)
start_servers.bat

# Atau manual:
# Terminal 1: cd app/backend && php artisan serve
# Terminal 2: cd app/frontend && npm start
# Terminal 3: cd app/beranda && npm run dev
```

---

## 📝 File .env Minimal

### Backend (`app/backend/.env`):
```env
APP_NAME="QuickKasir POS System"
APP_ENV=local
APP_KEY=base64:... (generate dengan php artisan key:generate)
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

FRONTEND_URL=http://localhost:3000
LANDING_URL=http://localhost:3001
```

### Frontend (`app/frontend/.env.local`):
```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api
```

### Landing (`app/beranda/.env.local`):
```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

---

**Selamat coding! 🚀**
