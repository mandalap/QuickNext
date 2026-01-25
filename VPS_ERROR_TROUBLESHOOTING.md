# 🔧 Troubleshooting Error VPS - QuickKasir POS System

Dokumentasi lengkap tentang error-error yang sering terjadi di VPS dan cara mengatasinya.

---

## 📋 Daftar Error Umum di VPS

### **1. Permission Denied Errors**

**Gejala:**
- `Permission denied` saat menjalankan `chmod` atau `chown`
- Laravel tidak bisa write ke `storage/` atau `bootstrap/cache/`
- Error saat upload file

**Penyebab:**
- File/folder dimiliki oleh user yang salah
- Permission tidak cukup (kurang dari 775)

**Solusi:**
```bash
cd /var/www/kasir-pos/app/backend

# Fix ownership
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

# Atau untuk seluruh project
sudo chown -R www-data:www-data /var/www/kasir-pos
```

---

### **2. Database Connection Error**

**Gejala:**
- `SQLSTATE[HY000] [2002] No connection could be made`
- `Access denied for user`
- `Unknown database 'kasir_pos'`

**Penyebab:**
- Database belum dibuat
- User MySQL belum dibuat atau password salah
- Konfigurasi `.env` salah
- MySQL service tidak running

**Solusi:**

**A. Cek MySQL Service:**
```bash
sudo systemctl status mysql
sudo systemctl start mysql  # Jika tidak running
```

**B. Buat Database & User:**
```bash
sudo mysql -u root -p

# Di dalam MySQL:
CREATE DATABASE kasir_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kasir_user'@'localhost' IDENTIFIED BY 'YourPassword123';
GRANT ALL PRIVILEGES ON kasir_pos.* TO 'kasir_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**C. Update .env:**
```bash
cd /var/www/kasir-pos/app/backend
nano .env

# Pastikan:
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kasir_pos
DB_USERNAME=kasir_user
DB_PASSWORD=YourPassword123
```

**D. Test Connection:**
```bash
php artisan tinker
# Di dalam tinker:
DB::connection()->getPdo();
# Harus tidak error
exit
```

---

### **3. Nginx 502 Bad Gateway**

**Gejala:**
- Browser menampilkan `502 Bad Gateway`
- Backend tidak bisa diakses via Nginx

**Penyebab:**
- PHP-FPM tidak running
- PHP-FPM socket tidak ditemukan
- Konfigurasi Nginx salah

**Solusi:**

**A. Cek PHP-FPM:**
```bash
sudo systemctl status php8.3-fpm  # atau php8.2-fpm
sudo systemctl start php8.3-fpm    # Jika tidak running
```

**B. Cek Socket:**
```bash
ls -la /var/run/php/php8.3-fpm.sock
# Harus ada file socket

# Jika tidak ada, restart PHP-FPM:
sudo systemctl restart php8.3-fpm
```

**C. Cek Nginx Config:**
```bash
sudo nginx -t  # Test config
sudo systemctl reload nginx
```

**D. Cek Logs:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/php8.3-fpm.log
```

---

### **4. Port Tidak Bisa Diakses**

**Gejala:**
- `Connection refused` saat akses port 8000, 3000, 3001
- Timeout saat akses dari browser

**Penyebab:**
- Firewall memblokir port
- Service tidak running di port tersebut
- IDCloudHost Firewall belum di-configure

**Solusi:**

**A. Cek UFW Firewall:**
```bash
sudo ufw status
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 22/tcp  # SSH
```

**B. Cek IDCloudHost Firewall:**
- Login ke IDCloudHost dashboard
- Buka Firewall settings untuk VPS
- Allow ports: 8000, 3000, 3001, 22

**C. Cek Port Listening:**
```bash
sudo netstat -tuln | grep -E ':(8000|3000|3001)'
# atau
sudo ss -tuln | grep -E ':(8000|3000|3001)'
```

**D. Cek PM2 (untuk backend):**
```bash
pm2 list
pm2 logs quickkasir-api
```

---

### **5. PM2 Processes Tidak Running**

**Gejala:**
- `pm2 list` kosong
- Backend tidak bisa diakses
- Service mati setelah restart VPS

**Penyebab:**
- PM2 tidak di-start
- PM2 startup tidak dikonfigurasi
- Process crash

**Solusi:**

**A. Start PM2 Manual:**
```bash
cd /var/www/kasir-pos/app/backend
pm2 start "php artisan serve --host=0.0.0.0 --port=8000" --name "quickkasir-api"
pm2 save
```

**B. Setup PM2 Startup:**
```bash
pm2 startup systemd -u root --hp /root
# Ikuti instruksi yang muncul
```

**C. Cek Logs:**
```bash
pm2 logs quickkasir-api
pm2 logs quickkasir-landing
```

**D. Restart PM2:**
```bash
pm2 restart all
pm2 save
```

---

### **6. Frontend Build Error / Build Tidak Ada**

**Gejala:**
- `ls build/` → `No such file or directory`
- Frontend tidak bisa diakses
- Nginx error `No such file or directory`

**Penyebab:**
- Frontend belum di-build
- Build gagal
- Dependencies belum diinstall

**Solusi:**

**A. Install Dependencies:**
```bash
cd /var/www/kasir-pos/app/frontend
npm install  # Jangan pakai --production, butuh devDependencies untuk build
```

**B. Build Frontend:**
```bash
npm run build
# Tunggu sampai selesai (2-5 menit)
```

**C. Verifikasi Build:**
```bash
ls -la build/
# Harus ada: index.html, static/
```

**D. Cek .env.production:**
```bash
cat .env.production
# Harus ada: REACT_APP_BACKEND_URL=http://103.59.95.78:8000
```

---

### **7. Redis Class Not Found**

**Gejala:**
- `Class "Redis" not found` saat `php artisan config:cache`
- Error saat setup Redis

**Penyebab:**
- Ekstensi `php-redis` belum terinstall
- `.env` menggunakan `REDIS_CLIENT=phpredis` tapi ekstensi tidak ada

**Solusi:**

**Opsi A - Pakai Predis (Recommended, tanpa ekstensi):**
```bash
cd /var/www/kasir-pos/app/backend
nano .env

# Pastikan:
REDIS_CLIENT=predis

# Clear & cache config:
php artisan config:clear
php artisan config:cache
```

**Opsi B - Install php-redis:**
```bash
sudo apt update
sudo apt install -y php8.3-redis  # atau php8.2-redis
sudo systemctl restart php8.3-fpm

cd /var/www/kasir-pos/app/backend
php artisan config:clear
php artisan config:cache
```

---

### **8. Too Many Requests (429 Error)**

**Gejala:**
- Console spam "Too Many Requests"
- API return 429 status code
- Frontend polling terlalu cepat

**Penyebab:**
- Rate limiting terlalu ketat
- Frontend polling terlalu cepat
- Route cache belum di-update

**Solusi:**

**A. Clear Route Cache:**
```bash
cd /var/www/kasir-pos/app/backend
php artisan route:clear
php artisan route:cache
```

**B. Cek Rate Limit di Code:**
```bash
# Rate limit untuk /profile/check harus 200 req/min
php artisan route:list --path=v1/user
```

**C. Update Frontend (jika perlu):**
- Kurangi interval polling di frontend
- Atau update rate limit di backend

---

### **9. Multiple Active Subscriptions Error**

**Gejala:**
- User sudah bayar tapi masih pakai trial
- `getCurrentSubscription` return subscription yang salah

**Penyebab:**
- Multiple subscriptions dengan status "active"
- Logic subscription tidak handle upgrade dengan benar

**Solusi:**

**A. Fix dengan Artisan Command:**
```bash
cd /var/www/kasir-pos/app/backend
php artisan subscription:fix-multiple-active --dry-run  # Cek dulu
php artisan subscription:fix-multiple-active  # Fix
```

**B. Manual Fix via Database:**
```sql
-- Cek user dengan multiple active
SELECT user_id, COUNT(*) as active_count
FROM user_subscriptions
WHERE status = 'active'
GROUP BY user_id
HAVING active_count > 1;

-- Fix: Mark old subscriptions as upgraded
UPDATE user_subscriptions
SET status = 'upgraded'
WHERE user_id = USER_ID
  AND id != NEWEST_SUBSCRIPTION_ID
  AND status = 'active';
```

---

### **10. SSL Certificate Error**

**Gejala:**
- `SSL certificate problem`
- Browser warning "Not Secure"
- Let's Encrypt certificate expired

**Penyebab:**
- Certificate belum diinstall
- Certificate expired
- Konfigurasi Nginx salah

**Solusi:**

**A. Install Let's Encrypt:**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

**B. Renew Certificate:**
```bash
sudo certbot renew
sudo certbot renew --dry-run  # Test
```

**C. Cek Certificate:**
```bash
sudo certbot certificates
```

---

### **11. Composer Install Error**

**Gejala:**
- `composer install` gagal
- `Memory limit exhausted`
- Dependency conflict

**Penyebab:**
- Memory limit PHP terlalu kecil
- Composer version lama
- Dependency conflict

**Solusi:**

**A. Increase Memory Limit:**
```bash
php -d memory_limit=512M /usr/local/bin/composer install --optimize-autoloader --no-dev
```

**B. Update Composer:**
```bash
composer self-update
```

**C. Clear Composer Cache:**
```bash
composer clear-cache
composer install --optimize-autoloader --no-dev
```

---

### **12. NPM Install Error**

**Gejala:**
- `npm install` gagal
- `ENOENT` errors
- Permission denied

**Penyebab:**
- Node.js version tidak compatible
- Permission issue
- Disk space penuh

**Solusi:**

**A. Cek Node.js Version:**
```bash
node -v  # Harus 18.x atau lebih tinggi
npm -v
```

**B. Fix Permission:**
```bash
cd /var/www/kasir-pos/app/frontend
sudo npm install
```

**C. Clear NPM Cache:**
```bash
npm cache clean --force
npm install
```

**D. Cek Disk Space:**
```bash
df -h
# Jika penuh, hapus file tidak perlu
```

---

### **13. Git Pull Error**

**Gejala:**
- `git pull` gagal
- `Permission denied`
- `Merge conflict`

**Penyebab:**
- Local changes tidak di-commit
- Permission issue
- Merge conflict

**Solusi:**

**A. Stash Local Changes:**
```bash
cd /var/www/kasir-pos
git stash
git pull origin development
git stash pop
```

**B. Force Pull (HATI-HATI, akan overwrite local changes):**
```bash
git fetch origin
git reset --hard origin/development
```

**C. Fix Permission:**
```bash
sudo chown -R $USER:$USER /var/www/kasir-pos
git pull origin development
```

---

### **14. Laravel Cache Error**

**Gejala:**
- `php artisan config:cache` gagal
- Cache tidak ter-update
- Old config masih digunakan

**Penyebab:**
- Cache permission issue
- Config syntax error
- Cache corrupted

**Solusi:**

**A. Clear All Cache:**
```bash
cd /var/www/kasir-pos/app/backend
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
```

**B. Re-cache:**
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

**C. Fix Permission:**
```bash
sudo chmod -R 775 bootstrap/cache
sudo chown -R www-data:www-data bootstrap/cache
```

---

### **15. Service Tidak Auto-Start Setelah Reboot**

**Gejala:**
- Setelah restart VPS, service tidak running
- PM2 processes hilang
- MySQL/Nginx tidak start

**Penyebab:**
- Service tidak di-enable
- PM2 startup tidak dikonfigurasi

**Solusi:**

**A. Enable Services:**
```bash
sudo systemctl enable mysql
sudo systemctl enable nginx
sudo systemctl enable php8.3-fpm
sudo systemctl enable redis-server
```

**B. Setup PM2 Startup:**
```bash
pm2 startup systemd -u root --hp /root
# Ikuti instruksi yang muncul
pm2 save
```

**C. Test Reboot:**
```bash
sudo reboot
# Setelah reboot, cek:
pm2 list
sudo systemctl status mysql
sudo systemctl status nginx
```

---

## 🔍 Quick Diagnostic Commands

Jalankan perintah ini untuk quick check:

```bash
# 1. Cek semua services
sudo systemctl status mysql
sudo systemctl status nginx
sudo systemctl status php8.3-fpm
sudo systemctl status redis-server
pm2 list

# 2. Cek ports
sudo netstat -tuln | grep -E ':(8000|3000|3001)'

# 3. Cek disk space
df -h

# 4. Cek memory
free -h

# 5. Cek logs
pm2 logs --lines 50
sudo tail -50 /var/log/nginx/error.log
sudo tail -50 /var/www/kasir-pos/app/backend/storage/logs/laravel.log

# 6. Test database
cd /var/www/kasir-pos/app/backend
php artisan tinker --execute="DB::connection()->getPdo(); echo 'OK';"

# 7. Test Redis
redis-cli ping  # Harus return PONG

# 8. Test HTTP
curl -I http://103.59.95.78:8000
curl -I http://103.59.95.78:3000
```

---

## 📚 Related Documentation

- `VPS_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `VPS_VERIFICATION_GUIDE.md` - Verification guide
- `VPS_URGENT_FIX.md` - Urgent fixes
- `scripts/verify-deployment.sh` - Automated verification script

---

## 🆘 Jika Masih Error

Jika setelah mengikuti semua solusi di atas masih ada error:

1. **Cek Logs Lengkap:**
   ```bash
   # Laravel logs
   tail -100 /var/www/kasir-pos/app/backend/storage/logs/laravel.log
   
   # Nginx logs
   tail -100 /var/log/nginx/error.log
   tail -100 /var/log/nginx/access.log
   
   # PHP-FPM logs
   tail -100 /var/log/php8.3-fpm.log
   
   # PM2 logs
   pm2 logs --lines 100
   ```

2. **Jalankan Verification Script:**
   ```bash
   cd /var/www/kasir-pos
   bash scripts/verify-deployment.sh
   ```

3. **Deploy Ulang dari Awal:**
   ```bash
   cd /var/www/kasir-pos
   sudo bash scripts/deploy-vps-ip-only.sh
   ```

---

**Dibuat:** 2026-01-26  
**Status:** Comprehensive troubleshooting guide  
**Priority:** 🔴 **HIGH** - Reference untuk semua error VPS
