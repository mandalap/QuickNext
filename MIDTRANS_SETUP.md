# 🚀 Setup Midtrans untuk QRIS Payment

## ⚠️ PENTING: Aktifkan Payment Methods di Midtrans Dashboard

Error "No payment channels available" terjadi karena payment methods belum diaktifkan di Midtrans Sandbox.

---

## 📋 Langkah-langkah Setup:

### **1. Login ke Midtrans Dashboard**
- Buka: https://dashboard.sandbox.midtrans.com/
- Login dengan akun Anda
- Pastikan mode **SANDBOX** (development)

---

### **2. Aktifkan Payment Methods**

#### **A. Settings → Configuration**
1. Klik menu **Settings** (⚙️) di sidebar
2. Pilih **Snap Preferences** atau **Payment Settings**

#### **B. Enable Payment Channels:**
Centang/aktifkan payment methods berikut:

✅ **E-Wallet:**
- GoPay
- ShopeePay
- Dana (optional)
- LinkAja (optional)

✅ **QRIS:**
- QRIS (wajib untuk fitur QRIS)

✅ **Virtual Account:**
- BCA Virtual Account
- BNI Virtual Account
- BRI Virtual Account
- Permata Virtual Account
- Mandiri Bill Payment (optional)

✅ **Credit/Debit Card:**
- Credit Card (Visa/Mastercard)
- Debit Card Online (optional)

#### **C. Save Configuration**
- Klik **Save** atau **Update**
- Tunggu beberapa saat untuk propagasi config

---

### **3. Verify Credentials di .env**

Pastikan file `.env` backend sudah benar:

```env
# Midtrans Sandbox Credentials
MIDTRANS_SERVER_KEY=SB-Mid-server-XP2IB1DkWmIjbe96wcZamzFQ
MIDTRANS_CLIENT_KEY=SB-Mid-client-P79Jkq4SfPTT5-kY
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true
```

**Cara mendapatkan credentials:**
1. Dashboard Midtrans → **Settings** → **Access Keys**
2. Copy **Server Key** (starts with `SB-Mid-server-...`)
3. Copy **Client Key** (starts with `SB-Mid-client-...`)

---

### **4. Test Payment di Sandbox**

Midtrans Sandbox menyediakan **test credentials** untuk testing:

#### **GoPay Test:**
- PIN: `112233`
- OTP: `112233`

#### **ShopeePay Test:**
- PIN: `112233`

#### **Credit Card Test:**
- Card Number: `4811 1111 1111 1114`
- CVV: `123`
- Exp Date: Any future date (e.g., `12/25`)

#### **QRIS Test:**
- Scan QR Code akan muncul di sandbox
- Klik "Simulate Payment" di popup
- Status akan langsung jadi SUCCESS

---

### **5. Webhook Setup (Optional tapi Recommended)**

Untuk auto-update status payment:

1. Dashboard Midtrans → **Settings** → **Notification URL**
2. Isi dengan URL:
   ```
   https://your-domain.com/api/v1/payments/midtrans/order-notification
   ```
3. Untuk localhost testing, gunakan **ngrok** atau **expose**:
   ```bash
   ngrok http 8000
   # Atau
   php artisan serve --host=0.0.0.0 --port=8000
   ```

---

### **6. Troubleshooting**

#### **"No payment channels available"**
✅ **Solusi:**
- Pastikan payment methods sudah diaktifkan di dashboard
- Tunggu 5-10 menit setelah enable payment methods
- Clear cache: `php artisan config:clear`
- Restart Laravel: Stop & start `php artisan serve`

#### **"Unauthorized"**
✅ **Solusi:**
- Cek `MIDTRANS_SERVER_KEY` di `.env`
- Pastikan Server Key valid (starts with `SB-Mid-server-`)
- Jangan ada spasi atau quote di key

#### **"Transaction declined"**
✅ **Solusi:**
- Pastikan mode Sandbox (`MIDTRANS_IS_PRODUCTION=false`)
- Gunakan test credentials yang disediakan Midtrans
- Amount harus > 0

---

### **7. Production Setup**

Ketika ready untuk production:

1. **Switch to Production Mode:**
   ```env
   MIDTRANS_IS_PRODUCTION=true
   ```

2. **Ganti Production Keys:**
   - Login: https://dashboard.midtrans.com/
   - Settings → Access Keys
   - Copy **Production** Server Key & Client Key
   - Update `.env`:
   ```env
   MIDTRANS_SERVER_KEY=Mid-server-YOUR_PROD_KEY
   MIDTRANS_CLIENT_KEY=Mid-client-YOUR_PROD_KEY
   ```

3. **Verifikasi Merchant:**
   - Submit dokumen bisnis
   - Tunggu approval dari Midtrans
   - Biasanya 1-3 hari kerja

4. **Test Production:**
   - Gunakan real payment methods
   - Real money akan tercharge
   - Status akan masuk ke dashboard

---

### **8. Contact Support**

Jika masih error:

📧 **Midtrans Support:**
- Email: support@midtrans.com
- Telegram: https://t.me/midtrans
- Dokumentasi: https://docs.midtrans.com/

🐛 **Check Logs:**
```bash
# Laravel logs
tail -f storage/logs/laravel.log

# Grep Midtrans errors
grep -i "midtrans" storage/logs/laravel.log
```

---

## ✅ Checklist Setup:

- [ ] Login Midtrans Dashboard Sandbox
- [ ] Aktifkan GoPay
- [ ] Aktifkan ShopeePay
- [ ] Aktifkan QRIS
- [ ] Aktifkan Virtual Account (BCA, BNI, BRI)
- [ ] Aktifkan Credit Card
- [ ] Copy Server Key & Client Key
- [ ] Update `.env` dengan credentials
- [ ] Run `php artisan config:clear`
- [ ] Restart Laravel server
- [ ] Test create QRIS payment
- [ ] Scan QR & simulate payment

---

## 🎯 Quick Test:

```bash
# 1. Clear config
cd backend
php artisan config:clear

# 2. Check Midtrans config loaded
php artisan tinker
>>> config('midtrans.server_key')
# Should return: "SB-Mid-server-XP2IB1DkWmIjbe96wcZamzFQ"

# 3. Test payment
# Go to frontend → POS → Create order → Pay with QRIS
# Or: Sales Management → Click "Bayar" on pending order
```

Selamat mencoba! 🚀
