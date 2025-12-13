# Test Backend Stats Response

## Step 1: Test dengan Browser Console

1. Buka halaman Products
2. Buka Chrome DevTools (F12) → Console tab
3. Lihat log:
   - `📦 Products Response:` - harus ada `stats` object
   - `📊 Backend Stats Received:` - harus ada data stats
   - `🔢 Current backendStats:` - harus ada nilai yang benar

## Step 2: Test API Response Manual

Buka Network tab di DevTools, refresh halaman, cari request ke `/api/v1/products?per_page=...`

Response harus seperti ini:

```json
{
  "current_page": 1,
  "data": [
    // array produk
  ],
  "per_page": 5,
  "total": 200,

  "stats": {
    "total_all_products": 200,
    "low_stock": 15,
    "out_of_stock": 3,
    "stock_value": 15000000
  }
}
```

## Step 3: Jika Stats Tidak Ada di Response

Kemungkinan backend belum updated. Jalankan:

```bash
cd app/backend
php artisan cache:clear
php artisan route:clear
php artisan config:clear
```

## Step 4: Test dengan cURL

```bash
curl -X GET "http://localhost:8000/api/v1/products?per_page=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1" \
  | json_pp
```

Cek apakah response punya `stats` object.

## Expected Console Output

Jika benar, console harus menampilkan:

```
📦 Products Response: {current_page: 1, data: Array(5), stats: {…}, ...}
📊 Backend Stats Received: {total_all_products: 200, low_stock: 15, out_of_stock: 3, stock_value: 15000000}
🔢 Current backendStats: {total_all_products: 200, low_stock: 15, out_of_stock: 3, stock_value: 15000000}
```

## Troubleshooting

### Jika `stats` masih undefined:

1. **Backend belum di-update**: Cek file `ProductController.php` line 95-152
2. **Cache issue**: Clear semua cache Laravel
3. **Route salah**: Pastikan menggunakan route yang benar (`/api/v1/products` bukan endpoint lain)

### Jika stats = {0, 0, 0, 0}:

1. **Database kosong**: Tambah produk dummy untuk test
2. **Business ID salah**: Cek header `X-Business-Id`
3. **Filter salah**: Backend query mungkin salah

## Quick Fix

Jika masih bermasalah, coba hard refresh browser:
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

Atau clear browser cache completely.
