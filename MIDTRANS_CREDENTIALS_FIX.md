# 🔧 Perbaikan Midtrans Credentials

## ❌ Masalah yang Ditemukan

Berdasarkan pengecekan, **Server Key dan Client Key masih menggunakan contoh/old key** yang tidak valid untuk pembayaran.

### Status Saat Ini:
- ❌ **Server Key**: Masih menggunakan `SB-Mid-server-XP2IB1DkWmIjbe96wcZamzFQ` (contoh/old key)
- ❌ **Client Key**: Masih menggunakan `SB-Mid-client-P79Jkq4SfPTT5-kY` (contoh/old key)
- ⚠️ **Business ID 3** juga masih menggunakan contoh/old key di database

---

## ✅ Cara Memperbaiki

### **Langkah 1: Dapatkan Credentials dari Midtrans Dashboard**

1. **Login ke Midtrans Dashboard:**
   - **Sandbox (Testing)**: https://dashboard.sandbox.midtrans.com/
   - **Production**: https://dashboard.midtrans.com/

2. **Ambil Access Keys:**
   - Klik menu **Settings** (⚙️) di sidebar
   - Pilih **Access Keys**
   - Copy **Server Key** (contoh: `SB-Mid-server-abc123...`)
   - Copy **Client Key** (contoh: `SB-Mid-client-xyz789...`)

   > **Catatan:** 
   > - Sandbox keys dimulai dengan `SB-Mid-server-` dan `SB-Mid-client-`
   > - Production keys dimulai dengan `Mid-server-` dan `Mid-client-`

---

### **Langkah 2: Update File .env Backend**

1. **Buka file `.env` di folder `app/backend/`**

2. **Cari dan update baris berikut:**
   ```env
   MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_ACTUAL_SERVER_KEY_HERE
   MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_ACTUAL_CLIENT_KEY_HERE
   MIDTRANS_IS_PRODUCTION=false
   ```

3. **Ganti dengan credentials Anda:**
   ```env
   MIDTRANS_SERVER_KEY=SB-Mid-server-abc123xyz...  # Paste Server Key Anda di sini
   MIDTRANS_CLIENT_KEY=SB-Mid-client-xyz789abc...  # Paste Client Key Anda di sini
   MIDTRANS_IS_PRODUCTION=false  # false untuk sandbox, true untuk production
   ```

4. **Simpan file**

---

### **Langkah 3: Clear Cache Laravel**

Jalankan perintah berikut di terminal (dari folder `app/backend/`):

```bash
php artisan config:clear
php artisan cache:clear
```

Atau jika menggunakan PowerShell:
```powershell
php artisan config:clear
php artisan cache:clear
```

---

### **Langkah 4: Update Business Config (Jika Ada)**

Jika ada business yang menggunakan custom Midtrans config di database, update juga:

**Via Database (SQL):**
```sql
UPDATE businesses 
SET midtrans_config = JSON_OBJECT(
    'server_key', 'SB-Mid-server-YOUR_ACTUAL_SERVER_KEY',
    'client_key', 'SB-Mid-client-YOUR_ACTUAL_CLIENT_KEY',
    'is_production', false,
    'is_sanitized', true,
    'is_3ds', true
)
WHERE id = 3;  -- Ganti dengan business ID Anda
```

**Atau via Tinker:**
```bash
php artisan tinker
```

Kemudian di tinker:
```php
$business = \App\Models\Business::find(3);
$business->midtrans_config = [
    'server_key' => 'SB-Mid-server-YOUR_ACTUAL_SERVER_KEY',
    'client_key' => 'SB-Mid-client-YOUR_ACTUAL_CLIENT_KEY',
    'is_production' => false,
    'is_sanitized' => true,
    'is_3ds' => true,
];
$business->save();
```

---

### **Langkah 5: Verifikasi**

Jalankan script pengecekan untuk memastikan credentials sudah benar:

```bash
cd app/backend
php check_midtrans_config.php
```

Script akan menampilkan status konfigurasi. Pastikan tidak ada lagi warning tentang contoh/old key.

---

## 🔍 Troubleshooting

### **Masalah: "No payment channels available"**

**Solusi:**
1. Login ke Midtrans Dashboard
2. Settings → Configuration → Snap Preferences
3. Aktifkan payment methods yang diperlukan:
   - ✅ QRIS
   - ✅ GoPay
   - ✅ ShopeePay
   - ✅ Credit Card
   - ✅ Virtual Account (BCA, BNI, BRI, dll)
4. Klik **Save**

---

### **Masalah: Payment gagal dengan error authentication**

**Kemungkinan penyebab:**
- Server Key atau Client Key salah
- Key tidak match dengan environment (sandbox vs production)
- Cache belum di-clear

**Solusi:**
1. Pastikan credentials benar (copy-paste langsung dari dashboard)
2. Pastikan `MIDTRANS_IS_PRODUCTION` sesuai dengan jenis key:
   - Sandbox key → `false`
   - Production key → `true`
3. Clear cache lagi:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

---

### **Masalah: Webhook tidak bekerja**

**Solusi:**
1. Pastikan webhook URL sudah dikonfigurasi di Midtrans Dashboard:
   - Settings → Configuration → Payment Notification URL
   - Set ke: `https://your-domain.com/api/v1/payments/midtrans/notification`
2. Untuk local development, gunakan ngrok:
   - Install ngrok: https://ngrok.com/
   - Jalankan: `ngrok http 8000`
   - Copy URL ngrok ke webhook URL di dashboard

---

## 📝 Checklist

Setelah update credentials, pastikan:

- [ ] File `.env` sudah diupdate dengan credentials yang benar
- [ ] Cache sudah di-clear (`php artisan config:clear`)
- [ ] Script `check_midtrans_config.php` tidak menampilkan warning
- [ ] Payment methods sudah diaktifkan di Midtrans Dashboard
- [ ] Webhook URL sudah dikonfigurasi (jika diperlukan)
- [ ] Test pembayaran berhasil

---

## 🧪 Test Payment

Setelah credentials diupdate, test pembayaran dengan:

### **Credit Card (Sandbox):**
- Card Number: `4811 1111 1111 1114`
- Expiry: `01/25` (atau tanggal masa depan)
- CVV: `123`
- OTP: `112233`

### **GoPay (Sandbox):**
- PIN: `112233`
- OTP: `112233`

### **ShopeePay (Sandbox):**
- PIN: `112233`

---

## 📞 Bantuan

Jika masih ada masalah setelah mengikuti panduan ini:

1. Cek log error di `app/backend/storage/logs/laravel.log`
2. Cek console browser untuk error JavaScript
3. Pastikan semua payment methods sudah diaktifkan di Midtrans Dashboard
4. Verifikasi credentials dengan menjalankan `check_midtrans_config.php` lagi

---

**Last Updated:** $(date)

