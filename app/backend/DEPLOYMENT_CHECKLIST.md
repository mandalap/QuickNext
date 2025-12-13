# 📋 Deployment Checklist

## 🚀 Sebelum Upload ke Hosting

### 1. Environment Setup
- [ ] Copy `.env.example` ke `.env`
- [ ] Update database credentials
- [ ] Update `APP_URL` sesuai domain hosting
- [ ] Update `APP_TIMEZONE` ke `Asia/Jakarta`
- [ ] Generate app key: `php artisan key:generate`

### 2. Database
- [ ] Backup database lokal
- [ ] Export database untuk import ke hosting
- [ ] Siapkan script migration jika perlu

### 3. Dependencies
- [ ] Jalankan `composer install --optimize-autoloader --no-dev`
- [ ] Jalankan `npm run build` (jika ada frontend)
- [ ] Clear cache: `php artisan config:clear`

### 4. Files & Permissions
- [ ] Pastikan `storage` dan `bootstrap/cache` writable
- [ ] Upload semua file ke server
- [ ] Set permissions:
  ```bash
  chmod -R 755 storage bootstrap/cache
  chown -R www-data:www-data storage bootstrap/cache
  ```

---

## 📤 Upload ke Hosting

### 1. Upload Files
- [ ] Upload semua file via FTP/SFTP atau Git
- [ ] Pastikan `.env` sudah di-upload dan di-update
- [ ] Pastikan `storage` dan `bootstrap/cache` ada

### 2. Setup Database
- [ ] Buat database di hosting
- [ ] Import database atau jalankan migration:
  ```bash
  php artisan migrate --force
  ```

### 3. Install Dependencies
- [ ] Jalankan `composer install --optimize-autoloader --no-dev`
- [ ] Clear dan cache config:
  ```bash
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
  ```

---

## ⚠️ PENTING: Setup Cron Job!

### **WAJIB DILAKUKAN!**

Setelah upload, **SEGERA** setup cron job agar:
- ✅ Pengingat subscription otomatis berjalan
- ✅ Scheduled tasks berfungsi
- ✅ Sistem berjalan otomatis

**Lihat file:** `CRONJOB_SETUP_REMINDER.md` untuk detail lengkap!

**Quick Setup:**
```bash
# Tambahkan ke crontab (via SSH atau cPanel)
* * * * * cd /path/to/project/app/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

**Test Command:**
```bash
php artisan subscription:send-reminders
```

---

## ✅ Post-Deployment

### 1. Verifikasi
- [ ] Test akses website
- [ ] Test login admin
- [ ] Test akses Filament panel
- [ ] Test API endpoints (jika ada)

### 2. Cron Job
- [ ] **Setup cron job** (WAJIB!)
- [ ] Test command: `php artisan subscription:send-reminders`
- [ ] Cek log: `storage/logs/laravel.log`

### 3. WhatsApp Config
- [ ] Login ke Filament Admin
- [ ] Buka **Pengaturan → WhatsApp Config**
- [ ] Aktifkan konfigurasi WhatsApp
- [ ] Test WhatsApp via "Test WhatsApp"

### 4. Subscription Reminder
- [ ] Pastikan cron job sudah setup
- [ ] Test manual: `php artisan subscription:send-reminders`
- [ ] Cek log untuk memastikan berjalan

---

## 🔍 Monitoring

### Log Files
- [ ] Cek `storage/logs/laravel.log` untuk error
- [ ] Setup log rotation jika perlu

### Performance
- [ ] Enable OPcache
- [ ] Setup Redis/Memcached jika perlu
- [ ] Optimize database queries

---

## 📝 Notes

1. **Cron Job**: JANGAN LUPA setup cron job setelah deploy!
2. **Timezone**: Pastikan server timezone sesuai (Asia/Jakarta)
3. **Permissions**: Pastikan storage dan cache writable
4. **WhatsApp Config**: Aktifkan config WhatsApp di Filament
5. **Test**: Selalu test setelah deploy

---

## 🆘 Troubleshooting

### Website Error 500
- Cek log: `storage/logs/laravel.log`
- Cek permissions: `storage` dan `bootstrap/cache`
- Clear cache: `php artisan cache:clear`

### Cron Job Tidak Berjalan
- Cek path PHP: `which php`
- Cek path project: pastikan benar
- Test manual: `php artisan subscription:send-reminders`
- Lihat: `CRONJOB_SETUP_REMINDER.md`

### Database Error
- Cek `.env` database credentials
- Test connection: `php artisan tinker` lalu `DB::connection()->getPdo()`

---

**⚠️ REMEMBER: Setup Cron Job Setelah Deploy! ⚠️**

Lihat `CRONJOB_SETUP_REMINDER.md` untuk detail lengkap!

