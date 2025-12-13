# API Debug Guide

## Testing Sales API

### 1. Debug Endpoint

Test endpoint untuk memeriksa status user dan business:

```
GET /api/v1/sales/debug
Authorization: Bearer {token}
```

Response yang diharapkan:

```json
{
    "success": true,
    "data": {
        "user_id": 1,
        "user_name": "John Doe",
        "current_business_id": 1,
        "businesses_count": 1,
        "fallback_business_id": 1,
        "orders_count": 0,
        "customers_count": 0
    }
}
```

### 2. Sales Stats Endpoint

```
GET /api/v1/sales/stats?date_range=today
Authorization: Bearer {token}
```

### 3. Orders Endpoint

```
GET /api/v1/orders?page=1&limit=10&search=&status=all&date_range=today
Authorization: Bearer {token}
```

### 4. Customers Endpoint

```
GET /api/v1/customers?page=1&limit=10&search=&status=all
Authorization: Bearer {token}
```

## Troubleshooting

### Error 500 Internal Server Error

1. Periksa log Laravel: `tail -f storage/logs/laravel.log`
2. Pastikan user sudah login dan memiliki business
3. Periksa database connection
4. Pastikan model Order dan Customer ada data

### Error 401 Unauthorized

1. Pastikan token valid
2. Periksa middleware auth:sanctum
3. Pastikan user sudah login

### Error 404 Not Found

1. Periksa route sudah terdaftar
2. Pastikan URL endpoint benar
3. Periksa middleware subscription.check

## Database Requirements

Pastikan tabel berikut memiliki data:

-   `users` - User yang login
-   `businesses` - Business data
-   `business_users` - Relasi user dengan business
-   `orders` - Data pesanan (optional untuk testing)
-   `customers` - Data pelanggan (optional untuk testing)

## Frontend Testing

1. Buka halaman Sales Management
2. Klik tombol "Debug" untuk test API
3. Periksa console browser untuk response
4. Periksa Network tab untuk request/response details
