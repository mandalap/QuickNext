# 🔧 Fix Database Connection Error

## ❌ Error yang Terjadi

```
SQLSTATE[HY000] [2002] No connection could be made because the target machine actively refused it
(Connection: mysql, Host: 127.0.0.1, Port: 3306, Database: laravel-pos-system)
```

## 🔍 Root Cause

Error ini terjadi karena:
1. **MySQL service tidak berjalan**
2. **Port 3306 tidak terbuka atau diblokir**
3. **Konfigurasi database di `.env` salah**
4. **MySQL tidak terinstall**

---

## ✅ Solusi Step-by-Step

### **STEP 1: Cek MySQL Service Status**

#### Windows:
```powershell
# Cek apakah MySQL service berjalan
Get-Service -Name MySQL*

# Atau cek di Services (services.msc)
# Cari "MySQL" atau "MySQL80" atau "MariaDB"
```

#### Linux/Ubuntu:
```bash
# Cek status MySQL service
sudo systemctl status mysql
# atau
sudo systemctl status mariadb
```

#### MacOS:
```bash
# Cek status MySQL
brew services list | grep mysql
# atau
sudo launchctl list | grep mysql
```

---

### **STEP 2: Start MySQL Service**

#### Windows:
```powershell
# Start MySQL service
Start-Service -Name MySQL80
# atau
net start MySQL80
```

Atau melalui Services:
1. Buka `services.msc`
2. Cari "MySQL80" atau "MySQL"
3. Klik kanan → Start

#### Linux/Ubuntu:
```bash
# Start MySQL service
sudo systemctl start mysql
# atau
sudo systemctl start mariadb

# Enable auto-start on boot
sudo systemctl enable mysql
```

#### MacOS:
```bash
# Start MySQL
brew services start mysql
# atau
sudo launchctl load -w /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist
```

---

### **STEP 3: Cek Konfigurasi Database di `.env`**

Pastikan file `.env` di `app/backend/.env` memiliki konfigurasi yang benar:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel-pos-system
DB_USERNAME=root
DB_PASSWORD=your_password_here
```

**⚠️ PENTING:**
- `DB_DATABASE` harus sesuai dengan nama database yang ada
- `DB_USERNAME` dan `DB_PASSWORD` harus benar
- Jika menggunakan XAMPP/WAMP, biasanya:
  - `DB_USERNAME=root`
  - `DB_PASSWORD=` (kosong)

---

### **STEP 4: Test Koneksi Database**

#### Test dengan MySQL Client:
```bash
# Windows (jika MySQL di PATH)
mysql -u root -p

# Linux/MacOS
mysql -u root -p

# Atau dengan host dan port eksplisit
mysql -h 127.0.0.1 -P 3306 -u root -p
```

#### Test dengan Laravel Tinker:
```bash
cd app/backend
php artisan tinker

# Di dalam tinker:
DB::connection()->getPdo();
```

Jika berhasil, akan return PDO object. Jika error, berarti masih ada masalah koneksi.

---

### **STEP 5: Cek Port 3306**

#### Windows:
```powershell
# Cek apakah port 3306 digunakan
netstat -an | findstr :3306

# Atau
Get-NetTCPConnection -LocalPort 3306
```

#### Linux/MacOS:
```bash
# Cek apakah port 3306 digunakan
sudo lsof -i :3306
# atau
sudo netstat -tulpn | grep 3306
```

Jika tidak ada output, berarti MySQL tidak berjalan di port 3306.

---

### **STEP 6: Cek Firewall (Jika Masih Error)**

#### Windows:
```powershell
# Cek firewall rules untuk MySQL
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*MySQL*"}

# Jika perlu, allow port 3306
New-NetFirewallRule -DisplayName "MySQL" -Direction Inbound -LocalPort 3306 -Protocol TCP -Action Allow
```

#### Linux:
```bash
# Cek firewall
sudo ufw status
sudo ufw allow 3306/tcp
```

---

### **STEP 7: Cek Nama Database**

Pastikan database `laravel-pos-system` sudah dibuat:

```bash
# Login ke MySQL
mysql -u root -p

# Di dalam MySQL:
SHOW DATABASES;

# Jika database tidak ada, buat:
CREATE DATABASE `laravel-pos-system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Atau gunakan nama database yang benar dari .env
```

---

### **STEP 8: Clear Laravel Cache**

Setelah memperbaiki koneksi, clear cache Laravel:

```bash
cd app/backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

---

## 🔍 Troubleshooting Lanjutan

### **Q: MySQL service tidak bisa start**

**A:** 
1. Cek error log MySQL:
   - Windows: `C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err`
   - Linux: `/var/log/mysql/error.log`
   - MacOS: `/usr/local/var/mysql/*.err`

2. Cek apakah port 3306 sudah digunakan aplikasi lain:
   ```bash
   # Windows
   netstat -ano | findstr :3306
   
   # Linux/MacOS
   sudo lsof -i :3306
   ```

3. Jika port sudah digunakan, ubah port MySQL di `my.cnf` atau `my.ini`

---

### **Q: Password MySQL salah**

**A:**
1. Reset password MySQL:
   ```bash
   # Windows (XAMPP)
   # Stop MySQL di XAMPP Control Panel
   # Edit my.ini, tambahkan: skip-grant-tables
   # Start MySQL
   # Login tanpa password: mysql -u root
   # Update password: ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
   # Hapus skip-grant-tables dari my.ini
   # Restart MySQL
   ```

2. Atau update `.env` dengan password yang benar

---

### **Q: Database tidak ada**

**A:**
1. Buat database baru:
   ```sql
   CREATE DATABASE `laravel-pos-system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Atau jalankan migration:
   ```bash
   cd app/backend
   php artisan migrate
   ```

---

### **Q: Menggunakan Database yang Berbeda**

Jika ingin menggunakan database yang berbeda, update `.env`:

```env
DB_DATABASE=quickkasir_db
DB_USERNAME=quickkasir_user
DB_PASSWORD=your_password
```

Kemudian clear config:
```bash
php artisan config:clear
```

---

## ✅ Checklist Verifikasi

- [ ] MySQL service berjalan
- [ ] Port 3306 terbuka dan tidak diblokir
- [ ] Konfigurasi `.env` benar (DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD)
- [ ] Database sudah dibuat
- [ ] User MySQL memiliki permission untuk database
- [ ] Firewall tidak memblokir port 3306
- [ ] Laravel cache sudah di-clear

---

## 🚀 Quick Fix Script

### Windows (PowerShell):
```powershell
# Start MySQL service
Start-Service -Name MySQL80

# Test connection
mysql -u root -p -e "SHOW DATABASES;"

# Clear Laravel cache
cd app/backend
php artisan config:clear
php artisan cache:clear
```

### Linux/MacOS:
```bash
# Start MySQL service
sudo systemctl start mysql

# Test connection
mysql -u root -p -e "SHOW DATABASES;"

# Clear Laravel cache
cd app/backend
php artisan config:clear
php artisan cache:clear
```

---

## 📝 Catatan Penting

1. **XAMPP/WAMP Users:**
   - Pastikan MySQL di XAMPP/WAMP Control Panel sudah running
   - Default password biasanya kosong (`DB_PASSWORD=`)

2. **Docker Users:**
   - Pastikan MySQL container running: `docker ps`
   - Cek port mapping: `docker port <container_name>`

3. **Production Server:**
   - Pastikan MySQL service auto-start on boot
   - Cek firewall rules
   - Pastikan user MySQL memiliki permission yang benar

---

Jika masih error setelah mengikuti semua langkah di atas, kirimkan:
1. Output dari `php artisan tinker` → `DB::connection()->getPdo();`
2. Output dari `mysql -u root -p -e "SHOW DATABASES;"`
3. Isi file `.env` (tanpa password) untuk bagian database
