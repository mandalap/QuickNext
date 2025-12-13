# 💳 Diskusi: Multi-Tenant Midtrans Configuration

## 📋 Masalah Saat Ini

Saat ini sistem menggunakan **satu konfigurasi Midtrans global** yang diatur di:
- `config/midtrans.php` 
- Environment variables (`.env`)

**Masalah:**
- Semua business/outlet menggunakan credentials Midtrans yang sama
- Kalau outlet punya owner lain, mereka **tidak bisa pakai credentials Midtrans sendiri**
- Semua transaksi masuk ke akun Midtrans yang sama
- Tidak bisa tracking revenue per business/outlet di Midtrans dashboard

**Contoh Skenario:**
```
Business A (Owner: Anda)
  └─ Outlet 1 (Pakai Midtrans Anda) ✅
  └─ Outlet 2 (Owner: Orang Lain) ❌ Masalah! Harus pakai Midtrans Anda
```

---

## 🎯 Opsi Solusi

### **Opsi 1: Per-Business Midtrans Configuration** ⭐ **REKOMENDASI**

Setiap **Business** punya credentials Midtrans sendiri.

**Struktur:**
```
Business A → Midtrans Config A
  └─ Outlet 1 → Pakai Midtrans Config A
  └─ Outlet 2 → Pakai Midtrans Config A

Business B → Midtrans Config B
  └─ Outlet 3 → Pakai Midtrans Config B
```

**Keuntungan:**
- ✅ Satu business = satu akun Midtrans (logis untuk accounting)
- ✅ Owner business bisa manage credentials sendiri
- ✅ Revenue tracking per business di Midtrans dashboard
- ✅ Implementasi lebih sederhana (tambah kolom di `businesses` table)

**Kekurangan:**
- ❌ Kalau satu business punya banyak outlet dengan owner berbeda, masih pakai credentials yang sama

**Implementasi:**
- Tambah kolom di `businesses` table untuk menyimpan Midtrans config
- Modify `MidtransService` untuk support per-business config
- Fallback ke global config jika business tidak punya config sendiri

---

### **Opsi 2: Per-Outlet Midtrans Configuration**

Setiap **Outlet** punya credentials Midtrans sendiri.

**Struktur:**
```
Business A
  └─ Outlet 1 → Midtrans Config A
  └─ Outlet 2 → Midtrans Config B (Owner berbeda)

Business B
  └─ Outlet 3 → Midtrans Config C
```

**Keuntungan:**
- ✅ Paling fleksibel - setiap outlet bisa punya credentials sendiri
- ✅ Cocok untuk franchise model (setiap outlet punya owner berbeda)
- ✅ Revenue tracking per outlet di Midtrans dashboard

**Kekurangan:**
- ❌ Lebih kompleks (tambah kolom di `outlets` table)
- ❌ Management credentials lebih banyak
- ❌ Kalau satu business punya banyak outlet, harus setup banyak credentials

**Implementasi:**
- Tambah kolom di `outlets` table untuk menyimpan Midtrans config
- Modify `MidtransService` untuk support per-outlet config
- Fallback ke business config → global config

---

### **Opsi 3: Hybrid (Business Default + Outlet Override)** ⭐⭐ **PALING FLEKSIBEL**

Business punya default config, tapi outlet bisa override dengan config sendiri.

**Struktur:**
```
Business A → Midtrans Config A (default)
  └─ Outlet 1 → Pakai Midtrans Config A (inherit dari business)
  └─ Outlet 2 → Midtrans Config B (override dengan config sendiri)

Business B → Midtrans Config C (default)
  └─ Outlet 3 → Pakai Midtrans Config C (inherit dari business)
```

**Keuntungan:**
- ✅ Paling fleksibel - support semua skenario
- ✅ Default behavior: outlet pakai business config (simple)
- ✅ Override behavior: outlet bisa pakai config sendiri (fleksibel)
- ✅ Cocok untuk berbagai model bisnis

**Kekurangan:**
- ❌ Implementasi paling kompleks
- ❌ Logic fallback: Outlet → Business → Global

**Implementasi:**
- Tambah kolom di `businesses` table (default config)
- Tambah kolom di `outlets` table (optional override)
- Modify `MidtransService` dengan fallback logic

---

## 🏆 Rekomendasi

### **Untuk Skenario Umum: Opsi 1 (Per-Business)**

**Alasan:**
1. **Lebih sederhana** - implementasi lebih mudah
2. **Lebih logis** - satu business = satu akun Midtrans (untuk accounting)
3. **Cukup fleksibel** - kalau outlet punya owner berbeda, bisa buat business baru
4. **Lebih mudah di-manage** - owner business manage credentials sendiri

**Kapan pakai Opsi 3 (Hybrid):**
- Kalau memang ada requirement: satu business punya banyak outlet dengan owner berbeda
- Kalau model bisnisnya franchise (setiap outlet punya owner sendiri)

---

## 🔧 Implementasi (Opsi 1: Per-Business)

### **1. Database Migration**

Tambah kolom di `businesses` table untuk menyimpan Midtrans config:

```php
// Migration: add_midtrans_config_to_businesses_table.php
Schema::table('businesses', function (Blueprint $table) {
    $table->json('midtrans_config')->nullable()->after('settings');
    // Atau bisa pisah per kolom:
    // $table->string('midtrans_server_key')->nullable();
    // $table->string('midtrans_client_key')->nullable();
    // $table->boolean('midtrans_is_production')->default(false);
});
```

**Struktur JSON `midtrans_config`:**
```json
{
  "server_key": "SB-Mid-server-...",
  "client_key": "SB-Mid-client-...",
  "is_production": false,
  "is_sanitized": true,
  "is_3ds": true
}
```

### **2. Update Business Model**

```php
// app/Models/Business.php
protected $casts = [
    'settings' => 'array',
    'midtrans_config' => 'array', // ✅ Tambah ini
    // ...
];

// Helper method untuk get Midtrans config
public function getMidtransConfig()
{
    // Jika business punya config sendiri, pakai itu
    if ($this->midtrans_config && !empty($this->midtrans_config['server_key'])) {
        return $this->midtrans_config;
    }
    
    // Fallback ke global config
    return [
        'server_key' => config('midtrans.server_key'),
        'client_key' => config('midtrans.client_key'),
        'is_production' => config('midtrans.is_production'),
        'is_sanitized' => config('midtrans.is_sanitized'),
        'is_3ds' => config('midtrans.is_3ds'),
    ];
}
```

### **3. Update MidtransService**

Modify `MidtransService` untuk support per-business config:

```php
// app/Services/MidtransService.php

class MidtransService
{
    protected $config;
    
    // Constructor default (untuk backward compatibility)
    public function __construct($config = null)
    {
        if ($config) {
            // Use provided config (from business)
            $this->config = $config;
        } else {
            // Use global config (default)
            $this->config = [
                'server_key' => config('midtrans.server_key'),
                'client_key' => config('midtrans.client_key'),
                'is_production' => config('midtrans.is_production'),
                'is_sanitized' => config('midtrans.is_sanitized'),
                'is_3ds' => config('midtrans.is_3ds'),
            ];
        }
        
        // Set Midtrans configuration
        Config::$serverKey = $this->config['server_key'];
        Config::$isProduction = $this->config['is_production'];
        Config::$isSanitized = $this->config['is_sanitized'];
        Config::$is3ds = $this->config['is_3ds'];
    }
    
    // Factory method untuk create service dengan business config
    public static function forBusiness(Business $business)
    {
        $config = $business->getMidtransConfig();
        return new self($config);
    }
    
    // Get client key untuk frontend
    public function getClientKey()
    {
        return $this->config['client_key'];
    }
}
```

### **4. Update Controllers**

Modify controllers untuk pakai business-specific MidtransService:

```php
// app/Http/Controllers/Api/OrderPaymentController.php

public function createQrisPayment(Request $request)
{
    // ... existing code ...
    
    $order = Order::with(['customer', 'business'])->findOrFail($request->order_id);
    
    // ✅ Get MidtransService dengan business config
    $midtransService = MidtransService::forBusiness($order->business);
    
    // ... rest of code ...
    $snapToken = $midtransService->createSnapToken($params);
    
    return response()->json([
        'success' => true,
        'data' => [
            // ...
            'client_key' => $midtransService->getClientKey(), // ✅ Pakai client key dari business
        ],
    ]);
}
```

### **5. Update PaymentController (Subscription)**

```php
// app/Http/Controllers/Api/PaymentController.php

public function getClientKey(Request $request)
{
    // Get business from user
    $user = $request->user();
    $business = $user->businesses()->first(); // atau dari request
    
    if ($business) {
        $midtransService = MidtransService::forBusiness($business);
        return response()->json([
            'success' => true,
            'client_key' => $midtransService->getClientKey(),
        ]);
    }
    
    // Fallback ke global
    return response()->json([
        'success' => true,
        'client_key' => config('midtrans.client_key'),
    ]);
}
```

### **6. Webhook Handler**

**PENTING:** Webhook handler perlu handle multiple Midtrans accounts!

```php
// app/Http/Controllers/Api/OrderPaymentController.php

public function handleNotification(Request $request)
{
    // Get notification
    $notification = new Notification();
    $orderId = $notification->order_id;
    
    // Find payment
    $payment = Payment::where('reference_number', $orderId)->first();
    $order = $payment->order;
    
    // ✅ Get MidtransService dengan business config
    $midtransService = MidtransService::forBusiness($order->business);
    
    // Verify notification dengan config yang benar
    // (Midtrans SDK akan handle ini otomatis)
    $notificationData = $midtransService->handleNotification();
    
    // ... rest of code ...
}
```

---

## 🔐 Security Considerations

1. **Encrypt Midtrans Credentials**
   - Jangan simpan credentials dalam plain text
   - Gunakan Laravel encryption: `encrypt()` / `decrypt()`

2. **Access Control**
   - Hanya owner business yang bisa edit Midtrans config
   - Validasi permissions sebelum update config

3. **Validation**
   - Validasi format server_key dan client_key
   - Test credentials sebelum save

---

## 📝 Migration Path

### **Phase 1: Backward Compatible**
- Tambah kolom `midtrans_config` (nullable)
- Update `MidtransService` dengan fallback ke global config
- Existing business tetap pakai global config

### **Phase 2: Business Setup**
- Buat UI untuk business owner setup Midtrans config
- Validasi dan test credentials

### **Phase 3: Full Migration**
- Update semua controllers untuk pakai business config
- Update webhook handlers
- Test thoroughly

---

## ❓ Pertanyaan untuk Diskusi

1. **Model bisnis Anda:**
   - Apakah satu business bisa punya banyak outlet dengan owner berbeda?
   - Atau setiap business = satu owner?

2. **Prioritas:**
   - Apakah perlu support per-outlet config?
   - Atau per-business sudah cukup?

3. **Timeline:**
   - Kapan perlu implementasi ini?
   - Apakah ada business yang sudah menunggu fitur ini?

4. **Budget:**
   - Apakah setiap business/outlet punya budget untuk akun Midtrans sendiri?

---

## 🚀 Next Steps

1. **Diskusikan opsi solusi** dengan tim/stakeholder
2. **Tentukan opsi yang dipilih** (rekomendasi: Opsi 1)
3. **Buat migration** untuk tambah kolom
4. **Update MidtransService** dengan factory method
5. **Update controllers** untuk pakai business config
6. **Buat UI** untuk business owner setup config
7. **Test thoroughly** dengan multiple business/outlet

---

## 📚 Referensi

- [Midtrans Dashboard](https://dashboard.midtrans.com/)
- [Midtrans Multi-Account Documentation](https://docs.midtrans.com/docs/multi-account)
- [Laravel Encryption](https://laravel.com/docs/encryption)

---

**Dibuat:** {{ date('Y-m-d') }}
**Status:** Draft untuk Diskusi
























