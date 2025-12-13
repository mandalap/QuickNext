# 📱 PWA Push Notification Setup Guide

## ✅ Yang Sudah Diimplementasikan

### 1. **Service Worker Push Handler** ✅

- File: `app/frontend/public/service-worker.js`
- Sudah ada event listener untuk:
  - `push` - Handle incoming push messages
  - `notificationclick` - Handle ketika user klik notification
  - `notificationclose` - Handle ketika user tutup notification

### 2. **React Hook untuk Push Notification** ✅

- File: `app/frontend/src/hooks/usePushNotification.js`
- Fitur:
  - Check browser support
  - Request notification permission
  - Subscribe/unsubscribe to push notifications
  - Auto-check subscription status

### 3. **UI Component untuk Settings** ✅

- File: `app/frontend/src/components/notifications/PushNotificationSettings.jsx`
- Fitur:
  - Tampilkan status permission
  - Tampilkan status subscription
  - Button untuk enable/disable notifications
  - Auto-subscribe setelah permission granted

## 🔧 Setup yang Diperlukan

### 1. **VAPID Keys (Web Push)**

VAPID (Voluntary Application Server Identification) keys diperlukan untuk push notifications.

#### Generate VAPID Keys:

```bash
# Install web-push package
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

Output akan seperti ini:

```
Public Key: BKx...xxx
Private Key: yKx...xxx
```

#### Tambahkan ke Environment Variables:

**Frontend** (`app/frontend/.env.local`):

```env
REACT_APP_VAPID_PUBLIC_KEY=BKx...xxx
```

**Backend** (`app/backend/.env`):

```env
VAPID_PUBLIC_KEY=BKx...xxx
VAPID_PRIVATE_KEY=yKx...xxx
VAPID_SUBJECT=mailto:your-email@example.com
```

### 2. **Backend API Endpoints**

Backend perlu memiliki endpoint untuk:

- `POST /api/v1/notifications/subscribe` - Save subscription
- `POST /api/v1/notifications/unsubscribe` - Remove subscription
- `POST /api/v1/notifications/send` - Send push notification

#### Contoh Request Body untuk Subscribe:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "base64-encoded-key",
    "auth": "base64-encoded-key"
  },
  "user_id": 1,
  "business_id": 1
}
```

### 3. **Backend Implementation (Laravel)**

#### Install Package:

```bash
cd app/backend
composer require laravel-notification-channels/webpush
```

#### Create Migration:

```bash
php artisan make:migration create_push_subscriptions_table
```

Migration:

```php
Schema::create('push_subscriptions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->foreignId('business_id')->nullable()->constrained()->onDelete('cascade');
    $table->string('endpoint')->unique();
    $table->string('public_key')->nullable();
    $table->string('auth_token')->nullable();
    $table->timestamps();
});
```

#### Create Controller:

```php
// app/Http/Controllers/Api/NotificationController.php
public function subscribe(Request $request) {
    $user = auth()->user();

    $subscription = PushSubscription::updateOrCreate(
        ['endpoint' => $request->endpoint],
        [
            'user_id' => $user->id,
            'business_id' => $request->business_id,
            'public_key' => $request->keys['p256dh'],
            'auth_token' => $request->keys['auth'],
        ]
    );

    return response()->json(['success' => true]);
}

public function sendNotification(Request $request) {
    $user = User::find($request->user_id);

    $user->notify(new OrderNotification($request->data));

    return response()->json(['success' => true]);
}
```

## 📋 Cara Menggunakan

### 1. **Tambahkan Component ke Settings Page**

```jsx
import PushNotificationSettings from '../components/notifications/PushNotificationSettings';

// Di settings page
<PushNotificationSettings />;
```

### 2. **Send Push Notification dari Backend**

```php
use Illuminate\Notifications\Notification;

class OrderNotification extends Notification
{
    public function via($notifiable)
    {
        return ['webpush'];
    }

    public function toWebPush($notifiable, $notification)
    {
        return (new WebPushMessage)
            ->title('Order Baru')
            ->body('Anda memiliki order baru: #ORD-123')
            ->icon('/logo-qk.png')
            ->action('Lihat Order', '/orders/123')
            ->data(['url' => '/orders/123']);
    }
}

// Send notification
$user->notify(new OrderNotification());
```

## 🧪 Testing

### 1. **Test di Browser**

1. Install PWA (Add to Home Screen)
2. Buka Settings → Push Notifications
3. Klik "Minta Izin Notifikasi"
4. Allow permission
5. Klik "Aktifkan Notifikasi"
6. Test dengan mengirim notification dari backend

### 2. **Test dengan cURL**

```bash
# Send test notification
curl -X POST http://localhost:8000/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": 1,
    "title": "Test Notification",
    "body": "This is a test notification",
    "data": {"url": "/"}
  }'
```

## ⚠️ Catatan Penting

1. **HTTPS Required**: Push notifications hanya bekerja di HTTPS (atau localhost untuk development)
2. **Service Worker**: Pastikan service worker sudah ter-register
3. **Permission**: User harus memberikan permission untuk notifications
4. **PWA Installed**: Push notifications bekerja lebih baik saat PWA sudah di-install
5. **Browser Support**:
   - ✅ Chrome/Edge (Desktop & Mobile)
   - ✅ Firefox (Desktop & Mobile)
   - ✅ Safari (iOS 16.4+)
   - ❌ Safari (Desktop - tidak support)

## 🔍 Troubleshooting

### Notification tidak muncul:

1. Check browser console untuk errors
2. Check service worker status di DevTools → Application → Service Workers
3. Check notification permission di Settings
4. Pastikan VAPID keys sudah benar
5. Pastikan subscription sudah tersimpan di database

### Permission ditolak:

- User harus manually enable di browser settings
- Clear cache dan coba lagi
- Pastikan menggunakan HTTPS (atau localhost)

### Subscription gagal:

- Check VAPID keys sudah benar
- Check endpoint URL valid
- Check backend API response

## 📚 Referensi

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Laravel WebPush](https://github.com/laravel-notification-channels/webpush)
