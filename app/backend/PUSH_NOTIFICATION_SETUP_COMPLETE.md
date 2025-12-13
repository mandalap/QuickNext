# ✅ Push Notification Setup - COMPLETE

## 📋 Yang Sudah Dikerjakan

### 1. **Backend Controller** ✅

-   File: `app/backend/app/Http/Controllers/Api/NotificationController.php`
-   Method `subscribe()` - Save push subscription
-   Method `unsubscribe()` - Remove push subscription
-   Method `send()` - Send push notification (for testing)

### 2. **Database Migration** ✅

-   File: `app/backend/database/migrations/2025_01_26_000000_create_push_subscriptions_table.php`
-   Table: `push_subscriptions`
-   Columns: `id`, `user_id`, `business_id`, `endpoint`, `p256dh`, `auth`, `timestamps`

### 3. **Model** ✅

-   File: `app/backend/app/Models/PushSubscription.php`
-   Relationships: `user()`, `business()`

### 4. **Routes** ✅

-   `POST /api/v1/notifications/subscribe` - Subscribe to push notifications
-   `POST /api/v1/notifications/unsubscribe` - Unsubscribe from push notifications
-   `POST /api/v1/notifications/send` - Send push notification (for testing)

### 5. **Composer Package** ✅

-   Added `minishlink/web-push` to `composer.json`

### 6. **VAPID Keys Generator Script** ✅

-   File: `app/backend/generate-vapid-keys.php`
-   Usage: `php generate-vapid-keys.php`

---

## 🚀 Setup Instructions

### **Step 1: Install Dependencies**

```bash
cd app/backend
composer require minishlink/web-push
```

### **Step 2: Run Migration**

```bash
php artisan migrate
```

### **Step 3: Generate VAPID Keys**

```bash
php generate-vapid-keys.php
```

Output akan seperti:

```
✅ VAPID Keys Generated Successfully!

📋 Add these to your environment variables:

Backend (.env):
VAPID_PUBLIC_KEY=BKx...xxx
VAPID_PRIVATE_KEY=yKx...xxx
VAPID_SUBJECT=mailto:admin@quickkasir.com

Frontend (.env.local):
REACT_APP_VAPID_PUBLIC_KEY=BKx...xxx
```

### **Step 4: Update Environment Variables**

**Backend** (`app/backend/.env`):

```env
VAPID_PUBLIC_KEY=BKx...xxx
VAPID_PRIVATE_KEY=yKx...xxx
VAPID_SUBJECT=mailto:admin@quickkasir.com
```

**Frontend** (`app/frontend/.env.local`):

```env
REACT_APP_VAPID_PUBLIC_KEY=BKx...xxx
```

### **Step 5: Test Push Notification**

1. **Start servers:**

    ```bash
    # Backend
    cd app/backend
    php artisan serve

    # Frontend
    cd app/frontend
    npm start
    ```

2. **Enable push notification di frontend:**

    - Buka Settings → Push Notifications
    - Klik "Minta Izin Notifikasi"
    - Allow permission
    - Klik "Aktifkan Notifikasi"

3. **Test send notification:**
    ```bash
    curl -X POST http://localhost:8000/api/v1/notifications/send \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer YOUR_TOKEN" \
      -H "X-Business-Id: YOUR_BUSINESS_ID" \
      -d '{
        "title": "Test Notification",
        "body": "This is a test notification",
        "data": {"url": "/"}
      }'
    ```

---

## 📝 API Endpoints

### **Subscribe to Push Notifications**

```http
POST /api/v1/notifications/subscribe
Authorization: Bearer {token}
X-Business-Id: {business_id}
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

### **Unsubscribe from Push Notifications**

```http
POST /api/v1/notifications/unsubscribe
Authorization: Bearer {token}
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

### **Send Push Notification (Testing)**

```http
POST /api/v1/notifications/send
Authorization: Bearer {token}
X-Business-Id: {business_id}
Content-Type: application/json

{
  "user_id": 1,
  "title": "Order Baru",
  "body": "Anda memiliki order baru: #ORD-123",
  "data": {
    "url": "/orders/123"
  },
  "icon": "/logo-qk.png",
  "badge": "/logo-qk.png",
  "tag": "order-notification"
}
```

---

## ✅ Checklist

-   [x] Backend Controller methods created
-   [x] Database migration created
-   [x] Model created
-   [x] Routes added
-   [x] Composer package added
-   [x] VAPID keys generator script created
-   [ ] Install dependencies (`composer require minishlink/web-push`)
-   [ ] Run migration (`php artisan migrate`)
-   [ ] Generate VAPID keys (`php generate-vapid-keys.php`)
-   [ ] Set environment variables
-   [ ] Test push notification

---

## 🎯 Next Steps

1. **Install dependencies** - Run `composer require minishlink/web-push`
2. **Run migration** - Run `php artisan migrate`
3. **Generate VAPID keys** - Run `php generate-vapid-keys.php`
4. **Set environment variables** - Add keys to `.env` files
5. **Test** - Test subscribe and send notification

---

## 📚 Related Files

-   Frontend Hook: `app/frontend/src/hooks/usePushNotification.js`
-   Frontend Component: `app/frontend/src/components/notifications/PushNotificationSettings.jsx`
-   Service Worker: `app/frontend/public/service-worker.js`
-   Backend Controller: `app/backend/app/Http/Controllers/Api/NotificationController.php`
-   Backend Model: `app/backend/app/Models/PushSubscription.php`
-   Migration: `app/backend/database/migrations/2025_01_26_000000_create_push_subscriptions_table.php`

---

## ⚠️ Important Notes

1. **HTTPS Required**: Push notifications hanya bekerja di HTTPS (atau localhost untuk development)
2. **VAPID Keys**: Jangan commit private key ke version control
3. **Service Worker**: Pastikan service worker sudah ter-register
4. **Permission**: User harus memberikan permission untuk notifications
5. **Browser Support**:
    - ✅ Chrome/Edge (Desktop & Mobile)
    - ✅ Firefox (Desktop & Mobile)
    - ✅ Safari (iOS 16.4+)
    - ❌ Safari (Desktop - tidak support)

---

## 🎉 Setup Complete!

Push notification backend sudah siap! Tinggal install dependencies, run migration, dan generate VAPID keys.
