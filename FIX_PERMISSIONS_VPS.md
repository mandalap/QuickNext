# 🔧 Fix Permission Issues di VPS

## ❌ Error yang Terjadi

```
Permission denied: /var/www/quickkasir/app/backend/storage/logs/laravel.log
Permission denied: /var/www/quickkasir/app/backend/bootstrap/cache/config.php
Permission denied: /var/www/quickkasir/app/backend/storage/framework/views/...
```

## ✅ Solusi Cepat

### Opsi 1: Set Ownership ke www-data (Recommended untuk Production)

```bash
cd /var/www/quickkasir/app/backend

# Set ownership
sudo chown -R www-data:www-data storage
sudo chown -R www-data:www-data bootstrap/cache

# Set permissions
sudo chmod -R 775 storage
sudo chmod -R 775 bootstrap/cache

# Buat direktori logs jika belum ada
sudo mkdir -p storage/logs
sudo chown -R www-data:www-data storage/logs
sudo chmod -R 775 storage/logs

# Buat file laravel.log jika belum ada
sudo touch storage/logs/laravel.log
sudo chown www-data:www-data storage/logs/laravel.log
sudo chmod 664 storage/logs/laravel.log
```

### Opsi 2: Set Ownership ke User Saat Ini (Alternatif)

```bash
cd /var/www/quickkasir/app/backend

# Ganti $USER dengan username Anda (contoh: mandala)
sudo chown -R mandala:www-data storage
sudo chown -R mandala:www-data bootstrap/cache

# Set permissions
sudo chmod -R 775 storage
sudo chmod -R 775 bootstrap/cache

# Buat direktori dan file yang diperlukan
sudo mkdir -p storage/logs
sudo touch storage/logs/laravel.log
sudo chown -R mandala:www-data storage/logs
sudo chmod -R 775 storage/logs
```

### Opsi 3: Tambahkan User ke Group www-data

```bash
# Tambahkan user ke group www-data
sudo usermod -a -G www-data $USER

# Logout dan login lagi, atau:
newgrp www-data

# Set permissions
cd /var/www/quickkasir/app/backend
sudo chmod -R 775 storage
sudo chmod -R 775 bootstrap/cache
```

## 🔍 Verifikasi Permissions

```bash
# Cek ownership
ls -la /var/www/quickkasir/app/backend/storage
ls -la /var/www/quickkasir/app/backend/bootstrap/cache

# Cek permissions
stat /var/www/quickkasir/app/backend/storage/logs/laravel.log
```

**Expected output:**
- Owner: `www-data` atau `mandala`
- Group: `www-data`
- Permissions: `775` atau `664` untuk files

## 🧪 Test Setelah Fix

```bash
cd /var/www/quickkasir/app/backend

# Test artisan commands
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Jika berhasil, tidak ada error
```

## 📝 Catatan Penting

1. **www-data** adalah user yang digunakan oleh Nginx/PHP-FPM
2. **775** = rwxrwxr-x (owner & group bisa write, others hanya read)
3. **664** = rw-rw-r-- (owner & group bisa write, others hanya read)
4. Setelah fix, pastikan semua artisan commands berjalan tanpa error

## 🚨 Jika Masih Error

```bash
# Cek apakah file/directory ada
ls -la /var/www/quickkasir/app/backend/storage/logs/

# Jika tidak ada, buat manual
sudo mkdir -p /var/www/quickkasir/app/backend/storage/logs
sudo mkdir -p /var/www/quickkasir/app/backend/storage/framework/views
sudo mkdir -p /var/www/quickkasir/app/backend/storage/framework/cache
sudo mkdir -p /var/www/quickkasir/app/backend/storage/framework/sessions

# Set ownership dan permissions
sudo chown -R www-data:www-data /var/www/quickkasir/app/backend/storage
sudo chmod -R 775 /var/www/quickkasir/app/backend/storage
```

## ✅ Checklist

- [ ] Storage directory ownership set ke www-data atau user
- [ ] Bootstrap/cache ownership set ke www-data atau user
- [ ] Permissions set ke 775
- [ ] Laravel.log file exists dan writable
- [ ] Artisan commands berjalan tanpa error
