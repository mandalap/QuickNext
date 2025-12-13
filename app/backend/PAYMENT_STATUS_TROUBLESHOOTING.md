# 🔧 Payment Status Troubleshooting

## ❌ Masalah: Payment Status Tidak Update Setelah Pembayaran Berhasil

### Gejala:

-   User sudah melakukan pembayaran di Midtrans dan berhasil
-   Status tetap "Pending Payment" meskipun sudah dicek berkali-kali
-   Error 404 untuk endpoint `/v1/payments/status/SUB-XXXXX`
-   Tidak redirect ke dashboard setelah pembayaran berhasil

---

## 🔍 Penyebab Umum

### 1. **Subscription Code Tidak Ditemukan (404)**

-   Order ID di Midtrans mungkin berbeda dengan `subscription_code` di database
-   Midtrans mungkin menambahkan timestamp ke order_id: `SUB-XXXXX-TIMESTAMP`
-   Subscription belum dibuat atau code berbeda

### 2. **Webhook Midtrans Tidak Terpanggil**

-   Webhook URL tidak dikonfigurasi dengan benar
-   Webhook gagal diproses
-   Network issue atau server down saat webhook dikirim

### 3. **Cache Masih Menyimpan Status Lama**

-   Response di-cache selama 30 detik
-   Status lama masih tersimpan di cache

---

## ✅ Solusi

### Solusi 1: Manual Trigger Webhook (Recommended)

Jika pembayaran sudah berhasil di Midtrans tapi status belum update:

1. **Cek Status di Midtrans Dashboard**

    - Login ke Midtrans Dashboard
    - Cari transaction dengan order_id: `SUB-XXXXX` atau `SUB-XXXXX-TIMESTAMP`
    - Pastikan status adalah `settlement` atau `capture`

2. **Trigger Webhook Manual**

    ```bash
    # Via Midtrans Dashboard
    - Buka transaction detail
    - Klik "Resend Notification" atau "Trigger Webhook"
    ```

3. **Atau Update Manual via Tinker**

    ```bash
    cd app/backend
    php artisan tinker
    ```

    ```php
    // Cari subscription
    $subscription = \App\Models\UserSubscription::where('subscription_code', 'SUB-HWXB3JXDVS')->first();

    // Update status manual
    if ($subscription) {
        $subscription->update(['status' => 'active']);

        // Update business jika ada
        $business = $subscription->user->ownedBusinesses()->first();
        if ($business) {
            $business->update([
                'current_subscription_id' => $subscription->id,
                'subscription_expires_at' => $subscription->ends_at,
            ]);
        }

        echo "Subscription updated successfully!";
    } else {
        echo "Subscription not found!";
    }
    ```

### Solusi 2: Clear Cache

```bash
cd app/backend
php artisan cache:clear
```

### Solusi 3: Cek Webhook Configuration

1. **Pastikan Webhook URL Benar**

    - Development: `http://localhost:8000/api/v1/midtrans/notification`
    - Production: `https://yourdomain.com/api/v1/midtrans/notification`

2. **Cek Webhook di Midtrans Dashboard**

    - Settings > Configuration > Payment Notification URL
    - Pastikan URL sudah dikonfigurasi dengan benar

3. **Test Webhook**
    ```bash
    # Test webhook dengan curl
    curl -X POST http://localhost:8000/api/v1/midtrans/notification \
      -H "Content-Type: application/json" \
      -d '{
        "transaction_status": "settlement",
        "order_id": "SUB-HWXB3JXDVS",
        "gross_amount": "99000",
        "payment_type": "credit_card",
        "transaction_time": "2024-01-01 12:00:00"
      }'
    ```

### Solusi 4: Cek Logs

**Windows PowerShell:**

```powershell
cd app/backend
Get-Content storage/logs/laravel.log -Tail 100 -Wait | Select-String -Pattern "payment|subscription|midtrans" -CaseSensitive:$false
```

**Atau untuk melihat semua log:**

```powershell
cd app/backend
Get-Content storage/logs/laravel.log | Select-String -Pattern "payment|subscription|midtrans" -CaseSensitive:$false
```

**Linux/Mac:**

```bash
cd app/backend
tail -f storage/logs/laravel.log | grep -i "payment\|subscription\|midtrans"
```

Cari error messages seperti:

-   "Subscription not found"
-   "Failed to process Midtrans notification"
-   "Business not found for subscription"

---

## 🔄 Flow Pembayaran yang Benar

1. **User Subscribe**

    - Subscription dibuat dengan status `pending_payment`
    - `subscription_code` dibuat: `SUB-XXXXX`

2. **User Membayar di Midtrans**

    - Midtrans membuat order dengan `order_id`: `SUB-XXXXX` atau `SUB-XXXXX-TIMESTAMP`
    - User menyelesaikan pembayaran

3. **Midtrans Mengirim Webhook**

    - Webhook dikirim ke: `/api/v1/midtrans/notification`
    - Status: `settlement` atau `capture`

4. **Backend Memproses Webhook**

    - Mencari subscription berdasarkan `subscription_code`
    - Update status menjadi `active`
    - Update business dengan subscription baru

5. **Frontend Check Status**
    - Frontend check status setiap 10 detik
    - Jika status `settlement` atau `active`, redirect ke success page

---

## 🛠️ Perbaikan yang Sudah Dilakukan

### 1. **Improved Subscription Lookup**

-   ✅ Mencari subscription dengan partial match jika exact match tidak ditemukan
-   ✅ Handle case order_id dengan timestamp

### 2. **Better Error Handling**

-   ✅ Logging yang lebih detail
-   ✅ Fallback ke subscription status jika Midtrans API gagal

### 3. **Cache Management**

-   ✅ Cache di-clear setelah payment success
-   ✅ Cache duration dikurangi menjadi 30 detik

### 4. **Frontend Improvements**

-   ✅ Check subscription status selain transaction_status
-   ✅ Better redirect logic setelah payment success
-   ✅ Handle 404 error dengan lebih baik

---

## 📝 Checklist Troubleshooting

-   [ ] Cek apakah subscription code ada di database
-   [ ] Cek apakah webhook URL sudah dikonfigurasi
-   [ ] Cek logs untuk error messages
-   [ ] Clear cache
-   [ ] Trigger webhook manual
-   [ ] Update status manual jika diperlukan
-   [ ] Test dengan subscription baru

---

## 🔗 File Terkait

-   **Controller**: `app/backend/app/Http/Controllers/Api/PaymentController.php`
-   **Frontend**: `app/frontend/src/pages/PaymentPending.jsx`
-   **Frontend**: `app/frontend/src/pages/PaymentSuccess.jsx`
-   **Webhook Route**: `app/backend/routes/api.php` (line 93)
