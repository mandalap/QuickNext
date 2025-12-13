# ✅ Implementasi: Multi-Tenant Midtrans Configuration

## 📋 Ringkasan

Implementasi **Per-Business Midtrans Configuration** telah selesai. Setiap business sekarang bisa memiliki credentials Midtrans sendiri, sehingga owner business bisa menggunakan akun Midtrans mereka sendiri.

---

## ✅ Yang Sudah Diimplementasikan

### **1. Database Migration**
- ✅ Tambah kolom `midtrans_config` (JSON) di `businesses` table
- ✅ Migration file: `2025_11_08_122659_add_midtrans_config_to_businesses_table.php`
- ✅ Migration sudah dijalankan

### **2. Business Model**
- ✅ Tambah `midtrans_config` di `$fillable`
- ✅ Tambah `midtrans_config` di `$casts` (array)
- ✅ Method `getMidtransConfig()` - return business config atau fallback ke global
- ✅ Method `hasCustomMidtransConfig()` - check apakah business punya config sendiri

### **3. MidtransService**
- ✅ Update constructor untuk accept config parameter (backward compatible)
- ✅ Factory method `forBusiness(Business $business)` - create service dengan business config
- ✅ Method `getClientKey()` - return client key untuk frontend
- ✅ Semua method tetap bekerja dengan business-specific config

### **4. Controllers Updated**
- ✅ **OrderPaymentController** - pakai `MidtransService::forBusiness()` untuk order payment
- ✅ **PaymentController** - pakai `MidtransService::forBusiness()` untuk subscription payment
- ✅ **SelfServiceController** - pakai `MidtransService::forBusiness()` untuk self-service payment
- ✅ Webhook handlers sudah update untuk pakai business-specific config

---

## 🔧 Cara Menggunakan

### **1. Setup Midtrans Config untuk Business**

Owner business bisa setup Midtrans config mereka sendiri melalui API atau langsung di database:

**Via Database:**
```sql
UPDATE businesses 
SET midtrans_config = JSON_OBJECT(
    'server_key', 'SB-Mid-server-XXXXX',
    'client_key', 'SB-Mid-client-XXXXX',
    'is_production', false,
    'is_sanitized', true,
    'is_3ds', true
)
WHERE id = 1;
```

**Via API (perlu dibuat endpoint):**
```php
// Endpoint: PUT /api/businesses/{id}/midtrans-config
$business->update([
    'midtrans_config' => [
        'server_key' => $request->server_key,
        'client_key' => $request->client_key,
        'is_production' => $request->is_production ?? false,
        'is_sanitized' => $request->is_sanitized ?? true,
        'is_3ds' => $request->is_3ds ?? true,
    ]
]);
```

### **2. Cara Kerja**

**Automatic Fallback:**
- Jika business punya `midtrans_config` dengan `server_key`, pakai config business
- Jika tidak, fallback ke global config dari `.env`

**Contoh:**
```php
// Di controller
$order = Order::with('business')->find($orderId);

// Otomatis pakai business config jika ada, atau global config
$midtransService = MidtransService::forBusiness($order->business);

// Create payment token
$snapToken = $midtransService->createSnapToken($params);

// Get client key untuk frontend
$clientKey = $midtransService->getClientKey();
```

---

## 📝 Struktur Data

### **midtrans_config JSON Structure:**
```json
{
  "server_key": "SB-Mid-server-XXXXX",
  "client_key": "SB-Mid-client-XXXXX",
  "is_production": false,
  "is_sanitized": true,
  "is_3ds": true
}
```

### **Fallback Logic:**
```php
// Business Model: getMidtransConfig()
if (business has midtrans_config && server_key not empty) {
    return business config (with fallback untuk missing fields)
} else {
    return global config from .env
}
```

---

## 🔐 Security Considerations

1. **Encryption (Recommended):**
   - Credentials sebaiknya di-encrypt sebelum disimpan
   - Gunakan Laravel encryption: `encrypt()` / `decrypt()`

2. **Access Control:**
   - Hanya owner business yang bisa edit Midtrans config
   - Validasi permissions sebelum update

3. **Validation:**
   - Validasi format server_key dan client_key
   - Test credentials sebelum save

---

## 🧪 Testing

### **Test Scenarios:**

1. **Business dengan custom config:**
   - Setup config untuk business
   - Create payment → harus pakai business config
   - Webhook notification → harus pakai business config

2. **Business tanpa config (fallback):**
   - Business tanpa config
   - Create payment → harus pakai global config
   - Webhook notification → harus pakai global config

3. **Multiple businesses:**
   - Business A dengan config A
   - Business B dengan config B
   - Business C tanpa config (pakai global)
   - Semua harus bekerja dengan benar

---

## 📚 API Endpoints yang Terpengaruh

### **Order Payment:**
- `POST /api/v1/orders/{id}/payment/qris` - ✅ Updated
- `POST /api/v1/payments/midtrans/notification` - ✅ Updated (webhook)
- `GET /api/v1/payments/{id}/status` - ✅ Updated

### **Subscription Payment:**
- `POST /api/v1/payments/midtrans/notification` - ✅ Updated (webhook)
- `GET /api/v1/payments/subscription/{code}/status` - ✅ Updated
- `GET /api/v1/payments/client-key` - ✅ Updated

### **Self-Service Payment:**
- `POST /api/public/v1/self-service/order/{orderNumber}/payment/midtrans` - ✅ Updated

---

## 🚀 Next Steps (Optional)

### **1. Buat UI untuk Setup Midtrans Config**
- Form di business settings untuk input Midtrans credentials
- Validasi dan test credentials
- Show status (configured / not configured)

### **2. Encryption untuk Credentials**
- Encrypt server_key dan client_key sebelum save
- Decrypt saat digunakan

### **3. Webhook URL per Business**
- Support custom webhook URL per business
- Atau gunakan single webhook dengan routing berdasarkan business

### **4. Logging & Monitoring**
- Log setiap payment dengan business ID
- Track revenue per business di Midtrans dashboard

---

## ⚠️ Important Notes

1. **Backward Compatible:**
   - Existing business tanpa config tetap pakai global config
   - Tidak ada breaking changes

2. **Webhook Handling:**
   - Webhook handler perlu find payment/subscription dulu untuk get business
   - Lalu pakai business-specific config untuk verify notification

3. **Client Key untuk Frontend:**
   - Frontend perlu get client key dari API (bukan hardcode)
   - Endpoint: `GET /api/v1/payments/client-key`

---

## 📖 Contoh Kode

### **Update Business Midtrans Config:**
```php
$business = Business::find($id);

$business->update([
    'midtrans_config' => [
        'server_key' => 'SB-Mid-server-XXXXX',
        'client_key' => 'SB-Mid-client-XXXXX',
        'is_production' => false,
        'is_sanitized' => true,
        'is_3ds' => true,
    ]
]);
```

### **Check Business Config:**
```php
$business = Business::find($id);

if ($business->hasCustomMidtransConfig()) {
    echo "Business punya custom config";
} else {
    echo "Business pakai global config";
}

$config = $business->getMidtransConfig();
// Returns: business config atau global config
```

### **Create Payment dengan Business Config:**
```php
$order = Order::with('business')->find($orderId);

// Otomatis pakai business config
$midtransService = MidtransService::forBusiness($order->business);

$snapToken = $midtransService->createSnapToken([
    'order_id' => 'ORD-123',
    'gross_amount' => 100000,
    // ... other params
]);
```

---

## ✅ Status Implementasi

- ✅ Database migration
- ✅ Business model update
- ✅ MidtransService update
- ✅ OrderPaymentController update
- ✅ PaymentController update
- ✅ SelfServiceController update
- ✅ Webhook handlers update
- ⏳ UI untuk setup config (optional)
- ⏳ Encryption untuk credentials (optional)

---

**Dibuat:** 2025-11-08
**Status:** ✅ Implementasi Selesai
























