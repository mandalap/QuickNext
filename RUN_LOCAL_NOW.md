# 🚀 Cara Menjalankan Project di Local - SEKARANG

## ⚡ Quick Start (Paling Cepat)

### **1. Jalankan Script Setup**

```bash
# Double-click atau jalankan di terminal:
setup-local.bat
```

Script ini akan otomatis:
- ✅ Install semua dependencies
- ✅ Buat file .env yang diperlukan
- ✅ Setup database
- ✅ Run migrations

### **2. Setelah Setup, Jalankan Servers**

```bash
# Double-click atau jalankan:
start_servers.bat
```

Ini akan membuka 3 window terminal:
- Backend Laravel (port 8000)
- Frontend React (port 3000)
- Landing Next.js (port 3001)

---

## 📋 Manual Setup (Jika Script Gagal)

### **STEP 1: Backend**

```bash
cd app/backend

# Install dependencies
composer install

# Generate APP_KEY (jika belum)
php artisan key:generate

# Buat database SQLite (jika belum)
type nul > database\database.sqlite

# Run migrations
php artisan migrate

# Start server
php artisan serve
```

**Cek:** http://localhost:8000 harus bisa diakses

---

### **STEP 2: Frontend**

```bash
cd app/frontend

# Install dependencies
npm install

# Buat .env.local jika belum ada
# Isi minimal:
# REACT_APP_BACKEND_URL=http://localhost:8000
# REACT_APP_API_BASE_URL=http://localhost:8000/api

# Start server
npm start
```

**Cek:** http://localhost:3000 harus bisa diakses

---

### **STEP 3: Landing (Optional)**

```bash
cd app/beranda

# Install dependencies
npm install

# Buat .env.local jika belum ada
# Isi minimal:
# NODE_ENV=development
# NEXT_PUBLIC_API_URL=http://localhost:8000/api
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Start server
npm run dev
```

**Cek:** http://localhost:3001 harus bisa diakses

---

## 🔍 Troubleshooting Cepat

### **Backend tidak jalan:**
```bash
cd app/backend
php artisan config:clear
php artisan cache:clear
php artisan serve
```

### **Frontend tidak jalan:**
```bash
cd app/frontend
rm -rf node_modules
npm install
npm start
```

### **Port sudah digunakan:**
```bash
# Cek port
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

### **Database error:**
```bash
cd app/backend
type nul > database\database.sqlite
php artisan migrate
```

---

## ✅ Checklist Cepat

- [ ] `composer install` di backend
- [ ] `npm install` di frontend
- [ ] `npm install` di beranda
- [ ] File `.env` di backend ada
- [ ] File `.env.local` di frontend ada
- [ ] File `.env.local` di beranda ada
- [ ] `php artisan key:generate` sudah dijalankan
- [ ] `php artisan migrate` sudah dijalankan
- [ ] Backend server running (port 8000)
- [ ] Frontend server running (port 3000)
- [ ] Landing server running (port 3001)

---

## 🎯 Test Koneksi

1. **Backend:** http://localhost:8000
2. **Frontend:** http://localhost:3000
3. **Landing:** http://localhost:3001
4. **API Test:** http://localhost:8000/api/v1/dashboard/stats (harus return JSON)

---

**Jika masih error, kirimkan:**
1. Error message lengkap
2. Output dari `php artisan serve`
3. Output dari `npm start`
4. Isi file `.env` (tanpa password/API key)
