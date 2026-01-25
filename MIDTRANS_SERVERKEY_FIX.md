# 🔧 Fix: Midtrans ServerKey Null - Payment & Webhook Handling

## 🐛 Masalah yang Ditemukan

### **Scenario Error:**
1. User klik bayar → Snap token GAGAL dibuat (ServerKey null)
2. Payment TIDAK tercatat di DB
3. Tapi user bayar manual via link sebelumnya
4. Midtrans terima → settlement
5. Webhook gagal (ServerKey null lagi)
6. DB tidak terupdate

### **Root Cause:**
1. **ServerKey null saat createSnapToken** → Exception tidak di-handle dengan baik
2. **Subscription tidak ada di DB** → User bayar manual via link, subscription belum dibuat
3. **Webhook gagal karena ServerKey null** → Tidak ada fallback untuk handle payment yang sudah settlement
4. **Tidak ada retry mechanism** → Jika webhook gagal, payment tidak ter-record

---

## ✅ Perbaikan yang Dilakukan

### **1. Validasi ServerKey di MidtransService Constructor**

**File:** `app/backend/app/Services/MidtransService.php`

**Sebelum:**
```php
public function __construct($config = null)
{
    // ... set config ...
    Config::$serverKey = $this->config['server_key']; // ❌ Bisa null
}
```

**Sesudah:**
```php
public function __construct($config = null)
{
    // ... set config ...
    
    // ✅ CRITICAL: Validate ServerKey before setting
    if (empty($this->config['server_key']) || $this->config['server_key'] === null) {
        Log::error('Midtrans ServerKey is null or empty', [
            'config_source' => $config ? 'custom' : 'global',
        ]);
        
        throw new \Exception('Midtrans ServerKey is not configured. Please set MIDTRANS_SERVER_KEY in .env file or configure it in business/outlet settings.');
    }
    
    Config::$serverKey = $this->config['server_key'];
}
```

**Penjelasan:**
- Validasi ServerKey di constructor → throw error jelas jika null
- Logging untuk debugging
- Error message yang jelas untuk admin

---

### **2. Validasi ServerKey di createSnapToken()**

**File:** `app/backend/app/Services/MidtransService.php`

**Sesudah:**
```php
public function createSnapToken($params)
{
    try {
        // ✅ CRITICAL: Validate ServerKey before creating snap token
        if (empty($this->config['server_key']) || $this->config['server_key'] === null) {
            Log::error('Cannot create Snap token: ServerKey is null', [
                'order_id' => $params['order_id'] ?? null,
            ]);
            
            throw new \Exception('Midtrans ServerKey is not configured. Please set MIDTRANS_SERVER_KEY in .env file or configure it in business/outlet settings.');
        }
        
        // ... create snap token ...
    }
}
```

**Penjelasan:**
- Double validation sebelum create snap token
- Error yang jelas jika ServerKey null
- Logging untuk tracking

---

### **3. Error Handling di SubscriptionController**

**File:** `app/backend/app/Http/Controllers/Api/SubscriptionController.php`

**Sebelum:**
```php
try {
    $snapToken = $this->midtransService->createSnapToken([...]);
} catch (\Exception $e) {
    Log::error('Failed to create Midtrans snap token', [...]);
    // Continue without snap token - user will be redirected to payment page
}
```

**Sesudah:**
```php
try {
    $snapToken = $this->midtransService->createSnapToken([...]);
} catch (\Exception $e) {
    $snapTokenError = $e->getMessage();
    Log::error('Failed to create Midtrans snap token', [
        'error' => $e->getMessage(),
        'is_serverkey_error' => strpos($e->getMessage(), 'ServerKey') !== false,
    ]);
    
    // ✅ CRITICAL: If ServerKey is null, return error immediately
    if (strpos($e->getMessage(), 'ServerKey') !== false) {
        DB::rollBack();
        return response()->json([
            'success' => false,
            'message' => 'Midtrans ServerKey is not configured. Please configure MIDTRANS_SERVER_KEY in .env file or contact administrator.',
            'error' => 'ServerKey configuration missing',
        ], 500);
    }
    // Continue without snap token for other errors
}
```

**Penjelasan:**
- Jika ServerKey null → return error 500, jangan lanjutkan
- Rollback transaction jika ServerKey error
- Error message jelas untuk user/admin

---

### **4. Fallback di Webhook Handler - Handle Subscription Tidak Ada**

**File:** `app/backend/app/Http/Controllers/Api/PaymentController.php`

**Sesudah:**
```php
if (!$subscription) {
    Log::error('Subscription not found for notification', [
        'order_id' => $orderId,
        'subscription_code' => $subscriptionCode,
    ]);

    // ✅ CRITICAL FIX: Try to find subscription by order_id pattern or create from Midtrans data
    // This handles case where user paid manually via link but subscription not in DB
    try {
        $midtransService = new MidtransService();
        $transactionStatus = $midtransService->getTransactionStatus($orderId);
        
        if ($transactionStatus && in_array($transactionStatus->transaction_status, ['settlement', 'capture'])) {
            Log::warning('Payment already settled but subscription not found in DB', [
                'order_id' => $orderId,
                'transaction_status' => $transactionStatus->transaction_status,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Subscription not found but payment already settled. Please contact support.',
            ], 200);
        }
    } catch (\Exception $e) {
        Log::error('Failed to check Midtrans transaction status', [...]);
    }
    
    return response()->json([
        'success' => false,
        'message' => 'Subscription not found',
    ], 200);
}
```

**Penjelasan:**
- Jika subscription tidak ada → cek status payment di Midtrans
- Jika payment sudah settlement → log warning untuk manual handling
- Return 200 untuk prevent Midtrans retry spam

---

### **5. Fallback di Webhook Handler - Handle ServerKey Null**

**File:** `app/backend/app/Http/Controllers/Api/PaymentController.php`

**Sesudah:**
```php
// ✅ CRITICAL FIX: Handle ServerKey null with fallback
$midtransService = null;
$serverKeyError = null;

try {
    if (!$business) {
        $midtransService = new MidtransService();
    } else {
        $midtransService = MidtransService::forBusiness($business);
    }
} catch (\Exception $e) {
    // If ServerKey is null, try fallback to global config
    if (strpos($e->getMessage(), 'ServerKey') !== false) {
        Log::warning('ServerKey null in business config, trying global config fallback', [...]);
        
        try {
            // Force use global config
            $midtransService = new MidtransService();
            $serverKeyError = 'Business config ServerKey is null, using global config';
        } catch (\Exception $e2) {
            Log::error('Both business and global ServerKey are null', [...]);
            return response()->json([
                'success' => false,
                'message' => 'Midtrans ServerKey is not configured.',
            ], 500);
        }
    } else {
        throw $e;
    }
}

// ✅ CRITICAL: If notification fails due to ServerKey, try direct transaction status check
try {
    $notification = $midtransService->handleNotification();
} catch (\Exception $e) {
    if (strpos($e->getMessage(), 'ServerKey') !== false || strpos($e->getMessage(), '401') !== false) {
        // Try to get transaction status directly from Midtrans API
        try {
            $transactionStatus = $midtransService->getTransactionStatus($orderId);
            
            if ($transactionStatus && in_array($transactionStatus->transaction_status, ['settlement', 'capture'])) {
                // Payment is already settled, process it manually
                $notification = [
                    'order_id' => $orderId,
                    'payment_status' => 'success',
                    'payment_type' => $transactionStatus->payment_type ?? 'unknown',
                    'gross_amount' => $transactionStatus->gross_amount ?? 0,
                    'transaction_time' => $transactionStatus->transaction_time ?? now()->toDateTimeString(),
                    'raw_notification' => $transactionStatus,
                ];
            }
        } catch (\Exception $e2) {
            // Handle error
        }
    }
}
```

**Penjelasan:**
- Jika business config ServerKey null → fallback ke global config
- Jika global config juga null → return error 500
- Jika webhook notification gagal → cek transaction status langsung dari Midtrans API
- Jika payment sudah settlement → process secara manual dari transaction status

---

## 🔍 Flow Setelah Fix

### **Scenario 1: ServerKey Null saat Create Snap Token**

1. User klik bayar → `createSnapToken()` dipanggil
2. **Validasi ServerKey** → null → throw Exception
3. **Error handling di SubscriptionController** → detect ServerKey error
4. **Return error 500** dengan message jelas
5. **User tidak bisa lanjut** → harus configure ServerKey dulu ✅

### **Scenario 2: User Bayar Manual via Link (Subscription Tidak Ada di DB)**

1. User bayar manual via link → Midtrans terima → settlement
2. Webhook datang → subscription tidak ada di DB
3. **Fallback: Cek transaction status di Midtrans** ✅
4. **Jika settlement** → log warning untuk manual handling
5. **Return 200** → prevent Midtrans retry spam

### **Scenario 3: Webhook Gagal karena ServerKey Null**

1. Webhook datang → subscription ada di DB
2. **Coba buat MidtransService** → ServerKey null → Exception
3. **Fallback ke global config** → jika juga null → return error 500
4. **Jika global config OK** → coba handle notification lagi
5. **Jika notification masih gagal** → cek transaction status langsung ✅
6. **Jika payment settlement** → process secara manual ✅

---

## 🧪 Testing

### **Test Case 1: ServerKey Null saat Create Snap Token**

```bash
# 1. Set ServerKey null di .env
MIDTRANS_SERVER_KEY=

# 2. User create subscription
POST /api/v1/subscriptions
# Expected: Return error 500 dengan message "ServerKey is not configured"

# 3. Check logs
# Expected: Log error "Cannot create Snap token: ServerKey is null"
```

### **Test Case 2: Webhook dengan ServerKey Null**

```bash
# 1. Set ServerKey null di .env
MIDTRANS_SERVER_KEY=

# 2. Simulate webhook dari Midtrans
POST /api/v1/payments/midtrans-notification
{
  "order_id": "SUB-XXXXX",
  "transaction_status": "settlement",
  ...
}

# 3. Expected:
# - Try business config → fail (ServerKey null)
# - Fallback ke global config → fail (ServerKey null)
# - Return error 500 dengan message jelas
```

### **Test Case 3: Payment Settlement tapi Subscription Tidak Ada**

```bash
# 1. User bayar manual via link (subscription tidak ada di DB)
# 2. Midtrans settlement → webhook datang

# 3. Expected:
# - Subscription not found
# - Try get transaction status from Midtrans
# - If settlement → log warning
# - Return 200 (prevent retry spam)
```

---

## 📊 Monitoring

Setelah deploy, monitor logs untuk:

1. **ServerKey null errors:**
   ```
   Midtrans ServerKey is null or empty
   Cannot create Snap token: ServerKey is null
   ```

2. **Fallback attempts:**
   ```
   ServerKey null in business config, trying global config fallback
   Payment already settled but subscription not found in DB
   ```

3. **Manual processing:**
   ```
   Payment already settled, processing manually from transaction status
   ```

---

## 🚀 Deployment

### **Step 1: Deploy Code Changes**

```bash
cd /var/www/kasir-pos/app/backend

# Pull latest changes
git pull origin development

# Install dependencies (if any)
composer install --optimize-autoloader --no-dev

# Clear cache
php artisan config:clear
php artisan route:clear
php artisan cache:clear

# Re-cache
php artisan config:cache
php artisan route:cache
```

### **Step 2: Verify ServerKey Configuration**

```bash
# Check .env
grep MIDTRANS_SERVER_KEY .env

# Should show:
# MIDTRANS_SERVER_KEY=SB-Mid-server-XXXXX (sandbox)
# atau
# MIDTRANS_SERVER_KEY=Mid-server-XXXXX (production)

# Test config
php artisan tinker
config('midtrans.server_key')
# Should return non-null value
```

### **Step 3: Test Create Snap Token**

```bash
# Test via API atau artisan command
# Should not throw ServerKey null error
```

---

## 📝 Checklist

- [x] Validasi ServerKey di MidtransService constructor
- [x] Validasi ServerKey di createSnapToken()
- [x] Error handling di SubscriptionController (rollback jika ServerKey null)
- [x] Fallback di webhook handler (handle subscription tidak ada)
- [x] Fallback di webhook handler (handle ServerKey null)
- [x] Fallback ke transaction status check jika notification gagal
- [x] Logging untuk debugging
- [x] Dokumentasi lengkap

---

## 🔧 Manual Fix untuk Payment yang Sudah Settlement

Jika ada payment yang sudah settlement tapi tidak ter-record di DB:

### **Option 1: Manual Sync via API (Jika ada endpoint)**

```bash
POST /api/v1/payments/sync-midtrans
{
  "order_id": "SUB-XXXXX"
}
```

### **Option 2: Manual via Database**

```sql
-- 1. Cek payment di Midtrans dashboard
-- 2. Get transaction details

-- 3. Create subscription payment record manually
INSERT INTO subscription_payments (
    user_subscription_id,
    payment_code,
    payment_method,
    payment_gateway,
    gateway_payment_id,
    amount,
    status,
    paid_at,
    payment_data,
    created_at,
    updated_at
) VALUES (
    SUBSCRIPTION_ID,
    'SUB-XXXXX',
    'payment_type_from_midtrans',
    'midtrans',
    'transaction_id_from_midtrans',
    GROSS_AMOUNT,
    'paid',
    'transaction_time_from_midtrans',
    '{"raw_notification": {...}}',
    NOW(),
    NOW()
);

-- 4. Update subscription status
UPDATE user_subscriptions
SET status = 'active',
    notes = CONCAT(COALESCE(notes, ''), ' | Payment synced manually at ', NOW())
WHERE subscription_code = 'SUB-XXXXX';
```

---

## 📚 Related Files

- `app/backend/app/Services/MidtransService.php` - Midtrans service
- `app/backend/app/Http/Controllers/Api/PaymentController.php` - Webhook handler
- `app/backend/app/Http/Controllers/Api/SubscriptionController.php` - Subscription controller
- `app/backend/config/midtrans.php` - Midtrans config

---

**Dibuat:** 2026-01-26  
**Status:** ✅ Fixed  
**Priority:** 🔴 **CRITICAL** - Fix ServerKey null handling
