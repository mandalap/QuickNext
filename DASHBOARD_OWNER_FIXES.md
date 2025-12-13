# Dashboard Owner - Perbaikan Lengkap

## 🔴 Masalah yang Dilaporkan

1. **Dashboard owner menampilkan data dummy**
2. **Toast notification**: "Menampilkan data demo (API belum tersedia)"
3. **Data tidak muncul meskipun ada transaksi di database**

## ✅ Perbaikan yang Sudah Dilakukan

### 1. Fix Relationship Error di getRecentOrders

**File:** `app/backend/app/Http/Controllers/Api/DashboardController.php` (Line 70)

**Masalah:**
```php
$query = Order::with(['customer', 'items.product', 'employee.user'])
```
Menggunakan `'items.product'` padahal relationship yang benar adalah `'orderItems.product'`

**Fix:**
```php
$query = Order::with(['customer', 'orderItems.product', 'employee.user'])
```

### 2. Fix Date Filter Terlalu Ketat di getTopProducts

**File:** `app/backend/app/Http/Controllers/Api/DashboardController.php` (Line 111)

**Masalah:**
```php
->whereDate('orders.created_at', today())
```
Hanya menampilkan produk yang dijual HARI INI. Jika belum ada transaksi hari ini → data kosong.

**Fix:**
Menambahkan parameter `date_range` dengan default `month`:

```php
// Get date range parameter (default to month)
$dateRange = $request->input('date_range', 'month');

// Apply date filter based on range
switch ($dateRange) {
    case 'today':
        $query->whereDate('orders.created_at', today());
        break;
    case 'week':
        $query->whereBetween('orders.created_at', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
        break;
    case 'month':
        $query->whereMonth('orders.created_at', now()->month)
              ->whereYear('orders.created_at', now()->year);
        break;
    case 'all':
        // No date filter - show all time
        break;
    default:
        // Default to month
        $query->whereMonth('orders.created_at', now()->month)
              ->whereYear('orders.created_at', now()->year);
}
```

**Manfaat:**
- Owner bisa lihat data bulan ini (default)
- Bisa ganti ke today, week, atau all
- Data tidak kosong meskipun hari ini belum ada transaksi

### 3. Menambahkan Status 'paid' ke Filter

**Before:**
```php
->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
```

**After:**
```php
->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready', 'paid'])
```

Order dengan status 'paid' sekarang juga dihitung.

---

## 🧪 Testing

### Test API Dashboard

#### 1. Test getStats
```bash
curl -X GET "http://localhost:8000/api/v1/dashboard/stats" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1" \
  -H "Accept: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "total_orders": 10,
    "total_revenue": 5000000,
    "total_products": 50,
    "total_customers": 25
  }
}
```

#### 2. Test getRecentOrders
```bash
curl -X GET "http://localhost:8000/api/v1/dashboard/recent-orders" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1" \
  -H "Accept: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_number": "ORD-2024-001",
      "customer": {...},
      "order_items": [...],  // Sekarang ada data karena relationship sudah benar
      "employee": {...},
      "total": 150000,
      "created_at": "..."
    }
  ]
}
```

#### 3. Test getTopProducts (Default: Month)
```bash
curl -X GET "http://localhost:8000/api/v1/dashboard/top-products" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id": 1" \
  -H "Accept: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Nasi Goreng",
      "price": 25000,
      "total_sold": 50,
      "total_revenue": 1250000
    }
  ]
}
```

#### 4. Test getTopProducts dengan Date Range
```bash
# Today
curl -X GET "http://localhost:8000/api/v1/dashboard/top-products?date_range=today" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1"

# Week
curl -X GET "http://localhost:8000/api/v1/dashboard/top-products?date_range=week" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1"

# All time
curl -X GET "http://localhost:8000/api/v1/dashboard/top-products?date_range=all" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1"
```

### Test Sales Stats (untuk Dashboard Overview)
```bash
curl -X GET "http://localhost:8000/api/v1/sales/stats?date_range=today" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1" \
  -H "Accept: application/json"
```

---

## 🔍 Debugging

### Jika Masih Muncul "Data Demo"

#### 1. Cek Console Browser
Buka Developer Tools → Console, lihat error:

**Kemungkinan Error:**
```javascript
Error fetching sales stats: Request failed with status code 500
```

**Solusi:** Cek Laravel log di `storage/logs/laravel.log`

#### 2. Cek Network Tab
Buka Developer Tools → Network, filter "XHR", lihat request:

**Check:**
- ✅ Request ke `/api/v1/sales/stats` dengan status 200
- ✅ Response `success: true`
- ❌ Jika 401 → Token expired, login ulang
- ❌ Jika 400 → Business ID tidak ditemukan
- ❌ Jika 500 → Server error, cek log

#### 3. Cek localStorage
```javascript
// Di console browser
console.log('Business ID:', localStorage.getItem('currentBusinessId'));
console.log('Outlet ID:', localStorage.getItem('currentOutletId'));
console.log('Token:', localStorage.getItem('token'));
```

**Jika Business ID null:**
1. Logout
2. Login ulang
3. Verify business ID tersimpan

#### 4. Test Langsung dengan curl
```bash
# Get token dari localStorage
# Replace YOUR_TOKEN dengan token sebenarnya

curl -X GET "http://localhost:8000/api/v1/sales/stats?date_range=today" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1" \
  -H "Accept: application/json" \
  -v
```

Check response:
- Jika sukses → Masalah di frontend
- Jika error → Masalah di backend

---

## 📊 Expected Behavior After Fix

### For Owner Dashboard:

#### 1. **Overview Cards**
- ✅ Total Penjualan Hari Ini (dari data real)
- ✅ Jumlah Transaksi (dari data real)
- ✅ Pelanggan Aktif (dari data real)
- ✅ Produk Terjual (dari data real)

#### 2. **Recent Orders**
- ✅ Menampilkan 10 order terakhir
- ✅ Data customer muncul
- ✅ Data order_items muncul (karena relationship fixed)
- ✅ Data employee/kasir muncul

#### 3. **Top Products**
- ✅ Menampilkan produk terlaris **bulan ini** (default)
- ✅ Bisa ganti ke today/week/all
- ✅ Data tidak kosong meskipun hari ini belum ada transaksi

#### 4. **Toast Notification**
- ✅ Tidak ada warning "Data demo"
- ✅ Data loading dengan benar
- ❌ Hanya muncul error jika memang API gagal

---

## 🎯 Frontend Integration

Dashboard.jsx sudah menggunakan service yang benar:

```javascript
// Sales Stats Query
const {
  data: salesData,
  isLoading: loadingSales,
} = useQuery({
  queryKey: queryKeys.sales.stats({ date_range: 'today' }),
  queryFn: async () => {
    const result = await salesService.getStats({ date_range: 'today' });
    return result.data;
  },
  enabled: !!currentBusiness, // ✅ Correct - tidak perlu outlet
});

// Recent Orders Query
const {
  data: ordersData,
  isLoading: loadingOrders,
} = useQuery({
  queryKey: queryKeys.sales.orders({ page: 1, limit: 5, date_range: 'today' }),
  queryFn: async () => {
    const result = await salesService.getOrders({
      page: 1,
      limit: 5,
      date_range: 'today'
    });
    return result.data.orders || result.data;
  },
  enabled: !!currentBusiness, // ✅ Correct - tidak perlu outlet
});

// Top Products Query
const {
  data: productsData,
  isLoading: loadingProducts,
} = useQuery({
  queryKey: queryKeys.dashboard.topProducts({ page: 1, limit: 5 }),
  queryFn: async () => {
    const result = await dashboardService.getTopProducts({
      page: 1,
      limit: 5
    });
    return result.data;
  },
  enabled: !!currentBusiness, // ✅ Correct - tidak perlu outlet
});
```

**Catatan Penting:**
- Semua query menggunakan `enabled: !!currentBusiness` (BUKAN `!!currentOutlet`)
- Ini membuat owner bisa lihat data meskipun tidak pilih outlet
- Data akan aggregate semua outlet jika outlet tidak dipilih

---

## 🚨 Common Issues & Solutions

### Issue 1: "Business ID not found"

**Penyebab:**
- User tidak punya business association
- currentBusinessId di localStorage null

**Solusi:**
```sql
-- Cek business user di database
SELECT * FROM business_user WHERE user_id = YOUR_USER_ID;

-- Jika kosong, insert:
INSERT INTO business_user (user_id, business_id, role, created_at, updated_at)
VALUES (YOUR_USER_ID, 1, 'owner', NOW(), NOW());
```

### Issue 2: Data Masih Kosong (Total = 0)

**Penyebab:**
- Belum ada transaksi di database
- Status order tidak sesuai filter

**Solusi:**
```sql
-- Cek orders di database
SELECT id, order_number, status, total, created_at
FROM orders
WHERE business_id = 1
ORDER BY created_at DESC
LIMIT 10;

-- Check status yang ada
SELECT status, COUNT(*)
FROM orders
WHERE business_id = 1
GROUP BY status;
```

### Issue 3: Top Products Kosong

**Penyebab:**
- Filter date range terlalu ketat (hanya today)
- Belum ada transaksi hari ini

**Solusi:**
Sudah diperbaiki! Sekarang default ke `month`. Atau pass parameter:
```javascript
dashboardService.getTopProducts({
  page: 1,
  limit: 5,
  date_range: 'all' // Tampilkan semua
});
```

### Issue 4: Frontend Masih Menampilkan Data Demo

**Penyebab:**
- API error (check console)
- Network issue
- Token expired

**Solusi:**
1. Check console browser untuk error
2. Check Network tab → Verify API calls sukses
3. Clear localStorage dan login ulang
4. Restart Laravel server: `php artisan serve`
5. Clear cache: `php artisan config:clear && php artisan cache:clear`

---

## ✅ Verification Checklist

### Backend
- [x] Fix relationship `items.product` → `orderItems.product`
- [x] Add date_range parameter ke getTopProducts
- [x] Default date_range = 'month' (tidak hanya today)
- [x] Add status 'paid' ke filter orders
- [x] Test endpoint dengan curl

### Frontend
- [x] Service sudah benar (salesService, dashboardService)
- [x] Query enabled by currentBusiness (bukan currentOutlet)
- [x] Fallback ke mock data jika API error
- [ ] **USER PERLU TEST**: Buka dashboard owner dan verify data real

### Database
- [ ] Verify ada orders di database
- [ ] Verify business_user relationship
- [ ] Verify products ada di order_items

---

## 📝 Summary

### Files Modified
1. ✅ `app/backend/app/Http/Controllers/Api/DashboardController.php`
   - Line 70: Fixed relationship error
   - Line 92-141: Added date_range support

### Expected Result
- ✅ Dashboard owner menampilkan data real dari database
- ✅ Top Products default menampilkan data bulan ini (bukan hanya hari ini)
- ✅ Recent Orders menampilkan data lengkap dengan relasi
- ✅ Tidak ada toast "Data demo" kecuali memang API error

### Next Test by User
1. Login sebagai owner
2. Buka Dashboard
3. Verify data real muncul (bukan data demo)
4. Verify toast tidak ada warning
5. Verify top products ada data (default bulan ini)
6. Verify recent orders lengkap dengan items

---

**Status:** ✅ **FIXED - Siap untuk Testing**

**Tested On:**
- Backend: Laravel 10+
- Database: MySQL
- Frontend: React + TanStack Query

**Author:** Claude Code Assistant
**Date:** 2025-01-22
