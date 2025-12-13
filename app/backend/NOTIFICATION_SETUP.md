# 🔔 Push Notification Setup Guide

## 1. Generate VAPID Keys

VAPID keys diperlukan untuk push notifications. Generate menggunakan web-push library:

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

Output akan seperti:

```
Public Key: <your-public-key>
Private Key: <your-private-key>
```

## 2. Set Environment Variables

### Backend `.env`:

```env
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
```

### Frontend `.env`:

```env
REACT_APP_VAPID_PUBLIC_KEY=<your-public-key>
```

## 3. Install Dependencies

### Backend (Laravel):

```bash
composer require minishlink/web-push
```

## 4. Create Database Migration

```bash
php artisan make:migration create_push_subscriptions_table
```

Migration content:

```php
Schema::create('push_subscriptions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->foreignId('business_id')->nullable()->constrained()->onDelete('cascade');
    $table->string('endpoint')->unique();
    $table->string('p256dh');
    $table->string('auth');
    $table->timestamps();

    $table->index(['user_id', 'business_id']);
});
```

## 5. Create Controller

```bash
php artisan make:controller Api/NotificationController
```

Controller methods:

-   `subscribe()` - Save subscription
-   `unsubscribe()` - Remove subscription
-   `send()` - Send notification (for testing)

## 6. Add Routes

In `routes/api.php`:

```php
Route::prefix('v1/notifications')->middleware('auth:sanctum')->group(function () {
    Route::post('/subscribe', [NotificationController::class, 'subscribe']);
    Route::post('/unsubscribe', [NotificationController::class, 'unsubscribe']);
    Route::post('/send', [NotificationController::class, 'send']); // For testing
});
```

## 7. Test Push Notification

1. Enable push notification di frontend
2. Send test notification dari backend
3. Verify notification muncul di device
