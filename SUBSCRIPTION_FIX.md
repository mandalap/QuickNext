# Fix: API Timeout Error - Subscription Required

## Masalah

Frontend mendapat error timeout untuk API calls karena semua user tidak memiliki subscription yang aktif.

## Penyebab

- Semua route di group `v1` menggunakan middleware `subscription.check`
- User yang login di frontend tidak memiliki subscription yang aktif
- API mengembalikan 403 Forbidden dengan pesan "Subscription required"

## Solusi

### 1. **Identifikasi Masalah**

- Test API dengan curl: HTTP 403 "Subscription required"
- Periksa middleware `CheckSubscriptionStatus.php`
- Semua route memerlukan subscription aktif

### 2. **Buat Subscription untuk Development**

```php
// Script: create_proper_subscription.php
$subscription = \App\Models\UserSubscription::create([
    'user_id' => $user->id,
    'subscription_plan_id' => $plan->id,
    'subscription_plan_price_id' => $planPrice->id, // Required field
    'subscription_code' => 'DEV-' . $user->id . '-' . time(),
    'status' => 'active',
    'amount_paid' => 0,
    'starts_at' => now(),
    'ends_at' => now()->addYear(), // 1 year subscription
    'is_trial' => true,
    'plan_features' => json_encode(['unlimited' => true]),
]);
```

### 3. **User yang Diperbaiki**

- ✅ Test User (ID: 1) - Member
- ✅ Ita Amalia Mawaddah (ID: 2) - Owner (sudah ada)
- ✅ Kasir 1 (ID: 3) - Kasir
- ✅ Kasir 2 (ID: 4) - Kasir

### 4. **Test Results**

```
🧪 Testing API with different users...
   Test User: HTTP 200
   Ita Amalia Mawaddah: HTTP 200
   Kasir 1: HTTP 200
   Kasir 2: HTTP 200
```

## Status

✅ **FIXED** - Semua user sekarang memiliki subscription aktif dan API berfungsi normal

## Next Steps

1. **Refresh halaman Self Service** di browser
2. **API calls seharusnya tidak timeout lagi**
3. **Data seharusnya muncul** (orders, stats, tables, QR menus)
4. **Modal "Buat Meja" seharusnya berfungsi**

## Development Notes

- Subscription dibuat untuk 1 tahun (development)
- Menggunakan plan "Trial 7 Hari" dengan harga 0
- Status: active, is_trial: true
- Untuk production, user harus subscribe melalui normal flow












































































