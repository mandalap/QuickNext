# 🔧 Fix: Subscription Logic - Prioritize Paid Over Trial

## 🐛 Masalah yang Ditemukan

### **Problem 1: API Backend Mengembalikan Trial Meskipun Sudah Upgrade**
- API `getCurrentSubscription()` tetap mengembalikan subscription trial meskipun user sudah upgrade ke paket berbayar
- Status di database sudah "upgraded" atau "cancelled", tapi API masih return trial
- Logic pemilihan subscription aktif lebih memilih "trial" walau sudah ada paket berbayar active

### **Root Cause:**
1. **Query di `getCurrentSubscription()` menggunakan `latest()` yang mengurutkan berdasarkan `created_at`**
   - Jika trial subscription dibuat lebih baru daripada paid subscription, trial akan dipilih
   - Tidak ada prioritas untuk paid subscription (is_trial = false) over trial (is_trial = true)

2. **Method `verifyActivate()` hanya mengambil SATU old subscription**
   - Seharusnya mengambil SEMUA old active subscriptions (termasuk trial) dan mark sebagai 'upgraded'

---

## ✅ Perbaikan yang Dilakukan

### **1. Fix Query di `getCurrentSubscription()` - Prioritize Paid Over Trial**

**File:** `app/backend/app/Http/Controllers/Api/SubscriptionController.php` (baris 461-466)

**Sebelum:**
```php
$activeSubscription = UserSubscription::with(['subscriptionPlan', 'subscriptionPlanPrice'])
    ->where('user_id', $user->id)
    ->where('status', 'active')
    ->where('ends_at', '>', now())
    ->latest()  // ❌ Hanya urutkan berdasarkan created_at
    ->first();
```

**Sesudah:**
```php
$activeSubscription = UserSubscription::with(['subscriptionPlan', 'subscriptionPlanPrice'])
    ->where('user_id', $user->id)
    ->where('status', 'active') // Only active subscriptions (excludes upgraded, cancelled, etc)
    ->where('ends_at', '>', now()) // Only get non-expired active subscriptions
    ->orderBy('is_trial', 'asc') // ✅ Paid subscriptions (is_trial = false) first
    ->latest() // Then by created_at DESC (newest first)
    ->first();
```

**Penjelasan:**
- `orderBy('is_trial', 'asc')` → Paid subscriptions (is_trial = false) akan dipilih lebih dulu daripada trial (is_trial = true)
- `latest()` → Jika ada multiple paid subscriptions, pilih yang terbaru (created_at DESC)
- Ditambahkan logging untuk debugging

---

### **2. Fix Method `verifyActivate()` - Mark ALL Old Subscriptions as Upgraded**

**File:** `app/backend/app/Http/Controllers/Api/SubscriptionController.php` (baris 1595-1608)

**Sebelum:**
```php
$oldSubscription = UserSubscription::where('user_id', $user->id)
    ->where('id', '!=', $subscription->id)
    ->where('status', 'active')
    ->where('ends_at', '>', Carbon::now())
    ->orderBy('created_at', 'desc')
    ->first(); // ❌ Hanya ambil satu

if ($oldSubscription) {
    $oldSubscription->update([
        'status' => 'upgraded',
        ...
    ]);
}
```

**Sesudah:**
```php
// ✅ CRITICAL FIX: Mark ALL old active subscriptions as upgraded (not just one)
$oldActiveSubscriptions = UserSubscription::where('user_id', $user->id)
    ->where('id', '!=', $subscription->id)
    ->where('status', 'active')
    ->get(); // ✅ Ambil semua

foreach ($oldActiveSubscriptions as $oldSub) {
    $oldSub->update([
        'status' => 'upgraded',
        'notes' => ($oldSub->notes ?? '') . ' | Upgraded to ' . ($subscription->subscriptionPlan->name ?? 'new plan') . ' at ' . Carbon::now(),
    ]);
    
    Log::info('Marked old subscription as upgraded (verify-activate)', [
        'old_subscription_id' => $oldSub->id,
        'old_subscription_code' => $oldSub->subscription_code,
        'old_is_trial' => $oldSub->is_trial,
        'new_subscription_id' => $subscription->id,
        'new_subscription_code' => $subscription->subscription_code,
    ]);
}
```

**Penjelasan:**
- Sekarang mengambil SEMUA old active subscriptions (termasuk trial)
- Semua di-mark sebagai 'upgraded' untuk mencegah multiple active subscriptions
- Ditambahkan logging untuk tracking

---

## 🔍 Logic Flow Setelah Fix

### **Scenario 1: User Upgrade dari Trial ke Paid**

1. User punya trial subscription (status: active, is_trial: true)
2. User upgrade ke paid plan → subscription baru dibuat (status: pending_payment, is_trial: false)
3. User bayar → webhook `handleMidtransNotification()` dipanggil
4. **Old trial subscription di-mark sebagai 'upgraded'** ✅
5. **New paid subscription di-activate (status: active)** ✅
6. `getCurrentSubscription()` dipanggil:
   - Query mencari subscription dengan status = 'active'
   - **Prioritaskan paid (is_trial = false) over trial (is_trial = true)** ✅
   - Return paid subscription ✅

### **Scenario 2: User Punya Multiple Active Subscriptions (Bug)**

1. User punya trial (status: active, created_at: 2025-01-20)
2. User punya paid (status: active, created_at: 2025-01-15) - lebih lama tapi sudah di-upgrade
3. **Sebelum fix:** Query `latest()` akan pilih trial (karena created_at lebih baru) ❌
4. **Sesudah fix:** Query `orderBy('is_trial', 'asc')` akan pilih paid (karena is_trial = false) ✅

---

## 🧪 Testing

### **Test Case 1: Upgrade dari Trial ke Paid**

```bash
# 1. User login dengan trial subscription
GET /api/v1/subscriptions/current
# Expected: Return trial subscription

# 2. User upgrade ke paid plan
POST /api/v1/subscriptions/upgrade
# Expected: Create new subscription with status 'pending_payment'

# 3. User bayar (simulate webhook)
POST /api/v1/payments/midtrans-notification
# Expected: 
# - Old trial subscription status = 'upgraded'
# - New paid subscription status = 'active'

# 4. Check current subscription
GET /api/v1/subscriptions/current
# Expected: Return paid subscription (NOT trial) ✅
```

### **Test Case 2: Multiple Active Subscriptions**

```sql
-- Simulate bug: User punya 2 active subscriptions
-- Trial (created_at: 2025-01-20, is_trial: true)
-- Paid (created_at: 2025-01-15, is_trial: false)

SELECT * FROM user_subscriptions 
WHERE user_id = 1 AND status = 'active';
-- Should show 2 subscriptions

-- Call API
GET /api/v1/subscriptions/current
-- Expected: Return paid subscription (is_trial = false) ✅
-- NOT trial subscription (is_trial = true)
```

---

## 📊 Database Query yang Benar

### **Query untuk Get Current Subscription:**

```sql
SELECT * FROM user_subscriptions
WHERE user_id = ?
  AND status = 'active'  -- Hanya active (exclude upgraded, cancelled)
  AND ends_at > NOW()   -- Hanya yang belum expired
ORDER BY is_trial ASC,  -- Paid (false) first, trial (true) last
         created_at DESC -- Newest first
LIMIT 1;
```

**Penjelasan:**
- `ORDER BY is_trial ASC` → `false` (paid) akan muncul sebelum `true` (trial)
- Jika ada multiple paid subscriptions, pilih yang terbaru (created_at DESC)

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

### **Step 2: Fix Existing Data (Jika Ada)**

Jika ada user yang punya multiple active subscriptions:

```bash
# Run artisan command untuk fix (jika ada)
php artisan subscription:fix-multiple-active

# Atau manual via SQL:
UPDATE user_subscriptions
SET status = 'upgraded',
    notes = CONCAT(COALESCE(notes, ''), ' | Fixed multiple active subscriptions at ', NOW())
WHERE user_id = USER_ID
  AND id != NEWEST_PAID_SUBSCRIPTION_ID
  AND status = 'active';
```

### **Step 3: Verify**

```bash
# Test API
curl -X GET http://your-vps/api/v1/subscriptions/current \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Accept: application/json"

# Expected: Return paid subscription (is_trial: false) jika user sudah upgrade
```

---

## 📝 Checklist

- [x] Fix query di `getCurrentSubscription()` - prioritize paid over trial
- [x] Fix method `verifyActivate()` - mark ALL old subscriptions as upgraded
- [x] Tambahkan logging untuk debugging
- [x] Test upgrade flow
- [x] Dokumentasi perbaikan

---

## 🔍 Monitoring

Setelah deploy, monitor logs untuk memastikan:

1. **Log saat subscription dipilih:**
   ```
   Selected active subscription
   - subscription_id
   - is_trial (should be false for paid subscriptions)
   - plan_name
   ```

2. **Log saat old subscription di-mark sebagai upgraded:**
   ```
   Marked old subscription as upgraded
   - old_subscription_id
   - old_is_trial
   - new_subscription_id
   ```

3. **Check database:**
   ```sql
   -- Pastikan tidak ada multiple active subscriptions per user
   SELECT user_id, COUNT(*) as active_count
   FROM user_subscriptions
   WHERE status = 'active'
   GROUP BY user_id
   HAVING active_count > 1;
   -- Expected: No rows (empty result)
   ```

---

## 📚 Related Files

- `app/backend/app/Http/Controllers/Api/SubscriptionController.php` - Main controller
- `app/backend/app/Http/Controllers/Api/PaymentController.php` - Webhook handler
- `app/backend/app/Models/UserSubscription.php` - Model

---

**Dibuat:** 2026-01-26  
**Status:** ✅ Fixed  
**Priority:** 🔴 **CRITICAL** - Fix logic pemilihan subscription
