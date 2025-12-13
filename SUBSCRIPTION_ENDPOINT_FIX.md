# Subscription Endpoint 404 Error - Fix Guide

## 🔴 Masalah

Error 404 pada endpoint subscription:
- `/api/v1/subscriptions/verify-activate` - 404
- `/api/v1/subscriptions/payment-token/{subscriptionCode}` - 400/404
- `/api/v1/payments/status/{subscriptionCode}` - 404

## ✅ Perbaikan yang Sudah Dilakukan

### 1. Frontend - Refactor Hardcoded URLs
- ✅ `PaymentSuccess.jsx` - Mengganti hardcoded URL ke `apiClient`
- ✅ `PaymentPending.jsx` - Mengganti hardcoded URL ke `apiClient`
- ✅ `SubscriptionPlans.jsx` - Mengganti hardcoded URL ke `apiClient`

### 2. Backend - Middleware Fix
- ✅ Menambahkan explicit check untuk `verify-activate` endpoint
- ✅ Menambahkan explicit check untuk `payments/status` endpoint
- ✅ Memastikan route matching bekerja dengan benar

## 🔧 Solusi yang Perlu Dilakukan

### Clear Route Cache

Route sudah terdaftar dengan benar, tapi mungkin ada masalah dengan route caching. Jalankan:

```bash
cd app/backend
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```

### Verifikasi Route

Route sudah terdaftar (dari `php artisan route:list`):
- ✅ `POST api/v1/subscriptions/verify-activate`
- ✅ `GET api/v1/subscriptions/payment-token/{subscriptionCode}`
- ✅ `GET api/v1/payments/status/{subscriptionCode}`

### Cek Controller Method

Method sudah ada di controller:
- ✅ `SubscriptionController::verifyAndActivatePending()`
- ✅ `SubscriptionController::getPaymentToken($subscriptionCode)`
- ✅ `PaymentController::checkPaymentStatus($subscriptionCode)`

## 🐛 Troubleshooting

### Jika masih error 404:

1. **Clear semua cache:**
   ```bash
   php artisan route:clear
   php artisan config:clear
   php artisan cache:clear
   php artisan view:clear
   ```

2. **Restart server:**
   ```bash
   php artisan serve
   ```

3. **Cek route list:**
   ```bash
   php artisan route:list --path=subscriptions
   php artisan route:list --path=payments
   ```

4. **Cek middleware:**
   - Pastikan `CheckSubscriptionStatus` middleware tidak memblokir
   - Route sudah di-exempt di middleware

### Error 400 pada payment-token

Error 400 biasanya berarti:
- Subscription code tidak valid
- Subscription sudah tidak pending
- Subscription tidak ditemukan

Cek di database apakah subscription dengan code tersebut ada dan statusnya `pending_payment`.

## 📝 Catatan

- Route sudah terdaftar dengan benar
- Middleware sudah di-update untuk allow endpoint ini
- Frontend sudah menggunakan `apiClient` (konsisten)
- Jika masih error, kemungkinan masalah route caching - clear cache dan restart server

---

**Last Updated:** 2025-01-XX
**Status:** Fixed (perlu clear route cache)

