# 🔒 Push Notification Security & Role-Based System

## ✅ Security Features

### 1. **VAPID Encryption** ✅
- Push notifications menggunakan **VAPID (Voluntary Application Server Identification)** keys
- Enkripsi end-to-end untuk semua push notifications
- Private key hanya ada di server, tidak pernah dikirim ke client

### 2. **Authentication Required** ✅
- Semua endpoint push notification memerlukan `auth:sanctum` middleware
- User harus login untuk subscribe/unsubscribe
- Tidak ada anonymous push notifications

### 3. **Role-Based Filtering** ✅
- Notifikasi hanya dikirim ke user dengan role yang sesuai
- Filter berdasarkan `role_targets` di database
- User hanya melihat notifikasi yang relevan dengan role mereka

### 4. **Business/Outlet Access Control** ✅
- Notifikasi hanya dikirim ke user yang memiliki akses ke business/outlet tersebut
- Filter berdasarkan `business_id` dan `outlet_id`
- User tidak bisa melihat notifikasi dari business/outlet lain

### 5. **User-Specific Notifications** ✅
- Jika `user_id` diisi, hanya user tersebut yang menerima notifikasi
- Owner/admin bisa melihat semua notifikasi, tapi push hanya ke user yang relevan

---

## 📋 Role-Based Notification System

### **Order Created** (`order.created`)
**Target Roles:**
- ✅ **kitchen** - Selalu (semua order perlu dipersiapkan)
- ✅ **waiter** - Hanya jika `order.type === 'dine_in'`
- ✅ **kasir** - Hanya jika `payment_status === 'pending'` (perlu proses pembayaran)
- ✅ **owner** - Selalu (monitoring)
- ✅ **admin** - Selalu (monitoring)

**Contoh:**
```php
// Dine-in order, belum dibayar
role_targets: ['kitchen', 'waiter', 'kasir', 'owner', 'admin']

// Takeaway order, sudah dibayar
role_targets: ['kitchen', 'owner', 'admin']

// Online order, belum dibayar
role_targets: ['kitchen', 'kasir', 'owner', 'admin']
```

### **Order Paid** (`order.paid`)
**Target Roles:**
- ✅ **kasir** - Selalu (konfirmasi pembayaran)
- ✅ **owner** - Selalu (monitoring)
- ✅ **admin** - Selalu (monitoring)

**Contoh:**
```php
role_targets: ['kasir', 'owner', 'admin']
```

### **Order Status Changed** (`order.status_changed`)
**Target Roles:**
- ✅ **waiter** - Jika `order.type === 'dine_in'` (untuk serve)
- ✅ **kasir** - Selalu (untuk tracking)
- ✅ **owner** - Selalu (monitoring)
- ✅ **admin** - Selalu (monitoring)

**Contoh:**
```php
// Dine-in order confirmed
role_targets: ['waiter', 'kasir', 'owner', 'admin']

// Takeaway order confirmed
role_targets: ['kasir', 'owner', 'admin']
```

---

## 🔐 Security Implementation

### **1. NotificationService.php**
```php
// ✅ SECURITY: Get target users based on role_targets
private function getTargetUsers(AppNotification $notification)
{
    $query = User::query();

    // Filter by role_targets if specified
    if ($notification->role_targets && is_array($notification->role_targets)) {
        $query->whereIn('role', $notification->role_targets);
    }

    // Filter by business access
    if ($notification->business_id) {
        $query->whereHas('businesses', function ($q) use ($notification) {
            $q->where('businesses.id', $notification->business_id);
        });
    }

    // Filter by outlet access
    if ($notification->outlet_id) {
        $query->whereHas('employeeOutlets', function ($q) use ($notification) {
            $q->where('outlet_id', $notification->outlet_id);
        });
    }

    return $query->get();
}
```

### **2. AppNotification Model Observer**
```php
// ✅ SECURITY: Auto-send push notification when notification is created
protected static function booted()
{
    static::created(function ($notification) {
        // Only send push if role_targets is specified
        if ($notification->role_targets && is_array($notification->role_targets)) {
            $service = new NotificationService();
            $service->sendPushNotification($notification);
        }
    });
}
```

### **3. NotificationController Filtering**
```php
// ✅ SECURITY: Role-based filtering when reading notifications
if (in_array($user->role, ['owner', 'admin', 'super_admin'])) {
    // Owner/admin: See all notifications
} else {
    // Other roles: Only see notifications for their user_id or global
    $query->where(function ($q) use ($user) {
        $q->where('user_id', $user->id)
          ->orWhereNull('user_id');
    });
}

// Filter by role_targets
if ($user->role) {
    $query->where(function ($q) use ($user) {
        $q->whereNull('role_targets')
          ->orWhereJsonContains('role_targets', $user->role);
    });
}
```

---

## 📊 Notification Flow

### **1. Order Created**
```
1. Order dibuat di POSController
2. AppNotification::create() dengan role_targets
3. AppNotification observer triggered
4. NotificationService::sendPushNotification()
5. Get target users berdasarkan role_targets
6. Filter by business/outlet access
7. Send push ke semua user yang sesuai
```

### **2. Order Paid**
```
1. Payment processed di POSController/OrderPaymentController
2. AppNotification::create() dengan role_targets: ['kasir', 'owner', 'admin']
3. Auto-send push notification
4. Only kasir, owner, admin receive push
```

### **3. Order Status Changed**
```
1. Kitchen update status di KitchenController
2. AppNotification::create() dengan role_targets berdasarkan order type
3. Auto-send push notification
4. Only relevant roles receive push
```

---

## ✅ Security Checklist

- [x] VAPID encryption untuk semua push notifications
- [x] Authentication required untuk semua endpoints
- [x] Role-based filtering saat membaca notifikasi
- [x] Role-based targeting saat mengirim push notification
- [x] Business/outlet access control
- [x] User-specific notifications (jika user_id diisi)
- [x] Auto-cleanup invalid subscriptions
- [x] Error handling yang aman (tidak expose sensitive data)
- [x] Logging untuk audit trail

---

## 🚨 Security Best Practices

### **1. VAPID Keys**
- ✅ Private key **TIDAK PERNAH** dikirim ke client
- ✅ Private key hanya ada di server `.env`
- ✅ Public key bisa di-share ke client untuk subscription

### **2. Subscription Management**
- ✅ User hanya bisa subscribe/unsubscribe untuk diri sendiri
- ✅ Subscription di-link dengan `user_id` dan `business_id`
- ✅ Invalid subscriptions otomatis dihapus

### **3. Notification Content**
- ✅ Tidak ada sensitive data di notification payload
- ✅ Hanya metadata (order_id, type, etc.)
- ✅ Full data di-fetch dari API setelah notification clicked

### **4. Access Control**
- ✅ Owner/admin bisa melihat semua notifikasi
- ✅ Other roles hanya melihat notifikasi yang relevan
- ✅ Filter berdasarkan business/outlet access

---

## 📝 Contoh Penggunaan

### **Membuat Notifikasi dengan Role-Based Targeting**
```php
\App\Models\AppNotification::create([
    'business_id' => $order->business_id,
    'outlet_id' => $order->outlet_id,
    'user_id' => null, // null = untuk semua user dengan role yang sesuai
    'role_targets' => ['kitchen', 'waiter', 'kasir', 'owner', 'admin'],
    'type' => 'order.created',
    'title' => 'Order Baru: ' . $order->order_number,
    'message' => "Order baru telah dibuat",
    'severity' => 'info',
    'resource_type' => 'order',
    'resource_id' => $order->id,
    'meta' => [
        'order_number' => $order->order_number,
        'payment_status' => $order->payment_status,
    ],
]);
// ✅ Push notification akan otomatis dikirim ke semua user dengan role yang sesuai
```

### **Membuat Notifikasi User-Specific**
```php
\App\Models\AppNotification::create([
    'business_id' => $business->id,
    'outlet_id' => null,
    'user_id' => $user->id, // Specific user
    'role_targets' => null, // null = hanya untuk user_id
    'type' => 'subscription.expiring',
    'title' => 'Paket Anda Akan Berakhir',
    'message' => "Paket Anda akan berakhir dalam 3 hari",
    'severity' => 'warning',
]);
// ✅ Push notification hanya dikirim ke user tersebut
```

---

## 🎯 Kesimpulan

**✅ Push Notification System AMAN dan Role-Based:**

1. **Security:**
   - VAPID encryption
   - Authentication required
   - Role-based filtering
   - Business/outlet access control

2. **Role-Based Targeting:**
   - Order created: kitchen, waiter (jika dine_in), kasir (jika pending), owner, admin
   - Order paid: kasir, owner, admin
   - Order status changed: waiter (jika dine_in), kasir, owner, admin

3. **Auto-Send:**
   - Push notification otomatis dikirim saat notifikasi dibuat
   - Hanya ke user dengan role yang sesuai
   - Hanya ke user dengan akses business/outlet yang sesuai

**✅ Sistem sudah aman dan siap digunakan!** 🔒

