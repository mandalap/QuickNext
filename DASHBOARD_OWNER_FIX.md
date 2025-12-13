# Fix Dashboard Owner - Panduan Perbaikan

## 🔍 Masalah yang Ditemukan

### 1. Relationship Error di getRecentOrders
**File:** `app/backend/app/Http/Controllers/Api/DashboardController.php:70`

**Masalah:**
```php
$query = Order::with(['customer', 'items.product', 'employee.user'])
```
Menggunakan `'items.product'` padahal relationship yang benar adalah `'orderItems.product'`

**Solusi:**
```php
$query = Order::with(['customer', 'orderItems.product', 'employee.user'])
```

---

### 2. Filter Tanggal Terlalu Ketat di getTopProducts
**File:** `app/backend/app/Http/Controllers/Api/DashboardController.php:111`

**Masalah:**
```php
->whereDate('orders.created_at', today())
```
Hanya menampilkan produk yang dijual **hari ini**. Jika belum ada transaksi hari ini, data akan kosong.

**Solusi:**
Tambahkan parameter `date_range` untuk fleksibilitas:

```php
public function getTopProducts(Request $request)
{
    try {
        $user = Auth::user();
        $businessId = $request->header('X-Business-Id') ?? $user->businesses->first()?->id;
        $outletId = $request->header('X-Outlet-Id');
        $dateRange = $request->input('date_range', 'today'); // today, week, month, all

        if (!$businessId) {
            return response()->json([
                'success' => false,
                'message' => 'Business ID not found'
            ], 400);
        }

        $query = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.business_id', $businessId)
            ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready']);

        // ✅ PERBAIKAN: Filter berdasarkan date_range
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
        }

        if ($outletId) {
            $query->where('orders.outlet_id', $outletId);
        }

        $topProducts = $query
            ->select(
                'products.id',
                'products.name',
                'products.price',
                DB::raw('SUM(order_items.quantity) as total_sold'),
                DB::raw('SUM(order_items.quantity * order_items.price) as total_revenue')
            )
            ->groupBy('products.id', 'products.name', 'products.price')
            ->orderBy('total_sold', 'desc')
            ->take(10)
            ->get()
            ->map(function ($product) {
                return [
                    'id' => (int) $product->id,
                    'name' => $product->name,
                    'price' => (float) $product->price,
                    'total_sold' => (int) $product->total_sold,
                    'total_revenue' => (float) $product->total_revenue
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $topProducts
        ]);
    } catch (\Exception $e) {
        \Log::error('DashboardController: getTopProducts failed', [
            'error' => $e->getMessage()
        ]);
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch top products',
            'error' => $e->getMessage()
        ], 500);
    }
}
```

---

### 3. Owner Tidak Bisa Lihat Data Tanpa Pilih Outlet
**File:** `app/frontend/src/components/dashboards/Dashboard.jsx:654`

**Masalah:**
```jsx
if (!currentOutlet) {
  return (
    <div className='space-y-6'>
      <Card className='p-8 text-center'>
        <h3>Pilih Outlet Terlebih Dahulu</h3>
      </Card>
    </div>
  );
}
```
Owner seharusnya bisa melihat data agregasi dari **semua outlet**, tidak harus pilih satu outlet.

**Solusi:**
```jsx
// Change the condition - only block if user is NOT owner and has no outlet
if (!currentOutlet && user?.role !== 'owner' && user?.role !== 'super_admin') {
  return (
    <div className='space-y-6'>
      <Card className='p-8 text-center'>
        <Activity className='w-16 h-16 mx-auto text-gray-400 mb-4' />
        <h3 className='text-xl font-semibold text-gray-900 mb-2'>
          Pilih Outlet Terlebih Dahulu
        </h3>
        <p className='text-gray-500 mb-4'>
          Anda perlu memilih outlet untuk mengakses dashboard.
        </p>
        {/* ... outlet selection ... */}
      </Card>
    </div>
  );
}
```

---

### 4. React Query Enabled Condition Inconsistency
**File:** `app/frontend/src/components/dashboards/Dashboard.jsx`

**Masalah:**
```jsx
// Line 286 - Good for owner
enabled: !!currentBusiness,

// Line 322 - Good for owner
enabled: !!currentBusiness,

// Line 375 - BAD for owner (will block if no outlet selected)
enabled: !!currentOutlet,

// Line 422 - Good (checks role first)
enabled: ['owner', 'super_admin', 'admin'].includes(user?.role) && !!currentOutlet,
```

**Solusi:**
```jsx
// Line 375 - Change topProducts query enabled condition
const {
  data: productsData,
  isLoading: loadingProducts,
  error: productsError,
} = useQuery({
  queryKey: queryKeys.dashboard.topProducts(
    {
      page: currentPage,
      limit: itemsPerPage,
    },
    currentOutlet?.id
  ),
  queryFn: async () => {
    const result = await dashboardService.getTopProducts({
      page: currentPage,
      limit: itemsPerPage,
    });
    // ... rest of the function
  },
  // ✅ FIX: Allow owner to see data without outlet selection
  enabled: !!currentBusiness, // Changed from !!currentOutlet
  staleTime: 5 * 60 * 1000,
  retry: 1,
});
```

---

### 5. Add Date Range Selector for Owner
**File:** `app/frontend/src/components/dashboards/Dashboard.jsx`

**Tambahan Fitur:** Owner seharusnya bisa memilih range tanggal untuk melihat data

**Solusi:**
```jsx
// Add state for date range
const [dateRange, setDateRange] = useState('today');

// Update queries to include date_range parameter
const {
  data: salesData,
  isLoading: loadingSales,
  refetch: refetchSales,
} = useQuery({
  queryKey: queryKeys.sales.stats({ date_range: dateRange }, currentOutlet?.id),
  queryFn: async () => {
    const result = await salesService.getStats({ date_range: dateRange });
    // ... rest
  },
  enabled: !!currentBusiness,
  staleTime: 5 * 60 * 1000,
});

// Add UI for date range selection in the welcome section
<div className='flex items-center space-x-2'>
  <Select value={dateRange} onValueChange={setDateRange}>
    <SelectTrigger className='w-32 bg-white/10 border-white/20 text-white'>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value='today'>Hari Ini</SelectItem>
      <SelectItem value='week'>Minggu Ini</SelectItem>
      <SelectItem value='month'>Bulan Ini</SelectItem>
      <SelectItem value='all'>Semua</SelectItem>
    </SelectContent>
  </Select>
</div>
```

---

## 📋 Checklist Perbaikan

### Backend (DashboardController.php)
- [ ] Fix relationship `'items.product'` → `'orderItems.product'` di getRecentOrders (Line 70)
- [ ] Add `date_range` parameter support di getTopProducts
- [ ] Add proper error logging di semua methods
- [ ] Test dengan data kosong (hari ini belum ada transaksi)
- [ ] Test dengan multiple outlets (untuk owner)

### Frontend (Dashboard.jsx)
- [ ] Fix outlet blocking condition untuk owner (Line 654)
- [ ] Fix React Query enabled condition untuk topProducts (Line 375)
- [ ] Add date range selector di welcome section
- [ ] Update query keys untuk include date_range
- [ ] Test dengan role owner tanpa pilih outlet
- [ ] Test dengan pilih outlet specific vs all outlets

### Testing
- [ ] Login sebagai owner
- [ ] Jangan pilih outlet - verify data tetap muncul (agregasi semua outlet)
- [ ] Pilih outlet specific - verify data filtered by outlet
- [ ] Change date range - verify data updates correctly
- [ ] Check console untuk error/warnings
- [ ] Check Network tab untuk API responses

---

## 🧪 Testing Scripts

### Test Backend Relationships
```bash
php artisan tinker
```
```php
// Test order with items relationship
$order = \App\Models\Order::with(['customer', 'orderItems.product', 'employee.user'])->first();
dump($order->orderItems); // Should show order items
dump($order->orderItems->first()->product); // Should show product details

// Test top products query
$products = \DB::table('order_items')
    ->join('products', 'order_items.product_id', '=', 'products.id')
    ->join('orders', 'order_items.order_id', '=', 'orders.id')
    ->whereIn('orders.status', ['completed', 'confirmed', 'preparing', 'ready'])
    ->whereDate('orders.created_at', today())
    ->select(
        'products.id',
        'products.name',
        \DB::raw('SUM(order_items.quantity) as total_sold'),
        \DB::raw('SUM(order_items.quantity * order_items.price) as total_revenue')
    )
    ->groupBy('products.id', 'products.name')
    ->orderBy('total_sold', 'desc')
    ->take(10)
    ->get();

dump($products);
```

### Test API Endpoints
```bash
# Get dashboard stats
curl -X GET "http://localhost:8000/api/v1/dashboard/stats" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1"

# Get recent orders
curl -X GET "http://localhost:8000/api/v1/dashboard/recent-orders" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1"

# Get top products
curl -X GET "http://localhost:8000/api/v1/dashboard/top-products" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1"

# Get top products with date range
curl -X GET "http://localhost:8000/api/v1/dashboard/top-products?date_range=week" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Business-Id: 1"
```

---

## 🚨 Kemungkinan Error

### Error 1: "No recent orders found"
**Penyebab:** Relationship `'items.product'` tidak ditemukan
**Solusi:** Fix ke `'orderItems.product'`

### Error 2: "Top products empty"
**Penyebab:** Filter `whereDate('orders.created_at', today())` terlalu ketat
**Solusi:** Add date_range parameter atau default ke 'week' atau 'all'

### Error 3: "Pilih outlet terlebih dahulu" (untuk owner)
**Penyebab:** Kondisi `if (!currentOutlet)` memblokir semua user
**Solusi:** Add role check untuk owner/super_admin

### Error 4: "React Query not fetching for owner"
**Penyebab:** `enabled: !!currentOutlet` memblokir owner tanpa outlet
**Solusi:** Change ke `enabled: !!currentBusiness`

---

## 📊 Expected Behavior After Fix

### For Owner (without selecting outlet):
✅ Shows **aggregated data** from all outlets
✅ Can see total sales across all outlets
✅ Can see all recent orders from all outlets
✅ Can see top products across all outlets
✅ Can select date range (today, week, month, all)

### For Owner (with outlet selected):
✅ Shows **filtered data** for selected outlet only
✅ Can see sales for that outlet
✅ Can see recent orders for that outlet
✅ Can see top products for that outlet

### For Kasir/Admin/Other Roles:
✅ Must select outlet first
✅ Shows data for selected outlet only
✅ Cannot see data without outlet selection

---

## 💡 Additional Improvements

### 1. Add Outlet Selector for Owner
Owner should have a dropdown to choose:
- "Semua Outlet" (aggregate all)
- "Outlet A" (specific outlet)
- "Outlet B" (specific outlet)

### 2. Add Date Range Preset Buttons
Quick filters:
- Hari Ini
- 7 Hari Terakhir
- 30 Hari Terakhir
- Bulan Ini
- Custom Range (date picker)

### 3. Add Export Button
Owner can export dashboard data to Excel/PDF

### 4. Add Real-time Updates
Use WebSocket or polling to auto-refresh dashboard data every 30 seconds

---

## 🔗 Related Files

- `app/backend/app/Http/Controllers/Api/DashboardController.php` - Main dashboard API
- `app/backend/app/Models/Order.php` - Order model with relationships
- `app/frontend/src/components/dashboards/Dashboard.jsx` - Frontend dashboard component
- `app/frontend/src/services/dashboard.service.js` - Dashboard service for API calls
- `app/backend/routes/api.php` - API routes (lines 67-69)

---

**Priority:** 🔴 HIGH - Owner tidak bisa lihat data adalah critical issue

**Estimated Time:** 2-3 hours untuk implement semua fixes
