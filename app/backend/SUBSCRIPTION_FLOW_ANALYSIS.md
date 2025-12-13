# 🔍 Analisis Flow Pembelian Paket Subscription

## ❌ Masalah yang Ditemukan

### 1. **Inkonsistensi Order ID Format**

**Saat Subscribe (Line 197):**
```php
'order_id' => $subscriptionCode,  // SUB-HWXB3JXDVS
```

**Saat Get Payment Token (Line 425):**
```php
$uniqueOrderId = $subscription->subscription_code . '-' . time() . '-' . rand(1000, 9999);
// Format: SUB-HWXB3JXDVS-TIMESTAMP-RANDOM
```

**Masalah:**
- Subscribe menggunakan `SUB-HWXB3JXDVS` sebagai order_id
- Get Payment Token menggunakan `SUB-HWXB3JXDVS-TIMESTAMP-RANDOM` sebagai order_id
- Webhook dari Midtrans akan menggunakan order_id yang terakhir (dengan timestamp)
- Tapi subscription lookup mencari dengan `SUB-HWXB3JXDVS` (tanpa timestamp)
- **Result: Subscription tidak ditemukan!**

### 2. **Webhook Handler Extraction Logic**

**PaymentController.php (Line 28-41):**
```php
$tempNotification = new \Midtrans\Notification();
$orderId = $tempNotification->order_id;
$subscriptionCode = $orderId;

// If order_id contains timestamp (format: SUB-XXXXX-TIMESTAMP), extract subscription code
if (strpos($orderId, '-') !== false) {
    $parts = explode('-', $orderId);
    // Check if last part is numeric (timestamp)
    if (count($parts) > 1 && is_numeric(end($parts))) {
        // Remove last part (timestamp)
        array_pop($parts);
        $subscriptionCode = implode('-', $parts);
    }
}
```

**Masalah:**
- Logic ini hanya handle format `SUB-XXXXX-TIMESTAMP` (1 timestamp)
- Tapi format sebenarnya adalah `SUB-XXXXX-TIMESTAMP-RANDOM` (2 bagian di akhir)
- Logic hanya remove 1 bagian terakhir, jadi masih ada timestamp
- **Result: Subscription code extraction salah!**

---

## ✅ Flow yang Benar

### Step 1: User Subscribe
1. User pilih paket → `POST /v1/subscriptions/subscribe`
2. Backend create subscription dengan code: `SUB-HWXB3JXDVS`
3. Backend create snap_token dengan `order_id = SUB-HWXB3JXDVS`
4. Frontend buka Midtrans payment dengan snap_token

### Step 2: User Bayar di Midtrans
1. User bayar di Midtrans
2. Midtrans kirim webhook dengan `order_id = SUB-HWXB3JXDVS`

### Step 3: Webhook Handler
1. Backend terima webhook
2. Extract subscription_code dari order_id
3. Cari subscription dengan code tersebut
4. Update status menjadi `active`

### Step 4: Frontend Check Status
1. Frontend check status dengan `GET /v1/payments/status/SUB-HWXB3JXDVS`
2. Backend cari subscription dengan code tersebut
3. Return status

---

## 🔧 Perbaikan yang Diperlukan

### 1. **Konsistensi Order ID**

**Opsi A: Selalu gunakan subscription_code sebagai order_id (Recommended)**
- Subscribe: `order_id = SUB-HWXB3JXDVS`
- Get Payment Token: `order_id = SUB-HWXB3JXDVS` (sama)
- Webhook: `order_id = SUB-HWXB3JXDVS`
- ✅ Konsisten, mudah di-track

**Opsi B: Selalu gunakan format dengan timestamp**
- Subscribe: `order_id = SUB-HWXB3JXDVS-TIMESTAMP-RANDOM`
- Get Payment Token: `order_id = SUB-HWXB3JXDVS-TIMESTAMP-RANDOM` (sama)
- Webhook: `order_id = SUB-HWXB3JXDVS-TIMESTAMP-RANDOM`
- ✅ Unique, tapi perlu extract logic yang benar

### 2. **Perbaiki Webhook Extraction Logic**

Jika tetap pakai format dengan timestamp, perbaiki logic:
```php
// Extract subscription code from order_id
// Format bisa: SUB-XXXXX atau SUB-XXXXX-TIMESTAMP atau SUB-XXXXX-TIMESTAMP-RANDOM
$parts = explode('-', $orderId);
if (count($parts) >= 2) {
    // Always use first 2 parts (SUB-XXXXX) as subscription code
    $subscriptionCode = $parts[0] . '-' . $parts[1];
} else {
    $subscriptionCode = $orderId;
}
```

### 3. **Perbaiki Get Payment Token**

Jika tetap pakai format dengan timestamp, simpan order_id di payment record:
```php
// Save unique order_id to payment record
SubscriptionPayment::create([
    'user_subscription_id' => $subscription->id,
    'payment_code' => $uniqueOrderId, // Store full order_id
    ...
]);
```

---

## 🎯 Rekomendasi

**Gunakan Opsi A: Selalu gunakan subscription_code sebagai order_id**

**Alasan:**
1. ✅ Konsisten di semua flow
2. ✅ Mudah di-track dan debug
3. ✅ Tidak perlu complex extraction logic
4. ✅ Subscription code sudah unique (random 10 chars)

**Perubahan yang Diperlukan:**
1. Di `getPaymentToken`: Gunakan `$subscription->subscription_code` sebagai order_id (bukan unique format)
2. Di webhook handler: Tidak perlu extract, langsung pakai order_id
3. Simpan order_id di payment record untuk tracking

---

## 📝 Checklist Perbaikan

- [ ] Fix `getPaymentToken` untuk menggunakan subscription_code sebagai order_id
- [ ] Fix webhook handler extraction logic (jika tetap pakai timestamp format)
- [ ] Test flow: Subscribe → Payment → Webhook → Status Check
- [ ] Pastikan subscription ditemukan di semua step
- [ ] Pastikan status update dengan benar setelah payment success

