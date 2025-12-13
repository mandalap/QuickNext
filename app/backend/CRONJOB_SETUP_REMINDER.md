# ⚠️ PENTING: Setup Cron Job di Hosting!

## 🚨 REMINDER: Jangan Lupa Setup Cron Job!

Setelah upload ke hosting, **WAJIB** setup cron job agar pengingat subscription otomatis berjalan!

---

## 📋 Checklist Setup Hosting

### ✅ 1. Upload Project ke Hosting
- [ ] Upload semua file ke server
- [ ] Setup database connection di `.env`
- [ ] Jalankan `php artisan migrate`
- [ ] Setup permissions untuk `storage` dan `bootstrap/cache`

### ✅ 2. Setup Cron Job (PENTING!)
- [ ] Login ke cPanel/Server
- [ ] Buka Cron Jobs
- [ ] Tambahkan cron job berikut:

---

## 🔧 Setup Cron Job

### **cPanel:**
1. Login ke cPanel
2. Cari menu **"Cron Jobs"** atau **"Advanced" → "Cron Jobs"**
3. Pilih **"Standard (cPanel)"** atau **"Advanced (Unix Style)"**
4. Tambahkan cron job:

**Standard (cPanel):**
- **Minute:** `*`
- **Hour:** `*`
- **Day:** `*`
- **Month:** `*`
- **Weekday:** `*`
- **Command:** 
  ```bash
  cd /home/username/public_html/app/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
  ```
  *(Ganti `/home/username/public_html` dengan path project Anda)*

**Advanced (Unix Style):**
```bash
* * * * * cd /home/username/public_html/app/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

### **VPS/Server (SSH):**
```bash
# Login via SSH
ssh user@your-server.com

# Edit crontab
crontab -e

# Tambahkan baris ini (ganti path sesuai lokasi project)
* * * * * cd /var/www/kasir-pos-system/app/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1

# Save dan exit (Ctrl+X, lalu Y, lalu Enter)

# Verifikasi
crontab -l
```

### **Shared Hosting (via cPanel):**
1. Login ke cPanel
2. Buka **Cron Jobs**
3. Pilih **"Add New Cron Job"**
4. Isi:
   - **Minute:** `*`
   - **Hour:** `*`
   - **Day:** `*`
   - **Month:** `*`
   - **Weekday:** `*`
   - **Command:** 
     ```bash
     cd /home/cpanelusername/public_html/app/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
     ```
     *(Ganti `cpanelusername` dengan username cPanel Anda)*

---

## 🔍 Cara Cek Path PHP

Jika tidak tahu path PHP di hosting:

**Via cPanel:**
1. Buka **Terminal** atau **SSH Access**
2. Jalankan: `which php`
3. Copy path yang muncul (biasanya `/usr/bin/php` atau `/opt/cpanel/ea-php81/root/usr/bin/php`)

**Via SSH:**
```bash
which php
# Output contoh: /usr/bin/php
```

---

## ✅ Verifikasi Cron Job Berjalan

### Test Command Manual:
```bash
# Via SSH atau Terminal cPanel
cd /path/to/project/app/backend
php artisan subscription:send-reminders
```

### Cek Log:
```bash
# Lihat log Laravel
tail -f storage/logs/laravel.log

# Atau via cPanel File Manager
storage/logs/laravel.log
```

### Cek Scheduled Tasks:
```bash
php artisan schedule:list
```

---

## 📝 Catatan Penting

1. **Path PHP**: Pastikan menggunakan path PHP yang benar (biasanya `/usr/bin/php` atau path khusus hosting)

2. **Path Project**: Ganti path project dengan path sebenarnya di hosting Anda
   - Contoh cPanel: `/home/username/public_html/app/backend`
   - Contoh VPS: `/var/www/kasir-pos-system/app/backend`

3. **Permissions**: Pastikan file dan folder memiliki permission yang benar:
   ```bash
   chmod -R 755 storage bootstrap/cache
   chown -R www-data:www-data storage bootstrap/cache
   ```

4. **Timezone**: Pastikan timezone server adalah `Asia/Jakarta` atau sesuai kebutuhan

5. **Test Dulu**: Setelah setup cron job, test manual dulu dengan:
   ```bash
   php artisan subscription:send-reminders
   ```

---

## 🆘 Troubleshooting

### Cron Job Tidak Berjalan:
1. **Cek path PHP**: Pastikan path PHP benar
2. **Cek path project**: Pastikan path project benar
3. **Cek permissions**: Pastikan file bisa diakses
4. **Cek log**: Lihat log untuk error

### Command Error:
1. **Cek PHP version**: Minimal PHP 8.1
2. **Cek dependencies**: Jalankan `composer install`
3. **Cek .env**: Pastikan database dan config sudah benar

### WhatsApp Tidak Terkirim:
1. **Cek WhatsApp Config**: Pastikan ada config yang aktif di Filament
2. **Cek nomor owner**: Pastikan owner sudah punya nomor WhatsApp
3. **Test manual**: Test via "Test WhatsApp" di Filament

---

## 📞 Support

Jika ada masalah:
1. Cek log: `storage/logs/laravel.log`
2. Test command manual: `php artisan subscription:send-reminders`
3. Cek cron job: `crontab -l` (via SSH)
4. Hubungi support hosting jika cron job tidak bisa diakses

---

## 🎯 Quick Reference

**Command untuk test:**
```bash
php artisan subscription:send-reminders
```

**Cron job yang harus ditambahkan:**
```bash
* * * * * cd /path/to/project/app/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

**Cek scheduled tasks:**
```bash
php artisan schedule:list
```

---

**⚠️ JANGAN LUPA SETUP CRON JOB SETELAH UPLOAD KE HOSTING! ⚠️**

