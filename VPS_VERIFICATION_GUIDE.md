# 🔍 Panduan Verifikasi Deployment - QuickKasir POS System

Panduan lengkap untuk mengecek apakah deployment ke VPS berhasil atau tidak.

---

## 🚀 Jalankan Deployment dari Awal (IP 103.59.95.78)

Untuk **deploy ulang dari nol** di VPS dengan IP **103.59.95.78**:

1. **SSH ke VPS**
   ```bash
   ssh root@103.59.95.78
   # atau: ssh mandala@103.59.95.78
   ```

2. **Clone repo ke VPS** (jika belum ada) lalu masuk ke project:
   ```bash
   cd /var/www/kasir-pos
   # Jika belum ada: clone dulu sesuai Step 9 di deploy script.
   ```

3. **Pastikan script terbaru** (git pull):
   ```bash
   cd /var/www/kasir-pos
   git fetch origin && git pull
   ```

4. **Jalankan deploy dengan IP 103.59.95.78**
   ```bash
   sudo bash scripts/deploy-vps-ip-only.sh 103.59.95.78
   ```
   Atau tanpa argumen (pakai default **103.59.95.78**):
   ```bash
   sudo bash scripts/deploy-vps-ip-only.sh
   ```

5. **Setelah selesai:** setup DB, migrasi, lalu verifikasi:
   ```bash
   cd /var/www/kasir-pos
   bash scripts/verify-deployment.sh
   ```

**URL akses setelah deploy:**
- Backend API: http://103.59.95.78:8000/api  
- Frontend App: http://103.59.95.78:3000  
- Landing Page: http://103.59.95.78:3001  

---

## ⚠️ Penting: Hanya untuk VPS

**Script verifikasi ini dirancang untuk dijalankan di VPS (Linux/Ubuntu), bukan di mesin local (Windows/Mac).**  
Semua pengecekan mengacu ke environment VPS: `/var/www/kasir-pos`, Nginx, MySQL, PM2, Redis, dll.

---

## 📌 Step-by-Step: Cek Deploy di VPS

Ikuti langkah ini berurutan untuk mengecek apakah `deploy-vps-ip-only.sh` sudah menginstall sempurna.

| Step | Apa yang dilakukan | Perintah |
|------|--------------------|----------|
| **1** | Buka terminal di komputer Anda (PowerShell, CMD, atau Git Bash). | — |
| **2** | SSH ke VPS. Ganti `root` / `mandala` dan IP jika berbeda. | `ssh root@103.59.95.78` |
| **3** | Masuk ke folder project. | `cd /var/www/kasir-pos` |
| **4** | Jalankan script verifikasi. | `bash scripts/verify-deployment.sh` |
| **5** | Tunggu sampai selesai. Script akan menampilkan banyak pengecekan (PASS ✅ / FAIL ❌). | — |
| **6** | Lihat **Summary** di bagian paling bawah: *Total Checks*, *Passed*, *Failed*. | — |
| **7** | Interpretasi hasil sesuai tiga poin di bawah. | — |

**Interpretasi Summary:**

- **`🎉 All checks passed! Deployment successful!`**  
  → Deploy **sempurna**. Semua komponen terinstall dan berjalan baik.

- **`⚠️ Some checks failed. Review the output above.`**  
  → Sebagian besar OK, ada 1–3 yang gagal. Cek baris yang ❌ FAIL di output, lalu perbaiki (mis. DB belum di-setup, firewall, dll.). Lihat [Troubleshooting](#-troubleshooting) di bawah.

- **`❌ Multiple checks failed. Deployment may be incomplete.`**  
  → Banyak yang gagal. Kemungkinan deploy belum selesai atau ada error saat install. Jalankan ulang `sudo bash scripts/deploy-vps-ip-only.sh` atau perbaiki satu per satu sesuai [Manual Verification](#-manual-verification-step-by-step) di bawah.

**Setelah perbaikan (mis. setup DB & migrasi):**  
Jalankan lagi **Step 3–4** (`cd /var/www/kasir-pos` lalu `bash scripts/verify-deployment.sh`) untuk memastikan semua hijau.

---

## 🎯 Quick Verification (Cara Cepat)

### **Menggunakan Script Otomatis** ⭐ (RECOMMENDED)

**1. SSH ke VPS:**
```bash
ssh mandala@103.59.95.78
# atau
ssh root@103.59.95.78
```

**2. Jalankan script verifikasi di VPS:**
```bash
cd /var/www/kasir-pos
bash scripts/verify-deployment.sh
```

**Cek apakah `deploy-vps-ip-only.sh` sudah install sempurna:**  
Jalankan `verify-deployment.sh` **di VPS** (setelah deploy). Script deploy sudah memanggil verifikasi di **Step 18**; Anda juga bisa jalankan ulang manual setelah selesai konfigurasi DB & migrasi.

Script ini akan otomatis mengecek:
- ✅ System requirements (PHP, Composer, Node.js, MySQL, Nginx, PM2, Redis)
- ✅ Project structure
- ✅ Backend Laravel setup
- ✅ Frontend React build
- ✅ Services status
- ✅ Network ports
- ✅ HTTP endpoints accessibility

---

## 📋 Manual Verification (Step-by-Step)

Jika script otomatis tidak berjalan, ikuti langkah manual:

---

### **Step 1: Cek System Requirements**

```bash
# PHP 8.3
php -v
# Harus menampilkan: PHP 8.3.x

# Composer
composer --version
# Harus menampilkan versi Composer

# Node.js
node -v
# Harus menampilkan: v18.x.x atau lebih tinggi

# npm
npm -v
# Harus menampilkan versi npm

# MySQL
systemctl status mysql
# Harus: active (running)

# Nginx
systemctl status nginx
# Harus: active (running)

# PM2
pm2 -v
# Harus menampilkan versi PM2

# Redis
systemctl status redis-server
# Harus: active (running)
redis-cli ping
# Harus menampilkan: PONG
```

---

### **Step 2: Cek Project Structure**

```bash
cd /var/www/kasir-pos

# Cek directory structure
ls -la
# Harus ada: app/

ls -la app/
# Harus ada: backend/, frontend/, beranda/

# Cek backend
ls -la app/backend/
# Harus ada: .env, vendor/, storage/, bootstrap/

# Cek frontend
ls -la app/frontend/
# Harus ada: build/, .env.production

# Cek landing (optional)
ls -la app/beranda/
# Harus ada: .next/ (jika ada)
```

---

### **Step 3: Cek Backend (Laravel)**

```bash
cd /var/www/kasir-pos/app/backend

# Cek .env file
cat .env | grep APP_KEY
# Harus ada: APP_KEY=base64:...

# Cek database config
cat .env | grep DB_
# Harus ada: DB_CONNECTION, DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD

# Cek vendor directory
ls -la vendor/
# Harus ada banyak package Laravel

# Cek storage permissions
ls -ld storage/
# Harus: drwxrwxr-x (775)

# Test database connection
php artisan tinker
# Di dalam tinker:
DB::connection()->getPdo();
# Harus: tidak error
exit
```

---

### **Step 4: Cek Frontend (React)**

```bash
cd /var/www/kasir-pos/app/frontend

# Cek build directory
ls -la build/
# Harus ada: index.html, static/

# Cek .env.production
cat .env.production
# Harus ada: REACT_APP_BACKEND_URL=http://103.59.95.78:8000

# Cek index.html
head -20 build/index.html
# Harus ada HTML content
```

---

### **Step 5: Cek Services**

```bash
# PM2 Processes
pm2 list
# Harus ada: quickkasir-api (dan quickkasir-landing jika ada)

# PM2 Status
pm2 status
# Semua harus: online

# PM2 Logs (optional)
pm2 logs quickkasir-api --lines 20
# Cek apakah ada error

# Nginx Config
ls -la /etc/nginx/sites-enabled/kasir-pos
# Harus ada file kasir-pos

# Nginx Syntax
sudo nginx -t
# Harus: syntax is ok, test is successful

# PHP-FPM
systemctl status php8.3-fpm
# Harus: active (running)

# Redis
redis-cli ping
# Harus: PONG
```

---

### **Step 6: Cek Network Ports**

```bash
# Cek port yang listening
sudo netstat -tuln | grep -E ':(8000|3000|3001) '
# atau
sudo ss -tuln | grep -E ':(8000|3000|3001) '

# Harus menampilkan:
# :8000 (Backend API)
# :3000 (Frontend)
# :3001 (Landing Page - jika ada)
```

---

### **Step 7: Test HTTP Endpoints**

```bash
# Test Backend API
curl -I http://103.59.95.78:8000
# Harus: HTTP/1.1 200 OK atau 302 Found

# Test Frontend
curl -I http://103.59.95.78:3000
# Harus: HTTP/1.1 200 OK

# Test Landing (jika ada)
curl -I http://103.59.95.78:3001
# Harus: HTTP/1.1 200 OK

# Test dari browser
# Buka: http://103.59.95.78:8000/api
# Buka: http://103.59.95.78:3000
```

---

### **Step 8: Cek Firewall**

```bash
# Cek UFW status (jika aktif)
sudo ufw status
# Port 8000, 3000, 3001 harus: ALLOW

# Atau cek IDCloudHost Firewall
# Login ke dashboard IDCloudHost
# Buka Firewall settings
# Pastikan port 8000, 3000, 3001 sudah di-allow
```

---

## 🗄️ Setup MySQL untuk Backend (Database, User, Password)

Panduan mengubah backend dari SQLite ke MySQL dan membuat database + user.

### **Step 1: Masuk ke MySQL**

Jalankan di VPS:

```bash
sudo mysql -u root -p
```

- Jika diminta password dan Anda belum pernah set root: coba **tekan Enter** (password kosong).
- Di Ubuntu 24.04, root sering pakai **auth_socket** — tidak perlu password. Kalau `-p` tidak bisa, coba:  
  `sudo mysql` (tanpa `-p`).

### **Step 2: Buat database**

Di dalam MySQL (`mysql>`):

```sql
CREATE DATABASE kasir_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### **Step 3: Buat user dan password**

Ganti `YourStrongPassword123!` dengan password yang Anda pilih:

```sql
CREATE USER 'kasir_user'@'localhost' IDENTIFIED BY 'Mandala123';
```

### **Step 4: Beri hak akses ke database**

```sql
GRANT ALL PRIVILEGES ON kasir_pos.* TO 'kasir_user'@'localhost';
FLUSH PRIVILEGES;
```

### **Step 5: Keluar dari MySQL**

```sql
EXIT;
```

### **Step 6: Cek koneksi (opsional)**

```bash
mysql -u kasir_user -p kasir_pos -e "SELECT 1;"
```

Masukkan password yang tadi. Jika tidak error, user & database OK.

### **Step 7: Update `.env` backend**

```bash
cd /var/www/kasir-pos/app/backend
nano .env
```

Ubah bagian `DB_` jadi seperti ini (sesuaikan `DB_PASSWORD`):

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kasir_pos
DB_USERNAME=kasir_user
DB_PASSWORD=YourStrongPassword123!
```

Hapus atau comment baris SQLite jika masih ada. Simpan: `Ctrl+O`, `Enter`, `Ctrl+X`.

### **Step 8: Jalankan migrasi**

```bash
cd /var/www/kasir-pos/app/backend
php artisan migrate --force
```

Jika berhasil, tabel Laravel akan terbuat di `kasir_pos`. Cek koneksi:

```bash
php artisan tinker --execute="DB::connection()->getPdo(); echo 'OK';"
```

Harus tampil `OK` tanpa error.

---

## ✅ Checklist Verifikasi

Setelah menjalankan verifikasi, pastikan semua ini ✅:

### **System Requirements**
- [ ] PHP 8.3 installed
- [ ] Composer installed
- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] MySQL running
- [ ] Nginx running
- [ ] PM2 installed
- [ ] Redis running

### **Project Structure**
- [ ] Project directory exists (`/var/www/kasir-pos`)
- [ ] Backend directory exists
- [ ] Frontend directory exists
- [ ] Landing directory exists (optional)

### **Backend (Laravel)**
- [ ] `.env` file exists
- [ ] `APP_KEY` is set
- [ ] Database config is set
- [ ] `vendor/` directory exists
- [ ] Storage permissions correct (775)
- [ ] Database connection works

### **Frontend (React)**
- [ ] `build/` directory exists
- [ ] `index.html` exists
- [ ] `.env.production` exists
- [ ] IP config is correct (103.59.95.78)

### **Services**
- [ ] PM2 processes running (quickkasir-api)
- [ ] Nginx config exists and valid
- [ ] PHP-FPM running
- [ ] Redis connection works

### **Network**
- [ ] Port 8000 listening (Backend)
- [ ] Port 3000 listening (Frontend)
- [ ] Port 3001 listening (Landing - optional)
- [ ] Backend API accessible via HTTP
- [ ] Frontend accessible via HTTP
- [ ] Firewall ports opened

---

## 🔧 Troubleshooting

### **Problem 1: Script Verification Gagal**

```bash
# Berikan permission execute
chmod +x scripts/verify-deployment.sh

# Jalankan lagi
bash scripts/verify-deployment.sh
```

---

### **Problem 2: PM2 Processes Tidak Running**

```bash
# Cek PM2 list
pm2 list

# Jika tidak ada, start manual
cd /var/www/kasir-pos/app/backend
pm2 start "php artisan serve --host=0.0.0.0 --port=8000" --name "quickkasir-api"
pm2 save
```

---

### **Problem 3: Port Tidak Listening**

```bash
# Cek apakah service running
pm2 list
systemctl status nginx

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

---

### **Problem 4: HTTP Endpoints Tidak Accessible**

```bash
# Cek firewall
sudo ufw status

# Allow ports
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# Cek IDCloudHost Firewall
# Pastikan port sudah di-allow di dashboard
```

---

### **Problem 5: Database Connection Error**

```bash
# Test database connection
cd /var/www/kasir-pos/app/backend
php artisan tinker

# Di dalam tinker:
DB::connection()->getPdo();
# Jika error, cek .env DB_* config
```

---

### **Problem 5b: `Class "Redis" not found` (saat config:cache / setup-redis)**

Laravel memakai **phpredis** (ekstensi PHP) tapi ekstensi `php-redis` belum terpasang, atau `.env` punya `REDIS_CLIENT=phpredis` sementara kita pakai **Predis**.

**Opsi A – Pakai Predis (tanpa ekstensi):**
```bash
cd /var/www/kasir-pos/app/backend
# Pastikan REDIS_CLIENT=predis di .env
sed -i 's/^REDIS_CLIENT=.*/REDIS_CLIENT=predis/' .env
php artisan config:clear
php artisan config:cache
```

**Opsi B – Install ekstensi php-redis:**
```bash
sudo apt update
sudo apt install -y php8.3-redis
sudo systemctl restart php8.3-fpm
cd /var/www/kasir-pos/app/backend
php artisan config:clear
php artisan config:cache
```

Setelah itu jalankan lagi `setup-redis-vps.sh` atau deploy step yang gagal.

---

### **Problem 6: Cek Manual Step 1–5 — Beberapa FAIL (DB, Frontend build, PM2, Nginx)**

**Gejala:** System requirements OK, tapi Step 3–5 ada yang gagal:

| Cek | Gejala | Artinya |
|-----|--------|---------|
| **Step 3** | `DB::connection()->getPdo()` → *SQLiteDatabaseDoesNotExistException* atau MySQL error | Database belum ada: SQLite file belum dibuat, atau MySQL belum dikonfigurasi & migrate |
| **Step 4** | `ls build/` → *No such file or directory* | Frontend React **belum di-build** (`npm run build` belum dijalankan) |
| **Step 5** | `pm2 list` kosong | Backend & landing **belum dijalankan** lewat PM2 |
| **Step 5** | `ls /etc/nginx/sites-enabled/kasir-pos` → *No such file or directory* | Nginx config untuk QuickKasir **belum dipasang** |

**Penyebab umum:** `deploy-vps-ip-only.sh` tidak dijalankan sampai selesai, atau deploy gagal di tengah jalan (frontend build / Nginx / PM2).

**Perbaikan (jalankan di VPS):**

```bash
# 1. Database: pilih salah satu

# Opsi A — Pakai SQLite (cepat, untuk tes)
cd /var/www/kasir-pos/app/backend
touch database/database.sqlite
php artisan migrate --force

# Opsi B — Pakai MySQL (produksi)
# Ikuti langkah lengkap: [Setup MySQL](#-setup-mysql-untuk-backend-database-user-password) di atas.
# Ringkas: buat DB + user di MySQL → update .env (DB_*) → php artisan migrate --force
php artisan migrate --force

# 2. Frontend — build React (build/ belum ada = belum pernah npm run build)
cd /var/www/kasir-pos/app/frontend
npm install          # jangan pakai --production; devDependencies (craco, dll.) dibutuhkan untuk build
npm run build        # menghasilkan build/ + index.html; bisa 2–5 menit
ls -la build/        # verifikasi: harus ada index.html, static/

# 3. Nginx & PM2 — jalankan deploy script (akan setup Nginx + PM2)
cd /var/www/kasir-pos
sudo bash scripts/deploy-vps-ip-only.sh
```

Atau perbaiki manual: pasang Nginx config (lihat deploy script), lalu start PM2 (`quickkasir-api`, `quickkasir-landing`). Setelah itu jalankan lagi `bash scripts/verify-deployment.sh`.

---

### **Problem 7: Storage / bootstrap/cache — "Operation not permitted" (chmod / chown)**

**Gejala:** Saat menjalankan `chmod -R 775 storage bootstrap/cache` atau `chown -R www-data:www-data storage bootstrap/cache`, muncul `Operation not permitted`.

**Penyebab:** Perintah dijalankan tanpa **root**. Mengubah permission atau ownership untuk direktori yang dimiliki user lain (mis. `www-data`) memerlukan `sudo`.

**Perbaikan (jalankan di VPS):**

```bash
cd /var/www/kasir-pos/app/backend

# Pakai sudo — wajib jika login sebagai user non-root (mis. mandala)
sudo chmod -R 775 storage bootstrap/cache
sudo chown -R www-data:www-data storage bootstrap/cache
```

Verifikasi: `ls -ld storage/` → harus `drwxrwxr-x` dan owner `www-data`.

---

## 📊 Interpretasi Hasil Script

### **Semua Pass (0 Failed)**
```
🎉 All checks passed! Deployment successful!
```
**Artinya:** Deployment berhasil! Semua komponen sudah terinstall dan berjalan dengan baik.

---

### **Beberapa Fail (1-3 Failed)**
```
⚠️  Some checks failed. Review the output above.
```
**Artinya:** Sebagian besar berhasil, tapi ada beberapa yang perlu diperbaiki. Cek output untuk detail.

**Kemungkinan masalah:**
- Database belum di-setup
- Frontend belum di-build
- PM2 processes belum di-start
- Firewall belum di-configure

---

### **Banyak Fail (>3 Failed)**
```
❌ Multiple checks failed. Deployment may be incomplete.
```
**Artinya:** Deployment mungkin belum selesai atau ada masalah besar.

**Kemungkinan masalah:**
- Dependencies belum terinstall
- Script deployment belum dijalankan
- Ada error saat installation

**Solusi:**
1. Jalankan script deployment lagi: `sudo bash scripts/deploy-vps-ip-only.sh`
2. Cek error messages
3. Perbaiki masalah satu per satu

---

## 🚀 Quick Commands Reference

```bash
# Verifikasi cepat
cd /var/www/kasir-pos && bash scripts/verify-deployment.sh

# Cek PM2
pm2 list
pm2 logs

# Cek services
systemctl status nginx
systemctl status php8.3-fpm
systemctl status mysql
systemctl status redis-server

# Cek ports
sudo netstat -tuln | grep -E ':(8000|3000|3001)'

# Test HTTP
curl -I http://103.59.95.78:8000
curl -I http://103.59.95.78:3000

# Cek logs
pm2 logs quickkasir-api
sudo tail -f /var/log/nginx/error.log
```

---

## 📚 Related Documentation

- `VPS_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `VPS_IP_DEPLOYMENT.md` - IP-only deployment guide
- `scripts/deploy-vps-ip-only.sh` - Deployment script
- `scripts/verify-deployment.sh` - Verification script

---

**Selamat Verifikasi! 🔍**
