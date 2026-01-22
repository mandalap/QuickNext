# 🚀 Panduan Menjalankan Project POS di Local

Panduan lengkap step-by-step untuk menjalankan QuickKasir POS System di local environment Windows.

---

## 📋 Prerequisites (Yang Harus Diinstall)

Sebelum mulai, pastikan sudah install:

- ✅ **PHP >= 8.2** - [Download PHP](https://www.php.net/downloads)
- ✅ **Composer** - [Download Composer](https://getcomposer.org/download/)
- ✅ **Node.js >= 18.x** - [Download Node.js](https://nodejs.org/)
- ✅ **MySQL >= 8.0** atau **SQLite** (untuk development)
- ✅ **Docker Desktop** (untuk Redis - optional tapi recommended)
- ✅ **Git** (jika clone dari repository)

---

## 🎯 Quick Start (Cara Cepat)

### **Option 1: Menggunakan Script Otomatis** ⭐ (RECOMMENDED)

Jalankan script yang sudah disediakan:

**Windows (PowerShell):**
```powershell
cd e:\development\kasir-pos-system
.\start_servers.ps1
```

**Windows (CMD):**
```cmd
cd e:\development\kasir-pos-system
start_servers.bat
```

Script ini akan otomatis:
- ✅ Start Backend Laravel (port 8000)
- ✅ Start Frontend React (port 3000)
- ✅ Start Landing Page Next.js (port 3001) - optional

---

## 📝 Setup Manual (Step-by-Step)

Jika script otomatis tidak berjalan, ikuti langkah manual berikut:

---

### **Step 1: Setup Backend (Laravel)**

#### **1.1. Install Dependencies**

```powershell
cd e:\development\kasir-pos-system\app\backend
composer install
```

#### **1.2. Setup Environment File**

```powershell
# Copy .env.example ke .env (jika belum ada)
copy .env.example .env

# Generate application key
php artisan key:generate
```

#### **1.3. Konfigurasi Database**

Edit file `app/backend/.env` dan set konfigurasi database:

**Untuk SQLite (Development - Paling Mudah):**
```env
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

**Untuk MySQL:**
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=quickkasir
DB_USERNAME=root
DB_PASSWORD=
```

**Setup SQLite Database:**
```powershell
# Buat file database SQLite
New-Item -ItemType File -Path "database\database.sqlite" -Force
```

#### **1.4. Setup Redis (Optional tapi Recommended)**

Jika sudah install Docker, jalankan:
```powershell
cd e:\development\kasir-pos-system
.\scripts\setup-redis-docker-windows.ps1
```

Atau manual:
```powershell
docker run -d --name quickkasir-redis -p 6379:6379 --restart unless-stopped redis:7-alpine
```

Kemudian update `.env`:
```env
REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

#### **1.5. Run Migrations**

```powershell
cd e:\development\kasir-pos-system\app\backend
php artisan migrate
```

**Dengan seed data (recommended untuk development):**
```powershell
php artisan migrate --seed
```

#### **1.6. Start Backend Server**

```powershell
php artisan serve
```

Backend akan berjalan di: **http://localhost:8000**

**Atau dengan host dan port custom:**
```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

---

### **Step 2: Setup Frontend (React)**

#### **2.1. Install Dependencies**

```powershell
cd e:\development\kasir-pos-system\app\frontend
npm install
```

#### **2.2. Setup Environment File**

Buat file `app/frontend/.env.local`:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_API_URL=http://localhost:8000/api
NODE_ENV=development
```

#### **2.3. Start Frontend Server**

```powershell
npm start
```

Frontend akan berjalan di: **http://localhost:3000**

Browser akan otomatis terbuka. Jika tidak, buka manual di browser.

---

### **Step 3: Setup Landing Page (Next.js) - Optional**

#### **3.1. Install Dependencies**

```powershell
cd e:\development\kasir-pos-system\app\beranda
npm install
```

#### **3.2. Start Landing Page Server**

```powershell
npm run dev
```

Landing page akan berjalan di: **http://localhost:3001**

---

## 🎯 Menjalankan Semua Server Sekaligus

### **Menggunakan Composer Script (Backend)**

Di folder `app/backend`, jalankan:

```powershell
cd e:\development\kasir-pos-system\app\backend
composer run dev
```

Ini akan menjalankan:
- ✅ Laravel server
- ✅ Queue worker
- ✅ Log viewer (Pail)
- ✅ Vite (asset bundler)

### **Menggunakan Script yang Sudah Ada**

**PowerShell:**
```powershell
.\start_servers.ps1
```

**CMD/Batch:**
```cmd
start_servers.bat
```

---

## ✅ Verifikasi Setup

### **1. Test Backend API**

Buka browser atau gunakan curl:

```powershell
# Test API health
curl http://localhost:8000/api/health

# Atau buka di browser:
# http://localhost:8000/api/health
```

### **2. Test Frontend**

Buka browser:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api

### **3. Test Database Connection**

```powershell
cd e:\development\kasir-pos-system\app\backend
php artisan tinker
```

Di dalam tinker:
```php
DB::connection()->getPdo();
// Jika tidak error, berarti database connected
```

### **4. Test Redis Connection**

```powershell
cd e:\development\kasir-pos-system\app\backend
php artisan tinker
```

Di dalam tinker:
```php
Cache::put('test', 'success', 60);
Cache::get('test'); // Should return "success"
```

---

## 🔧 Troubleshooting

### **Problem 1: Port Already in Use**

**Error:** `Address already in use` atau `Port 8000 is already in use`

**Solution:**

**Option A:** Stop process yang menggunakan port
```powershell
# Cek process di port 8000
netstat -ano | findstr :8000

# Kill process (ganti PID dengan process ID yang ditemukan)
taskkill /PID <PID> /F
```

**Option B:** Gunakan port lain
```powershell
php artisan serve --port=8001
```

Kemudian update `.env.local` frontend:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_API_BASE_URL=http://localhost:8001/api
```

---

### **Problem 2: Database Connection Error**

**Error:** `SQLSTATE[HY000] [2002] No connection could be made`

**Solution:**

1. **Check database service running:**
   ```powershell
   # Untuk MySQL
   # Pastikan MySQL service running di Services
   ```

2. **Check .env configuration:**
   ```env
   DB_CONNECTION=sqlite  # Atau mysql
   DB_DATABASE=database/database.sqlite  # Untuk SQLite
   ```

3. **Untuk SQLite, pastikan file database ada:**
   ```powershell
   New-Item -ItemType File -Path "app\backend\database\database.sqlite" -Force
   ```

---

### **Problem 3: Composer Install Error**

**Error:** `Your requirements could not be resolved`

**Solution:**

```powershell
# Update Composer
composer self-update

# Clear cache
composer clear-cache

# Install lagi
composer install --no-cache
```

---

### **Problem 4: npm Install Error**

**Error:** `npm ERR!` atau dependency conflicts

**Solution:**

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules dan package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Install lagi
npm install
```

---

### **Problem 5: Migration Error**

**Error:** `SQLSTATE[HY000]: General error`

**Solution:**

```powershell
# Fresh migration (HATI-HATI: akan hapus semua data!)
php artisan migrate:fresh --seed

# Atau rollback dan migrate lagi
php artisan migrate:rollback
php artisan migrate
```

---

### **Problem 6: CORS Error di Browser**

**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution:**

1. **Check CORS config di `app/backend/config/cors.php`**
2. **Pastikan frontend URL ada di allowed origins**
3. **Clear config cache:**
   ```powershell
   php artisan config:clear
   ```

---

## 📊 Checklist Setup

Setelah setup, pastikan semua ini ✅:

- [ ] PHP >= 8.2 terinstall
- [ ] Composer terinstall
- [ ] Node.js >= 18.x terinstall
- [ ] Database (SQLite/MySQL) configured
- [ ] Backend dependencies installed (`composer install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] `.env.local` frontend configured
- [ ] Database migrations run (`php artisan migrate`)
- [ ] Backend server running (http://localhost:8000)
- [ ] Frontend server running (http://localhost:3000)
- [ ] Redis running (optional, tapi recommended)
- [ ] Bisa akses frontend di browser
- [ ] Bisa login ke aplikasi

---

## 🎉 Success!

Jika semua checklist ✅, berarti aplikasi sudah siap digunakan!

**URLs:**
- 🌐 **Frontend:** http://localhost:3000
- 🔧 **Backend API:** http://localhost:8000/api
- 📄 **API Docs:** http://localhost:8000/api/documentation (jika ada)
- 🌍 **Landing Page:** http://localhost:3001 (optional)

---

## 📚 Next Steps

### **1. Login ke Aplikasi**

Buka http://localhost:3000 dan login dengan:
- Email: (cek di database atau seed data)
- Password: (cek di database atau seed data)

### **2. Setup Business & Outlet**

Setelah login:
1. Buat Business baru (jika belum ada)
2. Buat Outlet baru
3. Assign employees ke outlet

### **3. Test Features**

- ✅ POS Transaction
- ✅ Product Management
- ✅ Inventory Management
- ✅ Financial Reports
- ✅ Employee Management

---

## 🔄 Daily Development Workflow

### **Start Development:**

```powershell
# Option 1: Script otomatis
.\start_servers.ps1

# Option 2: Manual
# Terminal 1: Backend
cd app\backend
php artisan serve

# Terminal 2: Frontend
cd app\frontend
npm start

# Terminal 3: Redis (jika menggunakan)
docker start quickkasir-redis
```

### **Stop Development:**

```powershell
# Stop semua server dengan Ctrl+C di masing-masing terminal

# Stop Redis
docker stop quickkasir-redis
```

---

## 💡 Tips & Best Practices

1. **Gunakan SQLite untuk Development**
   - Lebih mudah setup
   - Tidak perlu install MySQL
   - File-based, mudah backup

2. **Gunakan Redis untuk Performance**
   - Cache lebih cepat
   - Session lebih scalable
   - Queue processing lebih efisien

3. **Hot Reload**
   - Frontend: Auto-reload saat edit file
   - Backend: Perlu restart manual (`php artisan serve`)

4. **Database Seeding**
   - Gunakan `php artisan migrate --seed` untuk data dummy
   - Memudahkan testing dan development

5. **Environment Variables**
   - Jangan commit `.env` ke git
   - Gunakan `.env.example` sebagai template
   - Setup berbeda untuk development/production

---

## 📞 Need Help?

Jika ada masalah:

1. **Cek dokumentasi:**
   - `README.md` - Overview project
   - `ENVIRONMENT_VARIABLES_GUIDE.md` - Environment variables
   - `API_DOCUMENTATION.md` - API documentation

2. **Cek logs:**
   - Backend: `app/backend/storage/logs/laravel.log`
   - Frontend: Browser console (F12)

3. **Test koneksi:**
   - Backend: `php artisan tinker`
   - Redis: `docker exec quickkasir-redis redis-cli ping`

---

**Selamat Development! 🚀**
