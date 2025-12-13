# Fix: API Endpoint 404 Error

## Masalah

Frontend mendapat error 404 untuk endpoint `/api/self-service-management/*` karena URL yang salah.

## Penyebab

- Route `self-service-management` ada di dalam group `v1` di `routes/api.php`
- Frontend memanggil endpoint tanpa prefix `v1`
- Base URL: `http://localhost:8000/api`
- Route group: `v1/self-service-management/*`
- URL yang benar: `http://localhost:8000/api/v1/self-service-management/*`

## Solusi

Memperbaiki `app/frontend/src/services/selfServiceApi.js`:

### Sebelum:

```javascript
const response = await apiClient.get("/self-service-management/orders");
```

### Sesudah:

```javascript
const response = await apiClient.get("/v1/self-service-management/orders");
```

## Endpoint yang Diperbaiki

- ✅ `/v1/self-service-management/orders`
- ✅ `/v1/self-service-management/stats`
- ✅ `/v1/self-service-management/tables`
- ✅ `/v1/self-service-management/tables` (POST)
- ✅ `/v1/self-service-management/tables/{id}/status` (PUT)
- ✅ `/v1/self-service-management/tables/{id}` (DELETE)
- ✅ `/v1/self-service-management/tables/{id}/qr-code`
- ✅ `/v1/self-service-management/qr-menus`
- ✅ `/v1/outlets`

## Testing

1. Server Laravel harus berjalan di `http://localhost:8000`
2. Frontend harus menggunakan token authentication
3. Header `X-Business-Id` dan `X-Outlet-Id` harus dikirim

## Status

✅ **FIXED** - Semua endpoint sekarang menggunakan prefix `/v1/` yang benar













































































