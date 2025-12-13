# 🔧 Fix: "No payment channels available" di Midtrans

## ❌ Masalah

Modal Midtrans muncul tapi menampilkan error:
> **"No payment channels available. Please contact SnapBlitz to discuss payment procedure."**

Ini berarti:
- ✅ Snap token berhasil dibuat
- ✅ Client key sudah ada
- ❌ **Payment methods belum diaktifkan di Midtrans Dashboard**

---

## ✅ Solusi: Aktifkan Payment Methods di Midtrans Dashboard

### **Langkah 1: Login ke Midtrans Dashboard**

1. Buka: **https://dashboard.sandbox.midtrans.com/** (untuk Sandbox/Testing)
   - Atau **https://dashboard.midtrans.com/** (untuk Production)

2. Login dengan akun Midtrans Anda

3. Pastikan mode **SANDBOX** aktif (untuk testing)

---

### **Langkah 2: Aktifkan Payment Methods**

#### **A. Buka Settings**

1. Klik menu **Settings** (⚙️) di sidebar kiri
2. Pilih **Snap Preferences** atau **Payment Settings**

#### **B. Enable Payment Channels**

Centang/aktifkan **SEMUA** payment methods berikut:

**✅ E-Wallet (Wajib):**
- [ ] **GoPay** ⭐ (Paling penting)
- [ ] **ShopeePay** ⭐ (Paling penting)
- [ ] Dana (optional)
- [ ] LinkAja (optional)

**✅ QRIS (Wajib untuk QRIS Payment):**
- [ ] **QRIS** ⭐⭐⭐ (WAJIB untuk fitur QRIS)

**✅ Virtual Account:**
- [ ] **BCA Virtual Account**
- [ ] **BNI Virtual Account**
- [ ] **BRI Virtual Account**
- [ ] **Permata Virtual Account**
- [ ] Mandiri Bill Payment (optional)

**✅ Credit/Debit Card:**
- [ ] **Credit Card** (Visa/Mastercard)
- [ ] Debit Card Online (optional)

#### **C. Save Configuration**

1. Scroll ke bawah
2. Klik tombol **Save** atau **Update**
3. **Tunggu 5-10 menit** untuk propagasi konfigurasi

> ⚠️ **PENTING:** Setelah save, tunggu beberapa menit agar perubahan terpropagasi ke semua server Midtrans.

---

### **Langkah 3: Verifikasi Credentials**

Pastikan credentials di `.env` sudah benar:

```bash
cd app/backend
php check_midtrans_config.php
```

Pastikan:
- ✅ Server Key sudah diupdate (bukan contoh/old key)
- ✅ Client Key sudah diupdate (bukan contoh/old key)
- ✅ `MIDTRANS_IS_PRODUCTION=false` (untuk sandbox)

---

### **Langkah 4: Clear Cache & Restart**

```bash
cd app/backend
php artisan config:clear
php artisan cache:clear
```

**Restart Laravel server:**
- Stop server (Ctrl+C)
- Start lagi: `php artisan serve`

---

### **Langkah 5: Test Lagi**

1. Buka aplikasi di browser
2. Buat order baru atau pilih order yang pending
3. Klik **Bayar** → Pilih **QRIS** atau **Midtrans**
4. Modal Midtrans seharusnya menampilkan pilihan payment methods

---

## 🔍 Troubleshooting

### **Masalah: Setelah enable payment methods, masih "No payment channels available"**

**Solusi:**
1. **Tunggu lebih lama** (10-15 menit) - propagasi config butuh waktu
2. **Clear cache lagi:**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```
3. **Restart Laravel server**
4. **Cek credentials** - pastikan Server Key dan Client Key benar
5. **Cek log** untuk error:
   ```bash
   tail -f app/backend/storage/logs/laravel.log
   ```

---

### **Masalah: Payment methods sudah diaktifkan tapi tidak muncul semua**

**Kemungkinan penyebab:**
- Beberapa payment methods memerlukan verifikasi merchant
- Sandbox mungkin tidak support semua methods

**Solusi:**
- Pastikan minimal **GoPay, ShopeePay, QRIS, dan Credit Card** sudah aktif
- Untuk testing, gunakan payment methods yang sudah aktif

---

### **Masalah: "Unauthorized" error**

**Solusi:**
1. Cek Server Key di `.env` - pastikan tidak ada spasi atau quote
2. Pastikan Server Key valid (starts with `SB-Mid-server-` untuk sandbox)
3. Clear cache dan restart

---

## 📋 Checklist

Setelah mengikuti langkah-langkah di atas, pastikan:

- [ ] Login ke Midtrans Dashboard Sandbox
- [ ] Settings → Snap Preferences
- [ ] ✅ GoPay diaktifkan
- [ ] ✅ ShopeePay diaktifkan
- [ ] ✅ QRIS diaktifkan
- [ ] ✅ Credit Card diaktifkan
- [ ] ✅ Virtual Account (BCA, BNI, BRI) diaktifkan
- [ ] ✅ Klik Save
- [ ] ✅ Tunggu 5-10 menit
- [ ] ✅ Credentials di `.env` sudah benar
- [ ] ✅ Clear cache (`php artisan config:clear`)
- [ ] ✅ Restart Laravel server
- [ ] ✅ Test pembayaran lagi

---

## 🧪 Test Payment Methods

Setelah payment methods aktif, test dengan:

### **GoPay:**
- PIN: `112233`
- OTP: `112233`

### **ShopeePay:**
- PIN: `112233`

### **Credit Card:**
- Card Number: `4811 1111 1111 1114`
- Expiry: `01/25` (atau tanggal masa depan)
- CVV: `123`
- OTP: `112233`

### **QRIS:**
- Scan QR code yang muncul
- Klik "Simulate Payment" di popup
- Status akan langsung SUCCESS

---

## 📞 Masih Error?

Jika setelah mengikuti semua langkah masih error:

1. **Cek log Laravel:**
   ```bash
   tail -f app/backend/storage/logs/laravel.log | grep -i midtrans
   ```

2. **Cek console browser:**
   - Buka Developer Tools (F12)
   - Tab Console
   - Lihat error JavaScript

3. **Hubungi Midtrans Support:**
   - Email: support@midtrans.com
   - Telegram: https://t.me/midtrans
   - Dokumentasi: https://docs.midtrans.com/

---

**Last Updated:** $(date)

