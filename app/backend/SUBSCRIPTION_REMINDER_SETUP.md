# 📱 Setup Pengingat Subscription Otomatis via WhatsApp

## 📋 Overview

Sistem ini akan secara otomatis mengirim notifikasi WhatsApp untuk subscription yang akan habis atau sudah habis. Notifikasi dikirim setiap hari jam 10:00 pagi (WIB).

## ⏰ Jadwal Pengiriman

### Sebelum Paket Habis:
- **7 hari sebelum habis** - Pengingat awal
- **3 hari sebelum habis** - Pengingat penting
- **1 hari sebelum habis** - Pengingat sangat mendesak
- **0 hari (hari terakhir)** - Pengingat hari terakhir

### Setelah Paket Habis:
- **1 hari setelah habis** - Notifikasi paket sudah berakhir
- **3 hari setelah habis** - Pengingat paket sudah berakhir 3 hari
- **7 hari setelah habis** - Pengingat paket sudah berakhir 7 hari

## 🚀 Setup

### 1. Pastikan WhatsApp Config Aktif

Buka Filament Admin Panel → **Pengaturan** → **WhatsApp Config** dan pastikan ada konfigurasi yang **Aktif**.

### 2. Setup Cron Job di Server

Laravel scheduler memerlukan cron job untuk berjalan. Tambahkan baris berikut ke crontab server:

```bash
# Edit crontab
crontab -e

# Tambahkan baris ini (jalankan setiap menit)
* * * * * cd /path/to/your/project/app/backend && php artisan schedule:run >> /dev/null 2>&1
```

**Contoh untuk Windows (Task Scheduler):**
- Buat task baru
- Trigger: Daily at 10:00 AM
- Action: Run program
- Program: `php`
- Arguments: `artisan schedule:run`
- Start in: `E:\development\kasir-pos-system\app\backend`

**Contoh untuk Linux/Unix:**
```bash
# Edit crontab
crontab -e

# Tambahkan (ganti path sesuai lokasi project Anda)
* * * * * cd /var/www/kasir-pos-system/app/backend && php artisan schedule:run >> /dev/null 2>&1
```

### 3. Test Command Manual

Untuk test apakah command berfungsi, jalankan:

```bash
php artisan subscription:send-reminders
```

Command ini akan:
- Mencari semua subscription yang perlu dikirim notifikasi
- Mengirim WhatsApp ke owner yang punya nomor
- Menampilkan summary hasil pengiriman

## 📊 Monitoring

### Log File

Semua aktivitas pengiriman dicatat di log Laravel:
- **Success**: `storage/logs/laravel.log`
- **Error**: Juga di `storage/logs/laravel.log`

### Check Log

```bash
# Lihat log terbaru
tail -f storage/logs/laravel.log | grep "Subscription reminder"

# Atau filter untuk hari ini
grep "$(date +%Y-%m-%d)" storage/logs/laravel.log | grep "Subscription reminder"
```

## 🔍 Troubleshooting

### Command tidak berjalan otomatis

1. **Cek cron job aktif:**
   ```bash
   crontab -l
   ```

2. **Cek timezone:**
   Pastikan timezone server adalah `Asia/Jakarta` atau sesuai kebutuhan.

3. **Test manual:**
   ```bash
   php artisan subscription:send-reminders
   ```

### WhatsApp tidak terkirim

1. **Cek konfigurasi WhatsApp:**
   - Pastikan ada konfigurasi yang **Aktif**
   - Test konfigurasi via "Test WhatsApp" di Filament

2. **Cek nomor owner:**
   - Pastikan owner sudah memasukkan nomor WhatsApp
   - Format nomor harus benar (62xxxxxxxxxx)

3. **Cek log error:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

### Subscription tidak terdeteksi

1. **Cek status subscription:**
   - Hanya subscription dengan status `active` yang akan dikirim notifikasi
   - Pastikan `ends_at` sudah diisi dengan benar

2. **Cek role user:**
   - Hanya owner yang akan dikirim notifikasi
   - Pastikan user memiliki role `owner`

## 📝 Catatan Penting

1. **Timezone**: Command menggunakan timezone `Asia/Jakarta`. Pastikan server menggunakan timezone yang sama.

2. **Overlapping Prevention**: Command menggunakan `withoutOverlapping()` untuk mencegah multiple instance berjalan bersamaan.

3. **Phone Number Required**: Notifikasi hanya dikirim ke owner yang sudah memasukkan nomor WhatsApp. Owner tanpa nomor akan di-skip.

4. **Active Subscription Only**: Hanya subscription dengan status `active` yang akan dikirim notifikasi.

## 🧪 Testing

### Test untuk hari tertentu:

Untuk test, Anda bisa modifikasi tanggal `ends_at` di database untuk subscription tertentu:

```sql
-- Test untuk 7 hari lagi
UPDATE user_subscriptions 
SET ends_at = DATE_ADD(NOW(), INTERVAL 7 DAY) 
WHERE id = 1;

-- Test untuk hari ini
UPDATE user_subscriptions 
SET ends_at = CURDATE() 
WHERE id = 1;

-- Test untuk 1 hari yang lalu
UPDATE user_subscriptions 
SET ends_at = DATE_SUB(CURDATE(), INTERVAL 1 DAY) 
WHERE id = 1;
```

Kemudian jalankan command:
```bash
php artisan subscription:send-reminders
```

## 📞 Support

Jika ada masalah, cek:
1. Log file: `storage/logs/laravel.log`
2. Konfigurasi WhatsApp di Filament
3. Status subscription di database
4. Nomor WhatsApp owner

