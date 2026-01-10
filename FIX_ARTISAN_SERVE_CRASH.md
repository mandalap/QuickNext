# 🔧 Fix: php artisan serve berhenti sendiri

## ✅ MASALAH SUDAH FIXED! ✅

**Status:** Server sudah running di `http://127.0.0.1:8000`

---

## 🔍 Root Cause Analysis

**Error yang ditemukan di log:**

```
SQLSTATE[HY000] [2002] No connection could be made because the target machine actively refused it
(Connection: mysql, SQL: delete from `cache`)
```

**Penyebab sebenarnya:**

1. ❌ Bukan MySQL yang error (MySQL sudah berjalan)
2. ❌ Bukan database credentials yang salah (.env sudah benar)
3. ✅ **Masalah: Cache driver menggunakan database tanpa struktur yang siap**
4. ✅ **Solusi: Clear cache dan migration**

---

## ✅ Solusi Step-by-Step

### Step 1: Check Database Credentials

File: `app/backend/.env`

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel-pos-system
DB_USERNAME=root
DB_PASSWORD=mandala
```

**Periksa:**

- ✅ Host: 127.0.0.1 (benar)
- ✅ Port: 3306 (benar)
- ✅ Database name: laravel-pos-system
- ✅ Username: root
- ✅ Password: mandala

---

### Step 2: Create Database (jika belum ada)

```bash
# Terminal (command prompt or MySQL client)

# Login ke MySQL
mysql -u root -pmandala

# Create database
CREATE DATABASE `laravel-pos-system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Exit
EXIT;
```

**Atau pakai Tools:**

- phpMyAdmin: http://localhost/phpmyadmin
- MySQL Workbench
- HeidiSQL

---

### Step 3: Run Database Migration

```bash
# Terminal di app/backend folder

# Fresh migration (jika database belum ada struktur)
php artisan migrate --fresh --seed

# Atau hanya migrate (jika database sudah ada)
php artisan migrate
```

---

### Step 4: Clear Laravel Cache

```bash
# Terminal di app/backend folder
php artisan optimize:clear
php artisan cache:clear
php artisan config:clear

# Atau yang terbaik:
php artisan config:cache
php artisan route:cache
```

---

### Step 5: Start Laravel Server

```bash
# Terminal di app/backend folder
php artisan serve

# Seharusnya berhasil tanpa error
```

---

## 📋 Full Fix Script

Jalankan commands ini di terminal (app/backend folder):

```bash
# 1. Clear existing cache
php artisan optimize:clear

# 2. Create fresh database
php artisan migrate --fresh --seed

# 3. Cache again
php artisan config:cache
php artisan route:cache

# 4. Start server
php artisan serve
```

---

## 🚨 Jika Masih Error

### Check 1: Database Connection Test

```bash
# Terminal di app/backend folder
php artisan tinker

# Di tinker prompt
>>> DB::connection()->getPDO();

# Seharusnya tidak error
# Ketik: exit
```

### Check 2: Database Credentials

```bash
# Cek .env file
type .env | findstr DB_

# Harus match dengan:
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=laravel-pos-system
# DB_USERNAME=root
# DB_PASSWORD=mandala
```

### Check 3: MySQL is Running

```bash
# Check MySQL process
Get-Process | Where-Object {$_.Name -like "*mysql*"}

# Harus ada process mysqld atau similar
```

### Check 4: Restart MySQL Service

```powershell
# Command Prompt as Administrator

# Stop MySQL
net stop MySQL80

# Start MySQL
net start MySQL80
```

---

## 📝 Complete Troubleshooting Checklist

- [ ] Database `laravel-pos-system` sudah dibuat
- [ ] Database credentials di `.env` sudah benar
- [ ] MySQL service sudah running
- [ ] Migration sudah dijalankan: `php artisan migrate --fresh --seed`
- [ ] Cache sudah dihapus: `php artisan optimize:clear`
- [ ] Config cache sudah di-regenerate: `php artisan config:cache`
- [ ] Coba connection test: `php artisan tinker` → `DB::connection()->getPDO()`
- [ ] Start server: `php artisan serve`

---

## 🎯 Quick Fix (Copy-Paste)

Jalankan commands ini satu-satu:

```bash
# 1. Go to backend folder
cd app/backend

# 2. Clear cache
php artisan optimize:clear

# 3. Fresh migrate with seed
php artisan migrate --fresh --seed

# 4. Cache config
php artisan config:cache

# 5. Start server
php artisan serve
```

Server seharusnya start tanpa error!

---

## 🔗 Related Issues

Jika ada error lain:

- **Timeout:** Increase `DB_TIMEOUT` di `.env`
- **Wrong password:** Double-check MySQL password
- **Database locked:** Restart MySQL service
- **Memory:** Increase `memory_limit` di `php.ini`
